import { diffProcedure, newUntitled } from "../src/extension";
import { diffChars } from "diff";
import { TextEditorEdit, Position, Range, Selection, EndOfLine, ViewColumn } from "vscode";
import * as assert from 'assert';

class TextEditorEditMock implements TextEditorEdit {
    log: {operation: "replace"|"insert"|"delete", location: Position | Range | Selection, value: string}[] = [];
    replace(location: Position | Range | Selection, value: string): void {
        this.log.push({operation: "replace", location, value});
    }
    insert(location: Position, value: string): void {
        this.log.push({operation: "insert", location, value});
    }
    delete(location: Range | Selection): void {
        this.log.push({operation: "delete", location, value: ""});
    }
    setEndOfLine(endOfLine: EndOfLine): void {
        throw new Error("Method not implemented.");
    }
}

describe("extension", () => {

    async function doDiffProcesure() {
        const diffs = diffChars("abcdefghi", "abqdefghi");
        const mock = new TextEditorEditMock();
        diffProcedure(diffs, mock);
        assert.deepStrictEqual(mock.log, [
            {operation: "delete", location: new Range(0, 2, 0, 3), value: ""},
            {operation: "insert", location: new Position(0, 2), value: "q"}
        ]);

        const textEditor = await newUntitled(ViewColumn.One, "abcdefghi");
        await textEditor.edit(editBuilder => diffProcedure(diffs, editBuilder));
        assert.strictEqual(textEditor.document.getText(), "abqdefghi");
    }

    it("diffProcedure", (done) => {
        doDiffProcesure().then(done).catch(done);
    });
});
