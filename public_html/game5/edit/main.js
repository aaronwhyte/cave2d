
// TODO: switch to a global variable backed by optional local storage for editor prefs?
let SHOULD_DRAW_STATS_DEFAULT = false;

let app;

function main() {
  let basePath = ['game5'];
  let fileTree = new FileTree(new RealStorage(localStorage));
  app = new EditorApp('Game 5', basePath,
      '../graphics/shaders/vertex-shader.glsl', '../graphics/shaders/fragment-shader.glsl',
      fileTree,
      EditLevelPage, TestLevelPage);
  app.start();
}

