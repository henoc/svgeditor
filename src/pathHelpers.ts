import SvgPath from "svgpath";
import {PathCommand} from "./domParser";
import { Vec2, v } from "./utils";

class SvgPath2 extends SvgPath {
    // @ts-ignore
    readonly err: string = super.err;

    constructor(path: string) {
        super(path);
    }

    evaluateStack(): void {
        // @ts-ignore
        super.__evaluateStack();
    }

    get segments(): PathCommand[] {
        // @ts-ignore
        return super.segments;
    }

    set segments(pathCommands: PathCommand[]) {
        // @ts-ignore
        super.segments = pathCommands;
    }

    unvh(): this {
        this.iterate((s, i, x, y) => {
            const isRelative = s[0] === s[0].toLowerCase();
            switch (s[0]) {
                case "V":
                case "v":
                return [isRelative ? "l" : "L", isRelative ? 0 : x, s[1]];
                case "H":
                case "h":
                return [isRelative ? "l" : "L", s[1], isRelative ? 0 : y];
            }
        });
        return this;
    }

    getVertexes(): Vec2[] {
        this.unvh().abs().unshort().unarc();
        const acc: Vec2[] = [];
        this.iterate((s, i, x, y) => {
            for (let i = 1; i < s.length; i += 2) {
                acc.push(v(s[i], s[i+1]));
            }
        });
        return acc;
    }

    /**
     * No optimize version of toString.
     */
    toString(): string {
        this.evaluateStack();
        return this.segments.map(s => s.join(" ")).join(" ");
    }
}

export function svgpath2(path?: string): SvgPath2 {
    return new SvgPath2(path || "");
}

