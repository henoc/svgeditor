import {Component} from "./component";
import { elementOpen, text, elementClose } from "incremental-dom";
import { onMenuButtonClick } from "./triggers";

export type ModeName = "select" | "node" | "rect" | "ellipse" | "polyline" | "path";

class MenuComponent implements Component {

    constructor(public name: ModeName, public isSelected: boolean = false) {
    }

    render() {
        const cls = this.isSelected ? ["class", "svgeditor-selected"] : [];
        elementOpen("li", this.name, [
            "id", `svgeditor-menu-${this.name}`,
            "onclick", (event: MouseEvent) => onMenuButtonClick(event, this.name)
        ], ...cls);
        text(this.name);
        elementClose("li");
    }
}

export class MenuListComponent implements Component {

    select = new MenuComponent("select", true)
    node = new MenuComponent("node")
    rect = new MenuComponent("rect")
    ellipse = new MenuComponent("ellipse")
    polyline = new MenuComponent("polyline")
    path = new MenuComponent("path")

    render() {
        elementOpen("ul");
        this.select.render();
        this.node.render();
        this.rect.render();
        this.ellipse.render();
        this.polyline.render();
        this.path.render();
        elementClose("ul");
    }

    changeSelectedMode(mode: ModeName) {
        this.select.isSelected = false;
        this.node.isSelected = false;
        this.rect.isSelected = false;
        this.ellipse.isSelected = false;
        this.polyline.isSelected = false;
        this.path.isSelected = false;
        this[mode].isSelected = true;
    }
}

