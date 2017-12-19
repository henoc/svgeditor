# SVG Editor

![sample](images/out.gif)

Now your VSCode can mutate to an interactive visual & literal SVG editor 😎

You can create shapes using the SVG's coder or directly creating shapes with the shaping tool.

## Commands

- New File with SVG Editor
  - Open untitled file with SVG template.
- Open SVG Editor
  - Target active SVG tab to edit with SVG Editor.

## Kinds of operation

- Hand mode
  - Scale and translate.
- Node mode
  - Edit node of polyline, polygon.
- Rectangle, ellipse, polygon mode
  - Make new object.

## Future plans

- [ ] Reimplement rotation
- [ ] Reimplement path mode, text mode
- [ ] Reimplement group and ungroup
- [x] Reflect embedded CSS in SVG
- [ ] Attributes output style options
- [ ] Line cap, marker
- [ ] Scale objects with fixed aspect ratio mode
- [ ] `defs` tag
- [ ] `use` tag
- [ ] Gradation colors
- [ ] No fixed transform attribute
- [ ] Zoom
- [ ] Handle images

## ChangeLog

- 0.4.2 Enable to select path element again
- 0.4.1 Support embedded CSS again
- 0.4.0 Reimplement with Elm. Many things have improved, but some functions are temporary unavailable 😥
- 0.3.0 Added group and ungroup button, improved right click menu
- 0.2.0 Affected embedded CSS in SVG
- 0.1.0 Released

## License

MIT
