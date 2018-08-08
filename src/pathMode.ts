import { svgVirtualMap, drawState, refleshContent } from "./main";
import uuidStatic from "uuid";
import { ParsedElement } from "./domParser";
import { v } from "./utils";

let isDragging: boolean = false;
let makeTargetUuid: string | null = null;

export function onShapeMouseDown(event: MouseEvent, uu: string, finished: () => void) {
    if (svgVirtualMap[uu].isRoot) {
        let [cx, cy] = [event.offsetX, event.offsetY];
        const root = svgVirtualMap[uu];
        event.stopPropagation();
        isDragging = true;
        if (root.tag === "svg") {
            if (makeTargetUuid === null) {
                makeTargetUuid = uuidStatic.v4();
                const pe: ParsedElement = {
                    uuid: makeTargetUuid,
                    isRoot: false,
                    tag: "path",
                    attrs: {
                        d: [
                            ["M", cx, cy],
                            ["S",
                                /* end ctrl point */ cx, cy,
                                /* end point */ cx, cy
                            ]
                        ],
                        fill: drawState.fill,
                        stroke: drawState.stroke,
                        class: null,
                        id: null,
                        unknown: {}
                    }
                };
                root.children.push(pe);
                refleshContent();
            } else {
                const pe = svgVirtualMap[makeTargetUuid];
                if (pe.tag === "path" && pe.attrs.d) {
                    if (event.button === 0) {
                        // insert new S command in second of the d
                        pe.attrs.d.splice(1, 0, ["S", cx, cy, cx, cy]);
                    } else if (event.button === 2) {
                        // delete second S command and modify new second S command to C command if exists
                        const secondS = 1;
                        const secondSEndCtrl = v(pe.attrs.d[secondS][1], pe.attrs.d[secondS][2]);
                        const secondSEnd = v(pe.attrs.d[secondS][3], pe.attrs.d[secondS][4]);
                        const newCStartCtrl = secondSEndCtrl.symmetry(secondSEnd);
                        pe.attrs.d.splice(1, 1);
                        if (pe.attrs.d.length <= 1) {
                            root.children.pop();
                        } else {
                            const [preCmdName, ...preArgs] = pe.attrs.d[1];
                            pe.attrs.d[1] = ["C", newCStartCtrl.x, newCStartCtrl.y, ...preArgs];
                            pe.attrs.d[0] = ["M", secondSEnd.x, secondSEnd.y];
                        }
                        makeTargetUuid = null;
                        finished();
                    }
                    refleshContent();
                }
            }
        }
    }
}

export function onDocumentMouseMove(event: MouseEvent) {
    const [cx, cy] = [event.offsetX, event.offsetY];
    if (makeTargetUuid) {
        const pe = svgVirtualMap[makeTargetUuid];
        if (pe.tag === "path" && pe.attrs.d) {
            const topM = 0;
            const secondS = 1;
            if (isDragging) {
                // modify M and second S command args (end ctrl point) while dragging
                pe.attrs.d[topM][1] = cx;
                pe.attrs.d[topM][2] = cy;
                pe.attrs.d[secondS][1] = cx;
                pe.attrs.d[secondS][2] = cy;
            } else {
                // modify M while dragging
                pe.attrs.d[topM][1] = cx;
                pe.attrs.d[topM][2] = cy;
            }
            refleshContent();
        }
    }
}

export function onDocumentMouseUp(event: MouseEvent) {
    isDragging = false;
}

export function breakaway() {

}