var app;
function main() {
  var basePath = ['game2'];
  app = new PlayApp('Game 2', basePath,
      'adventures/cavesofmagic.txt',
//      'adventures/shorttest.txt',
      'vertex-shader.txt', 'fragment-shader.txt');
  app.start();
}

