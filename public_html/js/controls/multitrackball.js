/**
 * A control trackball that combines other trackball inputs into one.
 * @constructor
 * @extends {Trackball}
 */
function MultiTrackball() {
  Trackball.call(this);
  this.trackballs = [];
  this.temp = new Vec2d();
}
MultiTrackball.prototype = new Trackball();
MultiTrackball.prototype.constructor = MultiTrackball;

MultiTrackball.prototype.addTrackball = function(t) {
  this.trackballs.push(t);
  return this;
};

MultiTrackball.prototype.startListening = function() {
  for (var i = 0; i < this.trackballs.length; i++) {
    this.trackballs[i].startListening();
  }
};

MultiTrackball.prototype.stopListening = function() {
  for (var i = 0; i < this.trackballs.length; i++) {
    this.trackballs[i].stopListening();
  }
};

MultiTrackball.prototype.setFriction = function(f) {
  for (var i = 0; i < this.trackballs.length; i++) {
    this.trackballs[i].setFriction(f);
  }
  return this;
};

MultiTrackball.prototype.getVal = function(out) {
  this.val.reset();
  for (var i = 0; i < this.trackballs.length; i++) {
    this.trackballs[i].getVal(this.temp);
    this.val.add(this.temp);
  }
  return out.set(this.val);
};

MultiTrackball.prototype.getContrib = function() {
  var val = 0;
  for (var i = 0; i < this.trackballs.length; i++) {
    val |= this.trackballs[i].getContrib();
  }
  return val;
};

MultiTrackball.prototype.reset = function() {
  for (var i = 0; i < this.trackballs.length; i++) {
    this.trackballs[i].reset();
  }
};

MultiTrackball.prototype.isTouched = function() {
  for (var i = 0; i < this.trackballs.length; i++) {
    if (this.trackballs[i].isTouched()) return true;
  }
  return false;
};
