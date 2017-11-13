export function displayContextmenu(ev: MouseEvent, display: boolean) {
  let menu = document.getElementById("svgeditor-contextmenu")!;
  let posX = ev.pageX;
  let posY = ev.pageY;
  menu.style.left = posX + "px";
  menu.style.top = posY + "px";
  menu.style.display = display ? null : "none";
}
