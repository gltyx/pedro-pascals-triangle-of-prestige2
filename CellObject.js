"use strict";

//total reward from all enemies is about 1.2e8
//power of snail is about 8.2e11
//power factor at snail is about 5.1e-2
const strengthDistFactor = 1.5; //how much harder enemies get per dist (factor^dist)
const rewardDistFactor = 1.3;   //how much more reward you get per dist (factor^dist)
const powerDistFactor = 0.95;   //how much immunity enemies have per dist (factor^(dist - 4))
const activeFactor = 0.5;      //how much harder active enemies are than normal

class CellObject {
  constructor(cell, dist, bgSpriteName) {
    this.cell = cell;
    this.state = {type: 'none'};
    this.bgSpriteName = bgSpriteName ?? 'border1';
    this.updateBackground(cell);
    this.percent = 0;
    this.UI = {};
    this.blocking = false;
    this.dist = dist;
  }

  getSaveObj() {
    return this.state;
  }

  loadFromObj(saveObject) {
    this.state = {...this.state, ...saveObject};
    this.fixInfinities(this.state);
  }

  postLoad() {
  }

  fixInfinities(o) {
    Object.keys(o).forEach( k => {
      if (typeof o[k] === 'object' && o[k] !== null) {
        this.fixInfinities(o[k]);
      } else {
        if (o[k] === null) {
          o[k] = Infinity;
        }
      }
    });
  }

  update(curTime, neighbors) { }

  draw(cell, progress) {
    const effectivePercent = this.percent >= 100 ? 0 : this.percent;
    const percentStr = `${Math.ceil(effectivePercent)}%`;
    this.updateStyle(progress.style, 'width', percentStr);
    this.cell = cell;
  }

  updateBackground(cell) {
    applySprite(cell, this.bgSpriteName);
    if (this.bgColor !== undefined) {
      cell.style.backgroundColor = this.bgColor;
    }

  }

  displayCellInfo(container) {
    container.innerText = '-';
  }

  isDragable() {
    return false;
  }

  isDropable(srcObject) {
    return true;
  }

  initGame(gameContainer) {
    gameContainer.innerHTML = '';
    this.UI = {};
  }

  closeGame() { }

  drawGame() { }

  createElement(type, id, parent, classes, text) { 
    const e = document.createElement(type); 

    if (id !== undefined && id !== '') {
      e.id = id; 
      if (id in this.UI) { 
        throw `attempt to recreate element with id ${id}`;
      }
      this.UI[id] = e;
    }



    if (parent !== undefined) {
      parent.appendChild(e); 
    }

    if (text !== undefined && text !== '') {
      e.innerText = text.toString().replaceAll(/\n/g, ''); 
    }

    if (classes !== undefined && classes.length > 0) {
      classes.split`,`.forEach( className => {
        e.classList.add(className);
      }); 
    }

    return e; 
  } 

  updateStyle(styleObj, styleName, styleValue) {
    if (styleObj[styleName] !== styleValue) {
      styleObj[styleName] = styleValue;
    }
  }

  roundToVal(value, roundType, roundVal) {
    //if (roundType === undefined) {roundType = 'round';}
    return Math[roundType](value / roundVal) * roundVal;
  }

  roundExp(val, roundType) {
    if (Math.abs(val) === Infinity) {return val.toString();}
    const e = Math.floor(Math.log10(val));
    const m = val / Math.pow(10.0, e);
    const roundm = this.roundToVal(m, roundType, 0.001);
    const result = `${roundm.toFixed(3)}e+${e}`;
    return result;
  }

  formatCurrency(value, roundType = 'round') {
    return this.formatValue(value, roundType, '$');
  }

  formatValue(value, roundType, prefix = '', suffix = '') {
    if (value < 1000) {
      return `${prefix}${this.roundToVal(value, roundType, 0.01).toFixed(2)}${suffix}`;
    } else {
      //return `${prefix}${value.toExponential(3)}${suffix}`;
      return `${prefix}${this.roundExp(value, roundType)}${suffix}`;
    }
  }
}

class CellObjectEnemy extends CellObject {
  constructor(cell, dist, bgSpriteName) {
    super(cell, dist, bgSpriteName ?? 'snail');
    this.blocking = true;
    this.state.type = 'enemy';
    this.percent = 100;
    this.state.enemyPower = 1;
    this.tPower = undefined;
    this.dPower = undefined;
    this.ePower = undefined;
  }

  update(curTime, neighbors) {
    this.curTime = curTime;
    const forceLast = this.tPower === undefined;
    this.lasttPower = this.tPower;
    this.lastdPower = this.dPower;
    this.lastePower = this.ePower;
    this.tPower = 0;
    this.dPower = 0;
    this.ePower = 0;

    for (let i = 0; i < neighbors.length; i++) {
      const ns = neighbors[i].content.state;
      this.tPower += ns.tickPower ?? 0;
      this.dPower += ns.disPower ?? 0;
      this.ePower += ns.enemyPower ?? 0;
    }

    this.tPower = this.tPower * Math.pow(powerDistFactor, (this.dist - 4));
    this.dPower = this.dPower * Math.pow(powerDistFactor, (this.dist - 4));

    if (this.ePower > 0) {
      this.dPower = 0;
    }

    if (forceLast) {
      this.lasttPower = this.tPower;
      this.lastdPower = this.dPower;
      this.lastePower = this.ePower;
    }
  }

  displayCellInfo(container) {
    container.innerText = `Enemy Details - Dist: ${this.dist} T: ${this.formatValue(this.tPower, 'floor')} D: ${this.formatValue(this.dPower, 'floor')} E: ${this.ePower} Rem: ${this.formatValue(Math.max(0, this.percent), 'ceil')}`;
  }

  isDropable(srcObject) {
    return false;
  }

  initGame(gameContainer) {
    super.initGame(gameContainer);
  }
}

class CellObjectSpot extends CellObject {
  constructor(cell, dist) {
    super(cell, dist, 'spot');
    this.state.type = 'spot';
    this.state.tickPower = 1;
    this.state.disPower = 0;
    this.cursor = 'grab';
  }

  displayCellInfo(container) {
    container.innerText = `SPOT details - T: ${this.formatValue(this.state.tickPower, 'floor')}`;
  }

  postLoad() {
    const tickOOM = Math.log10(this.state.tickPower);
    const h = (tickOOM * 30) % 360;
    const s = 30 + (tickOOM % 1) * 70;
    const l = 50;
    this.bgColor = `hsl(${h},${s}%,${l}%)`;
    this.updateBackground(this.cell);
  }

  isDragable() {
    return true;
  }

  isDropable(srcObject) {
    return false;
  }

  update(curTime, neighbors) {
    if (this.merged) {
      //merged, trigger removal
      return {merged: true};
    }
  }
}

class CellObjectBoss extends CellObject {
  constructor(cell, dist) {
    super(cell, dist, 'boss');
    this.state.type = 'boss';
    this.state.tickPower = 0;
    this.state.disPower = 1;
    this.cursor = 'grab';
  }

  displayCellInfo(container) {
    container.innerText = `BOSS details - D: ${this.formatValue(this.state.disPower, 'floor')}`;
  }

  postLoad() {
    const tickOOM = Math.log10(this.state.disPower);
    const h = (tickOOM * 30) % 360;
    const s = 30 + (tickOOM % 1) * 70;
    const l = 50;
    this.bgColor = `hsl(${h},${s}%,${l}%)`;
    this.updateBackground(this.cell);
  }

  isDragable() {
    return true;
  }

  isDropable(srcObject) {
    return false;
  }

  update(curTime, neighbors) {
    if (this.merged) {
      //merged, trigger removal
      return {merged: true};
    }
  }
}

class CellObjectEnemyWall extends CellObjectEnemy {
  constructor(cell, dist) {
    super(cell, dist, 'wall');
    this.state.type = 'wall';
    this.baseStrength = 10 * Math.pow(strengthDistFactor, dist);
    this.state.enemyPower = 0;
    this.state.start = Infinity;
    this.state.strength = this.baseStrength;
    this.state.clicks = 0;
  }

  update(curTime, neighbors) {
    super.update(curTime, neighbors);
    const clickScale = 0.10;

    //if disassembly power has changed and disassembly has already started
    if (this.dPower !== this.lastdPower && this.state.start < Infinity) {
      //if was already disassembling, save the previous time
      if (this.lastdPower > 0) {
        this.state.strength = this.state.strength - (curTime - this.state.start) * this.lastdPower - (this.state.clicks * this.lastdPower * clickScale);
        this.state.clicks = 0;
      }
      //if already started, set the new base time to now
      if (this.state.start !== Infinity) {
        this.state.start = curTime;
      }
    } else {
      //start disassembly automatically if not already started and dPower > 0
      if (this.dPower > 0 && this.state.start === Infinity) {
        this.state.start = curTime;
      }
    }

    this.timeRem = (this.state.strength - (this.state.clicks * this.dPower * clickScale)) / (this.dPower) - (curTime - this.state.start);
    this.fractionRemaining = this.timeRem / this.state.strength;
    if (this.state.start < Infinity) {
      this.percent = 100 * ((this.state.strength - (this.state.clicks * this.dPower * clickScale)) - (curTime - this.state.start) * (this.dPower)) / this.baseStrength;
    } else {
      this.percent = 100;
    }

    if (this.timeRem <= 0) {
      //game over, return spoils
      return {
        //tpoints: 1 * Math.pow(rewardDistFactor, this.dist),
        dpoints: 1 * Math.pow(rewardDistFactor, this.dist)
      };
    }

  }

  displayCellInfo(container) {
    super.displayCellInfo(container);

    if (this.state.start !== undefined) {
      this.UI.timeRem.innerText = Math.ceil(this.timeRem);
    } else {
      this.UI.timeRem.innerText = 'never';
    }

    this.UI.neighborCount.innerText = `${this.ePower} neighboring enemies`;

    const ctx = this.ctx;
    //ctx.fillStyle = 'hsl(205,36%,68%)';
    ctx.fillStyle = 'hsl(60, 48%, 76%)';
    ctx.fillRect(0, 0, this.UI.canvas.width, this.UI.canvas.height);

    ctx.strokeStyle = 'black';
    const blockPercent = 100 * 1 / (12 * 12);
    for (let yi = 0; yi < 12; yi++) {
      for (let xi = 0; xi < 12; xi++) {
        const p = 100 * (yi * 12 + xi) / (12 * 12);
        if ((100 - p) <= this.percent) {
          ctx.drawImage(this.UI.sprites, SPRITES.wall[0] * 32, SPRITES.wall[1] * 32, 32, 32, xi * 32, yi * 32, 32, 32);
        } else {
          const pnext = 100 * ( yi * 12 + xi + 1 ) / (12 * 12);
          if ((100 - pnext) <= this.percent) {
            ctx.fillStyle = 'green';
            const pdiff = this.percent - (100 - pnext);
            const fillFrac = pdiff / blockPercent;
            const fillHeight = fillFrac * 32;
            ctx.drawImage(this.UI.sprites, SPRITES.wall[0] * 32, SPRITES.wall[1] * 32, 32, 32, xi * 32, (yi + 1) * 32 - fillHeight, 32, 32);
          }
        }
      }
    }
  }

  initGame(gameContainer) {
    super.initGame(gameContainer);
    this.createElement('span', '', gameContainer, '', 'Disassembling ');
    this.createElement('span', 'timeRem', gameContainer, '', '');
    this.createElement('span', '', gameContainer, '', ' more seconds');
    this.createElement('div', 'neighborCount', gameContainer);

    const canvas = this.createElement('canvas', 'canvas', gameContainer, 'wallCanvas');
    canvas.width = '384';
    canvas.height = '384';
    this.ctx = canvas.getContext('2d');
    canvas.onclick = () => this.canvasClick();

    this.UI.sprites = document.getElementById('sprites');
  }

  canvasClick() {
    if (this.dPower > 0) {
      this.state.clicks++;
    }
  }

}

class CellObjectEnemyCheese extends CellObjectEnemy {
  constructor(cell, dist) {
    super(cell, dist, 'cheese');
    this.state.type = 'enemyCheese';
    this.baseStrength = 10 * Math.pow(strengthDistFactor, dist);
    this.state.start = Infinity;
    this.state.milk = 0;
    this.state.strength = this.baseStrength;
  }

  update(curTime, neighbors) {
    super.update(curTime, neighbors);

    if (this.tPower !== this.lasttPower && this.state.start < Infinity) {
      if (this.lasttPower > 0) {
        this.state.strength = this.state.strength - (curTime - this.state.start) * this.lasttPower;
      }
      if (this.state.start !== Infinity) {
        this.state.start = curTime;
      }
    }

    this.ferment = (this.state.strength / this.tPower) - (curTime - this.state.start);// * this.tPower;
    if (this.state.start < Infinity) {
      this.percent = 100 * (this.state.strength - (curTime - this.state.start) * this.tPower) / this.baseStrength;
    } else {
      this.percent = 100;
    }

    if (this.ferment <= 0) {
      //game over, return spoils
      return {
        tpoints: 1 * Math.pow(rewardDistFactor, this.dist),
      };
    }
  }

  displayCellInfo(container) {
    super.displayCellInfo(container);

    this.UI.milk.innerText = this.state.milk;
    if (this.state.start !== undefined) {
      this.UI.ferment.innerText = Math.ceil(this.ferment);
    } else {
      this.UI.ferment.innerText = 'never';
    }
  }

  initGame(gameContainer) {
    super.initGame(gameContainer);
    this.createElement('span', 'milk', gameContainer, '', 'MILK');
    this.createElement('span', '', gameContainer, '', ' gallons of milk ');
    this.createElement('a', 'hmilk', gameContainer, '', 'milk the cow').href = '#';
    this.createElement('br', '', gameContainer);
    this.createElement('span', '', gameContainer, '', '0');
    this.createElement('span', '', gameContainer, '', ' chunks of cottage cheese ');
    this.createElement('span', '', gameContainer, '', '(fermenting ');
    this.createElement('span', 'ferment', gameContainer, '', 'FERMENT');
    this.createElement('span', '', gameContainer, '', ' more seconds)');
    this.createElement('br', '', gameContainer);
    this.createElement('span', '', gameContainer, '', 'Note: There is nothing else to get after cottage cheese. There is not much content in this game. Please stop asking.');

    this.UI.hmilk.onclick = () => this.clickmilk();
  }

  clickmilk() {
    if (this.state.start === Infinity) {
      this.state.start = (new Date()).getTime() / 1000;
    }
    this.state.milk++;
  }
}

class CellObjectEnemyBusiness extends CellObjectEnemy {

  /*
  static levelInfo = {
    limeade: {priceBase: 4,      priceFactor: 1.07, revenue: 1,     duration: 1},
    spam:    {priceBase: 60,     priceFactor: 1.15, revenue: 60,    duration: 5},
    dogWash: {priceBase: 720,    priceFactor: 1.14, revenue: 540,   duration: 10},
    taco:    {priceBase: 8640,   priceFactor: 1.13, revenue: 4320,  duration: 20},
    cupcake: {priceBase: 103680, priceFactor: 1.12, revenue: 51840, duration: 40}
  };
  */
  /*
    at the beginning, goal is 253, powerDistFactor is 1, tPower is 1
    at the end, goal is 1.2e12, powerDistFactor is 5.95e-2, tPower is 1e8
  */
  /*
  static levelInfo = {
    limeade: {priceBase: 4,      priceFactor: 1.07, revenue: 1,       duration: 1},
    spam:    {priceBase: 300,    priceFactor: 1.15, revenue: 60e0,    duration: 5e2},
    dogWash: {priceBase: 3240,   priceFactor: 1.14, revenue: 540e2,   duration: 10e4},
    taco:    {priceBase: 30240,  priceFactor: 1.13, revenue: 4320e4,  duration: 20e6},
    cupcake: {priceBase: 414720, priceFactor: 1.12, revenue: 51840e6, duration: 40e8}
  };
  */
  static levelInfo = {
    limeade: {priceBase: 4,         priceFactor: 1.17, revenue: 1,      duration: 1},
    spam:    {priceBase: 240,       priceFactor: 1.17, revenue: 60,     duration: 5e2},
    dogWash: {priceBase: 19200,     priceFactor: 1.17, revenue: 5.4e4,  duration: 1e5},
    taco:    {priceBase: 1920000,   priceFactor: 1.17, revenue: 5.4e7,  duration: 2e7},
    cupcake: {priceBase: 230400000, priceFactor: 1.17, revenue: 8.1e10, duration: 4e9}
  };

  static levelOrder = ['limeade', 'spam', 'dogWash', 'taco', 'cupcake'];

  static durationFactorMilestones = [25, 50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 1000];

  constructor(cell, dist) {
    super(cell, dist, 'business');
    this.state.type = 'enemyBusiness';
    this.baseStrength = this.roundToVal(activeFactor * 100 * Math.pow(strengthDistFactor, dist), 'round', 0.01);
    this.state.start = Infinity;
    this.state.strength = this.baseStrength;
    this.state.cash = 0;

    this.state.level = {};
    this.levelPercent = {};
    this.timeRemaining = {};
    CellObjectEnemyBusiness.levelOrder.forEach( level => {
      const state = {};
      state.count = 0;
      state.start = Infinity;
      state.previousProgress = 0;

      this.state.level[level] = state;
      this.levelPercent[level] = '0%';
      this.timeRemaining[level] = '';
    });

    this.clickStart = undefined;
    this.buyStart = undefined;
    this.clickHoldDuration = 0.5;
  }

  closeGame() {
    super.closeGame();
    this.clickStart = undefined;
    this.buyStart = undefined;
  }

  update(curTime, neighbors) {
    super.update(curTime, neighbors);

    if (this.clickStart !== undefined) {
      this.startLevel(this.clickStart);
    }

    if (this.buyStart !== undefined && (curTime >= this.buyStartTime + this.clickHoldDuration)) {
      this.buy(this.buyStart);
    }

    CellObjectEnemyBusiness.levelOrder.forEach( level => {
      const state = this.state.level[level];
      const levelDuration = CellObjectEnemyBusiness.levelInfo[level].duration * this.getDurationFactor(level) / this.tPower;

      if (this.tPower > 0) {
        let a = 1;
      }

      //if tick power has changed and this level has already started
      if (this.tPower !== this.lasttPower && state.start < Infinity) {
        //save previous progress
        state.previousProgress += (curTime - state.start) * this.lasttPower;
        //change start to now
        state.start = curTime;
      }

      //const curDuration = Math.max(0, curTime - state.start) * this.tPower + state.previousProgress;
      const curDuration = Math.max(0, curTime - state.start) + state.previousProgress;

      if (curDuration >= levelDuration) {
        state.start = Infinity;
        state.previousProgress = 0;
        this.state.cash += CellObjectEnemyBusiness.levelInfo[level].revenue * state.count;
        this.levelPercent[level] = '0%';
        this.timeRemaining[level] = levelDuration;
      } else {
        this.levelPercent[level] = `${Math.round(100 * Math.min(1, curDuration / (levelDuration)))}%`;
        this.timeRemaining[level] = Math.max(0, (levelDuration) - curDuration);
      }

    });

    this.percent = 100 * (1 - this.state.cash / this.baseStrength);

    if (this.percent <= 0) {
      //game over, return spoils
      return {
        tpoints: 1 * Math.pow(rewardDistFactor, this.dist),
      };
    }
  }

  displayCellInfo(container) {
    super.displayCellInfo(container);
    const cash = this.state.cash;

    this.UI.cash.innerText = `${this.formatCurrency(cash, 'floor')} / ${this.formatCurrency(this.baseStrength, 'ceil')}` ;

    const buyCount = 1;
    CellObjectEnemyBusiness.levelOrder.forEach( level => {
      const state = this.state.level[level];
      this.updateStyle(this.UI[`levelProgress${level}`].style, 'width', this.levelPercent[level]);
      this.UI[`levelCount${level}`].innerText = `${state.count}/${this.getNextMilestone(level)}`;
      if (cash >= this.getPrice(level, buyCount)) {
        this.UI[`levelBuy${level}`].classList.remove('divButtonDisabled');
      } else {
        this.UI[`levelBuy${level}`].classList.add('divButtonDisabled');
      }
      if (state.count > 0 && state.start === Infinity && this.tPower > 0) {
        this.UI[`leftSide${level}`].classList.remove('divButtonDisabled');
      } else {
        this.UI[`leftSide${level}`].classList.add('divButtonDisabled');
      }
      this.UI[`levelTimer${level}`].innerText = this.formatTimeRemaining(this.timeRemaining[level]);
    });
  }

  initGame(gameContainer) {
    super.initGame(gameContainer);
    this.createElement('div', 'cash', gameContainer, '', '$100.00');

    const wrapper = this.createElement('div', '', gameContainer);
    wrapper.style.display = 'grid';
    wrapper.style.gridTemplateColumns = '1fr';
    wrapper.style.gridRowGap = '0.5em';

    const buyCount = 1;
    CellObjectEnemyBusiness.levelOrder.forEach( level => {
    /*
      image                progressBar
      curCount/nextCount   buyButton timer 

      click image to start progress bar
    */
      //TODO: get the styles into CSS
      const levelRow = this.createElement('div', '', wrapper);
      levelRow.style.display = 'grid';
      levelRow.style.gridTemplateColumns = '5em 1fr';
      levelRow.style.columnGap = '0.5em';
      const leftSide = this.createElement('div', `leftSide${level}`, levelRow);
      leftSide.style.display = 'grid';
      leftSide.style.gridTemplateColumns = '1fr';
      leftSide.style.justifyItems = 'center';
      leftSide.style.background = 'white';
      this.clickStart = undefined;
      leftSide.onpointerdown = () => {this.clickStart = level;};
      leftSide.onpointerup = () => {this.clickStart = undefined;};
      leftSide.classList.add('divButton');

      const rightSide = this.createElement('div', '', levelRow);
      rightSide.style.display = 'grid';
      rightSide.style.gridTemplateColumns = '1fr';

      const levelIcon = this.createElement('div', '', leftSide);
      levelIcon.style.width = '32px';
      levelIcon.style.height = '32px';
      //levelIcon.style.background = spriteNameToStyle(`business_${level}`);
      applySprite(levelIcon, `business_${level}`);

      const levelCount = this.createElement('div', `levelCount${level}`, leftSide, '', `${this.state.level[level].count}/${this.getNextMilestone(level)}`);

      const progressContainer = this.createElement('div', '', rightSide);
      progressContainer.style.width = '100%';
      progressContainer.style.backgroundColor = 'beige';
      progressContainer.style.position = 'relative';
      const progress = this.createElement('div', `levelProgress${level}`, progressContainer);
      progress.style.height = '100%';
      progress.style.backgroundColor = 'green';
      progress.style.width = '50%';
      progress.style.transition = 'width 0.1s';
      const revenue = this.createElement('div', `levelRevenue${level}`, progressContainer, '', `${this.formatCurrency(CellObjectEnemyBusiness.levelInfo[level].revenue * this.state.level[level].count, 'floor')}`);
      revenue.style.position = 'absolute';
      revenue.style.top = '0px';
      revenue.style.textAlign = 'center';
      revenue.style.width = '100%';
      const rightBottom = this.createElement('div', '', rightSide);
      rightBottom.style.display = 'grid';
      rightBottom.style.gridTemplateColumns = '1fr 7em';
      const buyContainer = this.createElement('div', `levelBuy${level}`, rightBottom);
      buyContainer.style.display = 'grid';
      buyContainer.style.gridTemplateColumns = '3em 1fr';
      buyContainer.style.backgroundColor = 'orange';
      buyContainer.style.alignItems = 'center';
      this.buyStart = undefined;
      buyContainer.onpointerdown = () => {this.buyStart = level; this.buyStartTime = this.curTime;};
      buyContainer.onpointerup = () => {
        if ((this.buyStart in this.state.level) && (this.curTime < (this.buyStartTime + this.clickHoldDuration))) {
          this.buy(this.buyStart);
        }
        this.buyStart = undefined;
      };
      buyContainer.classList.add('divButton');
      this.createElement('span', '', buyContainer, '', 'Buy');
      const cost = this.createElement('span', `levelCost${level}`, buyContainer, '', this.formatCurrency(this.getPrice(level, buyCount), 'ceil'));
      cost.style.textAlign = 'right';
      const progressTimer = this.createElement('div', `levelTimer${level}`, rightBottom, '', '00:00:00');
      progressTimer.style.textAlign = 'center';
      progressTimer.style.display = 'grid';
      progressTimer.style.alignItems = 'center';

    });
    
  }

  startLevel(level) {
    const state = this.state.level[level];
    if (state.count > 0 && state.start == Infinity && this.tPower > 0) {
      state.start = (new Date()).getTime() / 1000;
      state.previousProgress = 0;
    }
  }

  getPrice(level, count) {
    const curNum = this.state.level[level].count;
    if (level === 'limeade' && curNum === 0 && count === 1) {
      return 0;
    }
    const base = CellObjectEnemyBusiness.levelInfo[level].priceBase;
    const factor = CellObjectEnemyBusiness.levelInfo[level].priceFactor;
    return this.roundToVal(base * (Math.pow(factor, curNum + count) - Math.pow(factor, curNum)) / (factor - 1), 'round', 0.01);
  }

  getDurationFactor(level) {
    const curNum = this.state.level[level].count;
    let i = 0;
    for (;i < CellObjectEnemyBusiness.durationFactorMilestones.length; i++) {
      if (curNum < CellObjectEnemyBusiness.durationFactorMilestones[i]) {
        break;
      }
    }
    return Math.pow(0.5, i);
  }

  getNextMilestone(level) {
    const curNum = this.state.level[level].count;
    const milestones = CellObjectEnemyBusiness.durationFactorMilestones;
    let i = 0;
    for (;i < milestones.length; i++) {
      if (curNum < milestones[i]) {
        break;
      }
    }
    if (i < milestones.length) {
      return milestones[i];
    } else {
      return '-';
    }
    
  }

  formatTimeRemaining(time) {
    if (time === Infinity) { return 'Infinity'; }
     
    const h = Math.floor(time / 3600);
    time = time % 3600;
    const m = Math.floor(time / 60);
    time = time % 60;
    const s = Math.floor(time);
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  }

  buy(level) {
    const buyCount = 1;
    const cost = this.getPrice(level, buyCount);
    //TODO: determine buyCount
    if (this.state.cash >= cost) {
      this.state.cash -= cost;
      this.state.level[level].count += buyCount;
      this.UI[`levelCost${level}`].innerText = this.formatCurrency(this.getPrice(level, buyCount), 'ceil');
      this.UI[`levelRevenue${level}`].innerText = this.formatCurrency(CellObjectEnemyBusiness.levelInfo[level].revenue * this.state.level[level].count, 'floor');
    }
  }
}

class CellObjectMerge extends CellObject {
  constructor(cell, dist) {
    super(cell, dist, 'merge');
    this.state.type = 'merge';
    this.scalingFactor = 0.4;
  }

  isDropable(srcObject) {
    return false;
  }

  update(curTime, neighbors) {
    const forceLast = this.tPower === undefined;
    this.lasttPower = this.tPower;
    this.lastdPower = this.dPower;
    this.lastePower = this.ePower;
    this.tPower = 0;
    this.dPower = 0;
    this.ePower = 0;
    this.neighbors = neighbors;
    this.tMergePower = 0;
    this.dMergePower = 0;
    let tMin = Infinity;
    let dMin = Infinity;
    let tCount = 0;
    let dCount = 0;

    for (let i = 0; i < neighbors.length; i++) {
      const ns = neighbors[i].content.state;
      const tPower = ns.tickPower ?? 0;
      const dPower = ns.disPower ?? 0;
      const enemyPower = ns.enemyPower ?? 0;
      this.tPower += tPower;
      this.dPower += dPower;
      this.ePower += enemyPower;
      
      if (tPower > 0) {
        tMin = Math.min(tMin, tPower);
        tCount++;
      }
      if (dPower > 0) {
        dMin = Math.min(dMin, dPower);
        dCount++;
      }
    }

    this.tMergePower = (this.tPower > 0 && tCount > 1) ? (this.tPower + this.scalingFactor * tMin) : 0;
    this.dMergePower = (this.dPower > 0 && dCount > 1) ? (this.dPower + this.scalingFactor * dMin) : 0;

    if (this.ePower > 0) {
      this.tPower = 0;
      this.dPower = 0;
    }

    if (forceLast) {
      this.lasttPower = this.tPower;
      this.lastdPower = this.dPower;
      this.lastePower = this.ePower;
    }
  }

  displayCellInfo(container) {
    container.innerText = `Object Details - Dist: ${this.dist} T: ${this.formatValue(this.tPower, 'floor')} D: ${this.formatValue(this.dPower, 'floor')} E: ${this.ePower} Rem: ${this.formatValue(this.percent, 'ceil')}`;

    this.UI.butSpot.disabled = this.tMergePower <= 0;
    this.UI.butBoss.disabled = this.dMergePower <= 0;

    this.UI.butSpot.innerText = `Merge neighboring SPOTs.\nResult - T: ${this.formatValue(this.tPower, 'floor')} => ${this.formatValue(this.tMergePower, 'floor')}`;
    this.UI.butBoss.innerText = `Merge neighboring BOSSs.\nResult - D: ${this.formatValue(this.dPower, 'floor')} => ${this.formatValue(this.dMergePower, 'floor')}`;

    this.UI.neighborCount.innerText = `${this.ePower} neighboring enemies`;
  }

  initGame(gameContainer) {
    super.initGame(gameContainer);

    //spot merge
    const mergeSpotCont = this.createElement('div', '', gameContainer, 'buildCont');
    const mergeSpotIcon = this.createElement('span', '', mergeSpotCont, 'icon');
    const mergeSpotBut = this.createElement('button', 'butSpot', mergeSpotCont, '', 'merge ()');
    applySprite(mergeSpotIcon, 'spot');
    mergeSpotBut.onclick = () => this.mergeSpot();

    //boss merge
    const mergeBossCont = this.createElement('div', '', gameContainer, 'buildCont');
    const mergeBossIcon = this.createElement('span', '', mergeBossCont, 'icon');
    const mergeBossBut = this.createElement('button', 'butBoss', mergeBossCont, '', 'merge (uses all D points, 1 T point)');
    applySprite(mergeBossIcon, 'boss');
    mergeBossBut.onclick = () => this.mergeBoss();

    this.createElement('div', 'neighborCount', gameContainer);
  }

  mergeSpot() {
    const objectList = [];
    for (let i = 0; i < this.neighbors.length; i++) {
      const ns = this.neighbors[i].content.state;
      if (ns.type === 'spot') {
        objectList.push(this.neighbors[i]);
      }
    }

    objectList.forEach( (n, i) => {
      if (i === 0) {
        n.content.state.tickPower = this.tMergePower;
        n.content.postLoad();
      } else {
        n.content.merged = true;
      }
    });

    app.addToLog(`Merged ${objectList.length} SPOT into 1 x ${this.formatValue(this.tMergePower, 'floor')}`);
  }

  mergeBoss() {
    const objectList = [];
    for (let i = 0; i < this.neighbors.length; i++) {
      const ns = this.neighbors[i].content.state;
      if (ns.type === 'boss') {
        objectList.push(this.neighbors[i]);
      }
    }

    objectList.forEach( (n, i) => {
      if (i === 0) {
        n.content.state.disPower = this.dMergePower;
        n.content.postLoad();
      } else {
        n.content.merged = true;
      }
    });

    app.addToLog(`Merged ${objectList.length} BOSS into 1 x ${this.formatValue(this.dMergePower, 'floor')}`);
  }

}

class CellObjectBuild extends CellObject {
  constructor(cell, dist) {
    super(cell, dist, 'build');
    this.state.type = 'build';
  }

  isDropable(srcObject) {
    return false;
  }

  update(curTime, neighbors) {
    this.neighbors = neighbors;
  }

  displayCellInfo(container) {

    const openNeighborExists = this.getOpenNeighbor() !== undefined;

    this.UI.butSpot.disabled = !openNeighborExists || app.state.tpoints <= 0 || app.state.dpoints <= 0;
    this.UI.butBoss.disabled = !openNeighborExists || app.state.dpoints <= 0;

    const spotPower = Math.min(app.state.tpoints, app.state.dpoints * 2);
    this.UI.butSpot.innerText = `Build SPOT ${this.formatValue(spotPower, 'floor')} x power`;
    this.UI.butBoss.innerText = `Build BOSS ${this.formatValue(app.state.dpoints, 'floor')} x power`;
  }

  initGame(gameContainer) {
    super.initGame(gameContainer);

    //build spot
    const buildSpotCont = this.createElement('div', '', gameContainer, 'buildCont');
    const buildSpotIcon = this.createElement('span', '', buildSpotCont, 'icon');
    const buildSpotBut = this.createElement('button', 'butSpot', buildSpotCont, '', 'Build (uses all T, 1/2 D)');
    applySprite(buildSpotIcon, 'spot');
    buildSpotBut.onclick = () => this.buildSpot();

    //build boss
    const buildBossCont = this.createElement('div', '', gameContainer, 'buildCont');
    const buildBossIcon = this.createElement('span', '', buildBossCont, 'icon');
    const buildBossBut = this.createElement('button', 'butBoss', buildBossCont, '', 'Build (uses 0 T, All D)');
    applySprite(buildBossIcon, 'boss');
    buildBossBut.onclick = () => this.buildBoss();

    const infoDiv = this.createElement('div', '', gameContainer);
    infoDiv.innerText = `When building SPOT, the new strength will be Tnew=min(T,D*2).\n
    The T cost will be Tnew and the D cost will be Tnew/4.\n
    When building BOSS, the new strength will be Dnew=D.\n
    The T cost will be 0 and the D cost will be Dnew.`;

  }

  getOpenNeighbor() {
    let neighbor;
    for (let i = 0; i < this.neighbors.length; i++) {
      if (this.neighbors[i].content.state.type === 'none') {
        neighbor = this.neighbors[i];
        break;
      }
    }
    return neighbor;
  }

  buildSpot() {
    const openNeighbor = this.getOpenNeighbor();
    if (openNeighbor === undefined) {return;}

    openNeighbor.content.closeGame();
    openNeighbor.content = new CellObjectSpot(openNeighbor.ui, openNeighbor.x + openNeighbor.y);
    const power = Math.min(app.state.tpoints, app.state.dpoints * 2);
    openNeighbor.content.state.tickPower = power;
    openNeighbor.content.postLoad();
    app.state.tpoints -= power;
    app.state.dpoints -= power / 4;
    
    app.addToLog(`Built SPOT x ${this.formatValue(power, 'floor')}`);
  }

  buildBoss() {
    const openNeighbor = this.getOpenNeighbor();
    if (openNeighbor === undefined) {return;}

    openNeighbor.content.closeGame();
    openNeighbor.content = new CellObjectBoss(openNeighbor.ui, openNeighbor.x + openNeighbor.y);
    const power = app.state.dpoints;
    openNeighbor.content.state.disPower = power;
    openNeighbor.content.postLoad();
    //app.state.tpoints -= 1;
    app.state.dpoints = 0;

    app.addToLog(`Built BOSS x ${this.formatValue(power, 'floor')}`);

  }

}

class CellObjectSpawn extends CellObject {

  static MonthNames = "Imix,Ik',AK'b'al,K'an,Chikchan,Kimi,Manik',Lamat,Muluk,Ok,Chuwen,Eb',B'en,Ix,Men,K'ib',Kab'an,Etz'nab',Kawak,Ajaw".split(',');

  constructor(cell, dist) {
    super(cell, dist, 'spawn');
    this.state.type = 'spawn';
    this.state.tPower = 0;
    this.state.dPower = 0;
    this.state.tSac = 0;
    this.state.dSac = 0;
    this.state.startTime = (new Date()).getTime() / 1000;
    this.sacPowerT = 0;
    this.sacPowerD = 0;
    this.monthAngle = 0;
    this.dayAngle = 0;
    this.rate = 1 / (260 * 60); //multiples of sacrificed power per second. this is 1 multiple every 260 min=4.3hr
    this.harvD = 0;
    this.harvT = 0;
  }

  isDropable(srcObject) {
    return false;
  }

  update(curTime, neighbors) {

    this.sacPowerT = 0;
    this.sacPowerD = 0;
    for (let i = 0; i < neighbors.length; i++) {
      const ns = neighbors[i].content.state;
      this.sacPowerT += ns.tickPower ?? 0;
      this.sacPowerD += ns.disPower ?? 0;
    }
    this.neighbors = neighbors;

    const deltaT = curTime - this.state.startTime;

    this.powerT = this.state.tPower + (deltaT * this.state.tSac) * this.rate;
    this.powerD = this.state.dPower + (deltaT * this.state.dSac) * this.rate;


    this.monthAngle = (-(2 * Math.PI ) * curTime * 1/(20 * 60)) % (Math.PI * 2);
    this.dayAngle = (-(2 * Math.PI ) * curTime * 1/(13 * 60)) % (Math.PI * 2);

    const monthIndex = Math.floor(-20 * this.monthAngle / (Math.PI * 2));
    const dayIndex = Math.floor(-13 * this.dayAngle / (Math.PI * 2));

    this.monthName = CellObjectSpawn.MonthNames[monthIndex];
    this.dayName = (dayIndex + 1).toString();

    if (this.harvD > 0 || this.harvT > 0) {
      const tpoints = this.harvT;
      const dpoints = this.harvD;
      this.harvD = 0;
      this.harvT = 0;
      return {
        tpoints,
        dpoints,
        harvest: true
      }
    }
  }

  displayCellInfo(container) {
    this.UI.curPower.innerText = `Current power: {T: ${this.formatValue(this.powerT, 'floor')}, D: ${this.formatValue(this.powerD, 'floor')}}`;
    this.UI.curRate.innerText = `Current rate: {T: ${this.formatValue(this.state.tSac, 'floor')}, D: ${this.formatValue(this.state.dSac, 'floor')}} / Sacred Round`;

    this.UI.sacPower.innerText = `{T: ${this.formatValue(this.sacPowerT, 'floor')}, D: ${this.formatValue(this.sacPowerD, 'floor')}}`;
    this.UI.dayName.innerText = `${this.dayName} ${this.monthName}`;

    const canvas = this.UI.calCanvas;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = 'hsl(60, 48%, 76%)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.save();
    ctx.translate(canvas.width / 2, canvas.height / 2);
    ctx.rotate(this.monthAngle);
    ctx.translate(-canvas.width / 2, -canvas.height / 2);
    ctx.drawImage(this.UI.calendarMonths, 0, 0);
    ctx.restore();

    ctx.save();
    ctx.translate(canvas.width / 2, canvas.height / 2);
    ctx.rotate(this.dayAngle);
    ctx.translate(-canvas.width / 2, -canvas.height / 2);
    ctx.drawImage(this.UI.calendarNumerals, 0, 0);
    ctx.restore();

    ctx.save();
    ctx.translate(canvas.width / 2, canvas.height / 2);
    ctx.rotate(0);
    ctx.translate(-canvas.width / 2, -canvas.height / 2);
    ctx.drawImage(this.UI.calendarWindow, 0, 0);
    ctx.restore();
  }

  initGame(gameContainer) {
    super.initGame(gameContainer);

    //Current power
    const curCont = this.createElement('div', 'curCont', gameContainer);
    this.createElement('span', 'curPower', curCont);
    const harvBut = this.createElement('button', '', curCont, '', 'Harvest');
    harvBut.onclick = () => this.harvest();

    //current rate
    this.createElement('div', 'curRate', gameContainer);

    //Sacrifice neighbors
    const sacCont = this.createElement('div', '', gameContainer);
    this.createElement('span', '', sacCont, '', 'Sacrifice neighbors for ');
    this.createElement('span', 'sacPower', sacCont);
    const sacBut = this.createElement('button', '', sacCont, '', 'Sacrifice');
    sacBut.onclick = () => this.sacrifice();

    //Day Name
    const dayCont = this.createElement('div', '', gameContainer);
    this.createElement('span', '', dayCont, '', 'Today is: ');
    this.createElement('span', 'dayName', dayCont);

    //Calendar
    const calendar = this.createElement('canvas', 'calCanvas', gameContainer, 'spawnCanvas');
    calendar.width = 481;
    calendar.height = 481;

    this.UI.calendarMonths = document.getElementById('calendar_months');
    this.UI.calendarNumerals = document.getElementById('calendar_numerals');
    this.UI.calendarWindow = document.getElementById('calendar_window');
  }

  sacrifice() {
    const curTime = (new Date()).getTime() / 1000;
    const deltaT = curTime - this.state.startTime;
    this.state.tPower = this.state.tPower + (deltaT * this.state.tSac) * this.rate;
    this.state.dPower = this.state.dPower + (deltaT * this.state.dSac) * this.rate;
    this.state.startTime = curTime;

    let totalTPower = 0;
    let totalDPower = 0;
    let spotCount = 0;
    let bossCount = 0;
    for (let i = 0; i < this.neighbors.length; i++) {
      const ns = this.neighbors[i].content.state;
      if (ns.type === 'spot') {
        this.state.tSac += ns.tickPower;
        this.neighbors[i].content.merged = true;
        totalTPower += ns.tickPower;
        spotCount++;
      }
      if (ns.type === 'boss') {
        this.state.dSac += ns.disPower;
        this.neighbors[i].content.merged = true;
        totalDPower += ns.disPower;
        bossCount++;
      }
    }
    app.addToLog(`Sacrificed ${spotCount} SPOTs and ${bossCount} BOSSes for ${this.formatValue(totalTPower, 'floor')} T, ${this.formatValue(totalDPower, 'floor')} D`);
    
  }

  harvest() {
    const curTime = (new Date()).getTime() / 1000;
    const deltaT = curTime - this.state.startTime;
    this.harvT = this.state.tPower + (deltaT * this.state.tSac) * this.rate;
    this.harvD = this.state.dPower + (deltaT * this.state.dSac) * this.rate;
    this.state.startTime = curTime;
    this.state.tPower = 0;
    this.state.dPower = 0;
    this.state.tSac = this.state.tSac * 0.5 ;
    this.state.dSac = this.state.dSac * 0.5;
    
  }

}

class CellObjectInfo extends CellObject {

  static tutorialHTML = `
  <h1 id='tutTitle'>Pauahtan's Pupils' Trial of Prayer</h1>
  <h2>(PPToP 2)</h2>
  In this game, you observe the story of 3 strangers in Belize while controlling
    two entities to help them make progress. You can read parts of the story as
    they unlock in the Lore tab above. The first of which is already unlocked.
  <h2>How To Play</h2>
  <ul>
    <li>Return to this text any time by selecting <span class="infoIcon"></span></li>
    <li>Move <span class="spotIcon"></span> <span class="bossIcon"></span> via 
        drag and drop or by selecting one and then clicking a destination
        to direct your <b>T</b>ick or <b>D</b>isassembly power to the adjacent 8 squares
        and control your attack power against enemies.
        Multiple units can supply power against the same enemy.</li>
    <li>Enemies that are farther (Manhattan distance) from <span class='infoIcon'></span> have more immunity from
        <span class="spotIcon"></span> <span class="bossIcon"></span>. The immunity factor is ${powerDistFactor.toFixed(2)}^(dist-4).</li>
    <li>Defeating an enemy with <span class='spotIcon'></span> gives you points you can use at <span class='buildIcon'></span> 
        to build <span class='spotIcon'></span><span class='bossIcon'></span>. However, you also need points that can be collected by destroying 
        <span class='wallIcon'></span> with <span class='bossIcon'></span>. </li>
    <li>You can pan the grid by holding ctrl/cmd while dragging.</li>
    <li>Merge multiple units of the same type with <span class='mergeIcon'></span>.
        Units to merge must be in the 8 surrounding squares. The strength of the resulting 
        unit will be the sum of all the inputs plus 40% of the weakest one.</li>
    <li>There are 3 paths through the grid that correspond to the 3 main characters in the story.
        Unlock more of a character's dialog by defeating enemies in their path 
        with the <span class='loreIcon'></span> icon.</li>
    <li>Unlocked dialog can be viewed in the Lore tab above</li>
    <li>You can sacrifice <span class='spotIcon'></span><span class='bossIcon'></span>
        to increase the power of <span class='spawnIcon'></span>. It will generate
        an amount of power equal to that which was sacrificed every 260 "days" (minutes). To access
        the power, you must harvest it which converts it into points and costs half of
        the previously sacrificed power.
        </li>
  </ul>
  `;

  constructor(cell, dist) {
    super(cell, dist, 'info');
    this.state.type = 'info';
    this.state.lastTab = 'Tutorial';
    this.state.viewedLore = [];
    this.lastHistoryLength = -1;
    this.lastLoreUnlockArrayLength = -1;
  }

  isDropable(srcObject) {
    return false;
  }

  displayCellInfo(container) {
    this.updateHistory();
    this.updateLore();
  }

  initGame(gameContainer) {
    super.initGame(gameContainer);

    const extraUI = 'exportContainer,importContainer,exportBtnClose,exportText,importText,importBtnImport,importBtnClose'.split(',');
    extraUI.forEach( id => {
      this.UI[id] = document.getElementById(id);
    });

    this.UI.exportBtnClose.onclick = () => this.exportClose();
    this.UI.importBtnClose.onclick = () => this.importClose();
    this.UI.importBtnImport.onclick = () => this.doImport();

    this.UI.importContainer.onclose = () => {
      document.querySelector('body').classList.remove('blur2px');
    }
    this.UI.exportContainer.onclose = () => {
      document.querySelector('body').classList.remove('blur2px');
    }

    const tabContainer = this.createElement('div', 'tabContainer', gameContainer);
    const tabTutorial = this.createElement('div', 'tabTutorial', tabContainer, 'infoTab', 'Tutorial');
    const tabLog = this.createElement('div', 'tabLog', tabContainer, 'infoTab' ,'Log');
    const tabLore = this.createElement('div', 'tabLore', tabContainer, 'infoTab', 'Lore');
    const tabSettings = this.createElement('div', 'tabSettings', tabContainer, 'infoTab', 'Settings/Info');

    tabTutorial.onclick = () => this.selectTab('Tutorial');
    tabLog.onclick = () => this.selectTab('Log');
    tabLore.onclick = () => this.selectTab('Lore');
    tabSettings.onclick = () => this.selectTab('Settings');

    const tabBodyTutorial = this.createElement('div', 'infoContainerTutorial', gameContainer, 'infoTabBody');
    const tabBodyLog = this.createElement('dl', 'infoContainerLog', gameContainer, 'infoTabBody');
    const tabBodyLore = this.createElement('div', 'infoContainerLore', gameContainer, 'infoTabBody');
    const tabBodySettings = this.createElement('div', 'infoContainerSettings', gameContainer, 'infoTabBody');

    tabBodyTutorial.innerHTML = CellObjectInfo.tutorialHTML;

    ['spot', 'boss', 'info', 'wall', 'build', 'merge', 'lore', 'spawn'].forEach( name => {
      document.querySelectorAll(`.${name}Icon`).forEach( e => {
        applySprite(e, name);
        e.classList.add('icon');
      });
    });

    const saveBtn = this.createElement('button', '', tabBodySettings, '', 'Save');
    const resetBtn = this.createElement('button', '', tabBodySettings, '', 'Reset');
    const exportBtn = this.createElement('button', '', tabBodySettings, '', 'Export');
    const importBtn = this.createElement('button', '', tabBodySettings, '', 'Import');
    saveBtn.onclick = () => this.save();
    resetBtn.onclick = () => this.reset();
    exportBtn.onclick = () => this.export();
    importBtn.onclick = () => this.import();
    const extraText = this.createElement('div', '', tabBodySettings);
    extraText.innerHTML = `
    <a href='./attributions.html'>Attributions</a> 
    <div>
      Inspirations/references:
      <ul>
        <li><a href='https://play.google.com/store/apps/details?id=com.redcell.goldandgoblins'>Gold & Goblins: Idle Merger</a></li>
        <li><a href='https://asteriskman7.github.io/PedroPascalsTriangleOfPrestige/'>Pedro Pascal's Triangle of Prestige</a></li>
        <li><a href='https://makiki99.github.io/prestige/'>Prestige</a></li>
        <li><a href='https://unihedro.github.io/cheese-game/'>Cheese Game</a></li>
        <li><a href='https://www.firefliesalco.com/lawnmower-game/'>Lawnmower Game</a></li>
        <li><a href='https://faedine.com/games/crank/'>Crank</a></li>
        <li><a href='https://ivark.github.io/'>Antimatter Dimensions</a></li>
        <li><a href='https://hyperhippo.com/games/adventure-capitalist/'>Adventure Capitalist</a></li>
        <li><a href='https://asteriskman7.github.io/SnailGame/'>Snail Game</a></li>
        <li><a href='https://asteriskman7.github.io/spot-and-boss/'>S.P.O.T. & B.O.S.S.</a></li>
      </ul>
    </div>
    `;

    const resetDlg = this.createElement('dialog', 'resetDlg', tabBodySettings, '', 'Are you sure you want to reset?');
    const resetBtnContainer = this.createElement('div', '', resetDlg);
    const resetYes = this.createElement('button', '', resetBtnContainer, '', 'Yes');
    const resetNo = this.createElement('button', '', resetBtnContainer, '', 'No');
    resetYes.onclick = () => this.resetYes();
    resetNo.onclick = () =>  this.resetNo();
    resetDlg.onclose = () => {
      document.querySelector('body').classList.remove('blur2px');
    };


    this.updateHistory(true);
    this.updateLore(true);
    this.selectTab(this.state.lastTab);
  }

  selectTab(name) {
    const selectedTabs = document.getElementsByClassName('infoTabSelected');
    for (let i = 0; i < selectedTabs.length; i++) {
      selectedTabs.item(i).classList.remove('infoTabSelected');
    }
    const selectedTabBodies = document.getElementsByClassName('infoTabBodySelected');
    for (let i = 0; i < selectedTabBodies.length; i++) {
      selectedTabBodies.item(i).classList.remove('infoTabBodySelected');
    }

    this.UI[`tab${name}`].classList.add('infoTabSelected');
    this.UI[`infoContainer${name}`].classList.add('infoTabBodySelected');
    this.state.lastTab = name;
  }

  draw(cell, progress) {
  }

  updateHistory(force) {
    const logArray = app.state.log;

    if (logArray.length !== this.lastHistoryLength || force) {
      this.lastHistoryLength = logArray.length;

      this.UI.infoContainerLog.innerHTML = '';

      for (let i = logArray.length - 1; i >= 0; i--) {
        const log = logArray[i];
        this.createElement('dt', '', this.UI.infoContainerLog, 'logDate', (new Date(log.date)));
        this.createElement('dd', '', this.UI.infoContainerLog, '', log.msg);
      }
    }
  }

  updateLore(force) {
    //faces via https://boredhumans.com/faces.php
    const FORCE_UNLOCK = false;
    const loreUnlockArray = app.state.loreUnlocks;

    if (loreUnlockArray.length !==  this.lastLoreUnlockArrayLength || force) {
      this.lastLoreUnlockArrayLength = loreUnlockArray.length;

      this.UI.infoContainerLore.innerHTML = '';

      for (let dist = 0; dist < LORE.length; dist++) {
        delete this.UI[`infoLoreItem${dist}`];
        const msgDiv = this.createElement('div', `infoLoreItem${dist}`, this.UI.infoContainerLore, 'infoLoreMsg');
        const msgIcon = this.createElement('div', '', msgDiv, 'infoLoreIcon');
        const loreRawText = LORE[dist] ?? 'Hid:HELLO LORE this is even longer than you could have imagined';
        const loreAuthor = loreRawText.substr(0, 3);
        const loreText = loreRawText.substr(4);
        const loreName = {
          Adv: "Isabel Ram&iacute;rez",
          Cul: "Diego Camazotz",
          Ass: "Ellen Ochoa",
          Unk: "Unknown",
          Hid: "Hidden"
        };
        const name = this.createElement('div', '', msgDiv, 'infoLoreName', loreName[loreAuthor]);
        name.innerHTML = loreName[loreAuthor];
        if (loreUnlockArray[dist] || FORCE_UNLOCK) {
          applySprite(msgIcon, `icon${loreAuthor}`);
          msgDiv.onclick = () => this.setLoreViewed(dist);
          if (!this.state.viewedLore[dist]) {
            msgDiv.classList.add('infoLoreNew');
          }
          this.createElement('div', '', msgDiv, `infoLoreText,infoLoreText${loreAuthor}`, loreText);
        } else {
          applySprite(msgIcon, `iconHidden`);
          msgDiv.classList.add('infoLoreLocked');
          this.createElement('div', '', msgDiv, `infoLoreText,infoLoreTextUnk`, this.gibberfy(loreText));
        }
      }

    }
  }

  setLoreViewed(loreIndex) {
    this.state.viewedLore[loreIndex] = true;
    this.UI[`infoLoreItem${loreIndex}`].classList.remove('infoLoreNew');
  }

  gibberfy(text) {
    const letters = 'phngluimglwnafhcthulhurlyehwgah\'naglfhtagn-';
    const result = text.split``.map(c => {
      if (c.match(/[a-z]/i)) {
        const newLetter = letters[Math.floor(Math.random() * letters.length)];
        if (c.toUpperCase() === c) {
          return newLetter.toUpperCase();
        }
        return newLetter;
      } else if (c.match(/[0-9]/)) {
        return (Math.floor(Math.random() * 10)).toString();
      } else {
        return c;
      }
    }).join``;
    return result;
  }

  save() {
    app.saveToStorage();
    app.displayToast('Game Saved');
  }

  reset() {
    document.querySelector('body').classList.add('blur2px');
    this.UI.resetDlg.showModal();
  }

  resetYes() {
    app.reset();
  }

  resetNo() {
    this.UI.resetDlg.close();
    document.querySelector('body').classList.remove('blur2px');
  }

  export() {
    document.querySelector('body').classList.add('blur2px');
    this.UI.exportText.value = app.getExportString();
    this.UI.exportContainer.showModal();
  }

  exportClose() {
    this.UI.exportContainer.close();
    document.querySelector('body').classList.remove('blur2px');
  }

  import() {
    document.querySelector('body').classList.add('blur2px');
    this.UI.importContainer.showModal();
  }

  doImport() {
    const importString = this.UI.importText.value;
    app.importFromString(importString.trim());
  }

  importClose() {
    this.UI.importContainer.close();
    document.querySelector('body').classList.remove('blur2px');
  }
}

class CellObjectEnemyPrestige extends CellObjectEnemy {

  static tierInfo = [
    {numeral: 'I', name: 'Nanoprestige'},
    {numeral: 'II', name: 'Microprestige'},
    {numeral: 'III', name: 'Miniprestige'},
    {numeral: 'IV', name: 'Small Prestige'},
    {numeral: 'V', name: 'Partial Prestige'},
    {numeral: 'VI', name: 'Full Prestige'},
    {numeral: 'VII', name: 'Multiprestige'},
    {numeral: 'VIII', name: 'Hyperprestige'},
    {numeral: 'IX', name: 'Ultraprestige'},
    {numeral: 'X', name: 'Final Prestige'}
  ];

  constructor(cell, dist) {
    super(cell, dist, 'prestige');
    this.state.type = 'enemyPrestige';
    this.baseStrength = Math.round(100 * Math.pow(strengthDistFactor, dist));
    this.state.start = Infinity;
    this.state.lastPrestigeTime = Infinity;
    this.state.savedCoins = 0;
    this.state.prestiges = (new Array(10)).fill(0);
  }

  update(curTime, neighbors) {
    super.update(curTime, neighbors);

    const gain = this.getGain();
    const rate = this.tPower * gain;

    if (this.state.start === Infinity && this.tPower > 0) {
      this.state.start = (new Date()).getTime() / 1000;
    }

    //if tick power has changed and this level has already started
    if (this.tPower !== this.lasttPower && this.state.start < Infinity) {
      //save previous progress
      this.state.savedCoins = Math.floor((curTime - this.state.start)) * this.lasttPower * gain + this.state.savedCoins;

      //change start to now
      this.state.start = curTime;
    }
    
    if (rate > 0) {
      this.coins = Math.floor((curTime - this.state.start)) * rate + this.state.savedCoins;
    } else {
      this.coins = this.state.savedCoins;
    }

    this.percent = 100 * (1 - this.coins / this.baseStrength);

    if (this.percent <= 0) {
      //game over
      return {
        tpoints: 1 * Math.pow(rewardDistFactor, this.dist),
      };
    }
  }

  displayCellInfo(container) {
    super.displayCellInfo(container);

    this.UI.coins.innerText = Math.floor(this.coins);
    this.UI.gain.innerText = this.formatValue(this.getGain() * this.tPower, 'floor');

    this.state.prestiges.forEach( (p, i) => {
      this.UI[`tier${i}btn`].disabled = !this.canActivatePrestige(i);
    });
  }

  initGame(gameContainer) {
    super.initGame(gameContainer);

    const headerDiv = this.createElement('div', '', gameContainer, 'prestigeCenter');
    const header = this.createElement('h1', '', headerDiv);
    this.createElement('span', 'coins', header);
    this.createElement('span', '', header, '', ' / ');
    this.createElement('span', 'coinReq', header, '', this.formatValue(this.baseStrength, 'ceil'));
    this.createElement('span', '', header, '', ' coins');

    const rateHeader = this.createElement('h3', '', headerDiv);
    this.createElement('span', 'gain', rateHeader);
    this.createElement('span', '', rateHeader, '', ' coins/second');

    const table = this.createElement('table', '', gameContainer, 'prestigeCenter,prestigeTable');

    const headerRow = this.createElement('tr', '', table);
    'Tier,Name,Requirement,Amount,Effect'.split`,`.forEach( label => {
      this.createElement('th', '', headerRow, '', label);
    });
    this.createElement('th', '', headerRow);

    CellObjectEnemyPrestige.tierInfo.forEach( (t, i) => {
      const tierRow = this.createElement('tr', '', table);
      this.createElement('td', '', tierRow, '', t.numeral);
      this.createElement('td', '', tierRow, '', t.name);
      const reqWrap = this.createElement('td', '', tierRow);
      this.createElement('span', `tier${i}cost`, reqWrap);
      if (i === 0) {
        this.createElement('span', '', reqWrap, '', ' coins');
      } else {
        this.createElement('span', '', reqWrap, '', ` Tier ${CellObjectEnemyPrestige.tierInfo[i - 1].numeral}`);
      }

      this.createElement('td', `tier${i}a`, tierRow, '', 'AMT');
      this.createElement('td', `tier${i}mul`, tierRow, '', 'effect');
      const buttontd = this.createElement('td', '', tierRow);
      const button = this.createElement('button', `tier${i}btn`, buttontd, '', 'Activate');
      button.onclick = () => this.activatePrestige(i);
    });

    this.updateTable();
  }

  getGain() {
    return this.state.prestiges.reduce( (acc, p) => {
      return acc * (1 + p);
    }, 1);
  }
  
  getRequirement(id) {
    if (id === 0) {
      return Math.floor(Math.pow(1.5, this.state.prestiges[0]) * 10);
    } else {
      return Math.pow(id + 1, this.state.prestiges[id] + 1);
    }
  }

  canActivatePrestige(id) {
    if (id === 0) {
      return this.coins >= this.getRequirement(0);
    } else {
      return this.state.prestiges[id - 1] >= this.getRequirement(id);
    }
  }

  activatePrestige(id) {
    if (this.canActivatePrestige(id)) {
      this.state.savedCoins = 0;
      this.state.start = (new Date()).getTime() / 1000;
      for (let i = 0; i < id; i++) {
        this.state.prestiges[i] = 0;
      }
      this.state.prestiges[id]++;
      this.updateTable();
    }
  }

  updateTable() {
    this.state.prestiges.forEach( (p, i) => {
      this.UI[`tier${i}cost`].innerText = this.getRequirement(i);
      this.UI[`tier${i}a`].innerText = p;
      this.UI[`tier${i}mul`].innerText = `x${p + 1}`;
    });
  }
}

class CellObjectEnemyCrank extends CellObjectEnemy {
  constructor(cell, dist) {
    super(cell, dist, 'crank');
    this.state.type = 'enemyCrank';
    this.baseStrength = activeFactor * 10 * Math.pow(strengthDistFactor, dist);
    this.state.metalStart = Infinity;
    this.state.metalStrength = 100;
    this.state.previousMetalProgress = 0;
    this.state.metalCount = 0;
    this.state.previousBatteryProgress = 0;
    this.state.batteryCount = 0;
    this.state.batteryStart = Infinity;
    this.state.batteryStrength = 100;
    this.state.metalQueue = 0;
    this.state.batteryQueue = 0;
    this.state.metalQueueMax = 3;
    this.state.batteryQueueMax = 3;
    this.state.compPowerMax = 0;
    this.state.compPower = 0;
    this.state.compStart = Infinity;
    this.state.previousCompProgress = 0;
    this.state.compStart = (new Date()).getTime() / 1000;
    this.state.lastUpdate = Infinity;
    this.state.powerLevel = 0;
    this.state.crankLevels = 0;
    this.state.scrapLevels = 0;
    this.state.batteryLevels = 0;
    this.state.totalPower = 0;
    this.state.compTarget = 0;


    this.metalCost = 5;
    this.metalBoostCost = 1;
    this.batteryMetalCost = 10;
    this.batteryPowerCost = 10;
    this.batteryBoostMetalCost = 1;
    this.crankAngle = 0;
    this.crankVelocity = 0;
    this.crankForce = 0;
    this.metalProgress = 0;
    this.batteryProgress = 0;
    this.compProgress = 0;
    this.powerMax = 100;
    this.lastCompPower = this.state.compPower;

    this.metalPress = false;
    this.batteryPress = false;
    this.cpuPress = false;
    this.clickHoldDuration = 0.5;
  }

  closeGame() {
    super.closeGame();
    this.metalPress = false;
    this.batteryPress = false;
    this.cpuPress = false;
  }

  /*
    crank with power meter
      crank has inertia
      crank turns while mouse is held down
      while cranking, power production is increased
        about 3/second at max
      max power 100
      power production slowly deminishes to zero when
        not cranking
    scrap metal generator
      instantly takes 5 power to start
      clicking costs 1 power but increases completion by about 1/4
    repair cpu
      requires 10 scrap metal
      unlocks automation
      select crank, scrap metal, system
      can send power / second to perform upgrade
        0 through 3
      crank increases crank maximum speed (about 6/second)
        then decreases crank decay
      scrap metal allows setting a queue of scrap metal to craft
        up to 5
        then enables batteries
        building batteries cost 10 scrap and 10 power, clicking again costs 1 scrap and increases completion by 1/4
        batteries increase max power by 10
        also unlocks comp upgrade battery
      system adds an info box
      cpu can be upgraded by spending 15 scrap metal and then 5 more each time
        increases power/sec max by 1


  */

  update(curTime, neighbors) {
    super.update(curTime, neighbors);
    //const vmax = 0.1 + 0.1 * this.state.crankLevels;
    const vmax = 0.1 * this.state.crankLevels + 0.1 * (Math.pow(1.0010500, this.state.crankLevels));
    const cranka = 0.001 + 0.0001 * this.state.crankLevels;
    const crankm = 1000;
    const crankFriction = 0.0005;
    const crankPower = 0.1;
    const metalRate = 10;
    const batteryRate = 10;
    const compRate = 1;
    const deltaTime = Math.max(0, curTime - this.state.lastUpdate);

    const state = this.state;

    if (this.metalPress && (curTime >= this.metalPressStartTime + this.clickHoldDuration)) {
      this.metalClick();
    }

    if (this.batteryPress && (curTime >= this.batteryPressStartTime + this.clickHoldDuration)) {
      this.batteryClick();
    }

    if (this.cpuPress && (curTime >= this.cpuPressStartTime + this.clickHoldDuration)) {
      this.compUpgradeClick();
    }
    
    //this.powerMax = 100 + state.batteryCount * 10;
    this.powerMax = state.batteryCount * 10 + 100 * Math.pow(1.02, state.batteryCount);

    if (this.tPower !== this.lasttPower && state.metalStart < Infinity) {
      state.previousMetalProgress += (curTime - state.metalStart) * this.lasttPower * metalRate;
      state.metalStart = curTime;
    }
    if (this.tPower !== this.lasttPower && state.batteryStart < Infinity) {
      state.previousBatteryProgress += (curTime - state.batteryStart) * this.lasttPower * batteryRate;
      state.batteryStart = curTime;
    }
    if ((this.tPower !== this.lasttPower || this.state.compPower !== this.lastCompPower) && state.compStart < Infinity) {
      state.previousCompProgress += (curTime - state.compStart) * this.lasttPower * compRate * this.lastCompPower;
      state.compStart = curTime;
    }
    this.lastCompPower = this.state.compPower;
    if (state.compStart === Infinity && this.state.compPower > 0) {
      state.compStart = curTime;
    }

    const powerLeak = Math.max(0, 1 * deltaTime - 0.05 * this.state.crankLevels);
    let compLeak;
    if (this.state.compTarget === 3) {
      if (this.state.compPower > 0) {
        compLeak = ((Math.pow(1, this.state.compPower) )) * ( deltaTime);
      } else {
        compLeak = 0;
      }
    } else {
      compLeak = this.state.compPower * deltaTime;
    }
    const compCost = this.getCompTargetCost();
    

    this.crankVelocity = Math.max(0, Math.min(vmax, this.crankVelocity + this.tPower * this.crankForce / crankm - crankFriction));
    this.crankAngle += this.crankVelocity;
    const origPowerLevel = this.state.powerLevel;
    if (this.state.compTarget === 3) {
      //this.state.powerLevel = Math.max(0, Math.min(Infinity, this.state.powerLevel + (this.tPower * this.crankVelocity * crankPower / 0.1) - powerLeak));
      this.state.powerLevel = Math.max(0, Math.min(this.powerMax, this.state.powerLevel + (this.tPower * this.crankVelocity * crankPower / 0.1) - powerLeak));
    } else {
      this.state.powerLevel = Math.max(0, Math.min(this.powerMax, this.state.powerLevel + (this.tPower * this.crankVelocity * crankPower / 0.1) - powerLeak));
    }
    const deltaPowerLevel = Math.max(0, this.state.powerLevel - origPowerLevel);
    this.state.totalPower += deltaPowerLevel;
    let compPercent;
    if (this.state.compTarget === 3) {
      this.state.powerLevel -= Math.min(compLeak, this.state.powerLevel);
      this.compProgress = this.compProgress + deltaTime * this.tPower * compRate * this.state.compPower * 100 / compCost;
    } else {
      if (this.state.powerLevel >= compLeak) {
        this.state.powerLevel -= compLeak;
        //compPercent = Math.max(0, curTime - state.compStart) * this.tPower * compRate * this.state.compPower + state.previousCompProgress;
        this.compProgress = this.compProgress + deltaTime * this.tPower * compRate * this.state.compPower * 100 / compCost;
      }
    }

    const metalPercent = Math.max(0, curTime - state.metalStart) * this.tPower * metalRate + state.previousMetalProgress;
    const batteryPercent = Math.max(0, curTime - state.batteryStart) * this.tPower * batteryRate + state.previousBatteryProgress;

    if (metalPercent >= 100) {
      //state.metalQueue--;
      //this.UI.metalQueueSlider.value = state.metalQueue;
      
      //if (state.metalQueue > 0 && state.powerLevel >= this.metalCost) {
      //  state.metalStart = curTime;
      //  state.powerLevel -= this.metalCost;
      //} else {
        state.metalStart = Infinity;
      //}
      state.previousMetalProgress = 0;
      state.metalCount += 1;
      this.metalProgress = 0;
    } else {
      this.metalProgress = metalPercent;
    }

    if (batteryPercent >= 100) {
      //state.batteryQueue--;
      //this.UI.batteryQueueSlider.value = state.batteryQueue;
      //if (state.batteryQueue > 0 && state.powerLevel >= this.batteryPowerCost && state.metalCount >= this.batteryMetalCost) {
      //  state.batteryStart = curTime;
      //  state.powerLevel -= this.batteryPowerCost;
      //  state.metalCount -= this.batteryMetalCost;
      //} else {
        state.batteryStart = Infinity;
      //}
      state.previousBatteryProgress = 0;
      state.batteryCount += 1;
      this.batteryProgress = 0;
    } else {
      this.batteryProgress = batteryPercent;
    }

    if (this.compProgress >= 100) {
      switch (this.state.compTarget) {
        case 0: 
          this.state.crankLevels++; 
          break;
        case 1: 
          this.state.scrapLevels++;
          this.state.metalQueueMax++;
          break;
        case 2: 
          this.state.batteryLevels++;
          this.state.batteryQueueMax++;
          break;
        case 3: 
          break;
      }


      if (state.compPower > 0) {
        state.compStart = curTime;
      } else {
        state.compStart = Infinity;
      }
      state.previousCompProgress = 0;
      this.compProgress = 0;
    }


    if (state.metalStart === Infinity && this.state.powerLevel >= this.metalCost && state.metalQueue > 0) {
      this.state.powerLevel -= this.metalCost;
      state.metalStart = (new Date()).getTime() / 1000;
      state.metalQueue -= 1;
      if (this.UI.metalQueueSlider && !this.mqsMoving) {
        this.UI.metalQueueSlider.value = state.metalQueue;
      }
    }

    if (state.batteryStart === Infinity && this.state.powerLevel >= this.batteryPowerCost && state.metalCount >= this.batteryMetalCost && state.batteryQueue > 0) {
      this.state.powerLevel -= this.batteryPowerCost;
      state.metalCount -= this.batteryMetalCost;
      state.batteryStart = (new Date()).getTime() / 1000;
      state.batteryQueue -= 1;
      if (this.UI.batteryQueueSlider && !this.bqsMoving) {
        this.UI.batteryQueueSlider.value = state.batteryQueue;
      }
    }

    this.percent = 100 * (1 - this.state.totalPower / this.baseStrength);
    if (this.state.totalPower > this.baseStrength) {
      return {
        tpoints: 1 * Math.pow(rewardDistFactor, this.dist),
      };
    }

    this.state.lastUpdate = curTime;
  }

  displayCellInfo(container) {
    super.displayCellInfo(container);

    this.UI.crankBar.style.transform = `rotate(${this.crankAngle}rad)`;
    this.UI.crankBall.style.transform = `rotate(${this.crankAngle}rad)`;

    this.updateStyle(this.UI.crankLevelProgress.style, 'width', `${Math.min(100, this.state.powerLevel * 100 / this.powerMax)}%`);
    this.UI.crankLevelValue.innerText = `${this.formatValue(this.state.powerLevel, 'floor')} / ${this.formatValue(this.powerMax, 'floor')}`;

    this.updateStyle(this.UI.metalProgress.style, 'width', `${this.metalProgress.toFixed(1)}%`);
    this.updateStyle(this.UI.batteryProgress.style, 'width', `${this.batteryProgress.toFixed(1)}%`);
    this.updateStyle(this.UI.compProgress.style, 'width', `${this.compProgress.toFixed(1)}%`);

    this.UI.metalProgressValue.innerText = this.state.metalCount;
    this.UI.batteryProgressValue.innerText = this.state.batteryCount;

    this.UI.metalQueueCount.innerText = this.state.metalQueue;
    this.UI.batteryQueueCount.innerText = this.state.batteryQueue;
    this.UI.compPowerCount.innerText = `${this.state.compPower} pwr/s`;
    this.UI.metalQueueSlider.max = this.state.metalQueueMax;
    this.UI.batteryQueueSlider.max = this.state.batteryQueueMax;
    this.UI.compPowerSlider.max = this.state.compPowerMax;

    this.UI.totalPower.innerText = this.formatValue(this.state.totalPower, 'floor');
  }

  initGame(gameContainer) {
    super.initGame(gameContainer);

    //[game value] / [game target]
    const topSection = this.createElement('div', '', gameContainer);
    this.createElement('span', '', topSection, '', 'Total power: ');
    this.createElement('span', 'totalPower', topSection, '', '?');
    this.createElement('span', '', topSection, '', ' / ');
    this.createElement('span', '', topSection, '', this.formatValue(this.baseStrength, 'ceil'));

    //[crank] [power gen level]
    const crankSection = this.createElement('div', 'crankSection', gameContainer, 'crankColumns');
    const crankContainer = this.createElement('div', '', crankSection, 'crankContainer');
    this.createElement('div', '', crankContainer, 'crankBase');
    this.createElement('div', 'crankBar', crankContainer, 'crankBar');
    this.createElement('div', 'crankBall', crankContainer, 'crankBall');

    crankContainer.onmousedown = evt => this.crankMouseDown(evt);
    crankContainer.ontouchstart = evt => this.crankMouseDown(evt);
    crankContainer.onmouseup = evt => this.crankMouseUp(evt);
    crankContainer.ontouchend = evt => this.crankMouseUp(evt);
    crankContainer.onmouseleave = evt => this.crankMouseLeave(evt);


    const crankLevelContainer = this.createElement('div', 'crankLevelContainer', crankSection, 'crankProgressContainer');
    const crankLevelProgress = this.createElement('div', 'crankLevelProgress', crankLevelContainer);
    const crankLevelValue = this.createElement('div', 'crankLevelValue', crankLevelContainer, '', '85.2 / 100');

    //[metal button] [metal progress]
    //Scrap Metal: [metal count]
    const metalMainSection = this.createElement('div', 'metalMainSection', gameContainer, 'crankColumns');
    const metalButton = this.createElement('div', 'metalButton', metalMainSection, 'crankButton', 'Scrap Metal');
    const metalProgressContainer = this.createElement('div', '', metalMainSection, 'crankProgressContainer');
    const metalProgress = this.createElement('div', 'metalProgress', metalProgressContainer, 'crankProgress');
    const metalProgressValue = this.createElement('div', 'metalProgressValue', metalMainSection);
    metalButton.onpointerdown = () => {this.metalPress = true; this.metalPressStartTime = this.curTime;};
    metalButton.onpointerup = () => { if (this.curTime < this.metalPressStartTime + this.clickHoldDuration) { this.metalClick(); } this.metalPress = false; };

    //[metal queue #] [metal queue slider]
    const metalQueueSection = this.createElement('div', 'metalQueueSection', gameContainer, 'crankColumns');
    const metalQueueCount = this.createElement('div', 'metalQueueCount', metalQueueSection);
    const metalQueueSlider = this.createElement('input', 'metalQueueSlider', metalQueueSection, 'crankSlider');
    metalQueueSlider.type = 'range';
    metalQueueSlider.min = 0;
    metalQueueSlider.max = this.state.metalQueueMax;
    metalQueueSlider.value = this.state.metalQueue;
    metalQueueSlider.onchange = () => this.state.metalQueue = parseInt(metalQueueSlider.value);
    metalQueueSlider.onpointerdown = () => this.mqsMoving = true;
    metalQueueSlider.onpointerup = () => this.mqsMoving = false;

    //[battery button] [battery progress]
    //Battery: [battery count]
    const batteryMainSection = this.createElement('div', 'batteryMainSection', gameContainer, 'crankColumns');
    const batteryButton = this.createElement('div', 'batteryButton', batteryMainSection, 'crankButton', 'Battery');
    const batteryProgressContainer = this.createElement('div', '', batteryMainSection, 'crankProgressContainer');
    const batteryProgress = this.createElement('div', 'batteryProgress', batteryProgressContainer, 'crankProgress');
    const batteryProgressValue = this.createElement('div', 'batteryProgressValue', batteryMainSection);
    batteryButton.onpointerdown = () => {this.batteryPress = true; this.batteryPressStartTime = this.curTime;};
    batteryButton.onpointerup = () => { if (this.curTime < this.batteryPressStartTime + this.clickHoldDuration) { this.batteryClick(); } this.batteryPress = false; };

    //[battery queue #] [battery queue slider]
    const batteryQueueSection = this.createElement('div', 'batteryQueueSection', gameContainer, 'crankColumns');
    const batteryQueueCount = this.createElement('div', 'batteryQueueCount', batteryQueueSection);
    const batteryQueueSlider = this.createElement('input', 'batteryQueueSlider', batteryQueueSection, 'crankSlider');
    batteryQueueSlider.type = 'range';
    batteryQueueSlider.min = 0;
    batteryQueueSlider.max = this.state.batteryQueueMax;
    batteryQueueSlider.value = this.state.batteryQueue;
    batteryQueueSlider.onchange = () => { this.state.batteryQueue = parseInt(batteryQueueSlider.value); };
    batteryQueueSlider.onpointerdown = () => this.bqsMoving = true;
    batteryQueueSlider.onpointerup = () => this.bqsMoving = false;

    //[comp upgrade button] [comp target selection]
    const compTargetSection = this.createElement('div', 'compTargetSection', gameContainer, 'crankColumns');
    const compUpgradeButton = this.createElement('div', 'compButton', compTargetSection, 'crankButton', `CPU (${15 + 5 * this.state.compPowerMax})`);
    compUpgradeButton.onpointerdown = () => {this.cpuPress = true; this.cpuPressStartTime = this.curTime;};
    compUpgradeButton.onpointerup = () => { if (this.curTime < this.cpuPressStartTime + this.clickHoldDuration) { this.compUpgradeClick(); } this.cpuPress = false; };

    const compProgressContainer = this.createElement('div', '', compTargetSection, 'crankProgressContainer');
    const compProgress = this.createElement('div', 'compProgress', compProgressContainer, 'crankProgress');
    const compTargetLabel = this.createElement('div', '', compTargetSection, '', 'CPU Target');
    const compTargetRadioContainer = this.createElement('div', '', compTargetSection, '', '');
    const compTargetRadioCrank = this.createElement('input', 'radioCrank', compTargetRadioContainer, '');
    compTargetRadioCrank.type = 'radio';
    compTargetRadioCrank.name = 'target';
    compTargetRadioCrank.checked = this.state.compTarget === 0;
    compTargetRadioCrank.onchange = () => this.radioChange(0);
    this.createElement('label', '', compTargetRadioContainer, '', 'Crank');
    const compTargetRadioScrap = this.createElement('input', 'radioScrap', compTargetRadioContainer, '');
    compTargetRadioScrap.type = 'radio';
    compTargetRadioScrap.name = 'target';
    compTargetRadioScrap.checked = this.state.compTarget === 1;
    compTargetRadioScrap.onchange = () => this.radioChange(1);
    this.createElement('label', '', compTargetRadioContainer, '', 'Scrap');
    const compTargetRadioBattery = this.createElement('input', 'radioBattery', compTargetRadioContainer, '');
    compTargetRadioBattery.type = 'radio';
    compTargetRadioBattery.name = 'target';
    compTargetRadioBattery.checked = this.state.compTarget === 2;
    compTargetRadioBattery.onchange = () => this.radioChange(2);
    this.createElement('label', '', compTargetRadioContainer, '', 'Battery');
    /*
    const compTargetRadioHeat = this.createElement('input', 'radioHeat', compTargetRadioContainer, '');
    compTargetRadioHeat.type = 'radio';
    compTargetRadioHeat.name = 'target';
    compTargetRadioHeat.checked = this.state.compTarget === 3;
    compTargetRadioHeat.onchange = () => this.radioChange(3);
    this.createElement('label', '', compTargetRadioContainer, '', 'Heat');
    */

    //[comp power #] [comp power slider]
    const compPowerSection = this.createElement('div', 'compPowerSection', gameContainer, 'crankColumns');
    const compPowerCount = this.createElement('div', 'compPowerCount', compPowerSection, '', '0 power / sec');
    const compPowerSlider = this.createElement('input', 'compPowerSlider', compPowerSection, 'crankSlider');
    compPowerSlider.type = 'range';
    compPowerSlider.min = 0;
    compPowerSlider.max = this.state.compPowerMax;
    compPowerSlider.value = this.state.compPower;
    compPowerSlider.onchange = () => this.state.compPower = parseInt(compPowerSlider.value);

    //[comp progress]
    const compProgressSecton = this.createElement('div', 'compProgressSection', gameContainer);
  }

  crankMouseDown(evt) {
    //if (evt.button === 0) {
      this.crankForce = 1;
   // }
  }
  crankMouseUp(evt) {
    //if (evt.button === 0) {
      this.crankForce = 0;
    //}
  }
  crankMouseLeave(evt) {
    this.crankForce = 0;
  }

  metalClick() {
    if (this.state.metalStart === Infinity && this.state.powerLevel >= this.metalCost) {
      this.state.powerLevel -= this.metalCost;
      this.state.metalStart = (new Date()).getTime() / 1000;
    } else {
      if (this.state.metalStart < Infinity && this.state.powerLevel >= this.metalBoostCost) {
        this.state.powerLevel -= this.metalBoostCost;
        this.state.previousMetalProgress += 25;
      }
    }
  }

  batteryClick() {
    if (this.state.batteryStart === Infinity && this.state.powerLevel >= this.batteryPowerCost && this.state.metalCount >= this.batteryMetalCost) {
      this.state.powerLevel -= this.batteryPowerCost;
      this.state.metalCount -= this.batteryMetalCost;
      this.state.batteryStart = (new Date()).getTime() / 1000;
    } else {
      if (this.state.batteryStart < Infinity && this.state.metalCount >= this.batteryBoostMetalCost) {
        this.state.metalCount -= this.batteryBoostMetalCost;
        this.state.previousBatteryProgress += 25;
      }
    }
  }

  compUpgradeClick() {
    const upgradeCost = 15 + 5 * this.state.compPowerMax;
    if (this.state.metalCount >= upgradeCost) {
      this.state.metalCount -= upgradeCost;
      this.state.compPowerMax++;
      this.UI.compPowerSlider.max = this.state.compPowerMax;
      this.UI.compButton.innerText = `CPU (${15 + 5 * this.state.compPowerMax})`;
    }
  }

  radioChange(target) {
    this.state.previousCompProgress = 0;
    this.state.compStart = Infinity;
    this.compProgress = 0;
    this.lastCompPower = 0;
    this.state.compTarget = target;
  }

  getCompTargetCost() {
    switch (this.state.compTarget) {
      case 0: {
        return 100 + 50 * this.state.crankLevels;
      }
      case 1: {
        return 100 + 50 * this.state.scrapLevels;
      }
      case 2: {
        return 100 + 50 * this.state.batteryLevels;
      }
      case 3: {
        return 100; 
      }
    }
  }
}

//permission granted by firefliesalco, the creator of lawnmower game, on discord 10/20/2023
//  to "Feel free to use the code for the game however you wish"
//  Some constants, code, etc. copied or adapted from https://www.firefliesalco.com/lawnmower-game/
class CellObjectEnemyLawn extends CellObjectEnemy {
  constructor(cell, dist) {
    super(cell, dist, 'lawn');
    this.state.type = 'enemyLawn';
    this.baseStrength = 10 * Math.pow(strengthDistFactor, dist);
    this.csize = 240;
    //note that there's no upgrade here for the last value but the LAWNRATE accounts for it
    this.tsize = [24, 12, 10, 5, 3, 2, 1, 1];
    this.upgradeTypes = 'tr,gr,ls,lz,ts'.split`,`;
    this.state.start = Infinity;
    this.state.strength = this.baseStrength;
    this.state.savedMoney = 0;
    this.money = 0;
    this.state.totalMoney = 0;
    this.state.savedTotalMoney = 0;

    this.state.mulch = 0;
    this.state.displayField = 0;
    this.state.highestUnlock = 0;
    this.machinei = 0;
    this.lastMachinei = 0;
    this.maxGrowth = 15;
    this.state.fields = [];
    this.initFieldConsts();
    this.initFields();
    this.initUpgrades();
    this.nextTick = 0;
  }

  initUpgrades() {
    this.upgradeConsts = {};
    this.upgradeConsts.ls = {
      name: () => `${this.fieldConsts[this.state.displayField].machineName} Speed`,
      price: 50, //speedBasePrice
      multiplier: 2.5, //mowerRateMultiplier
      onBuy: () => this.state.fields[this.state.displayField].machineSpeed++,
      dispVal: () => `${this.state.fields[this.state.displayField].machineSpeed} tiles/tick`,
      canBuy: () => this.state.fields[this.state.displayField].machineSpeed < 20
    };
    this.upgradeConsts.lz = {
      name: () => `${this.fieldConsts[this.state.displayField].machineName} Size`,
      price: 75,
      multiplier: 1.5,
      onBuy: () => {
        const state = this.state.fields[this.state.displayField];
        if (state.machineWidth === state.machineHeight) {
          state.machineWidth++;
        } else {
          state.machineHeight++;
        }
        this.lastMachinei = 0;
        this.machinei = 0;
      },
      dispVal: () => `${this.state.fields[this.state.displayField].machineWidth}x${this.state.fields[this.state.displayField].machineHeight}`,
      canBuy: () => this.state.fields[this.state.displayField].machineHeight < this.csize / this.tsize[this.state.fields[this.state.displayField].tileSize]
    };
    this.upgradeConsts.ts = {
      name: () => 'Tile Size',
      price: 150,
      multiplier: 3.5,
      onBuy: () => {
        this.state.fields[this.state.displayField].tileSize = Math.min(this.state.fields[this.state.displayField].tileSize + 1, this.tsize.length - 1);
        this.resetGrid();
        this.updateCanvas();
      },
      dispVal: () => {const width = this.csize / this.tsize[this.state.fields[this.state.displayField].tileSize]; return `${width}x${width}`;},
      canBuy: () => this.state.fields[this.state.displayField].tileSize < this.tsize.length - 1
    };
    this.upgradeConsts.gr = {
      name: () => 'Growth Rate',
      price: 10,
      multiplier: 1.2,
      onBuy: () => this.state.fields[this.state.displayField].growthAmount += 2,
      dispVal: () => `${this.state.fields[this.state.displayField].growthAmount} growth/tick`,
      canBuy: () => this.state.fields[this.state.displayField].growthAmount < 60
    };
    this.upgradeConsts.tr = {
      name: () => 'Tick Rate',
      price: 5,
      multiplier: 1.2,
      onBuy: () => this.state.fields[this.state.displayField].tickRate = Math.max(1, Math.floor(this.state.fields[this.state.displayField].tickRate*0.9)),
      dispVal: () => `${this.state.fields[this.state.displayField].tickRate} ms`,
      canBuy: () => this.state.fields[this.state.displayField].tickRate > 4
    };
  }

  initFieldConsts() {
    this.fieldConsts = [];
    this.fieldConsts.push({"name":"Grass","multiplierBuff":0,"initialBuff":1,"baseColor":[0,210,0],"grownColor":[0,130,0],"machineColor":"rgb(255,0,0)","unlockPrice":0,"value":1,"machineName":"Lawnmower"});
    this.fieldConsts.push({"name":"Dirt","multiplierBuff":0.15,"initialBuff":10,"baseColor":[175,175,175],"grownColor":[122,96,0],"machineColor":"rgb(68, 130, 206)","unlockPrice":100000,"value":5,"machineName":"Vacuum"});
    this.fieldConsts.push({"name":"Weed","multiplierBuff":0.25,"initialBuff":50,"baseColor":[239,233,112],"grownColor":[145,233,124],"machineColor":"rgb(255,127,0)","unlockPrice":1000000,"value":20,"machineName":"Weed Whacker"});
    this.fieldConsts.push({"name":"Pumpkin","multiplierBuff":0.35,"initialBuff":100,"baseColor":[181,155,105],"grownColor":[255,188,61],"machineColor":"rgb(119, 119, 119)","unlockPrice":10000000,"value":50,"machineName":"Harvester"});
    this.fieldConsts.push({"name":"Tree","multiplierBuff":0.45,"initialBuff":500,"baseColor":[122,81,0],"grownColor":[54,109,0],"machineColor":"rgb(97, 175, 191)","unlockPrice":100000000,"value":100,"machineName":"Chainsaw"});
    this.fieldConsts.push({"name":"Fire","multiplierBuff":0.55,"initialBuff":1000,"baseColor":[255,0,0],"grownColor":[255,255,0],"machineColor":"rgb(0,0,255)","unlockPrice":1000000000,"value":200,"machineName":"Wave"});
    this.fieldConsts.push({"name":"Stone","multiplierBuff":0.65,"initialBuff":5000,"baseColor":[255,255,255],"grownColor":[124,124,124],"machineColor":"rgb(122, 73, 33)","unlockPrice":10000000000,"value":500,"machineName":"Wooden Pickaxe"});
    this.fieldConsts.push({"name":"Iron","multiplierBuff":0.75,"initialBuff":10000,"baseColor":[124,124,124],"grownColor":[221,206,193],"machineColor":"rgb(100, 100, 100)","unlockPrice":100000000000,"value":1000,"machineName":"Stone Pickaxe"});
    this.fieldConsts.push({"name":"Diamond","multiplierBuff":0.85,"initialBuff":50000,"baseColor":[124,124,124],"grownColor":[124,239,228],"machineColor":"rgb(221, 206, 193)","unlockPrice":1000000000000,"value":2000,"machineName":"Iron Pickaxe"});
    this.fieldConsts.push({"name":"Gold","multiplierBuff":0.95,"initialBuff":100000,"baseColor":[138,202,216],"grownColor":[211,176,0],"machineColor":"rgb(143, 158, 139)","unlockPrice":10000000000000,"value":5000,"machineName":"Pan"});
    this.fieldConsts.push({"name":"People","multiplierBuff":0.65,"initialBuff":5000,"baseColor":[255,67,50],"grownColor":[255,211,168],"machineColor":"rgb(100, 100, 100)","unlockPrice":100000000000000,"value":10000,"machineName":"Terminator"});
  }

  initFields() {

    this.fieldConsts.forEach( (f, i) => {
      const fstate = {};
      fstate.tileSize = 0;
      fstate.machineSpeed = 1;
      fstate.machineWidth = 1;
      fstate.machineHeight = 1;
      fstate.growthAmount = 4;
      fstate.tickRate = 1000;
      fstate.unlocked = false;
      fstate.upgrades = {};
      this.upgradeTypes.forEach( u => {
        fstate.upgrades[u] = 0;
      });
      this.state.fields[i] = fstate;
    });
    this.state.fields[0].unlocked = true;
  }

  getUpgradePrice(name) {
    const upgrade = this.upgradeConsts[name];
    const initialBuff = this.fieldConsts[this.state.displayField].initialBuff;
    const multiplierBuff = this.fieldConsts[this.state.displayField].multiplierBuff;
    return Math.floor(upgrade.price * initialBuff * Math.pow(upgrade.multiplier + multiplierBuff, this.state.fields[this.state.displayField].upgrades[name]));
  }

  resetGrid() {
    const s = this.tsize[this.state.fields[this.state.displayField].tileSize];
    const w = this.csize / s;
    const h = this.csize / s;
    this.grid = new Array(w);
    for (let x = 0; x < w; x++) {
      this.grid[x] = new Array(h);
      for (let y = 0; y < h; y++) {
        this.grid[x][y] = Math.floor(Math.random() * this.maxGrowth);
      }
    }
  }

  getFieldRate(state, i) {
    //return $ per second
    if (!state.unlocked) { return 0; }

    //get rate from LAWNRATES table defined elsewhere. The table is
    //based on simulations of the actual game code at all combinations
    //of upgrades except width. The width value is only sampled at 5
    //places and we interpolate between them here to get a final rate.

    //need to use orig tile sizes, not the ones used in this version
    const tileSizes = [50,25,20,10,5,4,2,1];
    let g = state.growthAmount;
    let scale = 1.0;
    //accidentally missed some values in the data so we compensate here
    if (g > 58) {
      scale *= 1.01;
      g = 58;
    }
    let s = state.machineSpeed;
    if (s > 19) {
      scale *= 1.01;
      s = 19;
    }
    const z = state.tileSize;
    const w = state.machineWidth;
    const wstep = Math.floor((500 / tileSizes[z]) / 5);
    const maxW = 500 / tileSizes[z];
    const wl = Math.floor((w - 1) / wstep) * wstep + 1;
    const wh = Math.min(maxW, Math.ceil(w / wstep) * wstep + 1);
    const tickRateMul = 1 / (state.tickRate / 1000);
    const value = this.fieldConsts[i].value;
    if (w === wl) {
      return LAWNRATES[`${g},${s},${z},${w}`] * scale * tickRateMul * value;
    } else {
      const lb = LAWNRATES[`${g},${s},${z},${wl}`];
      const ub = LAWNRATES[`${g},${s},${z},${wh}`];
      const f = (w - wl) / (wh - wl);
      return (lb + (ub - lb) * f) * scale * tickRateMul * value;
    }
  }

  getGrowthBonus() {
    return Math.floor(Math.log(Math.max(1, this.state.mulch))/Math.log(15));
  }

  getNextMulch() {
    return Math.floor(Math.max(0, Math.pow(Math.max(0, this.totalMoney / 10 - 7500), 0.575) - this.state.mulch));
  }

  update(curTime, neighbors) {
    super.update(curTime, neighbors);

    if (this.grid === undefined) {
      this.resetGrid();
    }

    const gain = this.state.fields.reduce( (acc, f, i) => acc + this.getFieldRate(f, i), 0);
    const rate = this.tPower * gain;

    if (this.state.start === Infinity && this.tPower > 0) {
      this.state.start = (new Date()).getTime() / 1000;
    }

    //this is used elsewhere to determine if the cell is active
    this.rate = rate;

    if (this.tPower !== this.lasttPower && this.state.start < Infinity) {
      this.state.savedMoney = Math.floor((curTime - this.state.start)) * this.lasttPower * gain + this.state.savedMoney;
      this.state.savedTotalMoney = Math.floor((curTime - this.state.start)) * this.lasttPower * gain + this.state.savedTotalMoney;

      this.state.start = curTime;
    }

    if (rate > 0) {
      const increase = Math.floor((curTime - this.state.start)) * rate * (1 + this.state.mulch/100);
      this.money      = increase + this.state.savedMoney;
      this.totalMoney = increase + this.state.savedTotalMoney;


      if (curTime >= this.nextTick && (curTime - this.lastActive) < 1) {
        this.tick = true;
        const tickRate = this.state.fields[this.state.displayField].tickRate / 1000;
        this.nextTick = curTime + tickRate;

        for (let i = 0; i < this.state.fields[this.state.displayField].growthAmount; i++) {
          this.growRndTile();
        }
        
        this.lastMachinei = this.machinei;
        for (let i = 0; i < this.state.fields[this.state.displayField].machineSpeed; i++) {
          this.stepMachine();
        }
      } else {
        this.tick = false;
      }

    } else {
      this.money = this.state.savedMoney;
      this.totalMoney = this.state.savedTotalMoney;
    }

    this.percent = 100 * (1 - this.money / this.baseStrength);

    if (this.percent <= 0) {
      //game over
      return {
        tpoints: 1 * Math.pow(rewardDistFactor, this.dist),
      };
    }

  }

  displayCellInfo(container) {
    super.displayCellInfo(container);

    this.lastActive = this.curTime;
    
    this.UI.cash.innerText = `${this.formatCurrency(this.money, 'floor')} / ${this.formatCurrency(this.baseStrength, 'ceil')}`;
    this.upgradeTypes.forEach( u => {
      const ub = this.UI[`button${u}`];
      const ud = this.UI[`desc${u}`];
      const cost = this.getUpgradePrice(u);
      const canBuy = this.upgradeConsts[u].canBuy();
      ub.innerText = `${this.upgradeConsts[u].name()} - ${canBuy ? this.formatCurrency(cost, 'ceil') : 'MAXED'}`;
      ud.innerText = this.upgradeConsts[u].dispVal();
      ub.disabled = !(canBuy && (cost <= this.money));
    });

    const nextFieldIndex = this.state.highestUnlock + 1;
    if (nextFieldIndex === this.fieldConsts.length) {
      this.UI.unlock.innerText = `All Fields Unlocked`;
      this.UI.unlock.disabled = true;
    } else {
      const nextFieldName = this.fieldConsts[nextFieldIndex].name;
      const nextFieldCost = this.fieldConsts[nextFieldIndex].unlockPrice;
      this.UI.unlock.innerText = `Unlock ${nextFieldName} - ${this.formatCurrency(nextFieldCost, 'ceil')}`;
      this.UI.unlock.disabled = nextFieldCost > this.money;
    }
    this.UI.prev.disabled = this.state.displayField <= 0;
    this.UI.next.disabled = (this.state.displayField + 1 >= this.state.fields.length) || (!this.state.fields[this.state.displayField + 1].unlocked);
    this.UI.mulch.innerText = this.formatValue(this.state.mulch, 'floor', '');
    const nextMulch = this.getNextMulch();
    this.UI.prestige.innerText = `Prestige for ${this.formatValue(nextMulch, 'floor', '')} Mulch`;
    this.UI.prestige.disabled = nextMulch === 0;
    this.UI.value.innerText = `${this.formatValue(this.state.mulch, 'floor', '')}%`;
    this.UI.growth.innerText = `${this.formatValue(this.getGrowthBonus() + 1, 'floor', '')}x`;

    if (this.tick) {
      for (let i = this.lastMachinei; i < this.machinei; i++) {
        if (i !== this.lastMachinei) {
          this.displayMachine(i, false);
        }
        this.displayMachine(i, true);
      }
      let i = this.lastMachinei;
      while (i !== this.machinei) {
        if (i !== this.lastMachinei) {
          this.displayMachine(i, false);
        }
        this.displayMachine(i, true);
        i = (i + 1) % this.getMaxMachinei(); 
      }
      this.displayMachine(this.machinei, false);
    }

  }

  updateCanvas() {
    const s = this.tsize[this.state.fields[this.state.displayField].tileSize];
    const w = this.csize / s;
    const h = this.csize / s;
    const ctx = this.UI.canvas.ctx;

    ctx.save();

    for (let x = 0; x < w; x++) {
      const col = this.grid[x];
      const xpos = x * s;
      for (let y = 0; y < h; y++) {
        const cell = col[y];
        ctx.fillStyle = this.getTileColor(cell);
        ctx.fillRect(xpos, y * s, s, s);
      }
    }

    ctx.restore();
  }

  growRndTile() {
    if (this.state.fields[this.state.displayField].machineWidth > 50) {return;}
    const s = this.tsize[this.state.fields[this.state.displayField].tileSize];
    const w = this.csize / s;
    const h = this.csize / s;
    const gx = Math.floor(Math.random() * w);
    const gy = Math.floor(Math.random() * h);
    const cell = Math.min(this.maxGrowth, this.grid[gx][gy] + 1 + this.getGrowthBonus());
    this.grid[gx][gy] = cell;
    if (this.UI.canvas) {
      const ctx = this.UI.canvas.ctx;
      
      ctx.fillStyle = this.getTileColor(cell);
      ctx.fillRect(gx * s, gy * s, s, s);
    }
  }

  getMaxMachinei() {
    const s = this.tsize[this.state.fields[this.state.displayField].tileSize];
    const mw = this.state.fields[this.state.displayField].machineWidth;
    const mh = this.state.fields[this.state.displayField].machineHeight;
    const maxi = Math.ceil(this.csize / (mw * s)) * Math.ceil(this.csize / (mh * s));
    return maxi;
  }

  stepMachine() {
    const maxi = this.getMaxMachinei();
    //this.lastMachinei = this.machinei;
    this.machinei = (this.machinei + 1) % maxi;
  }

  displayMachine(i, erase) {
    const s = this.tsize[this.state.fields[this.state.displayField].tileSize];
    const mw = this.state.fields[this.state.displayField].machineWidth;
    const mh = this.state.fields[this.state.displayField].machineHeight;
    const cw = Math.ceil(this.csize / (s * mw));
    const ch = Math.ceil(this.csize / (s * mh));
    const mx = Math.floor(i / ch);
    const my = mx % 2 ? ((ch-1) - i % ch) : i % ch;
    const ctx = this.UI.canvas.ctx;
    const bound = this.csize / s;
   
    if (erase) {
      if (mw > 50) {
        ctx.fillStyle = this.getTileColor(0);
        ctx.fillRect(mx * mw * s, my * mh * s, mw * s, mh * s);
      } else {
        for (let x = 0; x < mw; x++) {
          for (let y = 0; y < mh; y++) {
            const gx = mx * mw + x;
            const gy = my * mh + y;
            if (gx >= bound) {continue;}
            if (gy >= bound) {continue;}
            const cell = this.grid[gx][gy];
            ctx.fillStyle = this.getTileColor(cell);
            ctx.fillRect(gx * s, gy * s, s, s);
          }
        }
      }
    } else {
      if (i === this.machinei) {
        ctx.fillStyle = this.fieldConsts[this.state.displayField].machineColor;
        ctx.fillRect(mx * s * mw, my * s * mh, mw * s, mh * s);
      }
      if (mw <= 50) {
        for (let x = 0; x < mw; x++) {
          for (let y = 0; y < mh; y++) {
            const gx = mx * mw + x;
            const gy = my * mh + y;
            if (gx >= bound) {continue;}
            if (gy >= bound) {continue;}
            if (this.grid[gx][gy] >= 5) {
              this.grid[gx][gy] = 0;
            }
          }
        }
      }
    }
  }

  initGame(gameContainer) {
    super.initGame(gameContainer);
    
    const containerDiv = this.createElement('div', '', gameContainer, 'lawnContainer');
    const leftDiv = this.createElement('div', 'lawnLeft', containerDiv);
    const rightDiv = this.createElement('div', '', containerDiv);

    const cashDiv = this.createElement('div', '', leftDiv);
    const cashSpan = this.createElement('span', 'cash', cashDiv);
    const totalDiv = this.createElement('div', '', leftDiv);

    this.upgradeTypes.forEach( u => {
      const upgradeDiv = this.createElement('div', '', leftDiv);
      const button = this.createElement('button', `button${u}`, upgradeDiv, 'lawnUpgradeButton', u);
      const desc = this.createElement('div', `desc${u}`, upgradeDiv, '', 'desc');
      button.onclick = () => this.buyUpgrade(u);
    });

    const unlockDiv = this.createElement('div', '', leftDiv);
    const unlockB = this.createElement('button', 'unlock', unlockDiv, 'lawnUpgradeButton');
    const switchDiv = this.createElement('div', '', leftDiv);
    const prevB = this.createElement('button', 'prev', switchDiv, '', '<');
    const nextB = this.createElement('button', 'next', switchDiv, '', '>');
    prevB.onclick = () => this.prevField();
    unlockB.onclick = () => this.unlockField();
    nextB.onclick = () => this.nextField();

    const mulchDiv = this.createElement('div', '', leftDiv, '', 'Mulch: ');
    const mulchSpan = this.createElement('span', 'mulch', mulchDiv, '', '0');
    const prestigeDiv = this.createElement('div', '', leftDiv);
    const prestigeB = this.createElement('button', 'prestige', prestigeDiv, 'lawnUpgradeButton');
    prestigeB.onclick = () => this.prestige();

    const valueDiv = this.createElement('div', '', leftDiv, '', 'Value Bonus: ');
    const valueSpan = this.createElement('span', 'value', valueDiv, '', '0%');

    const growthDiv = this.createElement('div', '', leftDiv, '', 'Growth Bonus: ');
    const growthSpan = this.createElement('span', 'growth', growthDiv, '', '1x');

    const canvas = this.createElement('canvas', 'canvas', rightDiv, 'lawnCanvas');
    canvas.width = this.csize;
    canvas.height = this.csize;
    canvas.ctx = canvas.getContext('2d');

    this.updateCanvas();
  }

  getTileColor(val) {
    const ratio = val / this.maxGrowth;
    const fieldi = this.state.displayField;
    const baseColor = this.fieldConsts[fieldi].baseColor;
    const grownColor = this.fieldConsts[fieldi].grownColor;
    const r = baseColor[0] + (ratio * (grownColor[0] - baseColor[0]));
    const g = baseColor[1] + (ratio * (grownColor[1] - baseColor[1]));
    const b = baseColor[2] + (ratio * (grownColor[2] - baseColor[2]));

    return `rgb(${r},${g},${b})`;
  }

  buyUpgrade(upgradeName) {
    const cost = this.getUpgradePrice(upgradeName);
    if (this.money >= cost) {
      this.state.savedMoney = this.money - cost;
      this.state.savedTotalMoney = this.totalMoney;
      this.state.start = this.curTime;
      this.upgradeConsts[upgradeName].onBuy();
      this.state.fields[this.state.displayField].upgrades[upgradeName]++;
    }
  }

  changeField() {
    this.lastMachinei = 0;
    this.machinei = 0;
    this.resetGrid();
    this.updateCanvas();
    this.nextTick = this.curTime;
  }

  prevField() {
    this.state.displayField = Math.max(0, this.state.displayField - 1);
    this.changeField();
  }

  nextField() {
    const nextField = this.state.displayField + 1;
    if ((nextField < this.fieldConsts.length) && this.state.fields[nextField].unlocked) {
      this.state.displayField = nextField;
      this.changeField();
    }
  }

  unlockField() {
    const nextField = this.state.displayField + 1;
    if (nextField >= this.fieldConsts.length) {return;}

    const cost = this.fieldConsts[nextField].unlockPrice;
    if (this.money >= cost) {
      this.state.savedMoney = this.money - cost;
      this.state.savedTotalMoney = this.totalMoney;
      this.state.start = this.curTime;
      this.state.fields[nextField].unlocked = true;
      this.state.highestUnlock++;
      this.state.displayField++;
      this.changeField();
    }
  }

  prestige() {
    const nextMulch = this.getNextMulch();
    if (nextMulch > 0) {
      this.state.mulch += nextMulch;
      this.state.start = this.curTime;
      this.state.savedMoney = 0;
      this.money = 0;
      this.state.savedTotalMoney = 0;
      this.totalMoney = 0;
      this.state.displayField = 0;
      this.state.highestUnlock = 0;
      this.machinei = 0;
      this.lastMachinei = 0;
      this.state.fields = [];
      this.initFields();
      this.nextTick = 0;
      this.changeField();
    }
  }
}

class CellObjectEnemyAnti extends CellObjectEnemy {
  constructor(cell, dist) {
    super(cell, dist, 'anti');
    this.state.type = 'enemyAnti';
    //furthest strength is 2.4e11
    //nearest strength is 379.69
    //this.baseStrength = activeFactor * 100 * Math.pow(strengthDistFactor, dist);
    //strength @ 5 = 400
    //strength @ 61 = 4e300
    this.baseStrength = activeFactor * (400 / 0.5) * Math.pow(strengthDistFactor * 210000 / 1.5, (dist - 5));
    this.state.start = Infinity;
    this.state.strength = this.baseStrength;
    this.state.maxDimUnlocked = 3;
    this.buySize = 1;
    this.state.boosts = 0;
    this.state.galaxies = 0;

    this.resetDimensions();

    this.dimBasePrice = [10, 100, 10000, 1e6, 1e9, 1e13, 1e18, 1e24];
    this.basePer10 = [1, 1000, 10000, 1e5, 1e6, 1e8, 1e10, 1e12, 1e15];

  }

  /*
    start gaining antimatter at a rate equal to the number of first dimensions you own
    first upgrade costs 10 AM, cost only increases when you pass the x10 threshold
    d1 goes from cost 10 to cost 10k
    higher dimensions create the dimension below
    8 dimensions total
    multiplier for each dimension increases by 2xBase for every 10 purchased, then the price will increase
  */

  /*
  TODO: 
  */

  update(curTime, neighbors) {
    super.update(curTime, neighbors);

    const dt = curTime - this.state.start;
    const scaledDt = dt * this.getTickspeedVal() * this.tPower;
    const gain = this.state.start < Infinity ? (
      this.getCompoundValue(this.state.savedDims, this.state.dimMults, scaledDt)
    ) : 0;
    const rate = this.state.start < Infinity ? (
      this.getCompoundValue(this.dims, this.state.dimMults, this.getTickspeedVal())
    ) : 0;
    this.rate = rate;

    if (this.tPower !== this.lasttPower && this.state.start < Infinity) {
      const lastGain = this.getCompoundValue(this.state.savedDims, this.state.dimMults, dt * this.lasttPower * this.getTickspeedVal());
      this.state.savedAnti = Math.floor((curTime - this.state.start)) * lastGain + this.state.savedAnti;

      this.state.start = curTime;
    }

    if (this.state.start < Infinity) {
      this.anti = gain + this.state.savedAnti; 

      const d = [...this.dims];
      const m = [...this.state.dimMults];
      for (let i = 0; i < 8; i++) {
        d.shift();
        d.push(0);
        m.shift();
        m.push(0);
        this.dims[i] = this.getCompoundValue(d, m, scaledDt) + this.state.savedDims[i];
      }
    } else {
      this.anti = this.state.savedAnti;
    }

    this.percent = 100 * (1 - this.anti / this.baseStrength);

    if (this.percent <= 0) {
      //game over
      return {
        tpoints: 1 * Math.pow(rewardDistFactor, this.dist),
      };
    }
  }

  displayCellInfo(container) {
    super.displayCellInfo(container);

    this.UI.am.innerText = this.formatValue(this.anti, 'floor');
    this.UI.rate.innerText = this.formatValue(this.rate, 'floor');
    this.UI.ts.innerText = this.formatValue(this.getTickspeedVal(), 'floor');
    const tickspeedCost = this.getTickspeedCost();
    this.UI.tsb.innerText = this.formatValue(tickspeedCost, 'ceil', 'Tickspeed Cost: ');
    this.UI.tsb.disabled = tickspeedCost > this.anti;
    this.UI.tsu.innerText = this.getTickspeedBase().toFixed(3);


    for (let i = 0; i <= 7; i++) {
      if (i > this.state.maxDimUnlocked) {
        this.UI[`dcont${i}`].style.display = 'none';
      } else {
        this.UI[`d${i}_buy`].disabled = this.getDimCost(i) > this.anti;
        this.UI[`dcont${i}`].style.display = 'grid';
        if (this.buySize === 1) {
          this.UI[`d${i}_buy`].innerText = `Buy 1 Cost: ${this.formatValue(this.getDimCost(i), 'ceil', '', ' AM')}`;
        } else {
          this.UI[`d${i}_buy`].innerText = `Buy ${this.getDimUntil10Size(i)} Cost: ${this.formatValue(this.getDimUntil10Cost(i), 'ceil', '', ' AM')}`;
        }
        this.UI[`d${i}_owned`].innerText = this.formatValue(this.dims[i], 'floor') + `(${this.state.boughtDims[i] % 10})`;
        if (i === 0) {
          this.UI[`d${i}_mult`].innerText = this.formatValue(this.state.dimMults[i], 'floor');
        } else {
          this.UI[`d${i}_mult`].innerText = this.formatValue(this.state.dimMults[i] * 10, 'floor');
        }
      }
    }

    this.UI.boost.innerText = this.state.boosts;
    const boostReq = this.getBoostReq();
    this.UI.boostReq.innerText = this.getBoostReqText(boostReq);
    this.UI.boostButton.disabled = this.dims[boostReq.type] < boostReq.count;
    this.UI.boostButton.innerText = this.getBoostButtonText(boostReq);


    this.UI.galaxies.innerText = this.state.galaxies;
    const galaxyReq = this.getGalaxyReq();
    this.UI.galaxiesReqCount.innerText = galaxyReq;
    this.UI.galaxiesButton.disabled = this.dims[7] < galaxyReq;

  }

  initGame(gameContainer) {
    super.initGame(gameContainer);

    /*
    You have X antimatter.
    You are getting X antimatter per second.
    ADs produce xX faster per Tickspeed upgrade
    Total Tickspeed: x / sec
    [Until 10][Max All (M)]
          Buy 10 Dimension purchase multiplier: xX
    nth Antimatter Dimension       | Buy X      |
    xX                       X     | Cost: X AM |

    Dimension Boost (X)             Antimatter Galaxies (X)
    Requires: X Xth Antimatter D    Requires: X 8th Antimatter D
    [Reset...]                      [Reset ...]
    [X.XX%------|          ]
    */

    const am = this.createElement('div', '', gameContainer, 'antiCenter');
    this.createElement('span', '', am, '', 'You have ');
    this.createElement('span', 'am', am, 'anti', '10.0');
    this.createElement('span', '', am, '', this.formatValue(this.baseStrength, 'ceil', ' / ', ' anti'));

    const rate = this.createElement('div', '', gameContainer, 'antiCenter');
    this.createElement('span', '', rate, '', 'You are getting ');
    this.createElement('span', 'rate', rate, '', '0');
    this.createElement('span', '', rate, '', ' anti per second.');

    const tsu = this.createElement('div', '', gameContainer, 'antiCenter');
    this.createElement('span', '', tsu, '', 'ADs produce x');
    this.createElement('span', 'tsu', tsu, '', '1.125'); 
    this.createElement('span', '', tsu, '', ' faster per Tickspeed upgrade');

    const ts = this.createElement('div', '', gameContainer, 'antiCenter');
    this.createElement('span', '', ts, '', 'Total Tickspeed: ');
    this.createElement('span', 'ts', ts, '', '1.000');
    this.createElement('span', '', ts, '', ' / sec ');
    const tsb = this.createElement('button', 'tsb', ts, '', 'Tickspeed Cost: 1e3');
    tsb.onclick = () => this.buyTickspeed();

    const buyRow = this.createElement('div', '', gameContainer, 'antiCenter');
    const buyNext = this.createElement('button', 'buySize', buyRow, '', 'Buy 1');
    buyNext.onclick = () => this.toggleBuySize();
    const buyMax = this.createElement('button', 'buyMax', buyRow, '', 'Max All');
    buyMax.onclick = () => this.buyMax();

    const dm = this.createElement('div', '', gameContainer, 'antiCenter');
    this.createElement('span', '', dm, '', 'Buy 10 Dimension purchase multiplier: x');
    this.createElement('span', 'dm', dm, '', '2.00');

    const dimensionsContainer = this.createElement('div', 'dimensionsContainer', gameContainer, 'antiTable');
    for (let d = 0; d <= 7; d++) {
      const dcont = this.createElement('div', `dcont${d}`, dimensionsContainer, 'antiRow');
      this.createElement('div', '', dcont, '', `D${d+1}`);
      this.createElement('div', `d${d}_mult`, dcont, '', 'x1.03');
      this.createElement('div', `d${d}_owned`, dcont, '', '0');
      const bcont = this.createElement('div', '', dcont);
      const buyButton = this.createElement('button', `d${d}_buy`, bcont, '', 'Buy 1 Cost: 10');
      buyButton.onclick = () => this.buyDimension(d);
    }

    const resetContainer = this.createElement('div', '', gameContainer);
    const boostContainer = this.createElement('div', '', resetContainer);
    const boostLabel = this.createElement('div', '', boostContainer, 'antiCenter');
    this.createElement('span', '', boostLabel, '', 'Dimension Boost (');
    this.createElement('span', 'boost', boostLabel, '', '0');
    this.createElement('span', '', boostLabel, '', ')');

    const boostReq = this.createElement('div', '', boostContainer, 'antiCenter');
    this.createElement('span', '', boostReq, '', 'Requires: ');
    this.createElement('span', 'boostReq', boostReq, '', '20 AD 4');

    const boostButtonContainer = this.createElement('div', '', boostContainer, 'antiCenter');
    const boostButton = this.createElement('button', 'boostButton', boostButtonContainer, '', 'Reset your Dimensions to unlock the 5th Dimension and give a x2.0 multiplier to the 1st Dimension');
    boostButton.onclick = () => this.buyBoost();

    const galaxiesContainer = this.createElement('div', '', resetContainer);
    const galaxiesLabel = this.createElement('div', '', galaxiesContainer, 'antiCenter');
    this.createElement('span', '', galaxiesLabel, '', 'Antimatter Galaxies (');
    this.createElement('span', 'galaxies', galaxiesLabel, '', '0');
    this.createElement('span', '', galaxiesLabel, '', ')');

    const galaxiesReq = this.createElement('div', '', galaxiesContainer, 'antiCenter');
    this.createElement('span', '', galaxiesReq, '', 'Requires: ');
    this.createElement('span', 'galaxiesReqCount', galaxiesReq, '', '80');
    this.createElement('span', '', galaxiesReq, '', ' AD ');
    this.createElement('span', 'galaxiesReqType', galaxiesReq, '', '8');

    const galaxiesButtonContainer = this.createElement('div', '', galaxiesContainer, 'antiCenter');
    const galaxiesButton = this.createElement('button', 'galaxiesButton', galaxiesButtonContainer, '', 'Reset your Dimensions and Dimension Boosts to increase the power of Tickspeed upgrades');
    galaxiesButton.onclick = () => this.buyGalaxy();

  }

  getBasePer10(n) {
    const maxn = this.basePer10.length - 1;
    if (n <= maxn) {
      return this.basePer10[n];
    } else {
      return this.basePer10[maxn] * Math.pow(1e3, n - maxn);
    }
  }

  getDimCost(index) {
    const dimBought = this.state.boughtDims[index];
    //return this.dimBasePrice[index] * this.basePer10[Math.floor(dimBought / 10)];
    return this.dimBasePrice[index] * this.getBasePer10(Math.floor(dimBought / 10));
  }

  getDimUntil10Size(index) {
    return 10 - (this.state.boughtDims[index] % 10);
  }

  getDimUntil10Cost(index) {
    return this.getDimUntil10Size(index) * this.getDimCost(index);
  }

  //return the amount of anti after t seconds given initial dimension values in d and multiplier values given in m
  //can also be used for the current amount of a dimension given the higher dimension values
  //The values were determined by simulating the system, fitting a degree 8 polynomial, multiplying by 40320/40320,
  //  then setting only 1 d value to 1 while the others were zero to see the correct factor for that term
  //I tried to do it more algebraicly but I could not understand the pattern.
  getCompoundValue(dorig, m, t) {
    let cumulativeMul = 1;
    const d = dorig.map( (v, i) => {
      cumulativeMul *= m[i];
      return v * cumulativeMul;
    });
    let val = (
        Math.pow(t,8)*(d[7])
      + Math.pow(t,7)*(8*d[6]-28*d[7])
      + Math.pow(t,6)*(56*d[5]-168*d[6]+322*d[7])
      + Math.pow(t,5)*(336*d[4]-840*d[5]+1400*d[6]-1960*d[7])
      + Math.pow(t,4)*(1680*d[3]-3360*d[4]+4760*d[5]-5880*d[6]+6769*d[7])
      + Math.pow(t,3)*(6720*d[2]-10080*d[3]+11760*d[4]-12600*d[5]+12992*d[6]-13132*d[7])
      + Math.pow(t,2)*(20160*d[1]-20160*d[2]+18480*d[3]-16800*d[4]+15344*d[5]-14112*d[6]+13068*d[7])
      + Math.pow(t,1)*(40320*d[0]-20160*d[1]+13440*d[2]-10080*d[3]+8064*d[4]-6720*d[5]+5760*d[6]-5040*d[7])
      ) / 40320;
    if (isNaN(val)) {
      val = Infinity;
    }
    return Math.max(0, val);
  }

  updateSavedDims(deltaT) {
    //use getCompoundValue to update this.state.savedDims
    const dimList = [...this.dims];
    const multList = [...this.state.dimMults];
    for (let i = 0; i < 8; i++) {
      dimList.shift();
      dimList.push(0);
      multList.shift();
      multList.push(0);
      this.state.savedDims[i] += this.getCompoundValue(dimList, multList, deltaT);
    }
  }

  snapshot() {
    const deltaT = this.state.start < Infinity ? (this.curTime - this.state.start) * this.getTickspeedVal() * this.tPower : 0;
    this.updateSavedDims(deltaT);
    this.state.start = this.curTime;
  }

  getPurchasableTo10(i) {
    const cost = this.getDimCost(i);
    const size = this.getDimUntil10Size(i);
    const rawCount = Math.floor(this.anti / cost);
    return Math.min(size, rawCount);
  }

  buyDimension(i, maxMode) {
    let cost;
    let size;
    if (this.buySize === 1) {
      size = 1;
      cost = this.getDimCost(i);
    } else {
      if (maxMode) {
        //in max mode, only buy if we can get to the next level of 10
        //in max mode, buySize is always 10
        size = this.getDimUntil10Size(i);
        cost = this.getDimUntil10Cost(i);
      } else {
        //in normal mode, buy as many as we can up until 10
        const individualCost = this.getDimCost(i);
        size = this.getPurchasableTo10(i);
        cost = size * individualCost;
      }
    }
    if (this.anti >= cost) {
      this.state.savedAnti =  this.anti - cost;
      this.snapshot();
      this.state.boughtDims[i] += size;
      this.state.savedDims[i] += size;
      const boostMult = this.getBoostMult(i);
      if (i === 0) {
        this.state.dimMults[i] = boostMult * Math.pow(2, Math.floor(this.state.boughtDims[i] / 10));
      } else {
        this.state.dimMults[i] = boostMult * 0.1 * Math.pow(2, Math.floor(this.state.boughtDims[i] / 10));
      }
      return true;
    }
    return false;
  }

  getTickspeedCost() {
    return Math.pow(10, this.state.tickLevel + 3);
  }

  getTickspeedBase() {
    return this.state.galaxies * 0.02 + 1.125;
  }

  getTickspeedVal() {
    return Math.pow(this.getTickspeedBase(), this.state.tickLevel);
  }

  buyTickspeed() {
    const cost = this.getTickspeedCost();
    if (this.anti >= cost) {
      this.state.savedAnti = this.anti - cost;
      this.snapshot();
      this.state.tickLevel += 1;
      return true;
    }
    return false;
  }

  buyMaxTickspeed() {
    //TODO: this may be very slow if buying a lot...
    if (this.anti === Infinity) {return;}
    while (true) {
      if (!this.buyTickspeed()) {
        break;
      }
    }
  }

  buyMaxDimension(i) {
    //TODO: this may be very slow if buying a lot ...
    //this is called with buySize always = 10
    if (this.anti === Infinity) {return;}
    while (true) {
      if (!this.buyDimension(i, true)) {
        break;
      }
    }
  }

  toggleBuySize() {
    this.buySize = this.buySize === 1 ? 10 : 1;
    this.UI.buySize.innerText = this.buySize === 1 ? 'Buy 1' : 'Until 10';
  }

  buyMax() {
    //tickspeed
    this.buyMaxTickspeed();

    
    //dimensions in reverse order but only up to 10
    const origBuySize = this.buySize;
    this.buySize = 10;
    for (let dim = 7; dim >= 0; dim--) {
      if (dim <= this.state.maxDimUnlocked) {
        this.buyMaxDimension(dim);
      }
    }

    this.buySize = origBuySize;
  }

  getBoostReq() {
    if (this.state.boosts < 4) {
      return {count: 20, type: this.state.boosts + 3};
    } else {
      const count = -40 + 15 * this.state.boosts;
      return {count, type: 7};
    }
  }

  getBoostReqText(req) {
    return `${req.count} AD ${req.type + 1}`;
  }

  getBoostButtonText(req) {
    if (this.state.boosts < 4) {
      return `Reset your Dimensions to unlock D${req.type + 2} and give a x2 multiplier to the 1st ${Math.min(8, this.state.boosts + 1)} Dimensions`;
    } else {
      return `Reset your Dimensions to give a x2 multiplier to the 1st ${Math.min(8, this.state.boosts + 1)} Dimensions`;
    }
  }

  getBoostMult(i) {
    return Math.pow(2, Math.max(0, this.state.boosts - i));
  }

  resetDimensions() {
    this.state.savedAnti = 10;
    this.anti = 0;
    this.dims = (new Array(8)).fill(0);
    this.state.boughtDims = (new Array(8)).fill(0);
    this.state.savedDims = (new Array(8)).fill(0);
    this.state.tickLevel = 0;

    this.state.dimMults = (new Array(9)).fill(0.1);
    this.state.dimMults[0] = 1;

    for (let i = 0; i < Math.min(8, this.state.boosts); i++) {
      this.state.dimMults[i] *= this.getBoostMult(i);
    }
  }

  buyBoost() {
    const req = this.getBoostReq();
    if (this.dims[req.type] >= req.count) {
      this.state.boosts += 1;
      this.resetDimensions();
      
      if (this.state.maxDimUnlocked < 7) {
        this.state.maxDimUnlocked += 1;
      }
    }
  }

  getGalaxyReq() {
    return 80 + 60 * this.state.galaxies;
  }

  buyGalaxy() {
    const req = this.getGalaxyReq();
    if (this.dims[7] >= req) {
      this.state.galaxies += 1;
      this.state.boosts = 0;
      this.state.maxDimUnlocked = 3;
      this.resetDimensions();
      //tickspeed increase happens automatically elsewhere
    }
  }

}

class CellObjectEnemySnail extends CellObjectEnemy {
  constructor(cell, dist) {
    super(cell, dist, 'snail');
    this.state.type = 'enemySnail';
    this.baseStrength = 10 * Math.pow(strengthDistFactor, dist);
    this.state.start = Infinity;
    this.state.strength = this.baseStrength;
    this.cellValues = {};
    this.progressElements = {};
    this.timeElements = {};
    this.state.activeCells = [];
    this.state.reverseActiveCells = [];
    this.state.completeCells = {};
    this.state.started = false;
    this.rowCount = 20;
    this.cellColors = ['hsl(123, 15%, 54%)', 'hsl(60, 48%, 54%)'];
    this.completeTime = 0;
    this.totalTime = 0;
    this.partialCompleteTime = 0;
    this.cellCount = 0;
    this.completeCount = 0;
    this.activated = 0;
    //this should make the 192073 seconds in the critical path of the triangle
    //take 604800s (7 days) when the spot has tpower=1e8
    this.tPowerScale = 6.220985e-8;

    for (let i = 0; i < this.rowCount; i++) {
      for (let j = 0; j <= i; j++) {
        this.state.completeCells[`${i},${j}`] = true;
      }
    }

  }

  postLoad() {
    //gets called during startup after constructor and after state is restored
  }

  initFinalCell() {
    const finalCellRow = this.rowCount - 1;
    const finalCellCol = this.rowCount >> 1;
    delete this.state.completeCells[`${finalCellRow},${finalCellCol}`];

    const finalCellDuration = this.getCellVal(finalCellRow, finalCellCol);
    this.completeTime -= finalCellDuration;
    this.completeCount--;

    const curTime = (new Date()).getTime();
    //leave 10 minutes left on the timer
    const finalCellStartTime = curTime - finalCellDuration * 1000 + (10 * 60 * 1000); 
    this.state.activeCells.push({
      name: `${this.rowCount - 1},${this.rowCount >> 1}`,
      startTime: finalCellStartTime,
      duration: finalCellDuration * 1000,
      baseDuration: finalCellDuration * 1000,
      percent: 0,
      remaining: finalCellDuration * 1000,
      row: finalCellRow,
      col: finalCellCol
    });

    this.state.gameStart = (new Date()).getTime();
  }

  /*
    TODO:
      figure out what appropriate scaling should be
        this.tPowerScale
        should take between 1 to 7 days to finish
        do something to indicate the scaling factor on spot's power
        power of 1e7 should take 14 days, 

        longest path time is 92778+ 48620+24310+12870+6435+3432+1716+924+462+252+126+70+35+20+10+6+3+2+1+1=192073
        192073  1
        604800  3.1488

        dist factor here is 5.105e-2
        1e8 * distFactor x = 1/3.1488

        



      
  */

  update(curTime, neighbors) {
    super.update(curTime, neighbors);

    this.partialCompleteTime = this.completeTime;
    const curMS = curTime * 1000;
    this.state.activeCells.forEach( cell => {
      //for forward cells, power is always 1
      /*
      if (this.tPower !== this.lasttPower) {
        cell.duration = cell.duration - (curMS - cell.startTime) * this.lasttPower;
        cell.startTime = curMS;
      }
      */

      //const completeTime = (curMS - cell.startTime) * this.tPower;
      const completeTime = (curMS - cell.startTime);
      const remaining = Math.max(0, cell.duration - completeTime);
      cell.percent = Math.min(100, 100 * (cell.baseDuration - remaining) / cell.baseDuration);
      cell.remaining = remaining;
      if (remaining <= 0) {
        cell.complete = true;
        this.progressComplete(cell.row, cell.col);
      }
      this.partialCompleteTime += completeTime;
    });

    this.state.reverseActiveCells.forEach( cell => {
      //duration is saved complete time
      if (this.tPower !== this.lasttPower) {
        cell.duration = cell.duration + (curMS - cell.startTime) * this.lasttPower * this.tPowerScale;
        cell.startTime = curMS;
      }

      const completeTime = cell.duration + (curMS - cell.startTime) * this.tPower * this.tPowerScale;
      //remaining time to get to 100%. in this case, it will be increasing since we're going backwards
      //typically, duration is constant and completeTime goes down. but, duration can change with
      //  snaptshotting
      const remaining = Math.min(cell.baseDuration, completeTime);
      //percent complete. will be decreasing. baseDuration is constant, remaining increases
      cell.percent = Math.max(0, 100 * (cell.baseDuration - remaining) / cell.baseDuration);
      cell.remaining = remaining;
      if (remaining >= cell.baseDuration) {
        cell.reverseComplete = true;
        this.progressReverseComplete(cell.row, cell.col);
      }
      this.partialCompleteTime += (cell.baseDuration - remaining);
    });

    this.clickableCount = this.activated - (this.completeCount + this.state.activeCells.length);

    if (this.state.winClosed !== undefined) {
      //game over
      return {
        tpoints: 1e3 * Math.pow(rewardDistFactor, this.dist),
      };
    }

  }

  displayCellInProgress(cell, reverse) {
    const progressElement = this.progressElements[cell.name];
    const timeElement = this.timeElements[cell.name];
    progressElement.style.height = `${cell.percent}%`;

    const timeText = this.remainingToStr(cell.remaining);
    if (reverse) {
      if (cell.percent > 0) {
        timeElement.innerText = timeText;
      } else {
        timeElement.innerText = timeText;
        progressElement.style.filter = 'opacity(1.0)';
        progressElement.parentElement.style.cursor = 'not-allowed';
      }
    } else {
      if (cell.percent < 100) {
        timeElement.innerText = timeText;
      } else {
        timeElement.innerText = '';
        progressElement.style.filter = 'opacity(1.0)';
        //progressElement.parentElement.style.cursor = 'not-allowed';
      }
    }
    return cell.remaining;
  }

  displayCellInfo(container) {
    super.displayCellInfo(container);

    let minRemaining = Infinity;
    this.state.activeCells.forEach( cell => {
      minRemaining = Math.min(minRemaining, this.displayCellInProgress(cell, false));
    });

    this.state.reverseActiveCells.forEach( cell => {
      minRemaining = Math.min(minRemaining, this.displayCellInProgress(cell, true));
    });

    this.state.activeCells = this.state.activeCells.filter( cell => cell.complete !== true );
    this.state.reverseActiveCells = this.state.reverseActiveCells.filter( cell => cell.reverseComplete !== true );

    const curTime = this.state.endTime ?? (new Date()).getTime();
    const playTime = curTime - this.state.gameStart;
    
    const completePercent = 100 * this.partialCompleteTime / this.totalTime;
    this.UI.infoBoxProgress.style.width = `${completePercent}%`;

  }

  timeToObj(t) {
    const result = {};

    result.y = Math.floor(t / (365 * 24 * 60 * 60));
    t = t % (365 * 24 * 60 * 60);
    result.d = Math.floor(t / (24 * 60 * 60));
    t = t % (24 * 60 * 60);
    result.h = Math.floor(t / (60 * 60));
    t = t % (60 * 60);
    result.m = Math.floor(t / 60);
    t = t % 60;
    result.s = t;

    return result;
  }

  remainingToStr(ms, full) {
    if (ms === Infinity) {
      return 'Infinity';
    }

    const timeObj = this.timeToObj(ms / 1000);

    if (full) {
      return `${timeObj.y}:${timeObj.d.toString().padStart(3,0)}:${timeObj.h.toString().padStart(2,0)}:${timeObj.m.toString().padStart(2,0)}:${timeObj.s.toFixed(1).padStart(4,0)}`;
    }

    if (timeObj.y > 0 || timeObj.d > 0 || timeObj.h > 0) {
      //return `${timeObj.y}:${timeObj.d.toString().padStart(3,0)}:${timeObj.h.toString().padStart(2,0)}:${timeObj.m.toString().padStart(2,0)}`;
      return `${timeObj.d.toString().padStart(3,0)}:${timeObj.h.toString().padStart(2,0)}:${timeObj.m.toString().padStart(2,0)}`;
    } else {
      return `${timeObj.m.toString().padStart(2,0)}:${timeObj.s.toFixed(1).padStart(4,0)}`;
    }

  }

  getCellVal(row, col) {
    if (col === 0 || col === row) { return 1; }
    if (col < 0 || col > row) { return 0; }

    const key = `${row},${col}`;
    let cellValue = this.cellValues[key];
    if (cellValue === undefined) {
      cellValue = this.getCellVal(row - 1, col) + this.getCellVal(row - 1, col - 1);
      this.cellValues[key] = cellValue;
    }

    return cellValue;
  }
    
  initGame(gameContainer) {
    super.initGame(gameContainer);

    if (!this.state.started) {
      this.initFinalCell();
      this.state.started = true;
    }

    //expand the gameplay area
    document.querySelector('body').classList.add('bodyGameWide');
    document.querySelector('#cellInfoGameContainer').classList.add('cellInfoGameContainerSnail');

    //info box
    //  title
    //  total time remaining
    //  progress bar
    //  some kind of comment like "there are no upgrades, there is only"
    const infoBox = this.createElement('div', '', gameContainer, 'snailInfoBox');
    const infoTitle = this.createElement('div', '', infoBox, 'snailInfoBoxTitle', "Pedro Pascal's Triangle of Prestige");
    const infoProgressContainer = this.createElement('div', '', infoBox, 'snailInfoBoxProgressContainer');
    const infoProgress = this.createElement('div', 'infoBoxProgress', infoProgressContainer, 'snailInfoBoxProgress');
    const infoDialogCont = this.createElement('div', '', infoBox, 'snailInfoDialogCont');
    const infoDialogImg = this.createElement('div', '', infoDialogCont, 'snailInfoDialogImg', '\ud83d\udc0c');
    const infoDialogText = this.createElement('div', '', infoDialogCont, 'snailInfoDialogText');
    infoDialogText.innerText = "I have not approved your meddling here! You must not prevent my acolytes from completing PPTOP!";

    

    //game
    const completeList = [];
    this.totalTime = 0;
    this.completeTime = 0;
    this.partialCompleteTime = 0;
    for (let i = 0; i < this.rowCount; i++) {
      const row = this.createElement('div', '', gameContainer, 'snailRow');
      for (let j = 0; j <= i; j++) {
        this.cellCount++;
        const cellValue = this.getCellVal(i, j);
        const styleIndex = cellValue % 2;
        const button = this.createElement('div', `cellButton${i}_${j}`, row, 'snailCell');
        const progress = this.createElement('div', '', button, 'snailProgress');
        progress.style.background = `url('./p${styleIndex}_true.png')`;
        progress.style.backgroundSize = 'cover';
        progress.style.backgroundPosition = 'center';
        const cellContent = this.createElement('div', '', button, 'snailCellContent', cellValue);
        const cellTime = this.createElement('div', '', button, 'snailCellTime', this.remainingToStr(cellValue * 1000));
        this.totalTime += cellValue * 1000;

        this.progressElements[`${i},${j}`] = progress;
        this.timeElements[`${i},${j}`] = cellTime;

        button.onclick = () => {
          this.cellButtonReverseClick(button, i, j);
        }

        button.progress = progress;

        if (this.state.completeCells[`${i},${j}`]) {
          completeList.push({row: i, col: j});
          progress.style.height = '100%';
          cellTime.innerText = '';
          progress.style.filter = 'opacity(1.0)';
          //button.style.cursor = 'not-allowed';
          button.style.backgroundColor = this.cellColors[styleIndex];
        } else {
          button.style.cursor = 'not-allowed';
        }

        
        if (this.isCellInList(this.state.reverseActiveCells, i, j)) {
          button.style.cursor = 'not-allowed';
          button.style.backgroundColor = this.cellColors[styleIndex];
        } else if (this.isCellInList(this.state.activeCells, i, j)) { 
          button.style.backgroundColor = this.cellColors[styleIndex];
        }

        button.style.cursor = this.isCellReverseActive(i, j) ? '' : 'not-allowed';


        if (j === i || (i === (this.rowCount - 1))) {
          button.classList.add('snailCellRowEnd');
        }
        
      }
    }

    completeList.forEach( cell => {
      this.progressComplete(cell.row, cell.col);
    });

    this.completeCount = completeList.length;

    this.UI['cellButton0_0'].classList.add('snailCellClickable');
    this.activated++;

    if (this.state.endTime !== undefined) {
      this.showGameEnd();
    }
  }

  closeGame() {
    //return gameplay to normal size
    document.querySelector('body').classList.remove('bodyGameWide');
    document.querySelector('#cellInfoGameContainer').classList.remove('cellInfoGameContainerSnail');
  }

  progressComplete(row, col) {
    this.state.completeCells[`${row},${col}`] = true;
    this.completeTime += this.getCellVal(row, col) * 1000; 
    this.completeCount++;
    if (col === 0 || this.state.completeCells[`${row},${col-1}`]) {
      //mark row+1 col as clickable
      const cell = this.UI[`cellButton${row+1}_${col}`];
      if (cell && !cell.classList.contains('snailCellClickable')) {
        cell.classList.add('snailCellClickable');
        this.activated++;
      }
    }
    if (col === row || this.state.completeCells[`${row},${col+1}`]) {
      //mark row+1 col+1 as clickable
      const cell = this.UI[`cellButton${row+1}_${col+1}`];
      if (cell && !cell.classList.contains('snailCellClickable')) {
        cell.classList.add('snailCellClickable');
        this.activated++;
      }
    }

    if (this.completeCount >= this.cellCount && this.state.endTime === undefined) {
      //TODO: handle the lose condition properly.
      /*
      this.state.endTime = (new Date()).getTime();
      const playTime = this.state.endTime - this.state.gameStart;
      this.UI.winPlayTime.innerText = this.remainingToStr(playTime);
      this.UI.winContainer.style.display = 'block'; 
      this.saveToStorage();
      */
    }
  }

  showGameEnd() {
    const playTime = this.state.endTime - app.state.gameStart;
    document.querySelector('#winLore').innerHTML = `${LORE[26].substr(4)}<br>Your total play time was ${this.remainingToStr(playTime)}`;
    //document.querySelector('#winContainer').style.display = 'block';
    document.querySelector('#winContainer').showModal();
    document.querySelector('body').classList.add('blur2px');

    document.querySelector('#winBtn').onclick = () => {
      document.querySelector('#winContainer').close();
      document.querySelector('body').classList.remove('blur2px');
      this.state.winClosed = true;
    };

    document.querySelector('#winContainer').onclose = () => {
      document.querySelector('#winContainer').close();
      document.querySelector('body').classList.remove('blur2px');
      this.state.winClosed = true;
    }
  }

  progressReverseComplete(row, col) {
    if (this.isCellReverseActive(row - 1, col)) {
      const cell = this.UI[`cellButton${row-1}_${col}`];
      cell.classList.add('snailCellClickable');
      this.activated--;
    }
    if (this.isCellReverseActive(row - 1, col - 1)) {
      const cell = this.UI[`cellButton${row-1}_${col-1}`];
      cell.classList.add('snailCellClickable');
      this.activated--;
    }

    if (this.UI[`cellButton${row}_${col}`]) {
      this.UI[`cellButton${row}_${col}`].style.backgroundColor = '';
    }
    //this.timeElements[`${row},${col}`].innerText = this.remainingToStr(this.getCellVal(row, col) * 1000);

    if (this.completeCount <= 0 && this.state.endTime === undefined) {
      //game won case

      this.state.endTime = (new Date()).getTime();
      this.showGameEnd();
    }
  }

  isCellActive(row, col) {
    if (row < 0) {return true;}
    if (col < 0 || col > row) {return true;}
    return this.state.completeCells[`${row},${col}`];
  }

  isCellInList(list, row, col) {
    return list.some( cell => {return cell.row === row && cell.col === col;} );
  }

  isCellRevActiveOrComplete(row, col) {
    if (row >= this.rowCount) {return false;}
    return this.state.completeCells[`${row},${col}`] || this.isCellInList(this.state.reverseActiveCells, row, col);
  }

  isCellReverseActive(row, col) {
    if (row < 0 || col > row || col < 0) { return false; }
    //active if the cell is in the active list or it's complete and the two cells below it are neither active nor complete
    if (this.isCellInList(this.state.activeCells, row, col)) {
      return true;
    }

    if (this.state.completeCells[`${row},${col}`]) {
      return !this.isCellRevActiveOrComplete(row + 1, col) && !this.isCellRevActiveOrComplete(row + 1, col + 1);
    } else {
      return false;
    }

  }

  cellButtonClick(button, row, col) {
    if (this.isCellActive(row - 1, col) && this.isCellActive(row - 1, col - 1)) {
      const alreadyActive = this.isCellInList(this.state.activeCells, row, col);

      if (alreadyActive || this.isCellActive(row, col)) {
        return;
      }

      button.style.cursor = 'not-allowed';
      const styleIndex = this.getCellVal(row, col) % 2;
      button.style.background = this.cellColors[styleIndex];

      const duration = this.getCellVal(row, col) * 1000;
      this.state.activeCells.push({
        name: `${row},${col}`,
        startTime: (new Date()).getTime(),
        baseDuration: duration,
        duration: duration,
        percent: 0,
        remaining: duration,
        row,
        col
      });       
    }
  }


  cellButtonReverseClick(button, row, col) {
    console.log('REV CLICK');
    if (this.isCellReverseActive(row, col)) {
      console.log('REVERSE ACTIVE');
      const alreadyReverseActive = this.state.reverseActiveCells.some( cell => {
        return cell.row === row && cell.col === col;
      });


      if (alreadyReverseActive) {// || !this.isCellInListthis.state.completeCells[`${row},${col}`] !== undefined) {
        return;
      }

      if (this.state.completeCells[`${row},${col}`]) {
        delete this.state.completeCells[`${row},${col}`];
        this.completeTime -= this.getCellVal(row, col) * 1000; 
        this.completeCount--;
      }


      button.style.cursor = 'not-allowed';
      const baseDuration = this.getCellVal(row, col) * 1000;
      const activeCell = this.state.activeCells.filter( cell => {return cell.row === row && cell.col === col;} );
      const remaining = activeCell.length > 0 ? activeCell[0].remaining : 0;
      const percent = activeCell.length > 0 ? activeCell[0].percent : 100;

      if (this.isCellInList(this.state.activeCells, row, col)) {
        this.state.activeCells = this.state.activeCells.filter( cell => !(cell.row === row && cell.col === col) );
      }

      this.state.reverseActiveCells.push({
        name: `${row},${col}`,
        startTime: (new Date()).getTime(),
        baseDuration,
        duration: remaining,
        percent,
        remaining,
        row,
        col
      });       
    }
  }
}

const TYPE_TO_CLASS_MAP = {
  'none': CellObject,
  'spot': CellObjectSpot,
  'boss': CellObjectBoss,
  'enemy': CellObjectEnemy,
  'wall': CellObjectEnemyWall,
  'enemyCheese': CellObjectEnemyCheese,
  'enemyBusiness': CellObjectEnemyBusiness,
  'merge': CellObjectMerge,
  'build': CellObjectBuild,
  'info': CellObjectInfo,
  'enemyPrestige': CellObjectEnemyPrestige,
  'enemyCrank': CellObjectEnemyCrank,
  'enemyLawn': CellObjectEnemyLawn,
  'enemyAnti': CellObjectEnemyAnti,
  'enemySnail': CellObjectEnemySnail,
  'spawn': CellObjectSpawn
};

