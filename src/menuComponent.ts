import {Component} from "./component";
import { elementOpen, text, elementClose } from "incremental-dom";
import { editMode, refleshContent, inputRequest, sendBackToEditor } from "./main";
import { SelectMode } from "./selectMode";
import { NodeMode } from "./nodeMode";
import { RectMode } from "./rectMode";
import { EllipseMode } from "./ellipseMode";
import { PolylineMode } from "./polylineMode";
import { PathMode } from "./pathMode";
import { assertNever, el, iterate } from "./utils";

export type ModeName = "select" | "node" | "rect" | "ellipse" | "polyline" | "path" | "text";
export type OperatorName = "duplicate" | "delete" | "scale-up" | "scale-down" | "group" | "ungroup" | "font" | "bring forward" | "send backward" |
    "align left" | "align right" | "align bottom" | "align top" | "object to path";

class MenuComponent implements Component {

    constructor(public name: ModeName, public modeChangeHandler: (name: ModeName) => void, public isSelected: boolean = false) {
    }

    render() {
        const classes = ["svgeditor-menu", ...(this.isSelected ? ["svgeditor-selected"] : [])].join(" ");
        el`li :key=${this.name} *id=${`svgeditor-menu-${this.name}`} *onclick=${() => this.changeMode(this.name)} class=${classes}`;
        text(this.name);
        el`/li`;
    }

    changeMode(name: ModeName, initialUuid?: string) {
        switch (name) {
            case "select":
            editMode.mode = new SelectMode(initialUuid);
            break;
            case "node":
            editMode.mode = new NodeMode(initialUuid);
            break;
            case "rect":
            editMode.mode = new RectMode((uu: string | null) => this.changeMode("select", uu || undefined));
            break;
            case "ellipse":
            editMode.mode = new EllipseMode((uu: string | null) => this.changeMode("select", uu || undefined));
            break;
            case "polyline":
            editMode.mode = new PolylineMode((uu: string | null) => this.changeMode("node", uu || undefined));
            break;
            case "path":
            editMode.mode = new PathMode((uu: string | null) => this.changeMode("node", uu || undefined));
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

class OperatorComponent implements Component {
    constructor(public name: OperatorName) {}

    render() {
        el`li :key=${this.name} *class="svgeditor-operator" *onclick=${(event: Event) => editMode.mode.onOperatorClicked(event, this.name)}`;
        text(this.name);
        el`/li`;
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

    operatorComponents: Record<OperatorName, OperatorComponent> = {
        duplicate: new OperatorComponent("duplicate"),
        delete: new OperatorComponent("delete"),
        "scale-up": new OperatorComponent("scale-up"),
        "scale-down": new OperatorComponent("scale-down"),
        group: new OperatorComponent("group"),
        ungroup: new OperatorComponent("ungroup"),
        font: new OperatorComponent("font"),
        "bring forward": new OperatorComponent("bring forward"),
        "send backward": new OperatorComponent("send backward"),
        "align left": new OperatorComponent("align left"),
        "align right" :new OperatorComponent("align right"),
        "align top" : new OperatorComponent("align top"),
        "align bottom": new OperatorComponent("align bottom"),
        "object to path": new OperatorComponent("object to path")
    }
    

    render() {
        el`ul`;
        iterate(this.menuComponents, (_key, menuComponent) => {
            menuComponent.render();
        });
        el`/ul`;
        el`ul`;
        iterate(this.operatorComponents, (_key, operator) => {
            operator.render();
        });
        el`/ul`;
    }

    changeSelectedMode(mode: ModeName) {
        iterate(this.menuComponents, (key, menuComponent) => {
            menuComponent.isSelected = key === mode;
        });
    }
}

