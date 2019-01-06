function log(text, color) {
  let div = document.querySelector('#log');
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

let TEST_FUNC_NAME_RE = /(function )?(test[a-zA-Z0-9_$]*)/;
function getTestFunctionNameFromStack() {
  let caller = arguments.callee.caller;
  while (caller) {
    let m = TEST_FUNC_NAME_RE.exec(caller.toString());
    if (m) return m[2];
    caller = caller.caller;
  }
  return 'did not find test function name';
}

let failed = false;
function fail(message) {
  failed = true;
  logln('FAILED: ' + message, '#800');
}

function assertEquals(expected, actual) {
  if (expected !== actual) {
    let msg = 'expected: ' + expected + ', actual: ' + actual;
    fail(msg);
    throw msg;
  }
}

function assertTrue(val) {
  assertEquals(true, val);
}

function assertStringifyEquals(expected, actual) {
  let expectedStr = JSON.stringify(expected);
  let actualStr = JSON.stringify(actual);
  if (expectedStr !== actualStr) {
    let msg = 'expected:\n' + expectedStr + '\nactual:\n' + actualStr;
    fail(msg);
    throw msg;
  }
}

const tests = [];
function addTest(testFunc) {
  tests.push(testFunc);
}

function runTests() {
  for (let i = 0; i < tests.length; i++) {
    failed = false;
    let test = tests[i];
    logln(test.name + '...');
    tests[i]();
    if (!failed) {
      logln('passed', '#080');
    }
  }
  const colors = ['red', '#f80', '#bb0', 'green', 'blue', 'purple', 'brown', 'black'];
  const text = 'All tests passed with flying colors!';
  for (let i = 0; i < text.length; i++) {
    let color = colors[Math.floor(colors.length * i / text.length)];
    log(text.charAt(i), color);
  }
}

