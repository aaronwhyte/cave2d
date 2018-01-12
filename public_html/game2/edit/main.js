let app;

function main() {
  let basePath = ['game2'];
  let fileTree = new FileTree(new RealStorage(localStorage));
  app = new EditorApp('Game 2', basePath,
      '../vertex-shader.txt', '../fragment-shader.txt',
      fileTree,
      EditLevelPage, TestLevelPage);
  app.start();
}

