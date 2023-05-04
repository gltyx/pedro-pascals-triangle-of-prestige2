"use strict";

class CellObject {
  constructor() {
    this.state = {};
    this.type = 'None';
  }

  save() {
    return this.state;
  }

  load(saveObject) {
    this.state = saveObject;
  }

  update() {
  }

  draw(cell) {
    cell.style.background = spriteNameToStyle('border1');
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
  }

  update() {
  }

  draw(cell) {
    cell.style.background = spriteNameToStyle('enemy');
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
  }

  update() {
  }

  draw(cell) {
    cell.style.background = spriteNameToStyle('boss');
  }

  displayCellInfo(container) {
    container.innerText = 'boss details';
  }

  isDragable() {
    return true;
  }
}
