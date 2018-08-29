import ast from "assert";
import { readTtfName } from "../src/readTrueTypeFont";
const assert = ast.strict;

describe("readTrueTypeFont", () => {
    it("readTtfName", async () => {
        const name = await readTtfName("./test/Roboto-Regular.ttf");
        assert.strictEqual(name[1], "Roboto");
        assert.strictEqual(name[2], "Regular");
    });
});
