const SPRITES = {
  border1: [0, 0],
  border2: [32, 0],
  player: [64, 0],
  enemy: [96, 0],
  boss: [128, 0],
  snail: [160, 0],
  cheese: [192, 0]
}
const SPRITE_URL = 'url("./sprites.png")';

function spriteNameToStyle(name) {
  const spriteInfo = SPRITES[name];
  return `${SPRITE_URL} ${-spriteInfo[0]}px ${-spriteInfo[1]}px`;
}
