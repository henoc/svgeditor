import { uri, urlNormalizeRequest, callbacks, sendErrorMessage, informationRequest, refleshContent, imageList } from "./main";
import { ParsedElement } from "../isomorphism/svgParser";
import uuidStatic from "uuid";
import { traverse } from "../isomorphism/traverse";

export interface LoadedImage {
    url: string;
    width: number;
    height: number;
}

/**
 * Start loading all images.
 */
export async function collectImages(pe: ParsedElement, acc: {[href: string]: LoadedImage}): Promise<void> {
    traverse(pe, async (pe, parentPe, index) => {
        if (pe.tag === "image") {
            let href: string | null;
            let url: string | null;
            if ((href = pe.attrs.href) && !(href in acc) && (url = await absoluteUrl(href))) {
                const tmp = await loadImage(url)
                if (tmp) acc[href] = tmp;
            } else if ((href = pe.attrs["xlink:href"]) && !(href in acc) && (url = await absoluteUrl(href))) {
                const tmp = await loadImage(url);
                if (tmp) acc[href] = tmp;
            }
        }
    });
}

/**
 *  `file:` protocol will be replaced with `vscode-resource:`.
 */
function absoluteUrl(urlFragment: string): Promise<string | null> {
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
    try {
        const image = new Image();
        await imageOnloadPromise(url, image);
        return {width: image.width, height: image.height, url: url};
    } catch (_err) {
        // not found image or out of workspace directories.
        sendErrorMessage(`Failed to load image: \`${url}\` ${url.startsWith("vscode") ? "hint: WebView can only access workscape or extension directories and subdirectories." : ""}`);
        return null;
    }
}

function imageOnloadPromise(src: string, image: HTMLImageElement) {
    return new Promise<Event>((resolve, _reject) => {
        image.onload = (event: Event) => {
            resolve(event);
        }
        image.src = src;
    });
}
