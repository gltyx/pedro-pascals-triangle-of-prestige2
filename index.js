"use strict";

/*
  snails can be the antagonists
  defeating enemies and disassembling resources shouldn't just be a time wait
    it should be simple/short versions of other basic incrementals
    - cheese game - idle
    - adventure capitalist
    - pedro - but modified for the last game
    - prestige - idle
    - cookie clicker
    - crank - active
    - antimatter dimensions
    - lawnmower game

  different types of units near enemies give upgrades based on the unit type and level
    tick speed
    click power
    disassembly power
  get drag/drop working on mobile
  maybe the cult is trying to complete PPToP because it believes something good will
   happen when it's finished but in fact it unleashes the snail
  display icon on cells that will unlock story when completed
  need better favicon

  add some license info as necessary

  s  active
   \   ---
    \ /  |
     /m  |
  i / \i |
  d |  \x|
  l |   \|
  e |----f

*/
function reset() {
  localStorage.removeItem('gridGame');
  window.location.reload();
}

class App {
  constructor() {
    this.UI = {};

    const uiIDs = 'gameGrid,sprites,cellInfoTitle,cellInfoDetails,cellInfoGameContainer,gameInfoCompletionEnemies,gameInfoTotalEnemies,gameInfoCompletionWalls,gameInfoTotalWalls,gameInfoTPoints,gameInfoCPoints,gameInfoDPoints,toastRight';
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
    this.reflowReachableCells();

    this.fps = 60;
    setInterval(() => this.tick(), 1000/this.fps);
    setInterval(() => this.saveToStorage(), 10000);
  }

  loadFromStorage() {
    const rawState = localStorage.getItem('gridGame');

    this.state = {
      log: [],
      loreUnlocks: [true],
      tpoints: 0,
      cpoints: 0,
      dpoints: 0
    };

    if (rawState !== null) {
      const loadedState = JSON.parse(rawState);
      this.state = {...this.state, ...loadedState};
    } else {
      const startTime = new Date();
      this.state.gameStart = startTime.getTime();
      this.addToLog(`Game Start @ ${startTime.toString()}`);
    }

    if (this.state.cellSaves !== undefined) {
      this.state.cellSaves.forEach( (c, i) => {
        const dist = this.cells[i].x + this.cells[i].y;
        this.cells[i].content = new TYPE_TO_CLASS_MAP[c.type](this.cells[i].ui, dist);
        this.cells[i].content.loadFromObj(c);
      });
    }

    for (let i = 0; i < this.gridWidth * this.gridHeight; i++) {
      const loreUnlock = LORE_UNLOCK_MAP[i];
      if (this.state.loreUnlocks[loreUnlock]) {
        document.getElementById(`loreIcon${i}`).style.display = 'none';
      }
    }

    this.saveToStorage();
  }

  saveToStorage() {
    if (this.disableSaves) {return;}

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
    this.totalEnemies = 0;
    this.totalWalls = 0;
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

        if (LORE_UNLOCK_MAP[cellIndex] !== undefined) {
          const lore = document.createElement('div');
          lore.id = `loreIcon${cellIndex}`;
          lore.classList.add('loreIcon');
          applySprite(lore, 'lore', true);
          cell.appendChild(lore);
        }

        const worldClass = CHAR_TO_CLASS_MAP[WORLD[y][x]];
        
        const newCell = {
          ui: cell,
          progress,
          index: cellIndex,
          x,
          y,
          content: new worldClass(cell, x + y)
        };

        this.cells[cellIndex] = newCell;

        cell.onmousemove = (evt) => this.cellonmousemove(evt, newCell);

        if (newCell.content.state.type === 'wall') {
          this.totalWalls++;
        }

        if (newCell.content.state.type.substring(0, 5) === 'enemy') {
          this.totalEnemies++;
        }


        this.drawCell(this.cells[cellIndex]);


        cell.onclick = (evt) => this.clickCell(evt, cellIndex);
        cell.ondragstart = (evt) => this.oncelldrag(evt, cellIndex);
        cell.ondragover = (evt) => this.oncelldragover(evt, cellIndex);
        cell.ondrop = (evt) => this.oncelldrop(evt, cellIndex);
        container.appendChild(cell);


      }

      this.UI.gameInfoTotalWalls.innerText = this.totalWalls;
      this.UI.gameInfoTotalEnemies.innerText = this.totalEnemies;
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
    content.updateBackground(e);
  }

  reflowReachableCells() {
    //mark everything unreachable
    this.cells.forEach( c => {
      c.ui.classList.add('cellUnreachable');
      c.reachable = false;
      c.selectable = false;
    });

    //start at 0,0 and mark everything reachable via flood fill
    const edges = [this.cells[0]];
    const seen = {};
    this.cells[0].ui.classList.remove('cellUnreachable');
    this.cells[0].reachable = true;
    this.cells[0].selectable = true;
    const deltas = [[0, -1], [0, 1], [-1, 0], [1, 0]];

    while (edges.length > 0) {
      const cell = edges.pop();
      seen[cell.index] = true;

      //can't find neighbors via cell.neighbors because we only want to check
      //orthogonal neighbors
      deltas.forEach( d => {
        const nx = cell.x + d[0];
        const ny = cell.y + d[1];
        if (nx < 0 || ny < 0 || nx >= this.gridWidth || ny >= this.gridHeight) {return;}
        const ni = nx + ny * this.gridWidth;
        if (seen[ni]) {return;}
        const n = this.cells[ni];
        n.ui.classList.remove('cellUnreachable');
        n.selectable = true;
        if (!n.content.blocking) {
          edges.push(n);
          n.reachable = true;
        }
      });

    }
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
    if (this.cells[cellIndex].reachable && this.cells[cellIndex].content.isDropable(this.cells[this.dragSrcIndex].content)) {
      evt.preventDefault(); //call this if drop on this cell is ok
      evt.dataTransfer.dropEffect = 'move'; //set the feedback to show item is movable
    }
  }

  oncelldrop(evt, cellIndex) {
    evt.preventDefault(); //call this always 
    const srcIndex = this.dragSrcIndex;
    [this.cells[srcIndex].content,this.cells[cellIndex].content] = [
      this.cells[cellIndex].content, this.cells[srcIndex].content];
    this.drawCell(this.cells[srcIndex]);
    this.drawCell(this.cells[cellIndex]);
    if (srcIndex === this.selectedCellIndex) {
      this.clickCell({ctrlKey: false}, cellIndex);
    }
  }

  tick() {
    this.update();
    this.draw();
  }

  update() {
    const curTime = (new Date()).getTime() / 1000;
    let reflowNeeded = false;
    this.curWalls = 0;
    this.curEnemies = 0;
    this.cells.forEach( (cell, i) => {
      if (!cell.selectable) {return;}

      const cellOutput = cell.content.update(curTime, cell.neighbors);

      if (cellOutput !== undefined) {
        this.addToLog(`Completed ${cell.content.state.type} @ (${cell.x},${cell.y}). Reward: ${JSON.stringify(cellOutput, null, 1)}`);
        this.state.tpoints += cellOutput.tpoints ?? 0;
        this.state.cpoints += cellOutput.cpoints ?? 0;
        this.state.dpoints += cellOutput.dpoints ?? 0;
        const loreUnlock = LORE_UNLOCK_MAP[i];
        if (loreUnlock) {
          this.state.loreUnlocks[loreUnlock] = true;
          this.addToLog(`Lore ${loreUnlock} unlocked!`);
          document.getElementById(`loreIcon${i}`).style.display = 'none';
        }
        const dist = cell.x + cell.y;
        cell.content = new CellObject(cell.ui, dist);
        if (this.selectedCellIndex === i) {
          this.cells[i].content.initGame(this.UI.cellInfoGameContainer);
          this.displayCellInfo(this.cells[i]);
        }
        reflowNeeded = true;
      }

      const type = cell.content.state.type;
      if (type === 'wall') {
        this.curWalls++;
      }

      if (type.substring(0, 5) === 'enemy') {
        this.curEnemies++;
      }


    });

    this.cells.forEach( cell => {
      cell.content.draw(cell.ui, cell.progress);
    });

    if (this.selectedCellIndex !== undefined) {
      const selectedCell = this.cells[this.selectedCellIndex];
      selectedCell.content.displayCellInfo(this.UI.cellInfoDetails);
    }

    if (reflowNeeded) {
      this.reflowReachableCells();
    }
  }

  draw() {
    this.UI.gameInfoTPoints.innerText = this.state.tpoints;
    this.UI.gameInfoCPoints.innerText = this.state.cpoints;
    this.UI.gameInfoDPoints.innerText = this.state.dpoints;
    this.UI.gameInfoCompletionEnemies.innerText = (this.totalEnemies - this.curEnemies);
    this.UI.gameInfoCompletionWalls.innerText = (this.totalWalls - this.curWalls);
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
    if (!evt.ctrlKey && cellIndex !== this.selectedCellIndex && this.cells[cellIndex].selectable) {
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

  cellonmousemove(evt, cell) {
    if (cell.content.cursor === undefined || !cell.selectable) {
      cell.ui.style.cursor = '';
    } else {
      cell.ui.style.cursor = cell.content.cursor;
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

  addToLog(msg) {
    this.state.log.push({date: (new Date()).getTime(), msg});
    this.displayToast(msg);
  }

  displayToast(msg) {
    const toast = document.createElement('div');
    toast.classList.add('toastMsg');
    toast.innerText = msg;
    this.UI.toastRight.prepend(toast);

    setTimeout(() => this.removeToast(toast), 5000);
  }

  removeToast(toast, step) {
    switch (step) {
      case 1: {
        toast.remove();
        break;
      }
      default: {
        toast.style.filter = 'opacity(0)';
        setTimeout(() => this.removeToast(toast, 1), 1000);
      }
    }
  }
}

const app = new App();

