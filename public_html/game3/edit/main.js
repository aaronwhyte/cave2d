var app;
function main() {
  var basePath = ['game3'];
  var fileTree = new FileTree(new RealStorage(localStorage));
  app = new EditorApp('Game 3', basePath, fileTree,
      '../vertex-shader.txt', '../fragment-shader.txt',
      EditLevelPage, TestLevelPage);
  app.start();
}

