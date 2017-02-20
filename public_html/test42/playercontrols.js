/**
 * Controls for a PlayerSpirit
 *
 * @constructor
 */
function PlayerControls(stick, t1, t2, menuTrigger, clickPad) {
  this.stick = stick;
  this.t1 = t1;
  this.t2 = t2;
  this.menuTrigger = menuTrigger;
  this.clickPad = clickPad;

  this.spiritId = null;
}

PlayerControls.prototype.startListening = function() {
  if (this.stick) this.stick.startListening();
  if (this.t1) this.t1.startListening();
  if (this.t2) this.t2.startListening();
  if (this.menuTrigger) this.menuTrigger.startListening();
  if (this.clickPad) this.clickPad.startListening();
};

PlayerControls.prototype.stopListening = function() {
  if (this.stick) this.stick.stopListening();
  if (this.t1) this.t1.stopListening();
  if (this.t2) this.t2.stopListening();
  if (this.menuTrigger) this.menuTrigger.stopListening();
  if (this.clickPad) this.clickPad.stopListening();
};

PlayerControls.prototype.handleInput = function(world) {
  if (this.clickPad) {
    this.clickPad.poll();
  }
  var spirit = world.spirits[this.spiritId];
  if (spirit) {
    spirit.handleInput(this);
  }
};

PlayerControls.prototype.setSpiritId = function(id) {
  this.spiritId = id;
};
