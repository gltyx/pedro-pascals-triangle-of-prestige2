"use strict";

/*
  map is made up of buildings containing equipment/resources/enemies
  need to create your own units to go fight the enemies and collect the resources
  when disassembling equipment, it is made of a hierarchy of parts, different
    units are needed for different types of disassembly
  unit actions are always successful, they just take time
  units are always on grid
  instant travel
  may need to have smaller "worlds" instead of just 1 big grid for performance
  can enemies flood from a source?

*/

class App {
  constructor() {
    this.UI = {};

    const uiIDs = 'gameGrid,sprites,cellInfoTitle,cellInfoDetails';
    uiIDs.split`,`.forEach( id => {
      this.UI[id] = document.getElementById(id);
    });
    this.bgPosition = {x: 0, y: 0};
    document.body.onmousemove = (evt) => this.onmousemove(evt);
    document.body.onkeydown = (evt) => this.onkeydown(evt);
    document.body.onkeyup = (evt) => this.onkeyup(evt);


    this.initGrid(this.UI.gameGrid);

    setInterval(() => this.tick(), 1000/60);
  }

  initGrid(container) {
    this.gridWidth = 128;
    this.gridHeight = 128;
    this.cells = new Array(this.gridWidth * this.gridHeight);
    for (let y = 0; y < this.gridHeight; y++) {
      for (let x = 0; x < this.gridWidth; x++) {
        const cellIndex = x + y * this.gridWidth;
        const cell = document.createElement('div');
        cell.draggable = true;
        cell.classList.add('cell');
        this.cells[cellIndex] = {
          ui: cell,
          index: cellIndex,
          x,
          y,
          content: undefined
        };

        if (cellIndex === 0) {
          this.cells[cellIndex].content = {
            type: 'player'
          };
        }

        if (cellIndex === 2) {
          this.cells[cellIndex].content = {
            type: 'enemy'
          };
        }

        this.drawCell(this.cells[cellIndex]);


        cell.onclick = (evt) => this.clickCell(evt, cellIndex);
        cell.ondragstart = (evt) => this.oncelldrag(evt, cellIndex);
        cell.ondragover = (evt) => this.oncelldragover(evt, cellIndex);
        cell.ondrop = (evt) => this.oncelldrop(evt, cellIndex);
        container.appendChild(cell);


      }
    }
  }

  drawCell(cell) {
    const e = cell.ui;
    const content = cell.content;

    if (content === undefined) {
      e.style.background = spriteNameToStyle('border1');
    } else {
      e.style.background = spriteNameToStyle(content.type);
    }
  }

  oncelldrag(evt, cellIndex) {
    //turn off selection to make the drag image better
    this.clearAllSelectedCells();
    this.dragSrcIndex = cellIndex;
    const srcType = this.cells[cellIndex]?.content?.type;
    if (srcType !== 'player') {
      evt.preventDefault(); //call this if drag is not ok
    } else {
    }
    if (evt.ctrlKey) {
      //don't drag if trying to pan
      evt.preventDefault();
    }
  }

  oncelldragover(evt, cellIndex) {
    const dstType = this.cells[cellIndex]?.content?.type;
    if (dstType === undefined) {
      evt.preventDefault(); //call this if drop on this cell is ok
      evt.dataTransfer.dropEffect = 'move'; //set the feedback to show item is movable
    }
  }

  oncelldrop(evt, cellIndex) {
    evt.preventDefault(); //call this always 
    const srcIndex = this.dragSrcIndex;
    console.log('dropped', srcIndex, 'on', cellIndex);
    [this.cells[srcIndex].content,this.cells[cellIndex].content] = [
      this.cells[cellIndex].content, this.cells[srcIndex].content];
    this.drawCell(this.cells[srcIndex]);
    this.drawCell(this.cells[cellIndex]);
  }

  tick() {

  }

  clearAllSelectedCells() {
    const oldSelected = document.getElementsByClassName('cellSelected');
    for (let i = 0; i < oldSelected.length; i++) {
      oldSelected.item(i).classList.remove('cellSelected');
    }
    this.UI.cellInfoTitle.innerText = '-';
    this.UI.cellInfoDetails.innerText = '-';
  }

  clickCell(evt, cellIndex) {
    if (!evt.ctrlKey) {
      const cell = this.cells[cellIndex];
      const e = cell.ui;
      this.clearAllSelectedCells();
      e.classList.add('cellSelected');
      this.displayCellInfo(cell);
    }
  }

  displayCellInfo(cell) {
    const type = cell?.content?.type ?? 'None';
    this.UI.cellInfoTitle.innerText = `(${cell.x},${cell.y}) - ${type}`;
    switch (type) {
      case 'player': {
        this.UI.cellInfoDetails.innerText = 'player details';
        break;
      }
      case 'enemy': {
        this.UI.cellInfoDetails.innerText = 'enemy details';
        break;
      }
      default: {
        this.UI.cellInfoDetails.innerText = '-';
      }
    }
  }

  onmousemove(evt) {
    document.body.style.cursor = evt.ctrlKey ? 'move' : '';
    if (evt.buttons === 1 && evt.ctrlKey) {
      const zoom = window.outerWidth / window.innerWidth;
      this.bgPosition.x += evt.movementX / zoom;
      this.bgPosition.y += evt.movementY / zoom;
      this.updateBGPos();
    }
  }

  onkeydown(evt) {
    if (evt.ctrlKey) {
      this.UI.gameGrid.classList.add('gameGridMovable');
    } else {
      this.UI.gameGrid.classList.remove('gameGridMovable');
    }
  }

  onkeyup(evt) {
    if (evt.ctrlKey) {
      this.UI.gameGrid.classList.add('gameGridMovable');
    } else {
      this.UI.gameGrid.classList.remove('gameGridMovable');
    }
  }

  updateBGPos() {
    this.UI.gameGrid.style.transform = `translate(${Math.round(this.bgPosition.x)}px, ${Math.round(this.bgPosition.y)}px)`;
    //this.game.style.left = `${this.bgPosition.x}px`;
    //this.game.style.top = `${this.bgPosition.y}px`;
  }
}

const app = new App();
