/**
 * Controls for a PlayerSpirit
 *
 * @constructor
 */
function PlayerControls(stick, trigger1, trigger2, menuTrigger) {
  this.stick = stick;
  this.t1 = trigger1;
  this.t2 = trigger2;
  this.menuTrigger = menuTrigger;

  this.spiritId = null;
}

PlayerControls.prototype.startListening = function() {
  if (this.stick) this.stick.startListening();
  if (this.t1) this.t1.startListening();
  if (this.t2) this.t2.startListening();
  if (this.menuTrigger) this.menuTrigger.startListening();
};

PlayerControls.prototype.stopListening = function() {
  if (this.stick) this.stick.stopListening();
  if (this.t1) this.t1.stopListening();
  if (this.t2) this.t2.stopListening();
  if (this.menuTrigger) this.menuTrigger.stopListening();
};

PlayerControls.prototype.handleInput = function(world) {
  var spirit = world.spirits[this.spiritId];
  if (spirit) {
    spirit.handleInput(this);
  }
};

PlayerControls.prototype.setSpiritId = function(id) {
  this.spiritId = id;
};
