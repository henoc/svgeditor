import { newUntitled, normalizeUrl, intervalToRange, patchByXmlDiff } from "../../src/node/extension";
import { diffChars } from "diff";
import { TextEditorEdit, Position, Range, Selection, EndOfLine, ViewColumn, Uri } from "vscode";
import * as assert from 'assert';
import { join, isAbsolute } from "path";
import { XmlDiff } from "../../src/isomorphism/xmlDiffPatch";

type Operation = {operation: "replace"|"insert"|"delete", location: Position | Range | Selection, value?: string};

class TextEditorEditMock implements TextEditorEdit {
    log: Operation[] = [];
    replace(location: Position | Range | Selection, value: string): void {
        this.log.push({operation: "replace", location, value});
    }
    insert(location: Position, value: string): void {
        this.log.push({operation: "insert", location, value});
    }
    delete(location: Range | Selection): void {
        this.log.push({operation: "delete", location});
    }
    setEndOfLine(endOfLine: EndOfLine): void {
        throw new Error("Method not implemented.");
    }
}

describe("extension", () => {

    describe("normalizeUrl", () => {
        it("relative path", () => {
            if (process.platform === "win32") {
                assert.strictEqual(
                    normalizeUrl("foo/bar", `file:///c%3A/Users/henoc/sample.svg`),
                    "vscode-resource:/c%3A/Users/henoc/foo/bar"
                );
            } else {
                assert.strictEqual(
                    normalizeUrl("foo/bar", `file:///home/henoc/sample.svg`),
                    "vscode-resource:/home/henoc/foo/bar"
                )
            }
        });

        it("absolute path", () => {
            if (process.platform === "win32") {
                assert.strictEqual(
                    normalizeUrl("C:\\foo\\bar", `file:///c%3A/Users/henoc/sample.svg`),
                    "vscode-resource:/c%3A/foo/bar"
                );
            } else {
                assert.strictEqual(
                    normalizeUrl("/foo/bar", `file:///home/henoc/sample.svg`),
                    "vscode-resource:/foo/bar"
                );
            }
        });

        it("absolute url", () => {
            if (process.platform === "win32") {
                assert.strictEqual(
                    normalizeUrl("https://google.co.jp", `file:///c%3A/Users/henoc`),
                    "https://google.co.jp/"
                );
            } else {
                assert.strictEqual(
                    normalizeUrl("https://google.co.jp", `file:///home/henoc/sample.svg`),
                    "https://google.co.jp/"
                );
            }
        })
    });

    it("intervalToRange", () => {
        const text = 
`<svg width="100" height="100" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">
    <circle stroke-width="3" fill="red" stroke="black" r="40" cx="50" cy="50"/>
</svg>`;
        assert.deepStrictEqual(intervalToRange(text, {start: 17, end: 148}), new Range(0, 17, 1, 39));
    });

    it("patchByXmlDiff", () => {
        const text =
`<svg width="100" height="100" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">
    <circle stroke-width="3" fill="red" stroke="black" cx="50" cy="50"/>
</svg>`;
        const diffArray: XmlDiff[] = [
            {type: "modify", interval: {start: 135, end: 136}, value: "5"},
            {type: "add", pos: 120, value: ` r="40"`},
            {type: "delete", interval: {start: 171, end: 179}}
        ];
        const mock = new TextEditorEditMock();
        patchByXmlDiff(text, diffArray, mock);
        assert.deepStrictEqual(mock.log, <Operation[]>[
            {operation: "replace", location: new Range(1, 26, 1, 27), value: "5"},
            {operation: "insert", location: new Position(1, 11), value: ` r="40"`},
            {operation: "delete", location: new Range(1, 62, 1, 70)}
        ]);
    });
});
