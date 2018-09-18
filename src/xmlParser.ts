/**
 * @file Construct xml tree by using sax.
 */

import sax from "sax";
import { iterate } from "./utils";

export type XmlNode = XmlElement | XmlText | XmlComment | XmlCData;

export interface XmlElement extends XmlElementNop, PositionsProperty {
    children: XmlNode[];
}
export interface XmlText extends XmlTextNop, IntervalProperty {}
export interface XmlComment extends XmlCommentNop, IntervalProperty {}
export interface XmlCData extends XmlCDataNop, IntervalProperty {}

export type XmlNodeNop = XmlElementNop | XmlTextNop | XmlCommentNop | XmlCDataNop;

export interface XmlElementNop {
    type: "element";
    name: string;
    attrs: {[name: string]: string};
    children: XmlNodeNop[];
}

interface PositionsProperty {
    positions: ElementPositionsOnText;
}

interface IntervalProperty {
    interval: Interval;
}

export interface XmlTextNop {
    type: "text";
    text: string;
}

export interface XmlCommentNop {
    type: "comment";
    text: string;
}

export interface XmlCDataNop {
    type: "cdata";
    text: string;
}

export interface Interval {start: number, end: number}

/**
 * ex. <svg_start xmlns="something">first<def>inner</def>second</svg_end>  
 * interval: <svg_start...svg_end>  
 * openElement: <svg_start...>  
 * closeElement: </svg_end>  
 * startTag: svg_start  
 * endTag: svg_end  
 * attrs: something  
 */
export interface ElementPositionsOnText {
    interval: Interval;
    openElement: Interval;            
    closeElement: Interval | null;    
    startTag: Interval;                
    endTag: Interval | null;                 
    attrs: {[name: string]: Interval};             
}

interface Context {
    openElementStart: number;
    openElementEnd: number;
    startTagStart: number;
    startTagEnd: number;
    tagName: string;
    attrs: {[name: string]: {value: string; range: Interval}};
    isSelfClosing: boolean;
    closeElementStart: number;
    closeElementEnd: number;
    endTagStart: number;
    endTagEnd: number;
    children: XmlNode[];
}

export function textToXml(xmltext: string): XmlElement | null {
    const parser = sax.parser(true, {position: true});
    let ret: XmlElement | null = null;
    
    function pos(): number {
        return parser.position;
    }
    function startTagPos(): number {
        return parser.startTagPosition;
    }
    function contextLevelUp(): void {
        contexts.push(<any>{
            attrs: {},
            texts: [],
            children: [],
            isSelfClosing: false
        });
    }
    function contextLevelDown(): void {
        const current = currentContext();
        const xmlElement: XmlElement = {
            type: "element",
            name: current.tagName,
            attrs: iterate(current.attrs, (_key, value) => {
                return value.value
            }),
            children: current.children,
            positions: {
                interval: {start: current.openElementStart, end: current.isSelfClosing ? current.openElementEnd : current.closeElementEnd},
                openElement: {start: current.openElementStart, end: current.openElementEnd},
                closeElement: current.isSelfClosing ? null : {start: current.closeElementStart, end: current.closeElementEnd},
                startTag: {start: current.startTagStart, end: current.startTagEnd},
                endTag: current.isSelfClosing ? null : {start: current.endTagStart, end: current.endTagEnd},
                attrs: iterate(current.attrs, (_key, value) => value.range)
            }
        };
        if (contexts.length === 1) {
            ret = xmlElement;
            contexts.pop();
        } else {
            contexts.pop();
            currentContext().children.push(xmlElement);
        }
    }
    function currentContext(): Context {
        return contexts[contexts.length - 1];
    }

    const contexts: Context[] = [];
    let lastGT: number = 0;         // '>'

    // @ts-ignore
    parser.onopentagstart = (tag: sax.Tag) => {
        contextLevelUp();
        currentContext().openElementStart = startTagPos() - xmltext.slice(0, startTagPos()).match(/<\s*$/)![0].length;
        const startTagStart = startTagPos() + xmltext.slice(startTagPos()).match(/^\s*/)![0].length;
        currentContext().startTagEnd = startTagStart + tag.name.length;
        currentContext().startTagStart = startTagStart;
        currentContext().tagName = tag.name;
    };

    parser.onattribute = ({name, value}) => {
        const rawValue = xmltext.slice(0, pos()).match(/"([^"]*)"$/)![1];       // before unescaping
        currentContext().attrs[name] = {
            value: rawValue,
            range: {
                start: pos() - 1 - rawValue.length,
                end: pos() - 1
            }
        };
    };

    parser.onopentag = (tag: sax.Tag) => {
        currentContext().openElementEnd = pos();
        currentContext().isSelfClosing = tag.isSelfClosing;
        lastGT = pos();
    };

    parser.ontext = (_text) => {
        if (currentContext()) {
            const rawText = xmltext.slice(lastGT).match(/^[^<]*/)![0];       // before unescaping
            currentContext().children.push({
                type: "text",
                text: rawText,
                interval: {
                    start: lastGT,
                    end: lastGT + rawText.length
                }
            });
        }
    };

    parser.oncdata = (cdata) => {
        if (currentContext()) {
            currentContext().children.push({
                type: "cdata",
                text: cdata,
                interval: {
                    start: pos() - "]]>".length - cdata.length,
                    end: pos() - "]]>".length
                }
            });
            lastGT = pos();
        }
    }

    parser.oncomment = (comment) => {
        if (currentContext()) {
            currentContext().children.push({
                type: "comment",
                text: comment,
                interval: {
                    start: pos() - 2 - comment.length - 4,
                    end: pos() + 1
                }
            });
            lastGT = pos() + 1;         // in sax, call oncomment when "--" is found.
        }
    }

    parser.onclosetag = (tagName) => {
        if (!currentContext().isSelfClosing) {
            const pattern = `<\\s*/\\s*${tagName}\\s*>$`;
            const closeElementStart = pos() - xmltext.slice(0, pos()).match(new RegExp(pattern))![0].length;
            currentContext().closeElementEnd = pos();
            currentContext().closeElementStart = closeElementStart;
            const endTagStart = closeElementStart + xmltext.slice(closeElementStart).match(/^<\s*\/\s*/)![0].length;
            currentContext().endTagEnd = endTagStart && (endTagStart + tagName.length);
            currentContext().endTagStart = endTagStart;
        }
        lastGT = pos();
        contextLevelDown();
    };

    parser.onerror = (error) => {
        throw error;
    };

    parser.write(xmltext).close();
    return ret;
}
