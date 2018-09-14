/**
 * @param schema A mapping from field number to field name, like
 * {0: 'foo', 1: 'bar')
 * @constructor
 */
function Jsoner(schema) {
  this.schema = schema;
}

Jsoner.prototype.toJSON = function(that) {
  let json = [];
  for (let fieldNum in this.schema) {
    let fieldName = this.schema[fieldNum];
    let thatVal = that[fieldName];
    let jsonVal;
    if (thatVal && thatVal.toJSON) {
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
  for (let fieldNum in this.schema) {
    if (!(fieldNum in json)) {
      // keep defaults from constructor
      continue;
    }
    let fieldName = this.schema[fieldNum];
    let jsonVal = json[fieldNum];
    if (that[fieldName] && that[fieldName].setFromJSON) {
      that[fieldName].setFromJSON(jsonVal);
    } else if (typeof that[fieldName] == "number" && jsonVal == "Infinity") {
      that[fieldName] = Infinity;
    } else if (typeof that[fieldName] == "number" && jsonVal == "-Infinity") {
      that[fieldName] = -Infinity;
    } else {
      that[fieldName] = jsonVal;
    }
  }
};
