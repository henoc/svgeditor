const app =  Elm.Main.fullscreen();

app.ports.getSvgData.subscribe(function(){
  app.ports.getSvgDataFromJs.send(`{{svg}}`);
});

app.ports.sendSvgData.subscribe(function(svgData) {
  const name = "svgeditor.reflectToEditor";
  const args = [svgData];
  window.parent.postMessage(
    {
      command: "did-click-link",
      data: `command:${name}?${encodeURIComponent(JSON.stringify(args))}`
    },
    "file://"
  );
});

app.ports.getBoundingClientRect.subscribe(function(id){
  const elem = document.getElementById(id);
  setTimeout(() => app.ports.getBoundingClientRectFromJs.send(elem.getBoundingClientRect()), 500);
});

/**
 * 
 * @param {HTMLElement} gradient 
 */
function getGradientColors(gradient) {
  const cstyles = [];
  for (let i = 0; i < gradient.children.length; i++) {
    const element = gradient.children.item(i);
    if (element.tagName === "stop") {
      const cstyle = window.getComputedStyle(element);
      const minimunStyle = {
        stopColor: cstyle.stopColor,
        stopOpacity: cstyle.stopOpacity,
        offset: element.getAttribute("offset")     // offsetは計算後の値が参考にできないので属性を取ってくる
      }
      cstyles.push(minimunStyle);
    }
  }
  return cstyles;
}

/**
 * id: number, layer: string
 */
function getSvgEditorElement(id, layer) {
  return document.querySelector('*[svgeditor-id="' + id + '"][svgeditor-layer="' + layer +'"]');
}

app.ports.getStyle.subscribe(function([id, layer]){
  const elem = getSvgEditorElement(id, layer);
  if (elem == null) {
    app.ports.getStyleFromJs.send(null);
  } else {
    let styleObject = window.getComputedStyle(elem);
    app.ports.getStyleFromJs.send(styleObject);
  }
});

app.ports.getGradientStyles.subscribe(function(ids) {
  setTimeout(() => {
    const ret = ids.map(id => {
      const elem = getSvgEditorElement(id, "color")
      const tagName = elem.tagName;
      return {
        ident: elem.id,
        tagName: tagName,
        styles: getGradientColors(elem)
      };
    });
    app.ports.getGradientStylesFromJs.send(ret);
  }, 500);    // TODO: 500ms以上で elem = null からのエラーになるのでなんとかする
});

app.ports.getTextSizes.subscribe(function(ids) {
  setTimeout(() => {
    const ret = ids.map(id => {
      const elem = getSvgEditorElement(id, "color");
      const bbox = elem.getBBox();
      return [id, [[bbox.x, bbox.y], [bbox.width, bbox.height]]];
    });
    app.ports.getTextSizesFromJs.send(ret);
  }, 500);
});

app.ports.encodeURIComponent.subscribe(function(str){
  const encoded = encodeURIComponent(str);
  app.ports.encodeURIComponentFromJs.send(encoded);
});

document.addEventListener("mousedown", mouseEvent => {
  if (mouseEvent.button === 0) {
    app.ports.getMouseDownLeftFromJs.send([mouseEvent.clientX, mouseEvent.clientY]);
  }
  if (mouseEvent.button === 2) {
    app.ports.getMouseDownRightFromJs.send([mouseEvent.clientX, mouseEvent.clientY]);
  }
});

document.addEventListener("mouseup", mouseEvent => {
  app.ports.getMouseUpFromJs.send([mouseEvent.clientX, mouseEvent.clientY]);
});
document.addEventListener("mousemove", mouseEvent => {
  app.ports.getMouseMoveFromJs.send([mouseEvent.clientX, mouseEvent.clientY]);
});
