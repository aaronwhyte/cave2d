function Page() {
}

Page.prototype.enterDoc = function() {
};

Page.prototype.exitDoc = function() {
};

Page.prototype.ce = function(type, parent, className) {
  var e = document.createElement(type);
  if (parent) parent.appendChild(e);
  if (className) e.className = className;
  return e;
};