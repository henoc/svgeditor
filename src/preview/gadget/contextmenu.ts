export interface ContextMenuOperator {
  name: string;
  callback: (ev: MouseEvent) => void;
}

export class ContextMenu {

  private _contextMenu: HTMLElement;

  constructor(public parentElement: HTMLElement) {
    this._contextMenu = document.createElement("div");
    this._contextMenu.id = "svgeditor-contextmenu";
    this._contextMenu.style.display = "none";
    parentElement.insertAdjacentElement("beforeend", this._contextMenu);
  }

  addMenuOperators(...ops: ContextMenuOperator[]) {
    for (let op of ops) {
      let operatorElement = document.createElement("div");
      operatorElement.addEventListener("click", ev => {
        op.callback(ev);
        this.display(ev, false);
      });
      operatorElement.classList.add("svgeditor-contextmenu-item");
      operatorElement.textContent = op.name;
      this._contextMenu.insertAdjacentElement("beforeend", operatorElement);
    }
  }

  display(ev: MouseEvent, b: boolean) {
    this._contextMenu.style.display = b ? null : "none";
    let posX = ev.pageX;
    let posY = ev.pageY;
    this._contextMenu.style.left = posX + "px";
    this._contextMenu.style.top = posY + "px";
  }

  clear() {
    while (this._contextMenu.children.length > 0) {
      this._contextMenu.children.item(0).remove();
    }
  }
}
