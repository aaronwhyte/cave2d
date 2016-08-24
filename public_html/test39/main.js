var app;
function main() {
  var path = ['test39'];
  var fileTree = new FileTree(new JsonStorage({}));
  app = new Test39App('Test 39', path, fileTree,
      'vertex-shader.txt', 'fragment-shader.txt');
  app.start();
}

