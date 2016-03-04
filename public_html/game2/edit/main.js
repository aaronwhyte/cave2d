var BASE_PATH = ['game2', 'adventures'];
var TOUCHDATE = 'TOUCHDATE';

var fileTree;

function main() {
  fileTree = new FileTree(new RealStorage(localStorage));
  refreshList();
}

function onCreateClicked() {
  var now = new Date();
  var newName = formatTimeString(now);
  touch(newName);
  refreshList();
}

function refreshList() {
  var dir = fileTree.listChildren(BASE_PATH);
  var rowTemplate = document.getElementById('rowTemplate');
  var rows = document.getElementById('rows');
  rows.innerHTML = '';
  for (var i = 0; i < dir.length; i++) {
    var name = dir[i];
    var df = document.createDocumentFragment();
    df.appendChild(rowTemplate.cloneNode(true));
    df.querySelector('a').innerText = name;
    df.querySelector('#copyButton').onclick = createCopyFunction(name);
    df.querySelector('#renameButton').onclick = createRenameFunction(name);
    df.querySelector('#deleteButton').onclick = createDeleteFunction(name);
    rows.appendChild(df);
  }
}

function createDeleteFunction(name) {
  return function() {
    fileTree.deleteDescendants(BASE_PATH.concat([name]));
    refreshList();
  };
}

function createRenameFunction(name) {
  return function() {
    var newName = prompt('Rename ' + name + '\nNew name?');
    if (newName) {
      fileTree.moveDescendants(BASE_PATH.concat([name]), BASE_PATH.concat([newName]));
      refreshList();
    }
  };
}

function createCopyFunction(name) {
  return function() {
    var newName = prompt('Copy ' + name + '\nNew name?');
    if (newName) {
      fileTree.copyDescendants(BASE_PATH.concat([name]), BASE_PATH.concat([newName]));
      refreshList();
    }
  };
}

function touch(name) {
  var touchPath = BASE_PATH.concat([name, TOUCHDATE]);
  fileTree.setFile(touchPath, Date.now());
}

function formatTimeString(date) {
  return date.getFullYear() + '-' +
      padDateNum(date.getMonth() + 1) + '-' +
      padDateNum(date.getDate()) + ' ' +
      padDateNum(date.getHours()) + ':' +
      padDateNum(date.getMinutes()) + ':' +
      padDateNum(date.getSeconds()) + '.' +
      padLeft(date.getMilliseconds(), '0', 4);
}


function padDateNum(num) {
  return padLeft(num, '0', 2);
}

function padLeft(strToPad, paddingChar, padToLength) {
  strToPad = '' + strToPad;
  if (paddingChar.length != 1) {
    throw Error('Expected exactly one character, but got "' + paddingChar + '".');
  }
  var padSize = padToLength - strToPad.length;
  if (padSize <= 0) {
    return strToPad;
  } else {
    return repeatString(paddingChar, padSize) + strToPad;
  }
}

function repeatString(str, count) {
  var out = [];
  for (var i = 0; i < count; i++) {
    out.push(str);
  }
  return out.join('');
}