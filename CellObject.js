"use strict";

const strengthDistFactor = 1.5;
const rewardDistFactor = 1.2;

class CellObject {
  constructor(cell, dist, bgSpriteName) {
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
  }

  updateBackground(cell) {
    applySprite(cell, this.bgSpriteName);
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
    if (roundType === undefined) {roundType = 'round';}
    return Math[roundType](value / roundVal) * roundVal;
  }

  formatCurrency(value, roundType) {
    return this.formatValue(value, roundType, '$');
  }

  formatValue(value, roundType, prefix) {
    if (value < 1000) {
      return `${prefix}${this.roundToVal(value, roundType, 0.01).toFixed(2)}`;
    } else {
      return `${prefix}${value.toExponential(3)}`;
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
    this.cPower = undefined;
    this.dPower = undefined;
    this.ePower = undefined;
  }

  update(curTime, neighbors) {
    this.curTime = curTime;
    const forceLast = this.tPower === undefined;
    this.lasttPower = this.tPower;
    this.lastcPower = this.cPower;
    this.lastdPower = this.dPower;
    this.lastePower = this.ePower;
    this.tPower = 0;
    this.cPower = 0;
    this.dPower = 0;
    this.ePower = 0;

    for (let i = 0; i < neighbors.length; i++) {
      const ns = neighbors[i].content.state;
      this.tPower += ns.tickPower ?? 0;
      this.cPower += ns.clickPower ?? 0;
      this.dPower += ns.disPower ?? 0;
      this.ePower += ns.enemyPower ?? 0;
    }

    if (this.ePower > 0) {
      this.dPower = 0;
    }

    if (forceLast) {
      this.lasttPower = this.tPower;
      this.lastcPower = this.cPower;
      this.lastdPower = this.dPower;
      this.lastePower = this.ePower;
    }
  }

  displayCellInfo(container) {
    container.innerText = `Object Details - Dist: ${this.dist} T: ${this.tPower} C: ${this.cPower} D: ${this.dPower} E: ${this.ePower} Rem: ${Math.ceil(this.percent)}`;
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
    this.state.clickPower = 1;
    this.state.disPower = 0;
    this.cursor = 'grab';
  }

  displayCellInfo(container) {
    container.innerText = `spot details - T: ${this.state.tickPower} C: ${this.state.clickPower}`;
  }

  isDragable() {
    return true;
  }

  update(curTime, neighbors) {
    if (this.merged) {
      //merged, trigger removal
      return {};
    }
  }
}

class CellObjectBoss extends CellObject {
  constructor(cell, dist) {
    super(cell, dist, 'boss');
    this.state.type = 'boss';
    this.state.tickPower = 0;
    this.state.clickPower = 0;
    this.state.disPower = 1;
    this.cursor = 'grab';
  }

  displayCellInfo(container) {
    container.innerText = 'boss details - D: ' + this.state.disPower;
  }

  isDragable() {
    return true;
  }

  update(curTime, neighbors) {
    if (this.merged) {
      //merged, trigger removal
      return {};
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
  }

  update(curTime, neighbors) {
    super.update(curTime, neighbors);


    //if disassembly power has changed and disassembly has already started
    if (this.dPower !== this.lastdPower && this.state.start < Infinity) {
      //if was already disassembling, save the previous time
      if (this.lastdPower > 0) {
        this.state.strength = this.state.strength - (curTime - this.state.start) * this.lastdPower;
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

    this.timeRem = (this.state.strength / this.dPower) - (curTime - this.state.start);
    if (this.state.start < Infinity) {
      this.percent = 100 * (this.state.strength - (curTime - this.state.start) * this.dPower) / this.baseStrength;
    } else {
      this.percent = 100;
    }

    if (this.timeRem <= 0) {
      //game over, return spoils
      return {
        tpoints: 1 * Math.pow(rewardDistFactor, this.dist),
        cpoints: 1 * Math.pow(rewardDistFactor, this.dist)
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
  }

  initGame(gameContainer) {
    super.initGame(gameContainer);
    this.createElement('span', '', gameContainer, '', 'Disassembling ');
    this.createElement('span', 'timeRem', gameContainer, '', '');
    this.createElement('span', '', gameContainer, '', ' more seconds');
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
        cpoints: 1 * Math.pow(rewardDistFactor, this.dist)
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

  static levelInfo = {
    limeade: {priceBase: 4,      priceFactor: 1.07, revenue: 1,     duration: 0.6},
    spam:    {priceBase: 60,     priceFactor: 1.15, revenue: 60,    duration: 3},
    dogWash: {priceBase: 720,    priceFactor: 1.14, revenue: 540,   duration: 6},
    taco:    {priceBase: 8640,   priceFactor: 1.13, revenue: 4320,  duration: 12},
    cupcake: {priceBase: 103680, priceFactor: 1.12, revenue: 51840, duration: 24}
  };

  static levelOrder = ['limeade', 'spam', 'dogWash', 'taco', 'cupcake'];

  static durationFactorMilestones = [25, 50, 100, 200, 300, 400];

  constructor(cell, dist) {
    super(cell, dist, 'business');
    this.state.type = 'enemyBusiness';
    this.baseStrength = this.roundToVal(100 * Math.pow(strengthDistFactor, dist), 'round', 0.01);
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
  }

  update(curTime, neighbors) {
    super.update(curTime, neighbors);

    CellObjectEnemyBusiness.levelOrder.forEach( level => {
      const state = this.state.level[level];
      const levelDuration = CellObjectEnemyBusiness.levelInfo[level].duration * this.getDurationFactor(level) / this.tPower;

      //if tick power has changed and this level has already started
      if (this.tPower !== this.lasttPower && state.start < Infinity) {
        //save previous progress
        state.previousProgress += (curTime - state.start) * this.lasttPower;
        //change start to now
        state.start = curTime;
      }

      const curDuration = Math.max(0, curTime - state.start) * this.tPower + state.previousProgress;

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
        cpoints: 1 * Math.pow(rewardDistFactor, this.dist)
      };
    }
  }

  displayCellInfo(container) {
    super.displayCellInfo(container);
    const cash = this.state.cash;

    this.UI.cash.innerText = `${this.formatCurrency(cash, 'floor')} / ${this.formatCurrency(this.baseStrength)}` ;

    //TODO: set buy count properly
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
    //TODO: allow buying multiples

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
      leftSide.onclick = () => this.startLevel(level);
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
      progress.style.transition = 'width 0.2s';
      const revenue = this.createElement('div', `levelRevenue${level}`, progressContainer, '', `${this.formatCurrency(CellObjectEnemyBusiness.levelInfo[level].revenue * this.state.level[level].count)}`);
      revenue.style.position = 'absolute';
      revenue.style.top = '0px';
      revenue.style.textAlign = 'center';
      revenue.style.width = '100%';
      const rightBottom = this.createElement('div', '', rightSide);
      rightBottom.style.display = 'grid';
      rightBottom.style.gridTemplateColumns = '1fr 5em';
      const buyContainer = this.createElement('div', `levelBuy${level}`, rightBottom);
      buyContainer.style.display = 'grid';
      buyContainer.style.gridTemplateColumns = '3em 1fr';
      buyContainer.style.backgroundColor = 'orange';
      buyContainer.style.alignItems = 'center';
      buyContainer.onclick = () => this.buy(level);
      buyContainer.classList.add('divButton');
      this.createElement('span', '', buyContainer, '', 'Buy');
      const cost = this.createElement('span', `levelCost${level}`, buyContainer, '', this.formatCurrency(this.getPrice(level, buyCount)));
      cost.style.textAlign = 'right';
      const progressTimer = this.createElement('div', `levelTimer${level}`, rightBottom, '', '00:00:00');
      progressTimer.style.textAlign = 'center';
      progressTimer.style.display = 'grid';
      progressTimer.style.alignItems = 'center';

    });
    
  }

  startLevel(level) {
    console.log('start', level);
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
    console.log('buy', level);
    const buyCount = 1;
    const cost = this.getPrice(level, buyCount);
    //TODO: determine buyCount
    if (this.state.cash >= cost) {
      this.state.cash -= cost;
      this.state.level[level].count += buyCount;
      this.UI[`levelCost${level}`].innerText = this.formatCurrency(this.getPrice(level, buyCount));
      this.UI[`levelRevenue${level}`].innerText = this.formatCurrency(CellObjectEnemyBusiness.levelInfo[level].revenue * this.state.level[level].count);
    }
  }
}

class CellObjectMerge extends CellObject {
  constructor(cell, dist) {
    super(cell, dist, 'merge');
    this.state.type = 'merge';
  }

  isDropable(srcObject) {
    return false;
  }

  update(curTime, neighbors) {
    const forceLast = this.tPower === undefined;
    this.lasttPower = this.tPower;
    this.lastcPower = this.cPower;
    this.lastdPower = this.dPower;
    this.lastePower = this.ePower;
    this.tPower = 0;
    this.cPower = 0;
    this.dPower = 0;
    this.ePower = 0;
    this.neighbors = neighbors;

    for (let i = 0; i < neighbors.length; i++) {
      const ns = neighbors[i].content.state;
      this.tPower += ns.tickPower ?? 0;
      this.cPower += ns.clickPower ?? 0;
      this.dPower += ns.disPower ?? 0;
      this.ePower += ns.enemyPower ?? 0;
    }

    if (this.ePower > 0) {
      this.tPower = 0;
      this.cPower = 0;
      this.dPower = 0;
    }

    if (forceLast) {
      this.lasttPower = this.tPower;
      this.lastcPower = this.cPower;
      this.lastdPower = this.dPower;
      this.lastePower = this.ePower;
    }
  }

  displayCellInfo(container) {
    container.innerText = `Object Details - T: ${this.tPower} C: ${this.cPower} D: ${this.dPower} E: ${this.ePower}`;

    this.UI.mergeSpot.innerText = `Merge neighboring SPOT. Result - T: ${this.tPower} C: ${this.cPower}`;
    this.UI.mergeBoss.innerText = `Merge neighboring BOSS. Result - D: ${this.dPower}`;
  }

  initGame(gameContainer) {
    super.initGame(gameContainer);
    //TODO: disable buttons when unclickable

    //spot merge
    const mergeSpot = this.createElement('div', 'mergeSpot', gameContainer, 'divButton', 'MERGE SPOT');
    mergeSpot.style.background = 'grey';
    mergeSpot.onclick = () => this.mergeSpot();

    //boss merge
    const mergeBoss = this.createElement('div', 'mergeBoss', gameContainer, 'divButton', 'MERGE BOSS');
    mergeBoss.style.background = 'cyan';
    mergeBoss.onclick = () => this.mergeBoss();
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
        n.content.state.tickPower = this.tPower;
        n.content.state.clickPower = this.cPower;
      } else {
        n.content.merged = true;
      }
    });
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
        n.content.state.disPower = this.dPower;
      } else {
        n.content.merged = true;
      }
    });
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

    //TODO: set up button text properly
    this.UI.buildSpot.innerText = `Build SPOT`;
    this.UI.buildBoss.innerText = `Build BOSS`;
  }

  initGame(gameContainer) {
    super.initGame(gameContainer);
    //TODO: disable buttons when unclickable

    //build spot
    const buildSpot = this.createElement('div', 'buildSpot', gameContainer, 'divButton', 'BUILD SPOT');
    buildSpot.style.background = 'grey';
    buildSpot.onclick = () => this.buildSpot();


    //build boss
    const buildBoss = this.createElement('div', 'buildBoss', gameContainer, 'divButton', 'BUILD BOSS');
    buildBoss.style.background = 'cyan';
    buildBoss.onclick = () => this.buildBoss();
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

    openNeighbor.content = new CellObjectSpot(openNeighbor.ui, openNeighbor.x + openNeighbor.y);
    
  }

  buildBoss() {
    const openNeighbor = this.getOpenNeighbor();
    if (openNeighbor === undefined) {return;}

    openNeighbor.content = new CellObjectBoss(openNeighbor.ui, openNeighbor.x + openNeighbor.y);
  }

}

class CellObjectInfo extends CellObject {

  static tutorialHTML = `
  <h1>Tutorial</h1>
  add tutorial text here
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
    const tabContainer = this.createElement('div', 'tabContainer', gameContainer);
    const tabTutorial = this.createElement('div', 'tabTutorial', tabContainer, 'infoTab', 'Tutorial');
    const tabLog = this.createElement('div', 'tabLog', tabContainer, 'infoTab' ,'Log');
    const tabLore = this.createElement('div', 'tabLore', tabContainer, 'infoTab', 'Lore');

    tabTutorial.onclick = () => this.selectTab('Tutorial');
    tabLog.onclick = () => this.selectTab('Log');
    tabLore.onclick = () => this.selectTab('Lore');

    const tabBodyTutorial = this.createElement('div', 'infoContainerTutorial', gameContainer, 'infoTabBody');
    const tabBodyLog = this.createElement('dl', 'infoContainerLog', gameContainer, 'infoTabBody');
    const tabBodyLore = this.createElement('div', 'infoContainerLore', gameContainer, 'infoTabBody');

    tabBodyTutorial.innerHTML = CellObjectInfo.tutorialHTML;

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
    this.state.start = (new Date()).getTime() / 1000;
    this.state.lastPrestigeTime = Infinity;
    this.state.savedCoins = 0;
    this.state.prestiges = (new Array(10)).fill(0);
  }

  update(curTime, neighbors) {
    super.update(curTime, neighbors);

    const gain = this.getGain();
    const rate = this.tPower * gain;

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
        cpoints: 1 * Math.pow(rewardDistFactor, this.dist)
      };
    }
  }

  displayCellInfo(container) {
    super.displayCellInfo(container);

    this.UI.coins.innerText = Math.floor(this.coins);
    this.UI.gain.innerText = this.getGain() * this.tPower;

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
    this.createElement('span', 'coinReq', header, '', this.baseStrength);
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
    this.baseStrength = 10 * Math.pow(strengthDistFactor, dist);
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
    this.compTarget = 0;
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
    const vmax = 0.1 + 0.1 * this.state.crankLevels;
    const cranka = 0.001 + 0.0001 * this.state.crankLevels;
    const crankm = 1000;
    const crankFriction = 0.0005;
    const crankPower = 0.1;
    const metalRate = 10;
    const batteryRate = 10;
    const compRate = 1;
    const deltaTime = Math.max(0, curTime - this.state.lastUpdate);

    const state = this.state;

    this.powerMax = 100 + state.batteryCount * 10;

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
    const compLeak = this.state.compPower * deltaTime;
    const compCost = this.getCompTargetCost();
    

    this.crankVelocity = Math.max(0, Math.min(vmax, this.crankVelocity + this.tPower * this.crankForce / crankm - crankFriction));
    this.crankAngle += this.crankVelocity;
    const origPowerLevel = this.state.powerLevel;
    this.state.powerLevel = Math.max(0, Math.min(this.powerMax, this.state.powerLevel + (this.tPower * this.crankVelocity * crankPower / 0.1) - powerLeak));
    const deltaPowerLevel = Math.max(0, this.state.powerLevel - origPowerLevel);
    this.state.totalPower += deltaPowerLevel;
    let compPercent;
    if (this.state.powerLevel >= compLeak) {
      this.state.powerLevel -= compLeak;
      //compPercent = Math.max(0, curTime - state.compStart) * this.tPower * compRate * this.state.compPower + state.previousCompProgress;
      this.compProgress = this.compProgress + deltaTime * this.tPower * compRate * this.state.compPower * 100 / compCost;
    }

    const metalPercent = Math.max(0, curTime - state.metalStart) * this.tPower * metalRate + state.previousMetalProgress;
    const batteryPercent = Math.max(0, curTime - state.batteryStart) * this.tPower * batteryRate + state.previousBatteryProgress;

    if (metalPercent >= 100) {
      if (state.metalQueue > 0) {
        state.metalQueue--;
        state.metalStart = curTime;
        this.UI.metalQueueSlider.value = state.metalQueue;
      } else {
        state.metalStart = Infinity;
      }
      state.previousMetalProgress = 0;
      state.metalCount += 1;
      this.metalProgress = 0;
    } else {
      this.metalProgress = metalPercent;
    }

    if (batteryPercent >= 100) {
      if (state.batteryQueue > 0) {
        state.batteryQueue--;
        state.batteryStart = curTime;
        this.UI.batteryQueueSlider.value = state.batteryQueue;
      } else {
        state.batteryStart = Infinity;
      }
      state.previousBatteryProgress = 0;
      state.batteryCount += 1;
      this.batteryProgress = 0;
    } else {
      this.batteryProgress = batteryPercent;
    }

    if (this.compProgress >= 100) {
      switch (this.compTarget) {
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
      this.UI.metalQueueSlider.value = state.metalQueue;
    }

    if (state.batteryStart === Infinity && this.state.powerLevel >= this.batteryPowerCost && state.metalCount >= this.batteryMetalCost && state.batteryQueue > 0) {
      this.state.powerLevel -= this.batteryPowerCost;
      state.metalCount -= this.batteryMetalCost;
      state.batteryStart = (new Date()).getTime() / 1000;
    }

    this.percent = 100 * (1 - this.state.totalPower / this.baseStrength);
    if (this.state.totalPower > this.baseStrength) {
      return {
        tpoints: 1 * Math.pow(rewardDistFactor, this.dist),
        cpoints: 1 * Math.pow(rewardDistFactor, this.dist)
      };
    }

    this.state.lastUpdate = curTime;
  }

  displayCellInfo(container) {
    super.displayCellInfo(container);

    this.UI.crankBar.style.transform = `rotate(${this.crankAngle}rad)`;
    this.UI.crankBall.style.transform = `rotate(${this.crankAngle}rad)`;

    this.updateStyle(this.UI.crankLevelProgress.style, 'width', `${this.state.powerLevel.toFixed(1) * 100 / this.powerMax}%`);
    this.UI.crankLevelValue.innerText = `${this.state.powerLevel.toFixed(1)} / ${this.powerMax}`;

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

    this.UI.totalPower.innerText = `${this.state.totalPower.toFixed(1)}`;
  }

  initGame(gameContainer) {
    super.initGame(gameContainer);

    //[game value] / [game target]
    const topSection = this.createElement('div', '', gameContainer);
    this.createElement('span', '', topSection, '', 'Total power: ');
    this.createElement('span', 'totalPower', topSection, '', '?');
    this.createElement('span', '', topSection, '', ' / ');
    this.createElement('span', '', topSection, '', this.baseStrength);

    //[crank] [power gen level]
    const crankSection = this.createElement('div', 'crankSection', gameContainer, 'crankColumns');
    const crankContainer = this.createElement('div', '', crankSection, 'crankContainer');
    this.createElement('div', '', crankContainer, 'crankBase');
    this.createElement('div', 'crankBar', crankContainer, 'crankBar');
    this.createElement('div', 'crankBall', crankContainer, 'crankBall');

    crankContainer.onmousedown = evt => this.crankMouseDown(evt);
    crankContainer.onmouseup = evt => this.crankMouseUp(evt);
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
    metalButton.onclick = () => this.metalClick();

    //[metal queue #] [metal queue slider]
    const metalQueueSection = this.createElement('div', 'metalQueueSection', gameContainer, 'crankColumns');
    const metalQueueCount = this.createElement('div', 'metalQueueCount', metalQueueSection);
    const metalQueueSlider = this.createElement('input', 'metalQueueSlider', metalQueueSection, 'crankSlider');
    metalQueueSlider.type = 'range';
    metalQueueSlider.min = 0;
    metalQueueSlider.max = this.state.metalQueueMax;
    metalQueueSlider.value = this.state.metalQueue;
    metalQueueSlider.onchange = () => this.state.metalQueue = metalQueueSlider.value;

    //[battery button] [battery progress]
    //Battery: [battery count]
    const batteryMainSection = this.createElement('div', 'batteryMainSection', gameContainer, 'crankColumns');
    const batteryButton = this.createElement('div', 'batteryButton', batteryMainSection, 'crankButton', 'Battery');
    const batteryProgressContainer = this.createElement('div', '', batteryMainSection, 'crankProgressContainer');
    const batteryProgress = this.createElement('div', 'batteryProgress', batteryProgressContainer, 'crankProgress');
    const batteryProgressValue = this.createElement('div', 'batteryProgressValue', batteryMainSection);
    batteryButton.onclick = () => this.batteryClick();

    //[battery queue #] [battery queue slider]
    const batteryQueueSection = this.createElement('div', 'batteryQueueSection', gameContainer, 'crankColumns');
    const batteryQueueCount = this.createElement('div', 'batteryQueueCount', batteryQueueSection);
    const batteryQueueSlider = this.createElement('input', 'batteryQueueSlider', batteryQueueSection, 'crankSlider');
    batteryQueueSlider.type = 'range';
    batteryQueueSlider.min = 0;
    batteryQueueSlider.max = this.state.batteryQueueMax;
    batteryQueueSlider.value = this.state.batteryQueue;
    batteryQueueSlider.onchange = () => this.state.batteryQueue = batteryQueueSlider.value;

    //[comp upgrade button] [comp target selection]
    const compTargetSection = this.createElement('div', 'compTargetSection', gameContainer, 'crankColumns');
    const compUpgradeButton = this.createElement('div', 'compButton', compTargetSection, 'crankButton', `CPU (${15 + 5 * this.state.compPowerMax})`);
    compUpgradeButton.onclick = () => this.compUpgradeClick();
    const compProgressContainer = this.createElement('div', '', compTargetSection, 'crankProgressContainer');
    const compProgress = this.createElement('div', 'compProgress', compProgressContainer, 'crankProgress');
    const compTargetLabel = this.createElement('div', '', compTargetSection, '', 'CPU Target');
    const compTargetRadioContainer = this.createElement('div', '', compTargetSection, '', '');
    const compTargetRadioCrank = this.createElement('input', 'radioCrank', compTargetRadioContainer, '');
    compTargetRadioCrank.type = 'radio';
    compTargetRadioCrank.name = 'target';
    compTargetRadioCrank.checked = 'true';
    compTargetRadioCrank.onchange = () => this.radioChange(0);
    this.createElement('label', '', compTargetRadioContainer, '', 'Crank');
    const compTargetRadioScrap = this.createElement('input', 'radioScrap', compTargetRadioContainer, '');
    compTargetRadioScrap.type = 'radio';
    compTargetRadioScrap.name = 'target';
    compTargetRadioScrap.onchange = () => this.radioChange(1);
    this.createElement('label', '', compTargetRadioContainer, '', 'Scrap');
    const compTargetRadioBattery = this.createElement('input', 'radioBattery', compTargetRadioContainer, '');
    compTargetRadioBattery.type = 'radio';
    compTargetRadioBattery.name = 'target';
    compTargetRadioBattery.onchange = () => this.radioChange(2);
    this.createElement('label', '', compTargetRadioContainer, '', 'Battery');

    //[comp power #] [comp power slider]
    const compPowerSection = this.createElement('div', 'compPowerSection', gameContainer, 'crankColumns');
    const compPowerCount = this.createElement('div', 'compPowerCount', compPowerSection, '', '0 power / sec');
    const compPowerSlider = this.createElement('input', 'compPowerSlider', compPowerSection, 'crankSlider');
    compPowerSlider.type = 'range';
    compPowerSlider.min = 0;
    compPowerSlider.max = this.state.compPowerMax;
    compPowerSlider.value = this.state.compPower;
    compPowerSlider.onchange = () => this.state.compPower = compPowerSlider.value;

    //[comp progress]
    const compProgressSecton = this.createElement('div', 'compProgressSection', gameContainer);
  }

  crankMouseDown(evt) {
    if (evt.button === 0) {
      this.crankForce = 1;
    }
  }
  crankMouseUp(evt) {
    if (evt.button === 0) {
      this.crankForce = 0;
    }
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
    this.compTarget = target;
    console.log(target);
  }

  getCompTargetCost() {
    switch (this.compTarget) {
      case 0: {
        return 100 + 50 * this.state.crankLevels;
      }
      case 1: {
        return 100 + 50 * this.state.scrapLevels;
      }
      case 2: {
        return 100 + 50 * this.state.batteryLevels;
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
    this.state.start = (new Date()).getTime() / 1000;
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

  /*
    TODO:
  */

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

    /* TODO: Uncomment to enable win condition
    if (this.percent <= 0) {
      //game over
      return {
        tpoints: 1 * Math.pow(rewardDistFactor, this.dist),
        cpoints: 1 * Math.pow(rewardDistFactor, this.dist)
      };
    }
    */

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
      this.state.mulch = nextMulch;
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
    this.baseStrength = 10 * Math.pow(strengthDistFactor, dist);
    this.state.start = Infinity;
    this.state.anti = 0;
    this.state.strength = this.baseStrength;
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
  'enemyAnti': CellObjectEnemyAnti
};

