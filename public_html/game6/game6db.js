function Game6Db() {
  this.map = new Map();

  let self = this;
  function a(key, spiritCtor, opt_modelId) {
    let modelId = opt_modelId || null;
    self.map.set(key, {
      key: key,
      spiritCtor: spiritCtor,
      modelId: modelId
    });
  }

  // without models
  a(Game6Key.BULLET, BulletSpirit);

  // props
  a(Game6Key.ENTRANCE, EntranceSpirit, ModelId.ENTRANCE);
  a(Game6Key.EXIT, ExitSpirit, ModelId.EXIT);
  a(Game6Key.MINE, MineSpirit, ModelId.MINE);

  // critters
  a(Game6Key.PLAYER, PlayerSpirit, ModelId.PLAYER);
  a(Game6Key.ANT, AntSpirit, ModelId.ANT);

  // items
  a(Game6Key.SLOW_SHOOTER, SlowShooter, ModelId.SLOW_SHOOTER);
  a(Game6Key.MEDIUM_SHOOTER, MediumShooter, ModelId.MEDIUM_SHOOTER);
  a(Game6Key.LASER_WEAPON, LaserWeapon, ModelId.LASER_WEAPON);
}

Game6Db.prototype.getSpiritCtor = function(key) {
  return this.map.get(key).spiritCtor;
};

Game6Db.prototype.getModelId = function(key) {
  return this.map.get(key).modelId;
};

let g5db = new Game6Db();
