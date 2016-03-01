function log(text, color) {
  var div = document.querySelector('#log');
  if (!div) {
    div = document.createElement('div');
    div.id = 'log';
    document.body.appendChild(div);
  }
  div.innerHTML += [
    '<span',
    color ? ' style="color:' + color + '"' : '',
    '>',
    Strings.textToHtml(text, true),
    '</span>'].join('');
}

function logln(text, color) {
  log(text + '\n', color);
}

var TEST_FUNC_NAME_RE = /(function )?(test[a-zA-Z0-9_$]*)/;
function getTestFunctionNameFromStack() {
  var caller = arguments.callee.caller;
  while (caller) {
    var m = TEST_FUNC_NAME_RE.exec(caller.toString());
    if (m) return m[2];
    caller = caller.caller;
  }
  return 'did not find test function name';
}

var failed = false;
function fail(message) {
  failed = true;
  logln('FAILED: ' + message, '#800');
}

function assertEquals(expected, actual) {
  if (expected !== actual) {
    var msg = 'expected: ' + expected + ', actual: ' + actual;
    fail(msg);
    throw msg;
  }
}

function assertJsonEquals(expectedJson, actualJson) {
  var expected = JSON.stringify(expectedJson);
  var actual = JSON.stringify(actualJson);
  if (expected !== actual) {
    var msg = 'expected: ' + expected + ', actual: ' + actual;
    fail(msg);
    throw msg;
  }
}

function assertTrue(val) {
  assertEquals(true, val);
}

function assertStringifyEquals(expected, actual) {
  var expectedStr = JSON.stringify(expected);
  var actualStr = JSON.stringify(actual);
  if (expectedStr !== actualStr) {
    var msg = 'expected:\n' + expectedStr + '\nactual:\n' + actualStr;
    fail(msg);
    throw msg;
  }
}

var tests = [];
function addTest(testFunc) {
  tests.push(testFunc);
}

function runTests() {
  for (var i = 0; i < tests.length; i++) {
    failed = false;
    var test = tests[i];
    logln(test.name + '...');
    tests[i]();
    if (!failed) {
      logln('passed', '#080');
    }
  }
  logln('Finished all tests.');
}

