import { diffProcedure } from "../src/extension";
import { diffChars } from "diff";
import { TextEditorEdit, Position, Range, Selection, EndOfLine } from "vscode";
import * as assert from 'assert';

class TextEditorEditLogger implements TextEditorEdit {
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
    it("diffProcedure", () => {
        const diffs = diffChars("abcdefghi", "abqdefghi");
        const logger = new TextEditorEditLogger();
        diffProcedure(diffs, logger);
        assert.deepStrictEqual(logger.log, [
            {operation: "delete", location: new Range(0, 2, 0, 3), value: ""},
            {operation: "insert", location: new Position(0, 2), value: "q"}
        ]);
    });
});