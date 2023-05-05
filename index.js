"use strict";

/*
  need to create your own units to go fight the enemies and collect the resources
  when disassembling equipment, it is made of a hierarchy of parts
  unit actions are always successful, they just take time
  may need to have smaller "worlds" instead of just 1 big grid for performance
  snails can be the antagonists
  defeating enemies and disassembling resources shouldn't just be a time wait
    it should be simple/short versions of other basic incrementals
    - pedro - idle
    - prestige 
    - cookie clicker
    - crank - active
    - antimatter dimensions
    - lawnmower game
    - cheese game - idle
    - adventure capitalist
  merge using a merge terminal?

  the game works from top left to bottom right
  can we have different paths that allow more/less idle?
  different types of units near enemies give upgrades based on the unit type and level
    tick speed
    click power

  s  active
   \   ---
    \ /  |
     /p  |
  i / \z |
  d |  \l|
  l |   \|
  e |----f

*/

class App {
  constructor() {
    this.UI = {};

    const uiIDs = 'gameGrid,sprites,cellInfoTitle,cellInfoDetails,cellInfoGameContainer';
    uiIDs.split`,`.forEach( id => {
      this.UI[id] = document.getElementById(id);
    });
    this.bgPosition = {x: 0, y: 0};
    document.body.onmousemove = (evt) => this.onmousemove(evt);
    document.body.onkeydown = (evt) => this.onkeydown(evt);
    document.body.onkeyup = (evt) => this.onkeyup(evt);


    this.initGrid(this.UI.gameGrid);
    this.selectedCellIndex = undefined;

    this.loadFromStorage();

    this.fps = 60;
    setInterval(() => this.tick(), 1000/this.fps);
    setInterval(() => this.saveToStorage(), 10000);
  }

  loadFromStorage() {
    const rawState = localStorage.getItem('gridGame');

    this.state = {
      tpoints: 0,
      cpoints: 0
    };

    if (rawState !== null) {
      const loadedState = JSON.parse(rawState);
      this.state = {...this.state, ...loadedState};
    } else {
      this.state.gameStart = (new Date()).getTime();
    }

    if (this.state.cellSaves !== undefined) {
      this.state.cellSaves.forEach( (c, i) => {
        this.cells[i].content = new TYPE_TO_CLASS_MAP[c.type];
        this.cells[i].content.loadFromObj(c);
      });
    }
    this.saveToStorage();
  }

  saveToStorage() {
    if (this.disableSaves) {return;}

    console.log('SAVING NOW');

    this.state.cellSaves = this.cells.map( c => {
      return c.content.getSaveObj();
    });

    const saveString = JSON.stringify(this.state);
    localStorage.setItem('gridGame', saveString);
  }

  reset() {
    this.disableSaves = true;
    localStorage.removeItem('gridGame');
    window.location.reload();
  }

  initGrid(container) {
    this.gridWidth = 32;
    this.gridHeight = 32;
    this.cells = new Array(this.gridWidth * this.gridHeight);
    for (let y = 0; y < this.gridHeight; y++) {
      for (let x = 0; x < this.gridWidth; x++) {
        const cellIndex = x + y * this.gridWidth;
        const cell = document.createElement('div');
        cell.draggable = true;
        cell.classList.add('cell');
        
        const progressContainer = document.createElement('div');
        progressContainer.classList.add('progressContainer');
        const progress = document.createElement('div');
        progress.classList.add('progress');
        progressContainer.appendChild(progress);
        cell.appendChild(progressContainer);

        progress.style.width = '0%';

        const worldClass = CHAR_TO_CLASS_MAP[WORLD[y][x]];

        this.cells[cellIndex] = {
          ui: cell,
          progress,
          index: cellIndex,
          x,
          y,
          content: new worldClass()
        };


        this.drawCell(this.cells[cellIndex]);


        cell.onclick = (evt) => this.clickCell(evt, cellIndex);
        cell.ondragstart = (evt) => this.oncelldrag(evt, cellIndex);
        cell.ondragover = (evt) => this.oncelldragover(evt, cellIndex);
        cell.ondrop = (evt) => this.oncelldrop(evt, cellIndex);
        container.appendChild(cell);


      }
    }

    for (let y = 0; y < this.gridHeight; y++) {
      for (let x = 0; x < this.gridWidth; x++) {
        const cellIndex = x + y * this.gridWidth;
        const cell = this.cells[cellIndex];
        cell.neighbors = [];
        for (let dx = -1; dx <= 1; dx++) {
          for (let dy = -1; dy <= 1; dy++) {
            if (dx === 0 && dy === 0) { continue; }
            const nx = x + dx;
            const ny = y + dy;
            if (nx < 0 || ny < 0) { continue; }
            if (nx >= this.gridWidth || ny >= this.gridHeight) { continue; }
            const nIndex = nx + ny * this.gridWidth;
            cell.neighbors.push(this.cells[nIndex]);
          }
        }
      }
    }
  }

  drawCell(cell) {
    const e = cell.ui;
    const content = cell.content;
    content.draw(e, cell.progress);
  }

  oncelldrag(evt, cellIndex) {
    //turn off selection to make the drag image better
    //this.clearAllSelectedCells();
    this.dragSrcIndex = cellIndex;
    if (!this.cells[cellIndex].content.isDragable()) {
      evt.preventDefault(); //call this if drag is not ok
    }
    if (evt.ctrlKey) {
      //don't drag if trying to pan
      evt.preventDefault();
    }
  }

  oncelldragover(evt, cellIndex) {
    if (this.cells[cellIndex].content.isDropable(this.cells[this.dragSrcIndex].content)) {
      evt.preventDefault(); //call this if drop on this cell is ok
      evt.dataTransfer.dropEffect = 'move'; //set the feedback to show item is movable
    }
  }

  oncelldrop(evt, cellIndex) {
    evt.preventDefault(); //call this always 
    const srcIndex = this.dragSrcIndex;
    //TODO: fix how dropping works so it's possible to merge
    [this.cells[srcIndex].content,this.cells[cellIndex].content] = [
      this.cells[cellIndex].content, this.cells[srcIndex].content];
    this.drawCell(this.cells[srcIndex]);
    this.drawCell(this.cells[cellIndex]);
    if (srcIndex === this.selectedCellIndex) {
      this.clickCell({ctrlKey: false}, cellIndex);
    }
  }

  tick() {
    const curTime = (new Date()).getTime() / 1000;
    this.cells.forEach( (cell, i) => {
      const cellOutput = cell.content.update(curTime, cell.neighbors);

      if (cellOutput !== undefined) {
        this.state.tpoints += cellOutput.tpoints;
        this.state.cpoints += cellOutput.cpoints;
        this.cells[i].content = new CellObject();
      }

    });

    this.cells.forEach( cell => {
      cell.content.draw(cell.ui, cell.progress);
    });

    if (this.selectedCellIndex !== undefined) {
      const selectedCell = this.cells[this.selectedCellIndex];
      selectedCell.content.displayCellInfo(this.UI.cellInfoDetails);
    }

  }

  clearAllSelectedCells() {
    if (this.selectedCellIndex !== undefined) {
      this.cells[this.selectedCellIndex].content.closeGame();
    }
    const oldSelected = document.getElementsByClassName('cellSelected');
    for (let i = 0; i < oldSelected.length; i++) {
      oldSelected.item(i).classList.remove('cellSelected');
    }
    this.UI.cellInfoTitle.innerText = '-';
    this.UI.cellInfoDetails.innerText = '-';
    this.selectedCellIndex = undefined;
  }

  clickCell(evt, cellIndex) {
    if (!evt.ctrlKey && cellIndex !== this.selectedCellIndex) {
      const cell = this.cells[cellIndex];
      const e = cell.ui;
      this.clearAllSelectedCells();
      e.classList.add('cellSelected');
      cell.content.initGame(this.UI.cellInfoGameContainer);
      this.displayCellInfo(cell);
      this.selectedCellIndex = cellIndex;
    }
  }

  displayCellInfo(cell) {
    const type = cell.content.state.type;
    this.UI.cellInfoTitle.innerText = `(${cell.x},${cell.y}) - ${type}`;
    cell.content.displayCellInfo(this.UI.cellInfoDetails);
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
  }
}

const app = new App();
