'use strict';

import * as vscode from 'vscode';
import * as fs from "fs";
import * as path from "path";

export function activate(context: vscode.ExtensionContext) {

	let previewUri = vscode.Uri.parse('svgeditor://authority/svgeditor');
	let readFilesInPreview = 
		(filename: string) => fs.readFileSync(path.join(__dirname, "preview", filename), "UTF-8");
	let insertJs = {
		hand: ["utils.js", "affine.js", "svgutils.js", "common.js", "handMode.js"]
		.map(x => readFilesInPreview(x))
		.join("\n"),
		rectangle: ["utils.js", "affine.js", "svgutils.js", "common.js", "rectangleMode.js"].map(x => readFilesInPreview(x))
		.join("\n")
	};
		
	let insertCss = fs.readFileSync(path.join(__dirname, "..", "src", "preview", "svgeditor.css"), "UTF-8");
	let viewer = fs.readFileSync(path.join(__dirname, "..", "src", "preview", "viewer.html"), "UTF-8");

	let editMode: "hand" | "rectangle" = "hand";

	class TextDocumentContentProvider implements vscode.TextDocumentContentProvider {
		public editor: vscode.TextEditor | undefined;
		private _onDidChange = new vscode.EventEmitter<vscode.Uri>();

		public provideTextDocumentContent(uri: vscode.Uri): string {
			return this.createCssSnippet();
		}

		get onDidChange(): vscode.Event<vscode.Uri> {
			return this._onDidChange.event;
		}

		public update(uri: vscode.Uri) {
			this._onDidChange.fire(uri);
		}

		private createCssSnippet(): string {
			if(this.editor === undefined) this.editor = vscode.window.activeTextEditor;
			const svg = this.editor.document.getText();
			const js = insertJs[editMode];
			const css = insertCss;
			const insertItems = {svg: svg, js: js, css: css};
			return viewer.replace(/(<!--|\/\*)\s*\$\{([a-zA-Z]+)\}\s*(-->|\*\/)/g, (all, p1, p2, p3) => insertItems[p2]);
		}
	}

	let disposables: vscode.Disposable[] = []

	let provider = new TextDocumentContentProvider();
	let registration = vscode.workspace.registerTextDocumentContentProvider('svgeditor', provider);
	disposables.push(registration);

	vscode.workspace.onDidChangeTextDocument((e: vscode.TextDocumentChangeEvent) => {
		if (e.document === vscode.window.activeTextEditor.document) {
			provider.update(previewUri);
		}
	});

	disposables.push(vscode.commands.registerCommand('extension.openSvgEditor', () => {
		return vscode.commands.executeCommand('vscode.previewHtml', previewUri, vscode.ViewColumn.Two, 'SVG Editor').then((success) => {
		}, (reason) => {
			vscode.window.showErrorMessage(reason);
		});
	}));
	vscode.commands.registerCommand("extension.handMode", () => {
		editMode = "hand";
		provider.update(previewUri);
	});
	vscode.commands.registerCommand("extension.rectangleMode", () => {
		editMode = "rectangle";
		provider.update(previewUri);
	});
	
	context.subscriptions.push(...disposables);

	/**
	 * Call only by previewer
	 */
	vscode.commands.registerCommand("extension.reflectToEditor", (text: string) => {
		provider.editor.edit(editbuilder => {
			editbuilder.replace(allRange(provider.editor), text);
		});
	});

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
