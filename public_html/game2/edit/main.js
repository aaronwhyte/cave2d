var app;
function main() {
  var basePath = ['game2', 'adventures'];
  var fileTree = new FileTree(new RealStorage(localStorage));
  app = new EditorApp('Game 2', basePath, fileTree);
  app.start();
}

