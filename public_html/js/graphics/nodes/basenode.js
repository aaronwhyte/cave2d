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
  this.interpolationPair = [null, null];
}

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
BaseNode.prototype.calcInterpolationPair = function(time) {
  this.interpolationPair[0] = null;
  this.interpolationPair[1] = null;
  // Maybe replace this linear scan with a binary search if we get very long series.
  if (!this.series.length || time < this.series[0].time ||
      this.series[this.series.length - 1].time < time) {
    return null;
  }
  for (var i = 0; i < this.series.length; i++) {
    if (this.series[i].time <= time) {
      this.interpolationPair[0] = this.series[i];
    }
    if (time <= this.series[i].time) {
      this.interpolationPair[1] = this.series[i];
      return this.interpolationPair;
    }
  }
  throw Error("inconceivable");
};
