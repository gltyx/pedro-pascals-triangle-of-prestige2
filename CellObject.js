"use strict";

class CellObject {
  constructor() {
    this.state = {};
    this.type = 'None';
    this.bgStyle = spriteNameToStyle('border1');
    this.percent = '0%';
  }

  save() {
    return this.state;
  }

  load(saveObject) {
    this.state = saveObject;
  }

  update(curTime, neighbors) {
  }

  draw(cell, progress) {
    if (cell.style.background !== this.bgStyle) {
      cell.style.background = this.bgStyle;
    }
    if (progress.style.width !== this.percent) {
      progress.style.width = this.percent;
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
    this.type = 'Enemy';
    this.bgStyle = spriteNameToStyle('enemy');
    this.percent = '25%';
  }

  update(curTime, neighbors) {
    const percent = 100 - (curTime % 10) * 100 / 10;
    this.percent = `${percent}%`;
  }

  displayCellInfo(container) {
    container.innerText = 'enemy details';
  }

  isDropable(srcObject) {
    return false;
  }
}

class CellObjectBoss extends CellObject {
  constructor() {
    super();
    this.type = 'boss';
    this.bgStyle = spriteNameToStyle('boss');
  }

  displayCellInfo(container) {
    container.innerText = 'boss details';
  }

  isDragable() {
    return true;
  }
}
