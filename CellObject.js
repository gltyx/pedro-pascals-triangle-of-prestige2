"use strict";

class CellObject {
  constructor() {
    this.state = {type: 'none'};
    this.bgStyle = spriteNameToStyle('border1');
    this.percent = 0;
    this.UI = {};
    this.blocking = false;
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
    this.updateStyle(cell.style, 'background', this.bgStyle);
    const effectivePercent = this.percent >= 100 ? 0 : this.percent;
    const percentStr = `${Math.ceil(effectivePercent)}%`;
    this.updateStyle(progress.style, 'width', percentStr);
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
      e.innerText = text; 
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
    if (value < 1000) {
      return `\$${this.roundToVal(value, roundType, 0.01).toFixed(2)}`;
    } else {
      return `\$${value.toExponential(3)}`;
    }
  }
}

class CellObjectEnemy extends CellObject {
  constructor() {
    super();
    this.blocking = true;
    this.state.type = 'enemy';
    this.bgStyle = spriteNameToStyle('snail');
    this.percent = 100;
    this.state.enemyPower = 1;
    this.tPower = undefined;
    this.cPower = undefined;
    this.dPower = undefined;
    this.ePower = undefined;
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
    container.innerText = `Object Details - T: ${this.tPower} C: ${this.cPower} D: ${this.dPower} E: ${this.ePower} Rem: ${Math.ceil(this.percent)}`;
  }

  isDropable(srcObject) {
    return false;
  }

  initGame(gameContainer) {
    super.initGame(gameContainer);
  }
}

class CellObjectSpot extends CellObject {
  constructor() {
    super();
    this.state.type = 'spot';
    this.state.tickPower = 1;
    this.state.clickPower = 1;
    this.state.disPower = 0;
    this.bgStyle = spriteNameToStyle('spot');
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
  constructor() {
    super();
    this.state.type = 'boss';
    this.state.tickPower = 0;
    this.state.clickPower = 0;
    this.state.disPower = 1;
    this.bgStyle = spriteNameToStyle('boss');
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
  constructor() {
    super();
    this.state.type = 'wall';
    this.baseStrength = 100;
    this.state.enemyPower = 0;
    this.state.start = Infinity;
    this.state.strength = this.baseStrength;
    this.bgStyle = spriteNameToStyle('wall');
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
        tpoints: 1,
        cpoints: 1
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
  constructor() {
    super();
    this.state.type = 'enemyCheese';
    this.bgStyle = spriteNameToStyle('cheese');
    this.baseStrength = 100;
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
        tpoints: 1,
        cpoints: 1
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

  constructor() {
    super();
    this.state.type = 'enemyBusiness';
    this.bgStyle = spriteNameToStyle('business');
    this.baseStrength = 10000;
    this.state.start = Infinity;
    this.state.strength = this.baseStrength;
    this.state.cash = 0;

    this.state.level = {};
    this.levelPercent = {};
    this.timeRemaining = {};
    CellObjectEnemyBusiness.levelOrder.forEach( level => {
      const state = {}
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
        tpoints: 1,
        cpoints: 1
      };
    }
  }

  displayCellInfo(container) {
    super.displayCellInfo(container);
    const cash = this.state.cash;

    this.UI.cash.innerText = this.formatCurrency(cash, 'floor');

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
      levelIcon.style.background = spriteNameToStyle(`business_${level}`);

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
  constructor() {
    super();
    this.state.type = 'merge';
    this.bgStyle = spriteNameToStyle('merge');
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
  constructor() {
    super();
    this.state.type = 'build';
    this.bgStyle = spriteNameToStyle('build');
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

    openNeighbor.content = new CellObjectSpot();
    
  }

  buildBoss() {
    const openNeighbor = this.getOpenNeighbor();
    if (openNeighbor === undefined) {return;}

    openNeighbor.content = new CellObjectBoss();
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
  'build': CellObjectBuild
};

