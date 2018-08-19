import { Transform, TransformDescriptor } from "./domParser";
import { assertNever, iterate } from "./utils";
import { transform, rotateDEG, scale, skew, translate, identity } from "transformation-matrix";

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

/**
 * Replace last descriptor of transform if it is margeable exclude the last one is matrix type and new descriptor is other type, else push it to last.
 */
export function replaceLastDescriptor(transformAttribute: Transform, descriptor: TransformDescriptor): void {
    const lastIndex = transformAttribute.descriptors.length - 1;
    if (transformAttribute.descriptors.length === 0) {
        transformAttribute.descriptors.push(descriptor);
        transformAttribute.matrices.push(descriptorToMatrix(descriptor));
    } else {
        if (merge(transformAttribute.descriptors[lastIndex], descriptor, false)) {
            transformAttribute.descriptors[lastIndex] = descriptor;
            transformAttribute.matrices[lastIndex] = descriptorToMatrix(descriptor);
        } else {
            transformAttribute.descriptors.push(descriptor);
            transformAttribute.matrices.push(descriptorToMatrix(descriptor));
        }
    }
}

export function appendDescriptor(transformAttribute: Transform, descriptor: TransformDescriptor): void {
    const lastIndex = transformAttribute.descriptors.length - 1;
    if (transformAttribute.descriptors.length === 0) {
        transformAttribute.descriptors.push(descriptor);
        transformAttribute.matrices.push(descriptorToMatrix(descriptor));
    } else {
        let merged = merge(transformAttribute.descriptors[lastIndex], descriptor);
        if (merged) {
            transformAttribute.descriptors[lastIndex] = merged;
            transformAttribute.matrices[lastIndex] = descriptorToMatrix(merged);
        } else {
            transformAttribute.descriptors.push(descriptor);
            transformAttribute.matrices.push(descriptorToMatrix(descriptor));
        }
    }
}

/**
 * Merge right descriptor to left one if possible (not so smart).
 */
export function merge(left: TransformDescriptor, right: TransformDescriptor, alwaysMergeIfLeftIsMatrix: boolean = true): false | TransformDescriptor {
    if (left.type === "matrix" && alwaysMergeIfLeftIsMatrix) {
        return { type: "matrix", ...transform(left, descriptorToMatrix(right))};
    } else if (left.type === right.type) {
        switch (left.type) {
            case "rotate":
            if (right.type === "rotate" /* for type inference */ && left.cx === right.cx && left.cy === right.cy) {
                return {type: "rotate", angle: left.angle + right.angle, cx: left.cx, cy: left.cy};
            } else {
                return false;
            }
            case "scale":
            return right.type === "scale" && {type: "scale", sx: left.sx * right.sx, sy: left.sy !== undefined && right.sy !== undefined && left.sy * right.sy || undefined};
            case "skewX":
            return right.type === "skewX" && {type: "skewX", angle: Math.atan(Math.tan(left.angle * Math.PI / 180) + Math.tan(right.angle * Math.PI / 180))};
            case "skewY":
            return right.type === "skewY" && {type: "skewY", angle: Math.atan(Math.tan(left.angle * Math.PI / 180) + Math.tan(right.angle * Math.PI / 180))};
            case "translate":
            return right.type === "translate" && {type: "translate", tx: left.tx + right.tx, ty: left.ty !== undefined && right.ty !== undefined && left.ty + right.ty || undefined};
            case "matrix":
            return {type: "matrix", ...transform(left, descriptorToMatrix(right))};
            default:
            assertNever(left);
        }
    } else {
        return false;
    }
    return false;
}

export function descriptorToMatrix(descriptor: TransformDescriptor): Matrix {
    switch (descriptor.type) {
        case "matrix":
        return descriptor;
        case "rotate":
        return rotateDEG(descriptor.angle, descriptor.cx, descriptor.cy);
        case "scale":
        return scale(descriptor.sx, descriptor.sy);
        case "skewX":
        return skew(descriptor.angle * Math.PI / 180, 0);
        case "skewY":
        return skew(0, descriptor.angle * Math.PI / 180);
        case "translate":
        return translate(descriptor.tx, descriptor.ty);
    }
}

export function equals(p: Matrix, q: Matrix): boolean {
    iterate(p, (key) => {
        if (p[key] !== q[key]) return false;
    });
    return true;
}
