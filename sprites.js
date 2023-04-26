const SPRITES = {
  border1: [0, 0],
  border2: [32, 0],
  player: [64, 0],
  enemy: [96, 0]
}
const SPRITE_URL = 'url(./sprites.png)';

function spriteNameToStyle(name) {
  const spriteInfo = SPRITES[name];
  return `${SPRITE_URL} -${spriteInfo[0]}px -${spriteInfo[1]}px`;
}
