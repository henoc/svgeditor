import { XmlNode } from "./xmlParser";

export interface LinearOptions {
    indent?: {
        unit: string;
        level: number;
        eol: "\n" | "\r\n";
    }
}

export function serializeXml(xml: XmlNode, options: LinearOptions): string {
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
                `<${head.join(" ")}>${eol}${xml.children.map(c => serializeXml(c, indentLevelUp(options))).join(eol)}${eol}${spaces}</${xml.tag}>` :
                `<${head.join(" ")}/>`);
    }
}

function indentLevelUp(linearOptions: LinearOptions): LinearOptions {
    const indent = linearOptions.indent && {
        ...linearOptions.indent,
        level: linearOptions.indent.level + 1
    }
    return {...linearOptions, indent}
}