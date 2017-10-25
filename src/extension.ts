/*---------------------------------------------------------
 * Copyright (C) Microsoft Corporation. All rights reserved.
 *--------------------------------------------------------*/
'use strict';

import * as vscode from 'vscode';
import * as fs from "fs";
import * as path from "path";

export function activate(context: vscode.ExtensionContext) {

	let previewUri = vscode.Uri.parse('css-preview://authority/css-preview');
	let insertJs = [
		fs.readFileSync(path.join(__dirname, "preview", "utils.js"), "UTF-8"),
		fs.readFileSync(path.join(__dirname, "preview", "svgutils.js"), "UTF-8"),
		fs.readFileSync(path.join(__dirname, "preview", "svgeditor.js"), "UTF-8")
	].join("\n");
	let insertCss = fs.readFileSync(path.join(__dirname, "..", "src", "preview", "svgeditor.css"), "UTF-8");

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
			this.editor = vscode.window.activeTextEditor;
			return this.snippet(this.editor.document);
		}

		private snippet(document: vscode.TextDocument): string {
			const svg = document.getText();
			const js = insertJs;
			const css = insertCss;
			return `
				<style type="text/css">
					${css}
				</style>
				<body>
					<div id="svgeditor-root">
						${svg}
					</div>
					<script type="text/javascript">
						${js}
					</script>
				</body>`;
		}
	}

	let provider = new TextDocumentContentProvider();
	let registration = vscode.workspace.registerTextDocumentContentProvider('css-preview', provider);

	vscode.workspace.onDidChangeTextDocument((e: vscode.TextDocumentChangeEvent) => {
		if (e.document === vscode.window.activeTextEditor.document) {
			provider.update(previewUri);
		}
	});

	// vscode.window.onDidChangeTextEditorSelection((e: vscode.TextEditorSelectionChangeEvent) => {
	// 	if (e.textEditor === vscode.window.activeTextEditor) {
	// 		provider.update(previewUri);
	// 	}
	// })

	let disposable = vscode.commands.registerCommand('extension.showCssPropertyPreview', () => {
		return vscode.commands.executeCommand('vscode.previewHtml', previewUri, vscode.ViewColumn.Two, 'CSS Property Preview').then((success) => {
		}, (reason) => {
			vscode.window.showErrorMessage(reason);
		});
	});

	/**
	 * Call only by previewer
	 */
	vscode.commands.registerCommand("extension.reflectToEditor", (text: string) => {
		provider.editor.edit(editbuilder => {
			editbuilder.replace(allRange(provider.editor), text);
		});
	});

	// let highlight = vscode.window.createTextEditorDecorationType({ backgroundColor: 'rgba(200,200,200,.35)' });

	// vscode.commands.registerCommand('extension.revealCssRule', (uri: vscode.Uri, propStart: number, propEnd: number) => {

	// 	for (let editor of vscode.window.visibleTextEditors) {
	// 		if (editor.document.uri.toString() === uri.toString()) {
	// 			let start = editor.document.positionAt(propStart);
	// 			let end = editor.document.positionAt(propEnd + 1);

	// 			editor.setDecorations(highlight, [new vscode.Range(start, end)]);
	// 			setTimeout(() => editor.setDecorations(highlight, []), 1500);
	// 		}
	// 	}
	// });

	context.subscriptions.push(disposable, registration);
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
