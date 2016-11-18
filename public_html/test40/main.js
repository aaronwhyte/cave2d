var app;

var stats, statTrail;
var SAMPLE_PERIOD_FRAMES = 1;
var GRAPH_SAMPLES = 120;
var GRAPH_TIMESPAN = 120 * SAMPLE_PERIOD_FRAMES;

var STAT_NAMES = {
  ANIMATION_MS: 'animation_ms'
};

function main() {
  stats = new Stats();
  statTrail = new StatRateTrail(stats, STAT_NAMES.ANIMATION_MS, GRAPH_SAMPLES);
  app = new Test40App('vertex-shader.txt', 'fragment-shader.txt');
  app.start();
}

