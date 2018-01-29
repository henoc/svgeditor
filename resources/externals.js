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

function currentNodeTextContent(elem) {
  let ret = "";
  for(node of elem.childNodes) {
    if (node.nodeName == "#text") {
      ret += node.nodeValue;
    }
  }
  return ret.trim();
}

/**
 * 
 * @param {SVGTextElement} elem 
 * @param {CanvasRenderingContext2D} ctx
 */
function measure(elem, ctx, font) {
  let fontSize = elem.getAttribute("font-size");
  if (fontSize && isFinite(fontSize)) fontSize += "px";
  let cfont = {
    fontStyle: elem.getAttribute("font-style") || font.fontStyle,
    fontVariant: elem.getAttribute("font-variant") || font.fontVariant,
    fontWeight: elem.getAttribute("font-weight") || font.fontWeight,
    fontSize: fontSize || font.fontSize || "14px",
    fontFamily: elem.getAttribute("font-family") || font.fontFamily || "sans-serif"
  }
  ctx.font = [cfont.fontStyle, cfont.fontVariant, cfont.fontWeight, cfont.fontSize, cfont.fontFamily].map(k => k || "").join(" ");
  let ret = ctx.measureText(currentNodeTextContent(elem)).width;
  for (let i = 0; i < elem.children.length; i++) {
    const c = elem.children.item(i);
    ret += measure(c, ctx, cfont);
  }
  return ret;
}

app.ports.getTextSizes.subscribe(function(ids) {
  setTimeout(() => {
    const ret = ids.map(id => {
      const elem = getSvgEditorElement(id, "color");
      const bbox = elem.getBBox();
      const ctx = document.getElementById("hiddenCanvas").getContext("2d");
      return [id, [[bbox.x, bbox.y], [measure(elem, ctx, {}), bbox.height]]];
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
