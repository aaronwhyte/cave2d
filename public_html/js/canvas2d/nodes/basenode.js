/**
 * Abstract base class for graphics nodes. This takes care of
 * the common task of time-ordering the series of values, and
 * it does the query for the two values surrounding a specific time,
 * used by subclasses for interpolating a value.
 * @constructor
 */
function BaseNode() {
  this.series = [];
  this.endTime = Infinity;
  // Two series-values and a fraction.
  this.interpolation = [null, null, 0];
  this.children = [];
}

/**
 * Override this to make anything interesting happen.
 * @param context
 * @param time
 */
BaseNode.prototype.render = function(context, time) {
  // override me.
  this.renderChildren(context, time);
};

BaseNode.prototype.renderChildren = function(context, time) {
  for (var i = 0, n = this.children.length; i < n; i++) {
    this.children[i].render(context, time);
  }
};

/**
 * Adds a value object, expected to have a "time" field, to the series.
 * This is optimized for appending, the assumption being that callers will
 * start at the beginning of time and work their way towards the end.
 * Appending is O(1), but prepending is O(series.length);
 * @param {Object} val
 */
BaseNode.prototype.addValueObject = function(val) {
  for (var i = this.series.length - 1; i >= 0; i--) {
    var oldVal = this.series[i];
    if (oldVal.time < val.time) {
      // add to the right
      this.series[i + 1] = val;
      return;
    } else if (oldVal.time == val.time) {
      // replace
      this.series[i] = val;
      return;
    } else {
      // shift old val to the right and keep going.
      this.series[i + 1] = oldVal;
    }
  }
  // Everything has been shifted. This is the new start.
  this.series[0] = val;
};

/**
 * @param time
 * @return {Array} the interpolation pair if we have a valid pair, or null.
 * If the time falls exactly on a value, the same value is used as both
 * parts of the interpolation pair, so the time difference may be zero.
 */
BaseNode.prototype.calcInterpolation = function(time) {
  this.interpolation[0] = null;
  this.interpolation[1] = null;
  // Maybe replace this linear scan with a binary search if we get very long series.
  if (!this.series.length || time < this.series[0].time ||
      this.series[this.series.length - 1].time < time) {
    return null;
  }
  for (var i = 0; i < this.series.length; i++) {
    if (this.series[i].time <= time) {
      this.interpolation[0] = this.series[i];
    }
    if (time <= this.series[i].time) {
      this.interpolation[1] = this.series[i];
      // calculate the fractional distance from A to B
      if (this.interpolation[0].time == this.interpolation[1].time) {
        this.interpolation[2] = 0.5;
      } else {
        this.interpolation[2] =
            (time - this.interpolation[0].time) /
            (this.interpolation[1].time - this.interpolation[0].time);
      }
      return this.interpolation;
    }
  }
  throw Error("inconceivable");
};

BaseNode.prototype.addChild = function(node) {
  this.children.push(node);
};

/**
 * @returns {boolean} true if the child was removed, false otherwise.
 */
BaseNode.prototype.removeChild = function(node) {
  for (var i = 0, n = this.children.length; i < n; i++) {
    if (this.children[i] == node) {
      this.children[i] = this.children[n - 1];
      this.children.pop();
      return true;
    }
  }
  return false;
};
