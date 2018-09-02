import { el } from "./utils";
import { text } from "incremental-dom";

export interface Component {
    render(): void;
}

export interface WindowComponent extends Component {
    onClose(): void;
}

export class ButtonComponent implements Component {
    constructor(public name: string, public key: string, public onclick: () => void) {}

    render() {
        el`div :key=${this.key} *class="svgeditor-button" onclick=${this.onclick}`;
        text(this.name);
        el`/div`;
    }
}

export function iconComponent(title: string, href: string, onclick: (event: Event) => void) {
    el`div *title=${title} style="display: inline-block"`;
        el`svg *class="svgeditor-icon" *width="20px" *height="20px" onclick=${onclick}`;
            el`use xlink:href=${href} /`;
        el`/svg`;
    el`/div`;
}
