Dom = {};
Dom.ce  = function(name, opt_parent) {
  var e = document.createElement(name);
  if (opt_parent) {
    opt_parent.appendChild(e);
  }
  return e;
};

Dom.ct = function(text, parent) {
  var e = document.createTextNode(text);
  if (parent) {
    parent.appendChild(e);
  }
  return e;
};
