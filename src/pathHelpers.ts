import SvgPath from "svgpath";
import {PathCommand} from "./domParser";
import { Vec2, v, deepCopy } from "./utils";

/**
 * SvgPath wrapper class
 */
class SvgPathManager {

    public svgpath: typeof SvgPath;

    constructor(path: string | PathCommand[]) {
        this.svgpath = new SvgPath(typeof path === "string" && path || "");
        // @ts-ignore
        if (Array.isArray(path)) this.svgpath.segments = path;
    }

    get segments(): PathCommand[] {
        // @ts-ignore
        return this.svgpath.segments;
    }

    set segments(segs: PathCommand[]) {
        // @ts-ignore
        this.svgpath.segments = segs;
    }

    get err(): string {
        // @ts-ignore
        return this.svgpath.err;
    }

    evaluateStack(): this {
        // @ts-ignore
        this.svgpath.__evaluateStack();
        return this;
    }

    proceed(fn: (svgpath: typeof SvgPath) => void): this {
        fn(this.svgpath);
        return this;
    }

    /**
     * Iterate function saving relative/absolute coordinate system. (`segment` is given as absolute)
     */
    safeIterate(iter: (segment: PathCommand, index: number, startPos: Vec2) => PathCommand | void): this {
        const isRelative = this.segments.map(s => s[0] === s[0].toLowerCase());
        this.svgpath.abs()
            .iterate((s, i, x, y) => {
                const ret = iter(<any>s, i , v(x, y));
                // resolve with library bug(?)
                if (ret) {
                    s.length = ret.length;
                    for (let j = 0; j < s.length; j++) {
                        s[j] = ret[j];
                    }
                }
            }).iterate((s, i, x, y) => {
                if (isRelative[i]) {
                    s[0] = s[0].toLowerCase();
                    /* "a" rx ry angle large-arc-flag sweep-flag dx dy */
                    if (s[0] === "a") {
                        s[6] -= x;
                        s[7] -= y;
                    } else if (s[0] === "v") {
                        s[1] -= y;
                    } else if (s[0] === "h") {
                        s[1] -= x;
                    } else {
                        for (let j = 1; j < s.length; j+=2) {
                            s[j] -= x;
                            s[j+1] -= y;
                        }
                    }
                }
            });
        return this;
    }

    unvh(): this {
        this.safeIterate((s, i, p) => {
            if (s[0] === "V") return ["L", p.x, s[1]];
            if (s[0] === "H") return ["L", s[1], p.y];
        });
        return this;
    }

    rel(): this {
        // @ts-ignore
        this.svgpath.rel();
        return this;
    }

    getVertexes(): Vec2[] {
        const clone = svgPathManager(deepCopy(this.segments)).unvh().proceed(p => p.unshort().unarc());
        const acc: Vec2[] = [];
        clone.safeIterate(([s, ...t]) => {
            for (let i = 0; i < t.length; i += 2) {
                acc.push(v(t[i], t[i+1]));
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

export function svgPathManager(path: string | PathCommand[]) {
    return new SvgPathManager(path);
}

