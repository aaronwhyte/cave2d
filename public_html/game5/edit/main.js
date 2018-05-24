let app;

function main() {
  let basePath = ['game5'];
  let fileTree = new FileTree(new RealStorage(localStorage));
  app = new EditorApp('Game 5', basePath,
      '../vertex-shader.glsl', '../fragment-shader.glsl',
      fileTree,
      EditLevelPage, TestLevelPage);
  app.start();
}

