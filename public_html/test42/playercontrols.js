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

PlayerControls.prototype.handleInput = function(world) {
  var spirit = world.spirits[this.spiritId];
  if (spirit) {
    spirit.handleInput(this);
  }
};

PlayerControls.prototype.setSpiritId = function(id) {
  this.spiritId = id;
};
