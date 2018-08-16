# SVG Editor

![sample](images/out.gif)

Now your VSCode can mutate to an interactive visual & literal SVG editor 😎

You can create shapes using the SVG's coder or directly creating shapes with the shaping tool.

## Commands

- New File with SVG Editor
  - Open untitled file with SVG template.
- Open SVG Editor
  - Target active SVG tab to edit with SVG Editor.

## Support attributes

- svg: xmlns, xmlns:xlink, version, viewBox, x, y, width, height
- circle: cx, cy, r, fill, stroke, transform
- rect: x, y, width, height, rx, ry, fill, stroke, transform
- ellipse: cx, cy, rx, ry, fill, stroke, transform
- polyline: points, fill, stroke, transform
- path: d, fill, stroke, transform

## Future plans

- [x] Reimplement rotation
- [x] Reimplement path mode
- [x] Reimplement text mode
- [ ] Reimplement group and ungroup
- [x] Reflect embedded CSS in SVG
- [ ] Attributes output style options
- [ ] Scale objects with fixed aspect ratio mode
- [x] `defs` tag
- [ ] `use` tag
- [ ] `marker` tag
- [ ] unit
- [x] Gradation colors
- [ ] Transform attribute
- [x] Zoom
- [ ] Handle images
- [ ] Filters

## License

MIT
