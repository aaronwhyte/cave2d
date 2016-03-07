
function main() {
  var basePath = ['game2', 'adventures'];
  var fileTree = new FileTree(new RealStorage(localStorage));
  var adventureList = new AdventureListPage('Game 2', basePath, fileTree);
  adventureList.enterDoc();
}

