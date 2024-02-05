"use strict";

/*

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
  localStorage.removeItem('pptop2');
  window.location.reload();
}

class App {
  constructor() {
    this.UI = {};
    this.rndBags = {};

    const uiIDs = 'gameGrid,sprites,cellInfoTitle,cellInfoDetails,cellInfoGameContainer,gameInfoCompletionEnemies,gameInfoTotalEnemies,gameInfoCompletionWalls,gameInfoTotalWalls,gameInfoTPoints,gameInfoDPoints,toastRight';
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

    setTimeout(() => this.clickCell(undefined, 0), 200);
  }

  loadFromStorage() {
    const rawState = localStorage.getItem('pptop2');

    this.state = {
      log: [],
      loreUnlocks: [true],
      tpoints: 0,
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
        this.cells[i].content.postLoad();
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
    localStorage.setItem('pptop2', saveString);
  }

  getExportString() {
    this.saveToStorage();
    const saveString = localStorage.getItem('pptop2');
    const compressArray = LZString.compressToUint8Array(saveString);
    const words = [ 'sh', 'il', 'ht', 'mn', 'hl', 'us', 'la', 'an', 'im', 'lo', 'mo', 'ua', 'hn', 'ho', 'sl', 'th' ];
    const result = new Array(compressArray.length * 2);
    for (let i = 0; i < compressArray.length; i++) {
      const val = compressArray[i];
      const wordI0 = val & 0x0f;
      const wordI1 = (val >> 4) & 0x0f;
      const word0 = ((i % 2 === 0) ? words[wordI0][0].toUpperCase() : words[wordI0][0]) + words[wordI0][1];
      const word1 = words[wordI1];
      result[i * 2] = word0;
      result[i * 2 + 1] = word1;
    }
    return result.join('');
  }

  importFromString(str) {
    const arraySize = Math.round(str.length / 2);
    const compressArray = new Uint8Array(arraySize);
    const wordMap = { 'sh': 0, 'il': 1, 'ht': 2, 'mn': 3, 'hl': 4, 'us': 5, 'la': 6, 'an': 7, 'im': 8, 'lo': 9, 'mo': 10, 'ua': 11, 'hn': 12, 'ho': 13, 'sl': 14, 'th': 15 };

    for (let i = 0; i < arraySize; i++) {
      const word0 = str.substr(i * 4, 2).toLowerCase();
      const word1 = str.substr(i * 4 + 2, 2).toLowerCase();
      const val1 = wordMap[word0];
      const val2 = wordMap[word1];
      const val = (val2 << 4) | val1;
      compressArray[i] = val;
    }

    const saveString = LZString.decompressFromUint8Array(compressArray);

    let state;
    try {
      state = JSON.parse(saveString);
    } catch (error) {
      console.error("Corrupted import string. JSON.parse check failed." + error);
      return;
    }

    this.disableSaves = true;
    localStorage.setItem('pptop2', saveString);
    window.location.reload();
  }

  reset() {
    this.disableSaves = true;
    localStorage.removeItem('pptop2');
    window.location.reload();
  }

  rnd(seed) {
    //return a value in [0,1)
    const x = Math.sin(seed++) * 14324;
    return x - Math.floor(x);
  }

  initRndBag(bagName, contents, duplicates, seed) {
    let bag = [];
    for (let i = 0; i < duplicates; i++) {
      bag = bag.concat(contents);
    }

    for (let i = bag.length - 1; i >= 1; i--) {
      seed = Math.floor(this.rnd(seed) * Number.MAX_SAFE_INTEGER);
      const swapIndex = seed % (i + 1);
      [bag[i], bag[swapIndex]] = [bag[swapIndex], bag[i]];
    }

    this.rndBags[bagName] = {
      name: bagName,
      contents,
      duplicates,
      seed,
      bag
    }
  }

  rndFromBag(bagName) {
    const bag = this.rndBags[bagName];

    if (bag.bag.length === 0) {
      this.initRndBag(bagName, bag.contents, bag.duplicates, bag.seed);
    }

    return this.rndBags[bagName].bag.shift();
  }

  initGrid(container) {
    this.gridWidth = 32;
    this.gridHeight = 32;
    this.totalEnemies = 0;
    this.totalWalls = 0;
    this.cells = new Array(this.gridWidth * this.gridHeight);
    this.initRndBag('path1', '$ra'.split``, 3, 260);
    this.initRndBag('path3', 'c$prla'.split``, 3, 365);
    this.initRndBag('path2', 'cpl'.split``, 3, 52);
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
          lore.classList.add('loreMark');
          applySprite(lore, 'lore', true);
          cell.appendChild(lore);
        }

        //const worldChar = WORLD[y][x];
        const pathEnemiesList = [
          '$ra', //top = active
          'c$prla', //mid = both
          'cpl' //bot = idle
        ];
        let worldChar = WORLD[y][x];
        if (worldChar === '1' || worldChar === '2' || worldChar === '3') {
          const pathNum = parseInt(worldChar);
          //worldChar = enemyList[Math.floor(Math.random() * enemyList.length)];
          worldChar = this.rndFromBag(`path${pathNum}`);
        }

        const worldClass = CHAR_TO_CLASS_MAP[worldChar];
        
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

  moveCell(srcIndex, dstIndex, noClick) {
    [this.cells[srcIndex].content,this.cells[dstIndex].content] = [
      this.cells[dstIndex].content, this.cells[srcIndex].content];
    this.drawCell(this.cells[srcIndex]);
    this.drawCell(this.cells[dstIndex]);
    if (srcIndex === this.selectedCellIndex && noClick !== true) {
      this.clickCell({ctrlKey: false}, dstIndex);
    }
  }

  oncelldrop(evt, cellIndex) {
    evt.preventDefault(); //call this always 
    const srcIndex = this.dragSrcIndex;
    this.moveCell(srcIndex, cellIndex);
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
      const type = cell.content.state.type;
      if (type === 'wall') {
        this.curWalls++;
      }

      if (type.substring(0, 5) === 'enemy') {
        this.curEnemies++;
      }

      if (!cell.selectable) {return;}

      const cellOutput = cell.content.update(curTime, cell.neighbors);

      if (cellOutput !== undefined) {
        this.state.tpoints += cellOutput.tpoints ?? 0;
        this.state.dpoints += cellOutput.dpoints ?? 0;
        const loreUnlock = LORE_UNLOCK_MAP[i];
        if (loreUnlock) {
          this.state.loreUnlocks[loreUnlock] = true;
          this.addToLog(`Lore ${loreUnlock} unlocked!`);
          document.getElementById(`loreIcon${i}`).style.display = 'none';
        }

        if (cellOutput.harvest !== true && cellOutput.merged !== true) {
          this.addToLog(`Completed ${cell.content.state.type} @ (${cell.x},${cell.y}). Reward: T: ${this.formatValue(cellOutput.tpoints ?? 0, 'floor')}, D: ${this.formatValue(cellOutput.dpoints ?? 0, 'floor')}`);
        } else {
          if (cellOutput.harvest === true) {
            this.addToLog(`Harvested ${cell.content.state.type} @ (${cell.x},${cell.y}). Reward: T: ${this.formatValue(cellOutput.tpoints ?? 0, 'floor')}, D: ${this.formatValue(cellOutput.dpoints ?? 0, 'floor')}`);
          }
        }
        cell.content.closeGame();
        const dist = cell.x + cell.y;
        cell.content = new CellObject(cell.ui, dist);
        if (this.selectedCellIndex === i) {
          this.cells[i].content.initGame(this.UI.cellInfoGameContainer);
          this.displayCellInfo(this.cells[i]);
        }
        reflowNeeded = true;
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

  roundToVal(value, roundType, roundVal) {
    if (roundType === undefined) {roundType = 'round';}
    return Math[roundType](value / roundVal) * roundVal;
  }

  formatCurrency(value, roundType) {
    return this.formatValue(value, roundType, '$');
  }

  formatValue(value, roundType, prefix = '', suffix = '') {
    if (value < 1000) {
      return `${prefix}${this.roundToVal(value, roundType, 0.01).toFixed(2)}${suffix}`;
    } else {
      return `${prefix}${value.toExponential(3)}${suffix}`;
    }
  }

  draw() {
    this.UI.gameInfoTPoints.innerText = this.formatValue(this.state.tpoints, 'floor');
    this.UI.gameInfoDPoints.innerText = this.formatValue(this.state.dpoints, 'floor');
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
    const notCtrl = evt === undefined || !evt.ctrlKey;
    if (this.selectedCellIndex !== undefined) {
      const prevCanMove = this.cells[this.selectedCellIndex].content.isDragable();
      const canMoveHere = this.cells[cellIndex].reachable && this.cells[cellIndex].content.isDropable();
      if (prevCanMove && canMoveHere && this.selectedCellIndex !== cellIndex) {
        this.moveCell(this.selectedCellIndex, cellIndex, true);
      }
    }
    if (notCtrl && cellIndex !== this.selectedCellIndex && this.cells[cellIndex].selectable) {
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

/*
Below is pieroxy's LZString and license
*/

/*
MIT License

Copyright (c) 2013 pieroxy

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
*/

var LZString=function(){var r=String.fromCharCode,o="ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=",n="ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+-$",e={};function t(r,o){if(!e[r]){e[r]={};for(var n=0;n<r.length;n++)e[r][r.charAt(n)]=n}return e[r][o]}var i={compressToBase64:function(r){if(null==r)return"";var n=i._compress(r,6,function(r){return o.charAt(r)});switch(n.length%4){default:case 0:return n;case 1:return n+"===";case 2:return n+"==";case 3:return n+"="}},decompressFromBase64:function(r){return null==r?"":""==r?null:i._decompress(r.length,32,function(n){return t(o,r.charAt(n))})},compressToUTF16:function(o){return null==o?"":i._compress(o,15,function(o){return r(o+32)})+" "},decompressFromUTF16:function(r){return null==r?"":""==r?null:i._decompress(r.length,16384,function(o){return r.charCodeAt(o)-32})},compressToUint8Array:function(r){for(var o=i.compress(r),n=new Uint8Array(2*o.length),e=0,t=o.length;e<t;e++){var s=o.charCodeAt(e);n[2*e]=s>>>8,n[2*e+1]=s%256}return n},decompressFromUint8Array:function(o){if(null==o)return i.decompress(o);for(var n=new Array(o.length/2),e=0,t=n.length;e<t;e++)n[e]=256*o[2*e]+o[2*e+1];var s=[];return n.forEach(function(o){s.push(r(o))}),i.decompress(s.join(""))},compressToEncodedURIComponent:function(r){return null==r?"":i._compress(r,6,function(r){return n.charAt(r)})},decompressFromEncodedURIComponent:function(r){return null==r?"":""==r?null:(r=r.replace(/ /g,"+"),i._decompress(r.length,32,function(o){return t(n,r.charAt(o))}))},compress:function(o){return i._compress(o,16,function(o){return r(o)})},_compress:function(r,o,n){if(null==r)return"";var e,t,i,s={},u={},a="",p="",c="",l=2,f=3,h=2,d=[],m=0,v=0;for(i=0;i<r.length;i+=1)if(a=r.charAt(i),Object.prototype.hasOwnProperty.call(s,a)||(s[a]=f++,u[a]=!0),p=c+a,Object.prototype.hasOwnProperty.call(s,p))c=p;else{if(Object.prototype.hasOwnProperty.call(u,c)){if(c.charCodeAt(0)<256){for(e=0;e<h;e++)m<<=1,v==o-1?(v=0,d.push(n(m)),m=0):v++;for(t=c.charCodeAt(0),e=0;e<8;e++)m=m<<1|1&t,v==o-1?(v=0,d.push(n(m)),m=0):v++,t>>=1}else{for(t=1,e=0;e<h;e++)m=m<<1|t,v==o-1?(v=0,d.push(n(m)),m=0):v++,t=0;for(t=c.charCodeAt(0),e=0;e<16;e++)m=m<<1|1&t,v==o-1?(v=0,d.push(n(m)),m=0):v++,t>>=1}0==--l&&(l=Math.pow(2,h),h++),delete u[c]}else for(t=s[c],e=0;e<h;e++)m=m<<1|1&t,v==o-1?(v=0,d.push(n(m)),m=0):v++,t>>=1;0==--l&&(l=Math.pow(2,h),h++),s[p]=f++,c=String(a)}if(""!==c){if(Object.prototype.hasOwnProperty.call(u,c)){if(c.charCodeAt(0)<256){for(e=0;e<h;e++)m<<=1,v==o-1?(v=0,d.push(n(m)),m=0):v++;for(t=c.charCodeAt(0),e=0;e<8;e++)m=m<<1|1&t,v==o-1?(v=0,d.push(n(m)),m=0):v++,t>>=1}else{for(t=1,e=0;e<h;e++)m=m<<1|t,v==o-1?(v=0,d.push(n(m)),m=0):v++,t=0;for(t=c.charCodeAt(0),e=0;e<16;e++)m=m<<1|1&t,v==o-1?(v=0,d.push(n(m)),m=0):v++,t>>=1}0==--l&&(l=Math.pow(2,h),h++),delete u[c]}else for(t=s[c],e=0;e<h;e++)m=m<<1|1&t,v==o-1?(v=0,d.push(n(m)),m=0):v++,t>>=1;0==--l&&(l=Math.pow(2,h),h++)}for(t=2,e=0;e<h;e++)m=m<<1|1&t,v==o-1?(v=0,d.push(n(m)),m=0):v++,t>>=1;for(;;){if(m<<=1,v==o-1){d.push(n(m));break}v++}return d.join("")},decompress:function(r){return null==r?"":""==r?null:i._decompress(r.length,32768,function(o){return r.charCodeAt(o)})},_decompress:function(o,n,e){var t,i,s,u,a,p,c,l=[],f=4,h=4,d=3,m="",v=[],g={val:e(0),position:n,index:1};for(t=0;t<3;t+=1)l[t]=t;for(s=0,a=Math.pow(2,2),p=1;p!=a;)u=g.val&g.position,g.position>>=1,0==g.position&&(g.position=n,g.val=e(g.index++)),s|=(u>0?1:0)*p,p<<=1;switch(s){case 0:for(s=0,a=Math.pow(2,8),p=1;p!=a;)u=g.val&g.position,g.position>>=1,0==g.position&&(g.position=n,g.val=e(g.index++)),s|=(u>0?1:0)*p,p<<=1;c=r(s);break;case 1:for(s=0,a=Math.pow(2,16),p=1;p!=a;)u=g.val&g.position,g.position>>=1,0==g.position&&(g.position=n,g.val=e(g.index++)),s|=(u>0?1:0)*p,p<<=1;c=r(s);break;case 2:return""}for(l[3]=c,i=c,v.push(c);;){if(g.index>o)return"";for(s=0,a=Math.pow(2,d),p=1;p!=a;)u=g.val&g.position,g.position>>=1,0==g.position&&(g.position=n,g.val=e(g.index++)),s|=(u>0?1:0)*p,p<<=1;switch(c=s){case 0:for(s=0,a=Math.pow(2,8),p=1;p!=a;)u=g.val&g.position,g.position>>=1,0==g.position&&(g.position=n,g.val=e(g.index++)),s|=(u>0?1:0)*p,p<<=1;l[h++]=r(s),c=h-1,f--;break;case 1:for(s=0,a=Math.pow(2,16),p=1;p!=a;)u=g.val&g.position,g.position>>=1,0==g.position&&(g.position=n,g.val=e(g.index++)),s|=(u>0?1:0)*p,p<<=1;l[h++]=r(s),c=h-1,f--;break;case 2:return v.join("")}if(0==f&&(f=Math.pow(2,d),d++),l[c])m=l[c];else{if(c!==h)return null;m=i+i.charAt(0)}v.push(m),l[h++]=i+m.charAt(0),i=m,0==--f&&(f=Math.pow(2,d),d++)}}};return i}();"function"==typeof define&&define.amd?define(function(){return LZString}):"undefined"!=typeof module&&null!=module?module.exports=LZString:"undefined"!=typeof angular&&null!=angular&&angular.module("LZString",[]).factory("LZString",function(){return LZString});

