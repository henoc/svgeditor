// Reference: https://github.com/trevordixon/ttfinfo

import fs from "fs";
import util from  "util";

const TABLE_COUNT_OFFSET = 4,
      TABLE_HEAD_OFFSET = 12,
      TABLE_HEAD_SIZE = 16,
      TAG_OFFSET = 0,
      TAG_SIZE = 4,
      CHECKSUM_OFFSET = TAG_OFFSET + TAG_SIZE,
      CHECKSUM_SIZE = 4,
      CONTENTS_PTR_OFFSET = CHECKSUM_OFFSET + CHECKSUM_SIZE,
      CONTENTS_PTR_SIZE = 4,
      LENGTH_OFFSET = TABLE_HEAD_SIZE + CONTENTS_PTR_OFFSET;

function count(data: Buffer) {
    return data.readUInt16BE(TABLE_COUNT_OFFSET);
}

function offset(data: Buffer, name: string) {
    let tmp = tableHead(data, name);
    return tmp && tmp.contents;
}

interface TableHead {
    tag: string;
    checksum: number;
    contents: number;
    length: number;
}

function tableHead(data: Buffer, name: string): TableHead | undefined {
    const numTables = count(data);

    for (let i = 0; i < numTables; i++) {
        const o = TABLE_HEAD_OFFSET + i * TABLE_HEAD_SIZE;
        const tag = data.slice(o, o + CONTENTS_PTR_SIZE).toString();

        if (tag === name) {
            return {
                tag,
                checksum: data.readUInt32BE(o + CHECKSUM_OFFSET),
                contents: data.readUInt32BE(o + CONTENTS_PTR_OFFSET),
                length: data.readUInt32BE(o + LENGTH_OFFSET)
            };
        }
    }
}

/**
 * https://docs.microsoft.com/en-us/typography/opentype/spec/name#name-ids
 * 
 * |code|meaning|
 * |:---|:------|
 * |1|family name|
 * |2|subfamily name|
 * |4|full name|
 */
function nameTable(data: Buffer) {
    const ntOffset = offset(data, "name");
    if (ntOffset === undefined) throw new Error("No name table found in font file.");
    const offsetStorage = data.readUInt16BE(ntOffset + 4);
    const numberNameRecords = data.readUInt16BE(ntOffset + 2);

    const stroage = offsetStorage + ntOffset;

    const info = [];
    for (let j = 0; j < numberNameRecords; j++) {
        const o = ntOffset + 6 + j * 12;

        const platformId = data.readUInt16BE(o);
        const nameId = data.readUInt16BE(o + 6);
        const stringLength = data.readUInt16BE(o + 8);
        const stringOffset = data.readUInt16BE(o + 10);

        if (!info[nameId]) {
            info[nameId] = "";

            for (let k = 0; k < stringLength; k++) {
                const charCode = data[stroage + stringOffset + k];
                if (charCode === 0) continue;
                info[nameId] += String.fromCharCode(charCode);
            }
        }
    }

    return info;
}

/**
 * Read name table from true type font file.
 */
export async function readTtfName(path: string | Buffer) {
    let buffer: Buffer;
    if (typeof path === "string") {
        buffer = await preadFile(path);
    } else {
        buffer = path;
    }
    return nameTable(buffer);
}

const preadFile = util.promisify(fs.readFile)
