Dom = {};

/**
 * create element
 * @param {string} type like "DIV"
 * @param {HTMLElement} parent
 * @param {string} className
 * @returns {HTMLElement}
 */
Dom.ce = function(type, parent, className) {
  var e = document.createElement(type);
  if (parent) parent.appendChild(e);
  if (className) e.className = className;
  return e;
};

Dom.requestFullScreen = function() {
  var elem = document.body;
  if (elem.requestFullscreen) {
    elem.requestFullscreen();
  } else if (elem.msRequestFullscreen) {
    elem.msRequestFullscreen();
  } else if (elem.mozRequestFullScreen) {
    elem.mozRequestFullScreen();
  } else if (elem.webkitRequestFullscreen) {
    elem.webkitRequestFullscreen();
  }
};

