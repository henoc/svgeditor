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

app.ports.getBoundingClientLeft.subscribe(function(id){
  const elem = document.getElementById(id);
  app.ports.getBoundingClientLeftFromJs.send(elem.getBoundingClientRect().left);
});

app.ports.getBoundingClientTop.subscribe(function(id){
  const elem = document.getElementById(id);
  app.ports.getBoundingClientTopFromJs.send(elem.getBoundingClientRect().top);
});

app.ports.getStyle.subscribe(function(id){
  const elem = document.getElementById(id);
  if (elem == null) {
    app.ports.getStyleFromJs.send(null);
  } else {
    app.ports.getStyleFromJs.send(window.getComputedStyle(elem));
  }
});
