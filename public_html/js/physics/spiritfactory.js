/**
 * Builds spirits from JSON using a set of SpiritConfig objects
 * @param {Array.<SpiritConfig>} configs map from spirit type to SpiritConfig
 * @constructor
 */
function SpiritFactory(configs) {
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
      spirit = new spiritConfig.ctor(this);
      spirit.setModelStamp(spiritConfig.stamp);
      spirit.setFromJSON(json);
    } else {
      console.error("Unknown spiritType " + spiritType + " in spirit JSON: " + json);
    }
  }
  return spirit;
};
