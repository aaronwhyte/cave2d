var app, stats, statTrail;

var STAT_NAMES = {
  ANIMATION_MS: 'animation_ms'
};

function main() {
  stats = new Stats();
  statTrail = new StatRateTrail(stats, STAT_NAMES.ANIMATION_MS, 60 * 10);
  app = new Test40App('vertex-shader.txt', 'fragment-shader.txt');
  app.start();
}

