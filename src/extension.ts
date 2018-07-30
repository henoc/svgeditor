import * as vscode from "vscode";
import * as fs from "fs";
import * as path from "path";
import * as xmldoc from "xmldoc";
import { render } from "ejs";
import { parse } from "./domParser";

export function activate(context: vscode.ExtensionContext) {

    let readResource =
        (filename: string) => fs.readFileSync(path.join(__dirname, "..", "resources", filename), "UTF-8");
    let readOthers =
        (filename: string) => fs.readFileSync(path.join(__dirname, "..", filename), "UTF-8");
    let viewer = readResource("viewer.html");
    let templateSvg = readResource("template.svg");
    let bundleJsPath = vscode.Uri.file(path.join(context.extensionPath, "resources", "bundle.js")).with({ scheme: "vscode-resource"});
    let cssPath = vscode.Uri.file(path.join(context.extensionPath, "resources", "style.css")).with({ scheme: "vscode-resource"});


    let panelSets: {editor: vscode.TextEditor, panel: vscode.WebviewPanel}[] = [];
    let diagnostics = vscode.languages.createDiagnosticCollection("svgeditor");

    let createPanel = (editor: vscode.TextEditor) => {
        const panel = vscode.window.createWebviewPanel(
            "svgeditor",
            "SVG Editor",
            vscode.ViewColumn.Two, {
                enableScripts: true,
                localResourceRoots: [
                    vscode.Uri.file(path.join(context.extensionPath, "resources"))
                ]
            });
        panel.webview.html = render(viewer, {bundleJsPath, cssPath});
        panel.webview.onDidReceiveMessage(message => {
            switch (message.command) {
                case "modified":
                    editor.edit(editBuilder => {
                        editBuilder.replace(allRange(editor), message.data);
                    });
                    return;
                case "svg-request":
                    panel.webview.postMessage({
                        command: "modified",
                        data: parseSvg(editor.document.getText(), editor, diagnostics)
                    });
                    return;
            }
        }, undefined, context.subscriptions);
        
        panelSets.push({editor, panel})
    }

    context.subscriptions.push(vscode.workspace.onDidChangeTextDocument((e: vscode.TextDocumentChangeEvent) => {
        panelSets.forEach(sets => {
            if (sets.editor.document === e.document) {
                sets.panel.webview.postMessage({
                    command: "modified",
                    data: parseSvg(e.document.getText(), sets.editor, diagnostics)
                });
            }
        });
    }));

    context.subscriptions.push(vscode.commands.registerCommand("svgeditor.openSvgEditor", () => {
        const editor = vscode.window.activeTextEditor;
        if (editor) {
            createPanel(editor);
        } else {
            showError("Not found active text editor.");
        }
    }));

    context.subscriptions.push(vscode.commands.registerCommand("svgeditor.newSvgEditor", async () => {
        try {
            await vscode.commands.executeCommand("workbench.action.files.newUntitledFile");
            const editor = vscode.window.activeTextEditor!;
            await editor.edit(editbuilder => {
                editbuilder.insert(new vscode.Position(0, 0), templateSvg);
            });
            createPanel(editor);
        } catch (error) {
            showError(error);
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
    const parsed = parse(dom);
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
