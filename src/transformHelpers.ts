import { Transform } from "./domParser";
import { assertNever } from "./utils";

/**
 * No collect matrices version.
 */
export function toTransformStrWithoutCollect(transform: Transform): string {
    const acc: string[] = [];
    for (let t of transform.descriptors) {
        switch (t.type) {
            case "matrix":
            acc.push(`matrix(${t.a},${t.b},${t.c},${t.d},${t.e},${t.f})`);
            break;
            case "rotate":
            acc.push(`rotate(${t.angle}${t.cx !== undefined && t.cy !== undefined && `,${t.cx},${t.cy}` || ""})`);
            break;
            case "scale":
            acc.push(`scale(${t.sx}${t.sy !== undefined && `,${t.sy}` || ""})`);
            break;
            case "skewX":
            acc.push(`skewX(${t.angle})`);
            break;
            case "skewY":
            acc.push(`skewY${t.angle})`);
            break;
            case "translate":
            acc.push(`translate(${t.tx}${t.ty !== undefined && `,${t.ty}` || ""})`);
            break;
            default:
            assertNever(t);
        }
    }
    return acc.join(" ");
}