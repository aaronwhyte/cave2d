function Game5Db() {
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
  a(Game5Key.BULLET, BulletSpirit);

  // props
  a(Game5Key.ENTRANCE, EntranceSpirit, ModelId.ENTRANCE);
  a(Game5Key.EXIT, ExitSpirit, ModelId.EXIT);
  a(Game5Key.MINE, MineSpirit, ModelId.MINE);

  // critters
  a(Game5Key.PLAYER, PlayerSpirit, ModelId.PLAYER);
  a(Game5Key.ANT, AntSpirit, ModelId.ANT);

  // items
  a(Game5Key.SLOW_SHOOTER, SlowShooter, ModelId.SLOW_SHOOTER);
  a(Game5Key.MEDIUM_SHOOTER, MediumShooter, ModelId.MEDIUM_SHOOTER);
  a(Game5Key.LASER_WEAPON, LaserWeapon, ModelId.LASER_WEAPON);
}

Game5Db.prototype.getSpiritCtor = function(key) {
  return this.map.get(key).spiritCtor;
};

Game5Db.prototype.getModelId = function(key) {
  return this.map.get(key).modelId;
};

let g5db = new Game5Db();
