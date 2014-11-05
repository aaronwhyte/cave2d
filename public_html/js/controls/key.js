/**
 * @param {string} name
 * @param {number} keyCode
 * @constructor
 */
function Key(name, keyCode) {
  this.name = name;
  this.keyCode = keyCode;
}

/**
 * Names of keys that don't always have a
 * readable single character representation.
 * @enum {string}
 */
Key.Name = {
  UP: 'up',
  DOWN: 'down',
  LEFT: 'left',
  RIGHT: 'right',
  BACKSPACE: 'backspace',
  DELETE: 'delete',
  SPACE: 'space',
  SEMICOLON: ';',
  BACKSLASH: '\\',
  ESC: 'esc'
};
