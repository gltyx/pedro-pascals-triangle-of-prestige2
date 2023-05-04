"use strict";

class CellObject {
  constructor() {
    this.state = {type: 'none'};
    this.bgStyle = spriteNameToStyle('border1');
    this.percent = 0;
  }

  getSaveObj() {
    return this.state;
  }

  loadFromObj(saveObject) {
    this.state = saveObject;
  }

  update(curTime, neighbors) {
  }

  draw(cell, progress) {
    if (cell.style.background !== this.bgStyle) {
      cell.style.background = this.bgStyle;
    }
    const percentStr = `${Math.round(this.percent)}%`;
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
  }

  closeGame() {
  }

}

class CellObjectEnemy extends CellObject {
  constructor() {
    super();
    this.state.type = 'enemy';
    this.bgStyle = spriteNameToStyle('snail');
    this.percent = 100;
  }

  update(curTime, neighbors) {
    this.tPower = 0;
    this.cPower = 0;
    for (let i = 0; i < neighbors.length; i++) {
      this.tPower += neighbors[i].content.state.tickPower ?? 0;
      this.cPower += neighbors[i].content.state.clickPower ?? 0;
    }

    this.percent -= this.tPower * 0.5;
    if (this.percent <= 0) {this.percent = 100;}
  }

  displayCellInfo(container) {
    container.innerText = 'enemy details ' + Math.round(this.percent) + ' power: ' + this.tPower;
  }

  isDropable(srcObject) {
    return false;
  }

  initGame(gameContainer) {
    //INIT GAME GUI
    gameContainer.innerHTML = '';
    const b = document.createElement('button');
    b.innerText = 'PRESS';
    gameContainer.appendChild(b);
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
  }
}

const TYPE_TO_CLASS_MAP = {
  'none': CellObject,
  'boss': CellObjectBoss,
  'enemy': CellObjectEnemy,
  'enemyCheese': CellObjectEnemyCheese
};
