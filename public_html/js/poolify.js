/**
 * Adds a static pool, plus alloc and free methods, to a constructor.
 *
 * That constructor's instances must implement "reset()" which clears
 * the instance in preparation for re-use, taking the same arguments
 * as the constructor.
 *
 * @param {Function} ctor A constructor.
 */
function Poolify(ctor) {
  ctor.pool = [];
  ctor.alloc = Poolify.alloc;
  ctor.free = Poolify.free;
  ctor.prototype.free = function() {
    ctor.free(this);
  };
}

Poolify.alloc = function() {
  var retval;
  if (this.pool.length) {
    retval = this.pool.pop();
    retval.reset.apply(retval, arguments);
  } else {
    retval = Object.create(this.prototype);
    this.apply(retval, arguments);
  }
  return retval;
};

Poolify.free = function(o) {
  this.pool.push(o);
};
