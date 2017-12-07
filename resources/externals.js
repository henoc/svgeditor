const app =  Elm.Main.fullscreen();

app.ports.getSvgData.subscribe(function(hello){
  app.ports.getSvgDataFromJs.send(`<%- svg %>`);
});
