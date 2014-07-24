Strings = {};

Strings.REGEXP_ESCAPE_RE_ = /([\{\}\|\^\$\[\]\(\)\.\?\*\+\\\,\:\!])/g;

Strings.AMP_RE_ = /&/g;
Strings.LT_RE_ = /</g;
Strings.SQUOT_RE_ = /'/g;
Strings.DQUOT_RE_ = /"/g;
Strings.EOLN_RE_ = /\n/g;
Strings.TWOSPACE_RE_ = /  /g;

/**
 * Backslash-escapes regexp symbols.  Useful for creating regexps that match
 * literal strings.
 * @param {String} text
 * @return {String} a string for passing to the RegExp constructor
 */
Strings.textToRegExpStr = function(text) {
  return String(text).replace(Strings.REGEXP_ESCAPE_RE_, '\\$1');
};

/**
 * Converts text to HTML, including double-quotes, but not single-quotes.
 * @param {String} text
 * @param {Boolean=} opt_preserveSpaces  if true, nbsp's will replace every
 *     other space in a run of spaces, and br's will replace eolns.
 */
Strings.textToHtml = function(text, opt_preserveSpaces) {
  var html = String(text).
      replace(Strings.AMP_RE_, '&amp;').
      replace(Strings.LT_RE_, '&lt;').
      replace(Strings.DQUOT_RE_, '&quot;');
  if (opt_preserveSpaces) {
    html = html.
        replace(Strings.EOLN_RE_, '<br>').
        replace(Strings.TWOSPACE_RE_, '&nbsp; ');
  }
  return html;
};

/**
 * Converts text to a string that can go between single-quotes in a JS string
 * literal.
 * @param {String} text
 * @return {String} the JS literal, with single-quotes escaped.
 */
Strings.textToSingleQuoteJsLiteral = function(text) {
  return String(text).
      replace(Strings.SQUOT_RE_, '\\\'').
      replace(Strings.EOLN_RE_, '\\n');
};

Strings.replace = function(text, oldStr, newStr) {
  var re = new RegExp(Strings.textToRegExpStr(oldStr), 'g');
  // Ha-ha! Read about "$" here:
  // https://developer.mozilla.org/en/JavaScript/Reference/Global_Objects/String/replace
  var sub = newStr.replace(/\$/g, "$$$$"); // Replaces one dollar-sign with two.
  return text.replace(re, sub);
};

Strings.padLeft = function(strToPad, paddingChar, padToLength) {
  if (paddingChar.length != 1) {
    throw Error('Expected exactly one character, but got "' + paddingChar + '".');
  }
  var padSize = padToLength - strToPad.length;
  if (padSize <= 0) {
    return strToPad;
  } else {
    return Strings.repeat(paddingChar, padSize) + strToPad;
  }
};

Strings.repeat = function(str, count) {
  var out = [];
  for (var i = 0; i < count; i++) {
    out.push(str);
  }
  return out.join('');
};