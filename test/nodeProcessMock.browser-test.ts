const vscode = {
    postMessage(message: {command: string; data: any}) {
        switch (message.command) {
            case "svg-request":
            window.postMessage({
                command: "modified",
                data: {
                    xpath: "???",
                    parent: null,
                    tag: "svg",
                    attrs: {
                        class: null,
                        id: null,
                        unknown: {},
                        xmlns: null,
                        "xmlns:xlink": null,
                        version: null,
                        x: null,
                        y: null,
                        width: null,
                        height: null,
                        viewBox: null
                    },
                    children: []
                }
            }, "*");
            break;
            default:
            console.log(message);
            break;
        }
    }
};

(window as any).acquireVsCodeApi = () => vscode;
