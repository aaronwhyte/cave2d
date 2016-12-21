/**
 * Builds spirits from JSON using a set of SpiritConfig objects
 * @param {Screen} screen to weave into Spirit
 * @param {Array.<SpiritConfig>} configs map from spirit type to SpiritConfig
 * @constructor
 */
function SpiritFactory(screen, configs) {
  this.screen = screen;
  this.configs = configs;
}

/**
 * @param json or null
 * @returns {Spirit} a spirit, or null if the json is null
 */
SpiritFactory.prototype.createSpiritFromJson = function(json) {
  var spirit = null;
  if (json != null) {
    var spiritType = json[0];
    var spiritConfig = this.configs[spiritType];
    if (spiritConfig) {
      spirit = new spiritConfig.ctor(this.screen);
      spirit.setModelStamp(spiritConfig.stamp);
      spirit.setFromJSON(json);
    } else {
      console.error("Unknown spiritType " + spiritType + " in spirit JSON: " + json);
    }
  } else {
    console.warn('createSpiritFromJson called with null JSON!');
  }
  return spirit;
};
