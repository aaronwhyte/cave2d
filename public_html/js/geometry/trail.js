/**
 * @param maxSegments
 * @constructor
 */
function Trail(maxSegments) {
  this.maxSegments = maxSegments;
  this.queue = new CircularQueue(maxSegments);
  this.endTime = Infinity;
}

Trail.prototype.append = function(startTime, startPos, vel) {
  var overflow = this.queue.enqueue(TrailSegment.alloc(startTime, startPos, vel));
  if (overflow) overflow.free();
};

Trail.prototype.size = function() {
  return this.queue.size();
};

Trail.prototype.getSegmentStartTime = function(i) {
  return this.queue.getFromHead(i).startTime;
};

Trail.prototype.getSegmentEndTime = function(i) {
  return i === 0 ? this.endTime : this.queue.getFromHead(i - 1).startTime;
};

Trail.prototype.getSegmentPosAtTime = function(i, time, out) {
  return this.queue.getFromHead(i).getPosAtTime(time, out);
};

Trail.prototype.reset = function() {
  this.clear();
  this.endTime = Infinity;
};

Trail.prototype.clear = function() {
  while (!this.queue.isEmpty()) {
    this.queue.dequeue().free();
  }
};


/**
 * @param {Number} startTime
 * @param {Vec2d} startPos gets copied
 * @param {Vec2d} vel gets copied
 * @constructor
 */
function TrailSegment(startTime, startPos, vel) {
  this.startTime = startTime;
  this.startPos = new Vec2d().set(startPos);
  this.vel = new Vec2d().set(vel);
}

TrailSegment.pool = [];

/**
 * @param {Number} startTime
 * @param {Vec2d} startPos gets copied
 * @param {Vec2d} vel gets copied
 */
TrailSegment.alloc = function(startTime, startPos, vel) {
  if (TrailSegment.pool.length) {
    return TrailSegment.pool.pop().reset(startTime, startPos, vel);
  }
  return new TrailSegment(startTime, startPos, vel);
};

TrailSegment.prototype.free = function() {
  TrailSegment.pool.push(this);
};

/**
 * @param {Number} startTime
 * @param {Vec2d} startPos gets copied
 * @param {Vec2d} vel gets copied
 */
TrailSegment.prototype.reset = function(startTime, startPos, vel) {
  this.startTime = startTime;
  this.startPos.set(startPos);
  this.vel.set(vel);
  return this;
};


TrailSegment.prototype.getPosAtTime = function(t, out) {
  return out.set(this.vel).scale(t - this.startTime).add(this.startPos);
};