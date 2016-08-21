var app;
function main() {
  var basePath = ['test39'];
  var fileTree = new FileTree(new RealStorage(localStorage));
  app = new EditorApp('Test 39', basePath, fileTree,
      'vertex-shader.txt', 'fragment-shader.txt',
      EditLevelPage, TestLevelPage);
  app.start();
}

