import { XmlNode } from "./xmlParser";

export interface LinearOptions {
    indent?: {
        unit: string;
        level: number;
        eol: "\n" | "\r\n";
    }
}

export function serializeXml(xml: XmlNode, options: LinearOptions = {}): string {
    const spaces = (additionalLevel: number) => options.indent && options.indent.unit.repeat(options.indent.level + additionalLevel) || "";
    const eol = options.indent && options.indent.eol || "";
    switch (xml.type) {
        case "text":
        return `${spaces(0)}${xml.text}`;
        case "comment":
        return `${spaces(0)}<!--${xml.text}-->`;
        case "cdata":
        return `${spaces(0)}<![CDATA[${eol}${spaces(1)}${xml.text}${eol}${spaces(0)}]]>`;
        case "element":
        const head = [xml.tag, ...Object.entries(xml.attrs).map(([key, value]) => `${key}="${value}"`)];
        return spaces(0) + ((xml.children.length !== 0) ?
                `<${head.join(" ")}>${eol}${serializeXmls(xml.children, indentLevelUp(options))}${eol}${spaces}</${xml.tag}>` :
                `<${head.join(" ")}/>`);
    }
}

export function serializeXmls(xmls: XmlNode[], options: LinearOptions = {}): string {
    const eol = options.indent && options.indent.eol || "";
    return xmls.map(xml => serializeXml(xml)).join(eol)
}

export function indentLevelUp(linearOptions: LinearOptions): LinearOptions {
    const indent = linearOptions.indent && {
        ...linearOptions.indent,
        level: linearOptions.indent.level + 1
    }
    return {...linearOptions, indent}
}