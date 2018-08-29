import * as assert from 'assert';
import { readTtfName } from "../src/readTrueTypeFont";
import * as process from "process";

describe("readTrueTypeFont", () => {
    it("readTtfName", async () => {
        const name = await readTtfName(`${process.env.WORKSPACE_ROOT}/test/Roboto-Regular.ttf`);
        assert.strictEqual(name[1], "Roboto");
        assert.strictEqual(name[2], "Regular");
    });
});
