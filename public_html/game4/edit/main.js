let app;

function main() {
  let basePath = ['game4'];
  let fileTree = new FileTree(new RealStorage(localStorage));
  app = new EditorApp('Game 4', basePath,
      '../vertex-shader.glsl', '../fragment-shader.glsl',
      fileTree,
      EditLevelPage, TestLevelPage);
  app.start();
}

