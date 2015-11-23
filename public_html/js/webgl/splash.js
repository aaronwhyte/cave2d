/**
 * @constructor
 */
function Splash(stamp, startTime, endTime, colorFn, model1Fn, opt_model2Fn) {
  this.reset(stamp, startTime, endTime, colorFn, model1Fn, opt_model2Fn);
}

/**
 */
Splash.prototype.reset = function(stamp, startTime, endTime, colorFn, model1Fn, opt_model2Fn) {
  this.stamp = stamp;
  this.startTime = startTime;
  this.endTime = endTime;
  this.colorFn = colorFn;
  this.model1Fn = model1Fn;
  this.model2Fn = opt_model2Fn;
  return this;
};

Splash.pool = [];

/**
 */
Splash.alloc = function(stamp, startTime, endTime, colorFn, model1Fn, opt_model2Fn) {
  if (Splash.pool.length) {
    return Splash.pool.pop().reset(stamp, startTime, endTime, colorFn, model1Fn, opt_model2Fn);
  }
  return new Splash(stamp, startTime, endTime, colorFn, model1Fn, opt_model2Fn);
};

Splash.prototype.free = function() {
  Splash.pool.push(this);
};
