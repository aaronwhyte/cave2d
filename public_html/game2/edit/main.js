var app;
function main() {
  var basePath = ['game2'];
  var fileTree = new FileTree(new RealStorage(localStorage));
  app = new EditorApp('Game 2', basePath, fileTree,
      '../vertex-shader.txt', '../fragment-shader.txt',
      EditLevelPage, TestLevelPage);
  app.start();
}

