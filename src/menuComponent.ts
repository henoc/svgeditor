import {Component, iconComponent} from "./component";
import { elementOpen, text, elementClose } from "incremental-dom";
import { editMode, refleshContent, inputRequest, sendBackToEditor } from "./main";
import { SelectMode } from "./selectMode";
import { NodeMode } from "./nodeMode";
import { RectMode } from "./rectMode";
import { EllipseMode } from "./ellipseMode";
import { PolylineMode } from "./polylineMode";
import { PathMode } from "./pathMode";
import { assertNever, el, iterate } from "./utils";
import { ParsedElement } from "./domParser";

export type ModeName = "select" | "node" | "rect" | "ellipse" | "polyline" | "path" | "text";
export type OperatorName = "duplicate" | "delete" | "zoomIn" | "zoomOut" | "group" | "ungroup" | "font" | "bringForward" | "sendBackward" |
    "alignLeft" | "alignRight" | "alignBottom" | "alignTop" | "objectToPath" | "rotateClockwise" | "rotateCounterclockwise" | "rotateClockwiseByTheAngleStep" | "rotateCounterclockwiseByTheAngleStep" |
    "centerHorizontal" | "centerVertical";

export const operatorNames: OperatorName[] = ["duplicate" , "delete" , "zoomIn" , "zoomOut" , "group" , "ungroup" , "font" , "bringForward" , "sendBackward" ,
    "alignLeft" , "alignRight" , "alignBottom" , "alignTop" , "objectToPath", "rotateClockwise", "rotateCounterclockwise", "rotateClockwiseByTheAngleStep", "rotateCounterclockwiseByTheAngleStep",
    "centerVertical", "centerHorizontal"];

class MenuComponent implements Component {

    constructor(public name: ModeName, public modeChangeHandler: (name: ModeName) => void, public isSelected: boolean = false) {
    }

    render() {
        const classes = ["svgeditor-menu", ...(this.isSelected ? ["svgeditor-selected"] : [])].join(" ");
        el`li :key=${this.name} *id=${`svgeditor-menu-${this.name}`} *onclick=${() => this.changeMode(this.name)} class=${classes}`;
        text(this.name);
        el`/li`;
    }

    changeMode(name: ModeName, initial?: ParsedElement) {
        switch (name) {
            case "select":
            editMode.mode = new SelectMode(initial);
            break;
            case "node":
            editMode.mode = new NodeMode(initial);
            break;
            case "rect":
            editMode.mode = new RectMode((pe: ParsedElement | null) => this.changeMode("select", pe || undefined));
            break;
            case "ellipse":
            editMode.mode = new EllipseMode((pe: ParsedElement | null) => this.changeMode("select", pe || undefined));
            break;
            case "polyline":
            editMode.mode = new PolylineMode((pe: ParsedElement | null) => this.changeMode("node", pe || undefined));
            break;
            case "path":
            editMode.mode = new PathMode((pe: ParsedElement | null) => this.changeMode("node", pe || undefined));
            break;
            case "text":
            inputRequest("text");
            break;
            default:
            assertNever(name);
        }
        this.modeChangeHandler(name);
        refleshContent();
        sendBackToEditor();
    }
}

export class MenuListComponent implements Component {

    menuComponents: Record<ModeName, MenuComponent> = {
        select: new MenuComponent("select", (name) => this.changeSelectedMode(name), true),
        node: new MenuComponent("node", (name) => this.changeSelectedMode(name)),
        rect: new MenuComponent("rect", (name) => this.changeSelectedMode(name)),
        ellipse: new MenuComponent("ellipse", (name) => this.changeSelectedMode(name)),
        polyline: new MenuComponent("polyline", (name) => this.changeSelectedMode(name)),
        path: new MenuComponent("path", (name) => this.changeSelectedMode(name)),
        text: new MenuComponent("text", name => this.changeSelectedMode(name))
    }
    

    render() {
        el`ul`;
        iterate(this.menuComponents, (_key, menuComponent) => {
            menuComponent.render();
        });
        el`/ul`;
        el`ul`;
        for (let name of operatorNames) {
            if (name === "rotateClockwiseByTheAngleStep" || name === "rotateCounterclockwiseByTheAngleStep") continue;      // no icon operations
            iconComponent(name, `#svgeditor-icon-${name}`, (event: Event) => {
                event.stopPropagation();
                editMode.mode.onOperatorClicked(name);
            });
        }
        el`/ul`;
    }

    changeSelectedMode(mode: ModeName) {
        iterate(this.menuComponents, (key, menuComponent) => {
            menuComponent.isSelected = key === mode;
        });
    }
}

