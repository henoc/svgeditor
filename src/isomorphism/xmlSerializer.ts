import { XmlNode } from "./xmlParser";

export interface LinearOptions {
    indent?: {
        unit: string;
        level: number;
        eol: "\n" | "\r\n";
    }
}

export function serializeXml(xml: XmlNode, options: LinearOptions): string {
    const indent = (additionalLevel: number) => indentLiteral(options, additionalLevel);
    const eol = eolLiteral(options);
    switch (xml.type) {
        case "text":
        return `${indent(0)}${xml.text}`;
        case "comment":
        return `${indent(0)}<!--${xml.text}-->`;
        case "cdata":
        return `${indent(0)}<![CDATA[${eol}${indent(1)}${xml.text}${eol}${indent(0)}]]>`;
        case "element":
        const head = [xml.tag, ...Object.entries(xml.attrs).map(([key, value]) => `${key}="${value}"`)];
        return indent(0) + ((xml.children.length !== 0) ?
                `<${head.join(" ")}>${eol}${serializeXmls(xml.children, indentLevelUp(options))}${eol}${indent}</${xml.tag}>` :
                `<${head.join(" ")}/>`);
    }
}

export function serializeXmls(xmls: XmlNode[], options: LinearOptions): string {
    const eol = options.indent && options.indent.eol || "";
    return xmls.map(xml => serializeXml(xml, options)).join(eol)
}

export function indentLevelUp(linearOptions: LinearOptions): LinearOptions {
    const indent = linearOptions.indent && {
        ...linearOptions.indent,
        level: linearOptions.indent.level + 1
    }
    return {...linearOptions, indent}
}

export function indentLiteral(options: LinearOptions, additionalLevel: number) {
    return options.indent && options.indent.unit.repeat(options.indent.level + additionalLevel) || "";
}

export function eolLiteral(options: LinearOptions) {
    return options.indent && options.indent.eol || "";
}