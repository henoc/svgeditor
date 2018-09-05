import urlParse from "url-parse";
import { uri } from "./main";
import memoize from "fast-memoize";
import { ParsedElement } from "./domParser";
import { traverse } from "./svgConstructor";

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
            if ((href = pe.attrs.href) && (url = absoluteUrl(href, baseUrl))) {
                const tmp = await loadImage(url)
                if (tmp) acc[href] = tmp;
            } else if ((href = pe.attrs["xlink:href"]) && (url = absoluteUrl(href, baseUrl))) {
                const tmp = await loadImage(url);
                if (tmp) acc[href] = tmp;
            }
        }
    });
}

function absoluteUrl(urlFragment: string, baseUrl: string): string | null {
    const url = urlParse(urlFragment, baseUrl);
    if (url.protocol) {
        if (url.protocol === "file:") {
            url.set("protocol", "vscode-resource:");
            url.set("slashes", <any>false);
        }
        return url.toString();
    } else {
        return null;
    }
}

/**
 * Load image from URL. `file:` protocol will try to replace with `vscode-resource:`.
 */
async function loadImage(url: string): Promise<LoadedImage | null> {
    const response = await fetch(url).catch(err => null);
    if (response) {
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
