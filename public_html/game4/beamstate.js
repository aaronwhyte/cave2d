BeamState = {
  OFF: 'o',
  SEEKING: 's',
  DRAGGING: 'd',
  WIELDING: 'w',
  ACTIVATING: 'a',
  EJECTING: 'e'
};

BeamState.isOutputish = function(state) {
  return state === BeamState.WIELDING || state === BeamState.ACTIVATING || state === BeamState.EJECTING;
};

BeamState.isAimLocked = function(state) {
  return state === BeamState.ACTIVATING;
};
