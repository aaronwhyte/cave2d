/**
 * Simple object that keeps track of slot state and turns listeners on and off for state transitions.
 * @constructor
 */
function PlayerSlot(joinTrigger, playerControls) {
  this.joinTrigger = joinTrigger;
  this.playerControls = playerControls;
  this.status = PlayerSlot.Status.DISABLED;
}

PlayerSlot.Status = {
  DISABLED: 1,
  WAITING_TO_JOIN: 2,
  PLAYING: 3
};

PlayerSlot.prototype.enable = function() {
  if (!this.status == PlayerSlot.Status.DISABLED) return;
  this.status = PlayerSlot.Status.WAITING_TO_JOIN;
  this.joinTrigger.startListening();
};

PlayerSlot.prototype.join = function() {
  this.enable();
  this.status = PlayerSlot.Status.PLAYING;
  this.joinTrigger.stopListening();
  this.playerControls.startListening();
};

PlayerSlot.prototype.leave = function() {
  if (!this.status == PlayerSlot.Status.PLAYING) return;
  this.status = PlayerSlot.Status.WAITING_TO_JOIN;
  this.joinTrigger.startListening();
  this.playerControls.stopListening();
};

PlayerSlot.prototype.disable = function() {
  this.leave();
  if (!this.status == PlayerSlot.Status.WAITING_TO_JOIN) return;
  this.status = PlayerSlot.Status.DISABLED;
  this.joinTrigger.stopListening();
};
