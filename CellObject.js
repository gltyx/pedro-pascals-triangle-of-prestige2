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

}

class CellObjectEnemy extends CellObject {
  constructor() {
    super();
    this.state.type = 'enemy';
    this.bgStyle = spriteNameToStyle('enemy');
    this.percent = 100;
  }

  update(curTime, neighbors) {
    this.nPower = neighbors.reduce( (acc, e) => {
      return acc + (e.content.state.type === 'boss' ? 1 : 0);
    }, 0);

    this.percent -= this.nPower * 0.5;
    if (this.percent <= 0) {this.percent = 100;}
  }

  displayCellInfo(container) {
    container.innerText = 'enemy details ' + Math.round(this.percent) + ' power: ' + this.nPower;
  }

  isDropable(srcObject) {
    return false;
  }
}

class CellObjectBoss extends CellObject {
  constructor() {
    super();
    this.state.type = 'boss';
    this.bgStyle = spriteNameToStyle('boss');
  }

  displayCellInfo(container) {
    container.innerText = 'boss details';
  }

  isDragable() {
    return true;
  }
}

const TYPE_TO_CLASS_MAP = {
  'boss': CellObjectBoss,
  'enemy': CellObjectEnemy,
  'none': CellObject
};
