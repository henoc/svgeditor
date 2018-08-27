import process from "process";
import path from "path";
import fs from "fs";
import {load} from "opentype.js";
import memoize from "fast-memoize";

export const systemFonts = memoize(collectSystemFonts);

/**
 * Collect system fonts!
 * @param dirs User specified directory paths
 */
export async function collectSystemFonts(dirs: string[] = []): Promise<{[family: string]: {[subFamily: string]: opentype.Font}}> {
    const paths = await collectSystemFontFilePaths(dirs);
    return Promise.all(paths.map(p => pload(p).catch(_ => null))).then(fonts => {
        const ret: {[p:string]:{[sub:string]: opentype.Font}} = {};
        for (let f of fonts) {
            if (f) {
                if (ret[f.names.fontFamily.en] === undefined) ret[f.names.fontFamily.en] = {};
                ret[f.names.fontFamily.en][f.names.fontSubfamily.en] = f;
            }
        }
        return ret;
    });
}

export async function collectSystemFontFilePaths(dirs: string[] = []): Promise<string[]> {
    const dirPaths: string[] = dirs;
    switch (process.platform) {
        case "darwin":
        if (process.env.HOME) dirPaths.push(path.join(process.env.HOME, "Library", "Fonts"));
        dirPaths.push(
            path.join("/", "Library", "Fonts"),
            path.join("/", "System", "Library", "Fonts")
        );
        break;
        case "win32":
        const windir = process.env.windir || process.env.WINDIR;
        if (windir) dirPaths.push(path.join(windir, "Fonts"));
        break;
        default:
        const home = process.env.HOME;
        if (home) {
            dirPaths.push(
                path.join(home, ".fonts"),
                path.join(home, ".local", "share", "fonts")
            );
        }
        dirPaths.push(
            path.join("/", "usr", "share", "fonts"),
            path.join("/", "usr", "local", "share", "fonts")
        );
    }

    return (await Promise.all(dirPaths.map(getFontFileNames))).reduce((p, c) => p.concat(c));
}

async function getFontFileNames(pathString: string): Promise<string[]> {
    try {
        const stats = await pstat(pathString);
        if (stats.isDirectory()) {
            const fileOrDirs = await preaddir(pathString);
            const fontFiles = await Promise.all(fileOrDirs.map(tail => getFontFileNames(path.join(pathString, tail))));
            return fontFiles.reduce((p, c) => p.concat(c));
        } else if (stats.isFile()) {
            const extname = path.extname(pathString).toLowerCase();
            if (extname === ".ttf" || extname === ".otf") return [pathString];
        }
    } catch (err) {
        // no file or directory exist.
    }
    return [];
}

function pstat(pathLike: fs.PathLike): Promise<fs.Stats> {
    return new Promise((resolve, reject) => {
        fs.stat(pathLike, (err, stats) => {
            if (err) {
                reject(err);
            } else {
                resolve(stats);
            }
        });
    });
}

function preaddir(pathLike: fs.PathLike): Promise<string[]> {
    return new Promise((resolve, reject) => {
        fs.readdir(pathLike, (err, files) => {
            if (err) {
                reject(err);
            } else {
                resolve(files);
            }
        });
    });
}

/**
 * Promise version of opentype.load
 */
function pload(url: string): Promise<opentype.Font> {
    return new Promise((resolve, reject) => {
        load(url, (err, font) => {
            if (err) {
                reject(err);
            } else {
                resolve(font!);
            }
        });
    });
}

