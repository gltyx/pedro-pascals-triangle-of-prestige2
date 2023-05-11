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
    Object.keys(this.state).forEach( k => {
      if (this.state[k] === null) {
        this.state[k] = Infinity;
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
  }

  displayCellInfo(container) {
    container.innerText = 'spot details - Power: ' + this.state.tickPower;
  }

  isDragable() {
    return true;
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
  }

  displayCellInfo(container) {
    container.innerText = 'boss details - Power: ' + this.state.tickPower;
  }

  isDragable() {
    return true;
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
    if (this.percent < 100) {
      const a = 1;
    }
    super.update(curTime, neighbors);


    if (this.dPower !== this.lastdPower && this.state.start < Infinity) {
      if (this.lastdPower > 0) {
        this.state.strength = this.state.strength - (curTime - this.state.start) * this.lastdPower;
      }
      if (this.state.start !== Infinity) {
        this.state.start = curTime;
      }
    } else {
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

  static levels = [
    {type: 'limeade'},
    {type: 'spam'},
    {type: 'dogWash'},
    {type: 'taco'},
    {type: 'cupcake'}
  ];

  constructor() {
    super();
    this.state.type = 'enemyBusiness';
    this.bgStyle = spriteNameToStyle('business');
    this.baseStrength = 100;
    this.state.start = Infinity;
    this.state.strength = this.baseStrength;
    this.state.cash = 1;

    this.state.level = {};
    this.levelPercent = {};
    CellObjectEnemyBusiness.levels.forEach( level => {
      const type = level.type;
      const state = {}
      state.count = 0;
      state.start = Infinity;

      this.state.level[type] = state;
      this.levelPercent[type] = 0.5;
    });
  }

  update(curTime, neighbors) {
    super.update(curTime, neighbors);

    CellObjectEnemyBusiness.levels.forEach( level => {
      const type = level.type;
      const state = this.state.level[type];
      const levelDuration = 10;
      const curDuration = Math.max(0, curTime - state.start);

      if (curDuration >= levelDuration) {
        state.start = Infinity;
        //TODO: get correct cash value
        this.state.cash += 1;
        this.levelPercent[level.type] = '0%';
      } else {
        this.levelPercent[level.type] = `${Math.round(100 * curDuration / levelDuration)}%`;
      }

    });
  }

  displayCellInfo(container) {
    super.displayCellInfo(container);

    this.UI.cash.innerText = this.formatCurrency(this.state.cash, 'floor');

    CellObjectEnemyBusiness.levels.forEach( level => {
      const type = level.type;
      const state = this.state.level[type];
      this.updateStyle(this.UI[`levelProgress${type}`].style, 'width', this.levelPercent[type]);
      this.UI[`levelCount${type}`].innerText = `${state.count}/10`;
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
    //TODO: hitting a purchase milestone halves the production time

    CellObjectEnemyBusiness.levels.forEach( level => {
    /*
      image                progressBar
      curCount/nextCount   buyButton timer 

      click image to start progress bar
    */
      const levelRow = this.createElement('div', '', wrapper);
      levelRow.style.display = 'grid';
      levelRow.style.gridTemplateColumns = '5em 1fr';
      const leftSide = this.createElement('div', '', levelRow);
      leftSide.style.display = 'grid';
      leftSide.style.gridTemplateColumns = '1fr';
      leftSide.style.justifyItems = 'center';
      leftSide.onclick = () => this.startLevel(level.type);

      const rightSide = this.createElement('div', '', levelRow);
      rightSide.style.display = 'grid';
      rightSide.style.gridTemplateColumns = '1fr';

      const levelIcon = this.createElement('div', '', leftSide);
      levelIcon.style.width = '32px';
      levelIcon.style.height = '32px';
      levelIcon.style.background = spriteNameToStyle(`business_${level.type}`);

      const levelCount = this.createElement('div', `levelCount${level.type}`, leftSide, '', `${this.state.level[level.type].count}/10`);

      const progressContainer = this.createElement('div', '', rightSide);
      progressContainer.style.width = '100%';
      progressContainer.style.backgroundColor = 'beige';
      const progress = this.createElement('div', `levelProgress${level.type}`, progressContainer);
      progress.style.height = '100%';
      progress.style.backgroundColor = 'green';
      progress.style.width = '50%';
      progress.style.transition = 'width 0.2s';
      const rightBottom = this.createElement('div', '', rightSide);
      rightBottom.style.display = 'grid';
      rightBottom.style.gridTemplateColumns = '1fr 5em';
      const buyContainer = this.createElement('div', '', rightBottom);
      buyContainer.style.display = 'grid';
      buyContainer.style.gridTemplateColumns = '3em 1fr';
      buyContainer.style.backgroundColor = 'orange';
      buyContainer.style.alignItems = 'center';
      buyContainer.onclick = () => this.buy(level.type);
      this.createElement('span', '', buyContainer, '', 'Buy');
      const cost = this.createElement('span', `levelCost${level.type}`, buyContainer, '', '25e5');
      cost.style.textAlign = 'right';
      const progressTimer = this.createElement('div', '', rightBottom, '', '00:00:00');
      progressTimer.style.textAlign = 'center';
      progressTimer.style.display = 'grid';
      progressTimer.style.alignItems = 'center';

    });
    
  }

  startLevel(level) {
    console.log('start', level);
    if (this.state.level[level].count > 0) {
      this.state.level[level].start = (new Date()).getTime() / 1000;
    }
  }

  buy(level) {
    console.log('buy', level);
    const cost = 1;
    const buyCount = 1;
    //TODO: determine and apply buyCount (not just cost * buyCount)
    if (this.state.cash >= cost) {
      this.state.cash -= cost;
      this.state.level[level].count += buyCount;
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
  'enemyBusiness': CellObjectEnemyBusiness
};

