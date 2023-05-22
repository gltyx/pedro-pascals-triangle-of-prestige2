const WORLD = [
 '?b..$.......x.x.x..x.xxxxxx.....',
 'sB$xxx.m.x..x.x.x.........x.x.x.',
 '..c..xxxxx..x...x..x.xxxx.x.x.x.',
 '.x...x..xx....x.x..x......x.x.x.',
 'px.......x....x..x.x.xxxx.x.x.x.',
 '.xxx.x..x.....x....x......x.x.x.',
 '..x...x..xxxxxx...x.xxxxx.x.x.x.',
 '.mx............x.x...x......x.x.',
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
  'e': CellObjectEnemy, //TODO: should not be able to instantiate this
  'x': CellObjectEnemyWall,
  'c': CellObjectEnemyCheese,
  '$': CellObjectEnemyBusiness,
  'm': CellObjectMerge,
  'B': CellObjectBuild,
  '?': CellObjectInfo,
  'p': CellObjectEnemyPrestige
}

//map enemy cell index into a lore index that it unlocks when defeated
const LORE_UNLOCK_MAP = {
  [`${0 + 0 * 32}`]: 0,
  [`${1 + 0 * 32}`]: 1,
  [`${0 + 1 * 32}`]: 2,
  [`${2 + 1 * 32}`]: 4
};

const LORE = [];
//prefix is one of Adv,Cul,Ass,Unk for adventurer, cultist, assistant
LORE[0] = `Unk:Hello. The three of you have been summoned for an important quest.`;
LORE[1] = `Adv:I'll head into the jungle to search for clues.`;
LORE[2] = `Ass:One friend heads into the jungle, one friend heads into the city, and one friend stays behind at the lab.
This lore item is getting longer and longer and that's ok. I don't mind if it gets quite long.`;
LORE[3] = `Unk:lore 3`;
LORE[4] = `Adv:hello lore 4`;
LORE[5] = `Cul:hello lore 5`;

