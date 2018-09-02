
/**
 * Return hash value only if `url` represents hash (ex. `acceptHashOnly("#MyGradient") === "MyGradient"` ).
 * @param url Relative or absolute URL
 */
export function acceptHashOnly(url: string): string | null {
    if (/^#.+$/.test(url)) return url.slice(1);
    else return null;
}