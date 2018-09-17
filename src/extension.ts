import * as vscode from "vscode";
import * as fs from "fs";
import * as path from "path";
import * as xmldoc from "xmldoc";
import { parse, ParsedElement } from "./domParser";
import { collectSystemFonts } from "./fontFileProcedures";
import { iterate } from "./utils";
import { diffChars } from "diff";
import isAbsoluteUrl from "is-absolute-url";
import { OperatorName } from "./menuComponent";
import { updateXPaths } from "./traverse";
const format = require('xml-formatter');

type PanelSet = { panel: vscode.WebviewPanel, editor: vscode.TextEditor, text: string};

export function activate(context: vscode.ExtensionContext) {

    let readResource =
        (filename: string) => fs.readFileSync(path.join(__dirname, "..", "..", "resources", filename), "UTF-8");
    let readImage =
        (filename: string) => fs.readFileSync(path.join(__dirname, "..", "..", "images", filename), "UTF-8");
    let readOthers =
        (filename: string) => fs.readFileSync(path.join(__dirname, "..", "..", filename), "UTF-8");
    let viewer = readResource("viewer.html");
    let templateSvg = readResource("template.svg");
    let css = readResource("style.css");
    let bundleJs = readResource("bundle.js");

    let icons = [
        "addLinearGradient.svg", "alignLeft.svg", "bringForward.svg", "duplicate.svg", "objectToPath.svg", "sendBackward.svg",
        "addRadialGradient.svg", "alignRight.svg", "font.svg", "zoomOut.svg",
        "alignBottom.svg", "alignTop.svg", "delete.svg", "group.svg", "zoomIn.svg", "ungroup.svg",
        "rotateClockwise.svg", "rotateCounterclockwise.svg", "centerVertical.svg", "centerHorizontal.svg"
    ].map(readImage).join("");

    let diagnostics = vscode.languages.createDiagnosticCollection("svgeditor");

    let panelSet: PanelSet | null = null;

    let setup = (editor: vscode.TextEditor, oldPanel?: vscode.WebviewPanel) => {
        const config = vscode.workspace.getConfiguration("svgeditor", editor.document.uri);
        let text = editor.document.getText();
        const panel = oldPanel || (() => {
            const additionalResourceUris = [];
            for (let path of config.get<string[]>("additionalResourcePaths") || []) {
                try { additionalResourceUris.push(vscode.Uri.file(path)); } catch (_err) {}
            }
            const panel = vscode.window.createWebviewPanel(
                "svgeditor",
                "SVG Editor",
                vscode.ViewColumn.Beside, {
                    enableScripts: true,
                    localResourceRoots: [
                        vscode.Uri.file(context.extensionPath),
                        ...(vscode.workspace.workspaceFolders ? vscode.workspace.workspaceFolders.map(x => x.uri) : []),
                        ...additionalResourceUris
                    ]
                }
            )
            return panel;
        })();
        panel.webview.html = replaceMagic(viewer, {bundleJs, css, icons, uri: editor.document.uri.toString()});
        panelSet = {panel, editor, text};
        setListener(panelSet);
        setWebviewActiveContext(oldPanel ? false : true);
    }

    let setListener = (pset : PanelSet) => {
        const config = vscode.workspace.getConfiguration("svgeditor", pset.editor.document.uri);
        pset.panel.webview.onDidReceiveMessage(async message => {
            switch (message.command) {
                case "modified":
                    const oldText = pset.text;
                    pset.text = format(message.data);
                    pset.editor.edit(editBuilder => {
                        diffProcedure(diffChars(oldText, pset.text), editBuilder)
                    });
                    return;
                case "svg-request":
                    pset.panel.webview.postMessage({
                        command: "modified",
                        data: parseSvg(pset.text, pset.editor, diagnostics)
                    });
                    pset.panel.webview.postMessage({
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
                    pset.panel.webview.postMessage({
                        command: "input-response",
                        data: result
                    });
                    return;
                case "fontList-request":
                    const fonts = await collectSystemFonts();
                    pset.panel.webview.postMessage({
                        command: "fontList-response",
                        data: iterate(fonts, (_, value) => Object.keys(value))
                    });
                    return;
                case "information-request":
                    const ret = await vscode.window.showInformationMessage(message.data.message, ...message.data.items);
                    pset.panel.webview.postMessage({
                        command: "information-response",
                        data: {
                            result: ret,
                            kind: message.data.kind,
                            args: message.data.args
                        }
                    });
                    return;
                case "url-normalize-request":
                    const urlFragment = message.data.urlFragment;
                    const callbackUuid = message.data.uuid;
                    pset.panel.webview.postMessage({
                        command: "callback-response",
                        data: {
                            uuid: callbackUuid,
                            args: [normalizeUrl(urlFragment, pset.editor.document.uri.toString())]
                        }
                    });
                    return;
                case "error":
                    showError(message.data);
                    return;
            }
        }, undefined, context.subscriptions);

        pset.panel.onDidDispose(() => {
            panelSet = null;
        }, undefined, context.subscriptions);

        pset.panel.onDidChangeViewState(({ webviewPanel }) => {
            setWebviewActiveContext(webviewPanel.active);
        });
    }

    function register(...args: {cmd: string; fn: (...args: any[]) => any}[]): void {
        for (let {cmd, fn} of args) {
            context.subscriptions.push(vscode.commands.registerCommand(cmd, fn));
        }
    }

    function registerPostOnly(...lastNames: OperatorName[]): void {
        register(...lastNames.map(name => {
            return {
                cmd: `svgeditor.${name}`,
                fn: () => {
                    panelSet && panelSet.panel.webview.postMessage({command: name});
                }
            };
        }));
    }

    vscode.workspace.onDidChangeTextDocument((e: vscode.TextDocumentChangeEvent) => {
        if (panelSet && panelSet.editor.document === e.document && panelSet.text !== e.document.getText()) {
            panelSet.panel.webview.postMessage({
                command: "modified",
                data: parseSvg(panelSet.text = e.document.getText(), panelSet.editor, diagnostics)
            });
        }
    }, null, context.subscriptions);

    vscode.window.onDidChangeActiveTextEditor(editor => {
        const config = vscode.workspace.getConfiguration("svgeditor")
        if (
            editor
            && editor.document.languageId === config.get<string>("filenameExtension")
            && panelSet
            && panelSet.editor.document !== editor.document
        ) {
            setup(editor, panelSet.panel || undefined);
        }
    }, null, context.subscriptions);

    context.subscriptions.push(vscode.commands.registerTextEditorCommand("svgeditor.openSvgEditor", (textEditor) => {
        if (panelSet) panelSet.panel.reveal();
        else {
            setup(textEditor);
        }
    }));

    register(
        {
            cmd: "svgeditor.newSvgEditor",
            fn: async () => {
                if (panelSet) panelSet.panel.reveal();
                else try {
                    const config = vscode.workspace.getConfiguration("svgeditor");
                    const width = config.get<string>("width") || "400px";
                    const height = config.get<string>("height") || "400px";
                    const editor = await newUntitled(vscode.ViewColumn.One, replaceMagic(templateSvg, {width, height}));
                    setup(editor);
                } catch (error) {
                    showError(error);
                }
            }
        },
        {
            cmd: "svgeditor.reopenRelatedTextEditor",
            fn: async () => {
                if (panelSet) {
                    let editor = await newUntitled(vscode.ViewColumn.Beside, panelSet.text);
                    panelSet.editor = editor;
                    setListener(panelSet);
                }
            }
        }
    );

    registerPostOnly(
        "delete",
        "duplicate",
        "zoomIn",
        "zoomOut",
        "group",
        "ungroup",
        "font",
        "bringForward",
        "sendBackward",
        "alignLeft",
        "alignRight",
        "alignBottom",
        "alignTop",
        "objectToPath",
        "rotateClockwise",
        "rotateCounterclockwise",
        "rotateClockwiseByTheAngleStep",
        "rotateCounterclockwiseByTheAngleStep",
        "centerHorizontal",
        "centerVertical"
    );
}

function showError(reason: any) {
    vscode.window.showErrorMessage(reason);
}

function parseSvg(svgText: string, editor: vscode.TextEditor, diagnostics: vscode.DiagnosticCollection): ParsedElement | null {
    const dom = new xmldoc.XmlDocument(svgText);
    if (!dom) return null;
    const parsed = parse(dom);
    if (!parsed) return null;
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
    return parsed.result;
}

function setWebviewActiveContext(value: boolean) {
    vscode.commands.executeCommand('setContext', "svgeditorWebviewFocus", value);
}

export async function newUntitled(viewColumn: vscode.ViewColumn, content: string) {
    const config = vscode.workspace.getConfiguration("svgeditor");
    const document = await vscode.workspace.openTextDocument({language: config.get<string>("filenameExtension"), content});
    return vscode.window.showTextDocument(document, viewColumn);
}

export function diffProcedure(diffResults: JsDiff.IDiffResult[], editBuilder: vscode.TextEditorEdit) {
    let startLine = 0, startCharacter = 0;
    for (let diffResult of diffResults) {
        let lines = diffResult.value.split(/\r?\n/);
        let newlineCodes = lines.length - 1;
        let endLine = startLine + newlineCodes;
        let endCharacter = newlineCodes === 0 ? startCharacter + diffResult.value.length : lines[newlineCodes].length;

        if (diffResult.added) {
            editBuilder.insert(new vscode.Position(startLine, startCharacter), diffResult.value);
        } else if (diffResult.removed) {
            editBuilder.delete(new vscode.Range(startLine, startCharacter, endLine, endCharacter));
        }

        if (!diffResult.added) {
            startLine = endLine;
            startCharacter = endCharacter;
        }
    }
}

/**
 * @param urlFragment `../foo/bar.svg`, `/foo/bar/baz.svg`, `C:\\Users\\henoc\\sample.svg`
 * @param baseUrl `file:///c%3A/Users/henoc/sample.svg` accept file uri scheme
 */
export function normalizeUrl(urlFragment: string, baseUrl: string): string | null {
    let uri = path.isAbsolute(urlFragment) ? vscode.Uri.file(urlFragment) : isAbsoluteUrl(urlFragment) ? vscode.Uri.parse(urlFragment) : vscode.Uri.parse(path.posix.join(path.posix.dirname(baseUrl), urlFragment.replace(/\\/g, "/")));
    if (uri.scheme === "file") uri = uri.with({scheme: "vscode-resource"});
    return uri.scheme === "untitled" ? null : uri.toString();
}

export function replaceMagic(str: string, vars: {[key: string]: string}): string {
    return str.replace(/(?:\/\*|<!--)\?\s*([a-zA-Z_$]\w*)\s*(?:\*\/|-->)/g, (_match, p1) => {
        return vars[p1];
    });
}
