function Game5Db() {
  this.map = new Map();

  let self = this;
  function a(key, spiritCtor, opt_modelId, opt_itemCtor) {
    let itemCtor = opt_itemCtor || null;
    let modelId = opt_modelId || null;
    self.map.set(key, {
      key: key,
      spiritCtor: spiritCtor,
      modelId: modelId,
      itemCtor: itemCtor
    });
  }

  // without models or items
  a(Game5Key.BULLET, BulletSpirit);

  // non-item spirits with models (for the editor menu)
  a(Game5Key.ENTRANCE, EntranceSpirit, ModelId.ENTRANCE);
  a(Game5Key.EXIT, ExitSpirit, ModelId.EXIT);
  a(Game5Key.PLAYER, PlayerSpirit, ModelId.PLAYER);
  a(Game5Key.ANT, AntSpirit, ModelId.ANT);

  // items, whose models show up in menus and other places
  a(Game5Key.SLOW_SHOOTER, SlowShooterItemSpirit, ModelId.SLOW_SHOOTER, SlowShooterItem);
  a(Game5Key.MEDIUM_SHOOTER, MediumShooterItemSpirit, ModelId.MEDIUM_SHOOTER, MediumShooterItem);
  a(Game5Key.LASER_WEAPON, LaserWeaponItemSpirit, ModelId.LASER_WEAPON, LaserWeaponItem);
}

Game5Db.prototype.getSpiritCtor = function(key) {
  return this.map.get(key).spiritCtor;
};

Game5Db.prototype.getItemCtor = function(key) {
  return this.map.get(key).itemCtor;
};

Game5Db.prototype.getModelId = function(key) {
  return this.map.get(key).modelId;
};

let g5db = new Game5Db();
