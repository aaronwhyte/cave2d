/**
 * @param schema A mapping from field number to field name, like
 * {0: 'foo', 1: 'bar')
 * @constructor
 */
function Jsoner(schema) {
  this.schema = schema;
}

Jsoner.prototype.toJSON = function(that) {
  var json = [];
  for (var fieldNum in this.schema) {
    var fieldName = this.schema[fieldNum];
    var thatVal = that[fieldName];
    var jsonVal;
    if (thatVal instanceof Vec2d) {
      jsonVal = thatVal.toJSON();
    } else if (thatVal instanceof Vec4) {
      jsonVal = thatVal.toJSON();
    } else if (thatVal == Infinity) {
      // JSON spec doesn't include Infinity :-(
      jsonVal = "Infinity";
    } else if (thatVal == -Infinity) {
      jsonVal = "-Infinity";
    } else {
      jsonVal = thatVal;
    }
    json[fieldNum] = jsonVal;
  }
  return json;
};

Jsoner.prototype.setFromJSON = function(json, that) {
  for (var fieldNum in this.schema) {
    var fieldName = this.schema[fieldNum];
    var jsonVal = json[fieldNum];
    if (that[fieldName] instanceof Vec2d) {
      that[fieldName].set(Vec2d.fromJSON(jsonVal));
    } else if (that[fieldName] instanceof Vec4) {
      that[fieldName].set(Vec4.fromJSON(jsonVal));
    } else if (typeof that[fieldName] == "number" && jsonVal == "Infinity") {
      that[fieldName] = Infinity;
    } else if (typeof that[fieldName] == "number" && jsonVal == "-Infinity") {
      that[fieldName] = -Infinity;
    } else {
      that[fieldName] = jsonVal;
    }
  }
};
