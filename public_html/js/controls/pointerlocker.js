/**
 * Manages pointer-lock based on two factors:
 * <ul>
 *   <li>Whether pointer-lock is useful to the app now
 *   <li>Whether the player wants the pointer locked when it useful
 * @constructor
 */
function PointerLocker() {
  this.lockUseful = false;
  this.lockWanted = false;
  this.elem = document.body;

  let self = this;
  this.lockChangeListener = function(e) {
    self.onLockChange(e);
  };
  this.lockErrorListener = function(e) {
    self.onLockError(e);
  };
  this.clickListener = function(e) {
    self.onClick(e);
  };

  this.listening = false;
}

PointerLocker.BROWSER_PREFIXES = ['', 'moz', 'webkit'];

PointerLocker.prototype.startListening = function() {
  for (let i = 0; i < PointerLocker.BROWSER_PREFIXES.length; i++) {
    let prefix = PointerLocker.BROWSER_PREFIXES[i];
    document.addEventListener(prefix + 'pointerlockchange', this.lockChangeListener, false);
    document.addEventListener(prefix + 'pointerlockerror', this.lockErrorListener, false);
  }
  this.elem.addEventListener('click', this.clickListener);
  this.listening = true;
  return this;
};

PointerLocker.prototype.stopListening = function() {
  for (let i = 0; i < PointerLocker.BROWSER_PREFIXES.length; i++) {
    let prefix = PointerLocker.BROWSER_PREFIXES[i];
    document.removeEventListener(prefix + 'pointerlockchange', this.lockChangeListener, false);
    document.removeEventListener(prefix + 'pointerlockerror', this.lockErrorListener, false);
  }
  this.elem.removeEventListener('click', this.clickListener);
  this.listening = false;
  return this;
};

/**
 * Call from a mouse click event stack
 * @param u
 */
PointerLocker.prototype.setUseful = function(u) {
  if (u !== this.lockUseful) {
    this.setUsefulAndWanted(u, this.lockWanted);
  }
  return this;
};

/**
 * Call from a mouse click event stack
 * @param w
 */
PointerLocker.prototype.setWanted = function(w) {
  this.setUsefulAndWanted(this.lockUseful, w);
  return this;
};


PointerLocker.prototype.setUsefulAndWanted = function(u, w) {
  let oldLock = this.isLocked();
  this.lockUseful = u;
  this.lockWanted = w;
  let newLock = this.lockUseful && this.lockWanted;
  if (!oldLock && newLock) {
    this.lock();
  } else if (oldLock && !newLock) {
    this.unlock();
  }
};

PointerLocker.prototype.lock = function() {
  if (this.elem.requestPointerLock) {
    this.elem.requestPointerLock();
  }
};

PointerLocker.prototype.unlock = function() {
  if (document.exitPointerLock) {
    document.exitPointerLock();
  }
};

PointerLocker.prototype.isLocked = function() {
  return document.pointerLockElement ||
      document.mozPointerLockElement ||
      document.webkitPointerLockElement;
};

PointerLocker.prototype.onLockChange = function(e) {
  if (this.lockUseful && this.lockWanted && !this.isLocked()) {
    // User probably hit "esc" to break the lock. Remember that they don't want the lock now.
    this.lockWanted = false;
  }
};

PointerLocker.prototype.onLockError = function(e) {
  console.warn('PointerLocker.onLockError: ' + e);
};

PointerLocker.prototype.onClick = function(e) {
  if (this.lockUseful) {
    this.setWanted(true);
  }
};