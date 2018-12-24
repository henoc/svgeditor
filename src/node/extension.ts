import * as vscode from "vscode";
import * as fs from "fs";
import * as path from "path";
import { parse, ParsedElement } from "../isomorphism/svgParser";
import { collectSystemFonts } from "./fontFileProcedures";
import { iterate, assertNever, optionOf } from "../isomorphism/utils";
import isAbsoluteUrl from "is-absolute-url";
import { OperatorName } from "../renderer/menuComponent";
import { textToXml, Interval, trimXml, trimPositions, XmlElement, XmlElementNop } from "../isomorphism/xmlParser";
import { XmlDiff, jsondiffForXml, xmlJsonDiffToStringDiff } from "../isomorphism/xmlDiffPatch";
import { LinearOptions } from "../isomorphism/xmlSerializer";

type PanelSet = { panel: vscode.WebviewPanel, editor: vscode.TextEditor, text: string, blockOnChangeText: boolean};

export function activate(context: vscode.ExtensionContext) {

    let readResource =
        (filename: string) => fs.readFileSync(path.join(context.extensionPath, "resources", filename), "UTF-8");
    let readImage =
        (filename: string) => fs.readFileSync(path.join(context.extensionPath, "images", filename), "UTF-8");
    let readOthers =
        (filename: string) => fs.readFileSync(path.join(context.extensionPath, filename), "UTF-8");
    let viewer = readResource("viewer.html");
    let templateSvg = readResource("template.svg");
    let css = readResource("style.css");
    let bundleJs = readResource("bundle.js");

    let icons = [
        "addLinearGradient.svg", "alignLeft.svg", "bringForward.svg", "duplicate.svg", "objectToPath.svg", "sendBackward.svg",
        "addRadialGradient.svg", "alignRight.svg", "zoomOut.svg",
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
        panelSet = {panel, editor, text, blockOnChangeText: false};
        setListener(panelSet);
        setWebviewActiveContext(oldPanel ? false : true);
    }

    let setListener = (pset : PanelSet) => {
        const config = vscode.workspace.getConfiguration("svgeditor", pset.editor.document.uri);
        pset.panel.webview.onDidReceiveMessage(async message => {
            try {
                switch (message.command) {
                    case "modified":
                        pset.blockOnChangeText = true;      // Block to call onDidChangeTextDocument during updating
                        const originalXml = parseXml(pset.text);
                        const fixedXml =  message.data as XmlElementNop;
                        const unit = config.get<string>("indentStyle") === "tab" ? "\t" : " ".repeat(optionOf(config.get<number>("indentSize")).getOrElse(4));
                        const eol = pset.editor.document.eol === vscode.EndOfLine.LF ? "\n" : "\r\n";
                        const xmldiff = xmlSerialDiff(originalXml, fixedXml, {indent: {unit, level: 0, eol}});
                        await pset.editor.edit(editBuilder => {
                            patchByXmlDiff(pset.text, xmldiff, editBuilder);
                        });
                        pset.text = pset.editor.document.getText();
                        pset.blockOnChangeText = false;
                        return;
                    case "svg-request":
                        pset.panel.webview.postMessage({
                            command: "modified",
                            data: parseSvg(pset.text, pset.editor, diagnostics)
                        });
                        pset.panel.webview.postMessage({
                            command: "configuration",
                            data: {
                                defaultUnit: config.get<string | null>("defaultUnit"),
                                decimalPlaces: config.get<number>("decimalPlaces"),
                                collectTransform: config.get<boolean>("collectTransformMatrix"),
                                useStyleAttribute: config.get<boolean>("useStyleAttribute"),
                                indentStyle: config.get<string>("indentStyle"),
                                indentSize: config.get<number>("indentSize")
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
            } catch (e) {
                showError(e);
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
        if (panelSet && panelSet.editor.document === e.document && !panelSet.blockOnChangeText && panelSet.text !== e.document.getText()) {
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
    const xml = parseXml(svgText);
    if (xml === null) return null;
    const parsed = parse(xml);
    diagnostics.set(editor.document.uri, parsed.warns.map(warn => {
        return {
            source: "svgeditor",
            message: warn.message,
            range: intervalToRange(svgText, warn.interval),
            severity: vscode.DiagnosticSeverity.Warning
        };
    }));
    return parsed.result;
}

function parseXml(xmlText: string): XmlElement | null {
    const xml = textToXml(xmlText);
    return xml && trimXml(xml);
}

function xmlSerialDiff(left: XmlElement | null, right: XmlElementNop, options: LinearOptions): XmlDiff[] {
    if (left === null) return [];
    const leftNop = trimPositions(left);
    const diff = jsondiffForXml(leftNop, right);
    if (diff === undefined) return [];
    return xmlJsonDiffToStringDiff(left, diff, options);
}

export function intervalToRange(text: string, interval: Interval): vscode.Range {
    const lines1 = text.slice(0, interval.start).split(/\r?\n/);
    const lines2 = text.slice(0, interval.end).split(/\r?\n/);
    const startLine = lines1.length - 1;
    const endLine = lines2.length - 1;
    const startColumn = lines1[startLine].length;
    const endColumn = lines2[endLine].length;
    return new vscode.Range(startLine, startColumn, endLine, endColumn);
}

export function charposToPosition(text: string, pos: number): vscode.Position {
    const lines = text.slice(0, pos).split(/\r?\n/);
    const line = lines.length - 1;
    const column = lines[line].length;
    return new vscode.Position(line, column);
}

function setWebviewActiveContext(value: boolean) {
    vscode.commands.executeCommand('setContext', "svgeditorWebviewFocus", value);
}

export async function newUntitled(viewColumn: vscode.ViewColumn, content: string) {
    const config = vscode.workspace.getConfiguration("svgeditor");
    const document = await vscode.workspace.openTextDocument({language: config.get<string>("filenameExtension"), content});
    return vscode.window.showTextDocument(document, viewColumn);
}

export function patchByXmlDiff(originalText: string, diffArray: XmlDiff[], editBuilder: vscode.TextEditorEdit) {
    for (let diff of diffArray) {
        switch (diff.type) {
            case "add":
            editBuilder.insert(charposToPosition(originalText, diff.pos), diff.value);
            break;
            case "delete":
            editBuilder.delete(intervalToRange(originalText, diff.interval));
            break;
            case "modify":
            editBuilder.replace(intervalToRange(originalText, diff.interval), diff.value);
            break;
            default:
            assertNever(diff);
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
