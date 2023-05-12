const WORLD = [
 'bb..$.......x.x.x..x.xxxxxx.....',
 's.$xxx...x..x.x.x.........x.x.x.',
 's.c..xxxxx..x...x..x.xxxx.x.x.x.',
 '.x...x..xx....x.x..x......x.x.x.',
 'cx.......x....x..x.x.xxxx.x.x.x.',
 '.xxx.x..x.....x....x......x.x.x.',
 '..x...x..xxxxxx...x.xxxxx.x.x.x.',
 '..x............x.x...x......x.x.',
 '..xx.x...xxxx...x..x..xxxxxx....',
 '.xxxx.x.x....x...x...x........xx',
 '......x.x.xx.x....x.x........x..',
 '......x.x.x........x..xxxxxxx...',
 'xxx...x.x...x..x.x.xx...........',
 '......x..xx..xx...x..x.......x..',
 'xx.xxxx......xx...xxxx.xxxxxx..x',
 '.......x....x..x.........x....x.',
 'xxxx....x.......xxxxxx.x.x...x..',
 '....x..x.x..x...xx.....x.x..x.x.',
 '......x...x..xx.x..x.x.x.x..x...',
 'x.xxxx..x..xx.x.x.x..x.x.x..x...',
 '......x...x.x.x.x...xx.x.x..x...',
 'x.x.x.xx.x...xx.x.xxx..x.x..x.x.',
 'x.x.x.x.x.............xx.x....x.',
 'x.x.x.x.x..x..x.xxxxxxx..xx...x.',
 'x.x.x.x.x..x..x............x..x.',
 'x.......x..x..xxxxxxxxxx...x.x..',
 'xxxxxxx.x..x..x........x....x...',
 '........x..x..x.........xx......',
 '.xxxxxxx...x..x..xxxxx....x...xx',
 '..........x..x..x........x......',
 '.xxxxxxx.x.....x.x...xxxx...x.x.',
 '.........x....x.............x..e',
];

/*
  approximately 213 empties down each of the 3 paths
  359 blocks
*/

const CHAR_TO_CLASS_MAP = {
  '.': CellObject,
  'b': CellObjectBoss,
  's': CellObjectSpot,
  'e': CellObjectEnemy,
  'x': CellObjectEnemyWall,
  'c': CellObjectEnemyCheese,
  '$': CellObjectEnemyBusiness
}
