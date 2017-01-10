var app;
function main() {
  var basePath = ['game3'];
  var fileTree = new FileTree(new RealStorage(localStorage));
  app = new EditorApp('Game 3', basePath,
      '../vertex-shader.txt', '../fragment-shader.txt',
      fileTree, EditLevelPage, TestLevelPage);
  app.start();
}

