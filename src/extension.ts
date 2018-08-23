import * as vscode from "vscode";
import * as fs from "fs";
import * as path from "path";
import * as xmldoc from "xmldoc";
import { render } from "ejs";
import { parse } from "./domParser";
const format = require('xml-formatter');

export function activate(context: vscode.ExtensionContext) {

    let readResource =
        (filename: string) => fs.readFileSync(path.join(__dirname, "..", "resources", filename), "UTF-8");
    let readOthers =
        (filename: string) => fs.readFileSync(path.join(__dirname, "..", filename), "UTF-8");
    let viewer = readResource("viewer.html");
    let templateSvg = readResource("template.svg");
    let bundleJsPath = vscode.Uri.file(path.join(context.extensionPath, "resources", "bundle.js")).with({ scheme: "vscode-resource"});
    let cssPath = vscode.Uri.file(path.join(context.extensionPath, "resources", "style.css")).with({ scheme: "vscode-resource"});
    let diagnostics = vscode.languages.createDiagnosticCollection("svgeditor");

    let panelSet: { panel: vscode.WebviewPanel, editor: vscode.TextEditor} | null = null;
    let text: string | null = null;
    let prevendSend = false;

    let createPanel = (editor: vscode.TextEditor) => {
        text = editor.document.getText();
        const panel = vscode.window.createWebviewPanel(
            "svgeditor",
            "SVG Editor",
            vscode.ViewColumn.Beside, {
                enableScripts: true,
                localResourceRoots: [
                    vscode.Uri.file(path.join(context.extensionPath, "resources"))
                ]
            }
        );
        panel.webview.html = render(viewer, {bundleJsPath, cssPath});
        setListener(panel, editor);
        panelSet = {panel, editor};
        prevendSend = false;
    }

    let setListener = (panel: vscode.WebviewPanel, editor: vscode.TextEditor) => {
        const config = vscode.workspace.getConfiguration("svgeditor", editor.document.uri);
        panel.webview.onDidReceiveMessage(async message => {
            switch (message.command) {
                case "modified":
                    text = format(message.data);
                    editor.edit(editBuilder => {
                        editBuilder.replace(allRange(editor), text!);
                    });
                    prevendSend = true;
                    return;
                case "svg-request":
                    panel.webview.postMessage({
                        command: "modified",
                        data: parseSvg(text || editor.document.getText(), editor, diagnostics)
                    });
                    panel.webview.postMessage({
                        command: "configuration",
                        data: {
                            showAll: config.get<boolean>("showAll"),
                            defaultUnit: config.get<string | null>("defaultUnit"),
                            decimalPlaces: config.get<number>("decimalPlaces"),
                            collectTransform: config.get<boolean>("collectTransformMatrix")
                        }
                    });
                    return;
                case "input-request":
                    const result = await vscode.window.showInputBox({placeHolder: message.data})
                    panel.webview.postMessage({
                        command: "input-response",
                        data: result
                    });
                    return;
                case "error":
                    showError(message.data);
                    return;
            }
        }, undefined, context.subscriptions);

        panel.onDidDispose(() => {
            panelSet = null;
        }, undefined, context.subscriptions);
    }

    context.subscriptions.push(vscode.workspace.onDidChangeTextDocument((e: vscode.TextDocumentChangeEvent) => {
        if (panelSet && panelSet.editor.document === e.document) {
            if (prevendSend) {
                prevendSend = false;
            } else {
                panelSet.panel.webview.postMessage({
                    command: "modified",
                    data: parseSvg(text = e.document.getText(), panelSet.editor, diagnostics)
                });
            }
        }
    }));

    context.subscriptions.push(vscode.commands.registerCommand("svgeditor.openSvgEditor", () => {
        const editor = vscode.window.activeTextEditor;
        if (panelSet) panelSet.panel.reveal();
        else if (editor) {
            createPanel(editor);
        } else {
            showError("Not found active text editor.");
        }
    }));

    context.subscriptions.push(vscode.commands.registerCommand("svgeditor.newSvgEditor", async () => {
        if (panelSet) panelSet.panel.reveal();
        else try {
            const editor = await newUntitled(vscode.ViewColumn.One, templateSvg);
            createPanel(editor);
        } catch (error) {
            showError(error);
        }
    }));

    context.subscriptions.push(vscode.commands.registerCommand("svgeditor.reopenRelatedTextEditor", async () => {
            if (panelSet && text) {
                let editor = await newUntitled(vscode.ViewColumn.Beside, text);
                panelSet.editor = editor;
                setListener(panelSet.panel, panelSet.editor);
            }
    }));
}

function allRange(textEditor: vscode.TextEditor): vscode.Range {
    let firstLine = textEditor.document.lineAt(0);
    let lastLine = textEditor.document.lineAt(textEditor.document.lineCount - 1);
    let textRange = new vscode.Range(0,
        firstLine.range.start.character,
        textEditor.document.lineCount - 1,
        lastLine.range.end.character);
    return textRange;
}

function showError(reason: any) {
    vscode.window.showErrorMessage(reason);
}

function parseSvg(svgText: string, editor: vscode.TextEditor, diagnostics: vscode.DiagnosticCollection): any {
    const dom = new xmldoc.XmlDocument(svgText);
    const parsed = parse(dom, null);
    diagnostics.set(editor.document.uri, parsed.warns.map(warn => {
        const startLine = warn.range.line - (svgText.slice(warn.range.startTagPosition, warn.range.position).split("\n").length - 1);
        const startColumn = warn.range.startTagPosition - svgText.slice(undefined, warn.range.startTagPosition).lastIndexOf("\n") - 2;
        return {
            source: "svgeditor",
            message: warn.message,
            range: new vscode.Range(startLine, startColumn, warn.range.line, warn.range.column),
            severity: vscode.DiagnosticSeverity.Warning
        };
    }));
    return parsed.result
}

async function newUntitled(viewColumn: vscode.ViewColumn, content: string) {
    const config = vscode.workspace.getConfiguration("svgeditor");
    const document = await vscode.workspace.openTextDocument({language: config.get<string>("filenameExtension"), content});
    return vscode.window.showTextDocument(document, viewColumn);
}
