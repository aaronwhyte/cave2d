/**
 * An immutable reversible change operation, from "before" state to "after" state.
 * @param {String} type tells a ChangeOp consumer where to route each change, to apply it.
 * @param {String} id which uniquely identifies the object
 * @param {Object} beforeState represents the state before the change
 * @param {Object} afterState represents the state after the change
 * @param {=Rect} opt_beforeRect the bounding rect, in world coords, of the "before" state
 * @param {=Rect} opt_afterRect the bounding rect, in world coords, of the "after" state
 * @constructor
 */
function ChangeOp(type, id, beforeState, afterState, opt_beforeRect, opt_afterRect) {
  this.type = type;
  this.id = id;
  this.beforeState = beforeState;
  this.afterState = afterState;
  this.beforeRect = opt_beforeRect || null;
  this.afterRect = opt_afterRect || null;
}

ChangeOp.prototype.createReverse = function() {
  return new ChangeOp(this.type, this.id, this.afterState, this.beforeState, this.afterRect, this.beforeRect);
};
