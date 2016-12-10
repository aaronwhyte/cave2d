/**
 * Single saved game state, for storing in the UndoStack.
 * @param world
 * @param view
 * @constructor
 */
function UndoEntry(world, view) {
  this.world = world;
  this.view = view;
}
