"use strict";

class CellObject {
  constructor() {
    this.state = {type: 'none'};
    this.bgStyle = spriteNameToStyle('border1');
    this.percent = 0;
    this.UI = {};
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
    if (cell.style.background !== this.bgStyle) {
      cell.style.background = this.bgStyle;
    }
    const percentStr = `${Math.ceil(this.percent)}%`;
    if (progress.style.width !== percentStr) {
      progress.style.width = percentStr;
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
      e.innerText = text; 
    }

    if (classes !== undefined && classes.length > 0) {
      classes.split`,`.forEach( className => {
        e.classList.add(className);
      }); 
    }

    return e; 
  } 
}

class CellObjectEnemy extends CellObject {
  constructor() {
    super();
    this.state.type = 'enemy';
    this.bgStyle = spriteNameToStyle('snail');
    this.percent = 100;
    this.tPower = undefined;
    this.cPower = undefined;
  }

  update(curTime, neighbors) {
    const forceLast = this.tPower === undefined;
    this.lasttPower = this.tPower;
    this.lastcPower = this.cPower;
    this.tPower = 0;
    this.cPower = 0;
    for (let i = 0; i < neighbors.length; i++) {
      this.tPower += neighbors[i].content.state.tickPower ?? 0;
      this.cPower += neighbors[i].content.state.clickPower ?? 0;
    }

    if (forceLast) {
      this.lasttPower = this.tPower;
      this.lastcPower = this.cPower;
    }
  }

  displayCellInfo(container) {
    container.innerText = `Object Details - T Power: ${this.tPower} C Power: ${this.cPower} Remaining: ${Math.ceil(this.percent)}`;
  }

  isDropable(srcObject) {
    return false;
  }

  initGame(gameContainer) {
    super.initGame(gameContainer);
  }
}

class CellObjectBoss extends CellObject {
  constructor() {
    super();
    this.state.type = 'boss';
    this.state.tickPower = 1;
    this.state.clickPower = 1;
    this.bgStyle = spriteNameToStyle('boss');
  }

  displayCellInfo(container) {
    container.innerText = 'boss details - Power: ' + this.state.tickPower;
  }

  isDragable() {
    return true;
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

const TYPE_TO_CLASS_MAP = {
  'none': CellObject,
  'boss': CellObjectBoss,
  'enemy': CellObjectEnemy,
  'enemyCheese': CellObjectEnemyCheese
};

