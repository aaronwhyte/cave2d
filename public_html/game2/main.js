var app, stats;

var STAT_NAMES = {
  TO_DRAWSCREEN_MS: 'to_drawscreen_ms',
  STAT_DRAWING_MS: 'stat_drawing_ms',
  SCENE_PLUS_STAT_DRAWING_MS: 'scene_plus_stat_drawing_ms',
  ANIMATION_MS: 'animation_ms',

  DRAW_SPIRITS_MS: 'draw_spirits_ms',
  WORLD_TIME: 'world_time'
};

function main() {
  stats = new Stats();
  var basePath = ['game2'];
  app = new PlayApp('Game 2', basePath,
      'adventures/splendid6.txt',
      'vertex-shader.txt', 'fragment-shader.txt',
      PlayLevelPage);
  app.start();
}

