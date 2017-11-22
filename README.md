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
  - Scale and rotate.
    - Note: Rotation uses the transform attribute. Transform property order is now `translate, rotate, scale, translate`. If this transform property order is not followed correctly, the shape will not be effected.
- Node mode
  - Edit node of line, polyline, polygon and path object.
- Rectangle, ellipse, polygon, path, text mode
  - Make new object.

## Future plans

- [x] Reflect embedded CSS in SVG
- [ ] Attributes output style options
- [ ] Line cap, marker
- [ ] Scale objects with fixed aspect ratio mode
- [x] `g` tag
- [ ] `defs` tag
- [ ] `use` tag
- [ ] Gradation colors
- [ ] No fixed transform attribute
- [ ] Zoom
- [ ] Handle images

## ChangeLog

- 0.3.0 Added group and ungroup button, improved right click menu
- 0.2.0 Affected embedded CSS in SVG
- 0.1.0 Released

## License

MIT
