var app;
function main() {
  var basePath = ['game3'];
  app = new PlayApp('Game 3', basePath,
      'vertex-shader.txt', 'fragment-shader.txt',
      'adventures/demo3.txt',
      PlayLevelPage);
  app.start();
}

