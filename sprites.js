const SPRITES = {
  border1: [0, 0],
  border2: [1, 0],
  player: [2, 0],
  enemy: [3, 0],
  boss: [4, 0],
  snail: [5, 0],
  cheese: [6, 0],
  spot: [7, 0],
  wall: [8, 0],
  business: [9, 0],
  business_limeade: [10, 0],
  business_spam: [11, 0],
  business_dogWash: [12, 0],
  business_taco: [13, 0],
  business_cupcake: [14, 0]
}
const SPRITE_URL = 'url("./sprites.png")';

function spriteNameToStyle(name) {
  const spriteInfo = SPRITES[name];
  if (spriteInfo === undefined) {return '';}
  return `${SPRITE_URL} ${-spriteInfo[0] * 32}px ${-spriteInfo[1] * 32}px, white`;
}
