export function setTags(input: HTMLInputElement) {
  input.addEventListener("change", (ev) => {
    input.insertAdjacentHTML("beforebegin", `<span class="svgeditor-tags-item">${input.value} </span>`);
    input.value = "";
  });
  input.addEventListener("keydown", (ev: KeyboardEvent) => {
    let keycode = ev.keyCode;
    if (keycode === 8 && input.value === "") {
      let tags = document.getElementsByClassName("svgeditor-tags-item");
      tags.item(tags.length - 1).remove();
    }
  });
}

export function getValueOfTags(input: HTMLElement): string[] {
  let tags = document.getElementsByClassName("svgeditor-tags-item");
  let ret: string[] = [];
  for (let i = 0; i < tags.length; i++) {
    ret.push(tags.item(i).textContent!.trim());
  }
  return ret;
}

export function addValueOfTags(input: HTMLElement, ...values: string[]): void {
  values.forEach(value => {
    input.insertAdjacentHTML("beforebegin", `<span class="svgeditor-tags-item">${value} </span>`);
  });
}
