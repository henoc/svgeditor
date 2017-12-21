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
  app.ports.getBoundingClientRectFromJs.send(elem.getBoundingClientRect());
});

app.ports.getStyle.subscribe(function(id){
  const elem = document.getElementById(id);
  if (elem == null) {
    app.ports.getStyleFromJs.send(null);
  } else {
    app.ports.getStyleFromJs.send(window.getComputedStyle(elem));
  }
});

document.addEventListener("mousedown", mouseEvent => {
  if (mouseEvent.button === 0) {
    app.ports.getMouseDownLeftFromJs.send([mouseEvent.clientX, mouseEvent.clientY]);
  }
  if (mouseEvent.button === 2) {
    app.ports.getMouseDownRightFromJs.send([mouseEvent.clientX, mouseEvent.clientY]);
  }
});
