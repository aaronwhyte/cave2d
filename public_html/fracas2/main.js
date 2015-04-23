/**
 * The main controller for the game experience.
 * This initializes all common resources:
 * - drawing context & shaders
 * - level data
 * - audio context (eventually)
 * - model data (eventually)
 * @constructor
 */
function Main(canvas) {
  this.canvas = canvas;

  this.levelTextLoader = null;
  this.rendererLoader = null;

  this.goal = null;
}

// major goals
Main.GOAL_TITLE = 'title';
Main.GOAL_NEW_GAME = 'new_game';
Main.GOAL_PAUSE = 'pause';
Main.GOAL_RESUME = 'resume';
Main.GOAL_NEXT_LEVEL = 'next_level';
Main.GOAL_START_LEVEL = 'start_level';


Main.prototype.setGoal = function(goal) {
  if (this.goal != goal) {
    this.goal = goal;
    this.invalidate();
  }
};

Main.prototype.loadRenderer = function(vertexShaderPath, fragmentShaderPath) {
  if (!this.rendererLoader) {
    this.rendererLoader = new RendererLoader(this.canvas, vertexShaderPath, fragmentShaderPath);
    var self = this;
    this.rendererLoader.load(function (renderer) {
      self.renderer = renderer;
      console.log('renderer loaded');
      self.invalidate();
    });
  }
};

Main.prototype.loadLevels = function(paths) {
  this.levelTextLoader = new TextLoader(paths);
  var self = this;
  this.levelTextLoader.load(function(num) {
    console.log('level num loaded: ' + num);
    // TODO: care what level was loaded?
    self.invalidate();
  });
};


/////////////////////
// private methods //
/////////////////////

/** Called from async callbacks to move state towards the goal. */
Main.prototype.invalidate = function() {

  // build title screen
  // TODO: split renderer into stamper and models
  // TODO: audio
  if (!this.titleScreen && this.renderer) {
    this.titleScreen = new TitleScreen(this, this.canvas, this.renderer);
  }
  if (this.goal == Main.GOAL_TITLE && this.titleScreen) {
    this.titleScreen.appear();
  }

  if (!this.fracas2 && this.renderer) {
    this.fracas2 = new Fracas2(this, this.canvas, this.renderer);
  }
  if (this.goal == Main.GOAL_NEW_GAME && this.fracas2) {
    this.fracas2.appear();
  }
};
