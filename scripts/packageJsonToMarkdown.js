/**
 * Oh, it’s a secret.
 */

const fs = require("fs");
const path = require("path");
const space = require("to-space-case");
const packageJson = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "package.json") , {encoding: "UTF-8"}));
const contributes = packageJson.contributes;
const text = [];

outputCommands();
outputConfiguration();
outputKeybindings();

console.log(text.join("\n"));

function outputCommands() {
    const cmds = contributes.commands;
    text.push("## Commands");
    text.push("");
    text.push("|command|title|");
    text.push("|:---|:---|");
    for (let cmd of cmds) {
        text.push(`|${cmd.command}|${cmd.title}|`);
    }
    text.push("");
}

function outputKeybindings() {
    const keybindings = contributes.keybindings;
    text.push("## Keybindings");
    text.push("");
    text.push("|operation|key|");
    text.push("|:---|:---|");
    const acc = {};
    for (let key of keybindings) {
        acc[key.command] = acc[key.command] ? [...acc[key.command], key.key] : [key.key];
    }
    for (const name in acc) {
        if (acc.hasOwnProperty(name)) {
            const value = acc[name];
            text.push(`|${space(name.replace("svgeditor.", ""))}|${value.join(" / ")}|`);
        }
    }
    text.push("");
}

function outputConfiguration() {
    const properties = contributes.configuration.properties;
    text.push("## Configuration");
    text.push("");
    text.push("|name|description|default|");
    text.push("|:---|:---|:---|");
    for (const propName in properties) {
        if (properties.hasOwnProperty(propName)) {
            const property = properties[propName];
            text.push(`|${propName}|${property.description}|${property.default}|`);
        }
    }
    text.push("");
}

