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
  business_cupcake: [14, 0],
  merge: [15, 0],
  build: [16, 0],
  info: [17, 0],
  prestige: [18, 0],
  iconAdv: [19, 0],
  iconCul: [0, 1],
  iconAss: [1, 1],
  iconUnk: [2, 1],
  lore: [3, 1],
  crank: [4, 1],
  iconHidden: [5, 1]
}
const SPRITE_PATH = './sprites.png';
const SPRITE_URL = `url("${SPRITE_PATH}")`;

function spriteNameToStyle(name) {
  const spriteInfo = SPRITES[name];
  if (spriteInfo === undefined) {return [];}
  return [
    {property: 'backgroundImage', value: SPRITE_URL},
    {property: 'backgroundColor', value: 'white'},
    {property: 'backgroundPositionX', value: `${-spriteInfo[0] * 32}px`},
    {property: 'backgroundPositionY', value: `${-spriteInfo[1] * 32}px`}
  ];
}

function applySprite(element, spriteName, transparent) {
  const spriteInfo = SPRITES[spriteName];
  if (spriteInfo === undefined) { throw `UNKNOWN SPRITE NAME ${spriteName} USED`; }

  element.style.backgroundImage = SPRITE_URL;
  if (!transparent) {
    element.style.backgroundColor = 'white';
  }
  element.style.backgroundPositionX = `${-spriteInfo[0] * 32}px`;
  element.style.backgroundPositionY = `${-spriteInfo[1] * 32}px`;
}
