import { svgPathManager } from "../src/pathHelpers";
import ast from "assert";
import { deepCopy } from "../src/utils";
const assert = ast.strict;

describe("SvgPathManager", () => {

    let rectPath: ReturnType<typeof svgPathManager>
    let relavtiveRectPath: ReturnType<typeof svgPathManager>

    beforeEach(() => {
        rectPath = svgPathManager("M 0 0 H 10 V 10 H 0 Z");
        relavtiveRectPath = svgPathManager(deepCopy(rectPath.segments)).rel();
    });

    it("parse", () => {
        const absResult = rectPath.segments;
        assert.deepStrictEqual(
            absResult,
            [
                ["M", 0, 0],
                ["H", 10],
                ["V", 10],
                ["H", 0],
                ["Z"]
            ]
        );
    });

    it("unvh", () => {
        const result = rectPath.unvh().segments;
        assert.deepStrictEqual(
            result,
            [
                ["M", 0, 0],
                ["L", 10, 0],
                ["L", 10, 10],
                ["L", 0, 10],
                ["Z"]
            ]
        )

        const result2 = relavtiveRectPath.unvh().segments;
        assert.deepStrictEqual(
            result2,
            [
                ["M", 0, 0],
                ["l", 10, 0],
                ["l", 0, 10],
                ["l", -10, 0],
                ["z"]
            ]
        )
    });

    it("getVertexes", () => {
        const result = rectPath.getVertexes().map(vec =>{return {x: vec.x, y: vec.y} });
        assert.deepStrictEqual(
            result,
            [
                {x: 0, y: 0},
                {x: 10, y: 0},
                {x: 10, y: 10},
                {x: 0, y: 10}
            ]
        )

        const result2 = relavtiveRectPath.getVertexes().map(vec =>{return {x: vec.x, y: vec.y} });
        assert.deepStrictEqual(
            result2,
            [
                {x: 0, y: 0},
                {x: 10, y: 0},
                {x: 10, y: 10},
                {x: 0, y: 10}
            ]
        )
    });
});