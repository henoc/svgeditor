import { svgPathManager } from "../src/pathHelpers";
import ast from "assert";
import { deepCopy } from "../src/utils";
const assert = ast.strict;

describe("SvgPathManager", () => {

    let rectPath: ReturnType<typeof svgPathManager>
    let relavtiveRectPath: ReturnType<typeof svgPathManager>
    let decimalPath: ReturnType<typeof svgPathManager>

    beforeEach(() => {
        rectPath = svgPathManager("M 0 0 H 10 V 10 H 0 Z");
        relavtiveRectPath = svgPathManager(deepCopy(rectPath.segments)).rel();
        decimalPath = svgPathManager("M 13 6 l -1.5 1.3 h 2.4 l -2 2 h -4 v -4 l 2 -2 v 2.7 l 1.8 -1.5 z");
    });

    it("parse", () => {
        const result = rectPath.segments;
        assert.deepStrictEqual(
            result,
            [
                ["M", 0, 0],
                ["H", 10],
                ["V", 10],
                ["H", 0],
                ["Z"]
            ]
        );

        const result2 = decimalPath.segments;
        assert.deepStrictEqual(
            result2,
            [
                ["M", 13, 6],
                ["l", -1.5, 1.3],
                ["h", 2.4],
                ["l", -2, 2],
                ["h", -4],
                ["v", -4],
                ["l", 2, -2],
                ["v", 2.7],
                ["l", 1.8, -1.5],
                ["z"]
            ]
        )
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