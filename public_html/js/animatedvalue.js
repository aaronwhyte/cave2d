/**
 * @constructor
 */
function AnimatedValue() {
  this.series = [];
}

AnimatedValue.CMD_SET = 1;
AnimatedValue.CMD_LINEAR_RAMP = 2;

/**
 * @param {number} val
 * @param {number} time
 */
AnimatedValue.prototype.setValueAtTime = function(val, time) {
  this.addEntry({
    cmd: AnimatedValue.CMD_SET,
    val: val,
    time: time
  });
};

/**
 * @param {number} val
 * @param {number} time
 */
AnimatedValue.prototype.linearRampToValueAtTime = function(val, time) {
  this.addEntry({
    cmd: AnimatedValue.CMD_LINEAR_RAMP,
    val: val,
    time: time
  });
};

/**
 * @param {number} time
 * @return {number}
 */
AnimatedValue.prototype.getValueAtTime = function(time) {
  var left = null;
  var right = null;
  // TODO: replace linear scan?
  for (var i = 0; i < this.series.length; i++) {
    if (this.series[i].time <= time) {
      left = this.series[i];
    }
    if (time <= this.series[i].time) {
      right = this.series[i];
      break;
    }
  }
  if (left == null) {
    return undefined;
  }
  if (right == null) {
    return left.val;
  }
  if (right.time == left.time || right.cmd == AnimatedValue.CMD_SET) {
    return left.val;
  }
  if (right.cmd == AnimatedValue.CMD_LINEAR_RAMP) {
    return left.val + (right.val - left.val) * ((time - left.time) / (right.time - left.time));
  }
};

AnimatedValue.prototype.cancelScheduledValues = function(startTime) {
  for (var i = 0; i < this.series.length; i++) {
    if (startTime <= this.series[i].time) {
      this.series.length = i;
      return;
    }
  }
};

/**
 * This is optimized for appending, the assumption being that callers will
 * start at the beginning of time and work their way towards the end.
 * Appending is O(1), but prepending is O(series.length);
 * @param {Object } entry
 */
AnimatedValue.prototype.addEntry = function(entry) {
  for (var i = this.series.length - 1; i >= 0; i--) {
    var oldEntry = this.series[i];
    if (oldEntry.time < entry.time) {
      // add to the right
      this.series[i + 1] = entry;
      return;
    } else if (oldEntry.time == entry.time) {
      // replace
      this.series[i] = entry;
      return;
    } else {
      // shift old val to the right and keep going.
      this.series[i + 1] = oldEntry;
    }
  }
  // Everything has been shifted. This is the new start.
  this.series[0] = entry;
};
