'use strict';

import * as vscode from 'vscode';
import * as fs from "fs";
import * as path from "path";
import {render} from "ejs";

export function activate(context: vscode.ExtensionContext) {

	let previewUri = vscode.Uri.parse('svgeditor://authority/svgeditor');
	let readResource = 
		(filename: string) => fs.readFileSync(path.join(__dirname, "..", "resources", filename), "UTF-8");
	let insertJs = {
		hand: readResource("handMode_bundle.js"),
		rectangle: readResource("rectangleMode_bundle.js")
	};
		
	let insertCss = readResource("svgeditor.css");
	let viewer = readResource("viewer.ejs");

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
			const html = render(viewer, {
				svg: svg,
				js: js,
				css: css
			});
			fs.writeFileSync(path.join(__dirname, "..", "log", "log.html"), html);
			return html;
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
