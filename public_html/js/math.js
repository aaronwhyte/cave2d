if (!Math.sign) {
  // Mozilla's suggested polyfill.
  Math.sign = function sign(x) {
    x = +x; // convert to a number
    if (x === 0 || isNaN(x))
      return x;
    return x > 0 ? 1 : -1
  }
}