const app =  Elm.Main.fullscreen();

app.ports.getSvgData.subscribe(function(){
  app.ports.getSvgDataFromJs.send(`{{svg}}`);
});

app.ports.sendSvgData.subscribe(function(svgData) {
  const name = "extension.reflectToEditor";
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
