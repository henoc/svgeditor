import memoize from "fast-memoize";

// function restoreCss<T extends keyof CSSStyleDeclaration>(className: string, pseudoElt: string | null, ...styleNames: T[]): Record<T, string> {
//     const div = document.createElement("div");
//     div.style.position = "absolute";
//     div.style.zIndex = "-2147483648";
//     div.style.left = "0";
//     div.style.top = "0";
//     div.style.visibility = "hidden";
//     div.style.width = "1px";
//     div.classList.add(className);
//     document.body.insertAdjacentElement("beforeend", div);
//     const computed = getComputedStyle(div, pseudoElt);
//     const retObject: {[key: string]: string} = {};
//     for (let sname of styleNames) {
//         retObject[sname] = computed[sname];
//     }
//     document.body.removeChild(div);
//     return <Record<T, string>>retObject;
// }

function restoreCssVariable(name: string) {
    const div = document.createElement("div");
    div.style.position = "absolute";
    div.style.zIndex = "-2147483648";
    div.style.left = "0";
    div.style.top = "0";
    div.style.visibility = "hidden";
    div.style.width = "1px";
    document.body.insertAdjacentElement("beforeend", div);
    const computed = getComputedStyle(div);
    const variableValue = computed.getPropertyValue(name);
    document.body.removeChild(div);
    return variableValue;
}

/**
 * Enable to get CSS variables inherited from VSCode.
 */
export const cssVar = memoize(restoreCssVariable);
