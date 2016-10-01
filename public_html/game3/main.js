var app;
function main() {
  var basePath = ['game3'];
  app = new PlayApp('Game 3', basePath,
      'adventures/demo1.txt',
      'vertex-shader.txt', 'fragment-shader.txt',
      PlayLevelPage);
  app.start();
}

