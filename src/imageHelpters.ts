import urlParse from "url-parse";
import { uri, urlNormalizeRequest, callbacks, sendErrorMessage, informationRequest, refleshContent } from "./main";
import memoize from "fast-memoize";
import { ParsedElement } from "./domParser";
import { traverse } from "./svgConstructor";
import uuidStatic from "uuid";

export interface LoadedImage {
    objectUrl: string;
    width: number;
    height: number;
}

/**
 * Start loading all images.
 */
export async function collectImages(pe: ParsedElement, baseUrl: string, acc: {[href: string]: LoadedImage}): Promise<void> {
    traverse(pe, async (pe, parentPe, index) => {
        if (pe.tag === "image") {
            let href: string | null;
            let url: string | null;
            if ((href = pe.attrs.href) && !(href in acc) && (url = await absoluteUrl(href, baseUrl))) {
                const tmp = await loadImage(url)
                if (tmp) acc[href] = tmp;
            } else if ((href = pe.attrs["xlink:href"]) && !(href in acc) && (url = await absoluteUrl(href, baseUrl))) {
                const tmp = await loadImage(url);
                if (tmp) acc[href] = tmp;
            }
        }
    });
}

/**
 *  `file:` protocol will be replaced with `vscode-resource:`.
 */
function absoluteUrl(urlFragment: string, baseUrl: string): Promise<string | null> {
    return new Promise((resolve, _reject) => {
        const uuid = uuidStatic.v4();
        callbacks[uuid] = function(normalized: string | null) {
            resolve(normalized);
        }
        urlNormalizeRequest(urlFragment, uuid);
    });
}

/**
 * Load image from URL.
 */
async function loadImage(url: string): Promise<LoadedImage | null> {
    const response = await fetch(url).catch(_err => {
        sendErrorMessage(`Failed to load image: \`${url}\` ${url.startsWith("vscode") ? "hint: WebView can only access workscape or extension directories and subdirectories." : ""}`);
    });
    if (response) {
        informationRequest(`Succeed to load image: \`${url}\``);
        const blob = await response.blob();
        const objectUrl = URL.createObjectURL(blob);
        const image = new Image();
        await imageOnloadPromise(objectUrl, image);
        return {width: image.width, height: image.height, objectUrl};
    }
    // not found image or out of workspace directories.
    return null;
}

function imageOnloadPromise(src: string, image: HTMLImageElement) {
    return new Promise<Event>((resolve, _reject) => {
        image.onload = (event: Event) => {
            resolve(event);
        }
        image.src = src;
    });
}
