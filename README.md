# SVG Editor

![sample](images/capture.png)

**ver 2.5**: Fix bugs of nested svgs, introduce container viewer, and more 🍵

Now your VSCode can mutate to an interactive visual & literal SVG editor 😎

You can create shapes using the SVG's coder or directly creating shapes with the shaping tool.

## Commands

|command|title|
|:---|:---|
|svgeditor.openSvgEditor|Open SVG Editor|
|svgeditor.newSvgEditor|New File with SVG Editor|
|svgeditor.reopenRelatedTextEditor|Reopen Text Editor Related to Current SVG Editor|

## Configuration

|name|description|default|
|:---|:---|:---|
|svgeditor.filenameExtension|Initial filename extension of new untitled file.|svg|
|svgeditor.width|Initial width of new untitled file.|400px|
|svgeditor.height|Initial height of new untitled file.|400px|
|svgeditor.showAll|Send all attributes and tags to WebView regardless of SVG Editor support.|true|
|svgeditor.defaultUnit|Specifies the unit when creating some shapes.|null|
|svgeditor.decimalPlaces|The number of decimal places.|1|
|svgeditor.collectTransformMatrix|Collect two or more transform functions into a matrix.|true|
|svgeditor.additionalResourcePaths|Additional resource directory paths SVG Editor can access||

## Keybindings

|operation|key|
|:---|:---|
|delete|backspace / delete|
|duplicate|ctrl+d|
|zoom in|oem_plus|
|zoom out|oem_minus|
|group|ctrl+g|
|ungroup|ctrl+u|
|font|f8|
|bring forward|pageup|
|send backward|pagedown|
|align left|ctrl+alt+numpad4|
|align right|ctrl+alt+numpad6|
|align bottom|ctrl+alt+numpad2|
|align top|ctrl+alt+numpad8|
|object to path|shift+ctrl+c|
|rotate clockwise|ctrl+]|
|rotate counterclockwise|ctrl+[|
|rotate clockwise by the angle step|]|
|rotate counterclockwise by the angle step|[|

## Current support tags and attributes

- svg: xmlns, xmlns:xlink, version, viewBox, x, y, width, height
- circle: cx, cy, r, 🎨
- rect: x, y, width, height, rx, ry, 🎨
- ellipse: cx, cy, rx, ry, 🎨
- polyline/polygon: points, 🎨
- path: d, 🎨
- text: x, y, dx, dy, textLength, lengthAdjust, 🎨
- g: 🎨
- defs: 🎨
- linearGradient: 🎨
- radialGradient: 🎨
- stop: offset, stop-color, 🎨
- image: x, y, width, height, xlink:href, href, 🎨

🎨(presentation attributes): fill, fill-rule, stroke, stroke-width, stroke-linecap, stroke-linejoin, stroke-dasharray, stroke-dashoffset, transform, font-family, font-size, font-style, font-weight

## Notice

### image

Localtion (xlink:)href refers to is restricted with your workspace, extension, `svgeditor.additionalResourcePaths` directories due to `vscode-resource` scheme settings.

## Future plans

- [ ] Embedded CSS  
  I want to support it without parsing CSS 🤔
- [x] Gradient colors
- [ ] Filters
- [x] Images
- [ ] Animations
- [ ] Correct only the changed portions without auto formatting  
  Maybe it's available if there are some xml(or svg) parsers which return the character positions of attributes and tag names in document with accuracy 🤔

## License

MIT
