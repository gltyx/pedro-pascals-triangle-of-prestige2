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
  moving the grid should not result in a click on a cell
  only show the move cursor when ctrl is held down

*/

class App {
  constructor() {
    this.UI = {};

    const uiIDs = 'gameGrid';
    uiIDs.split`,`.forEach( id => {
      this.UI[id] = document.getElementById(id);
    });
    this.frame = 0;
    this.bgPosition = {x: 0, y: 0};
    document.body.onmousemove = (evt) => this.onmousemove(evt);

    this.initGrid(this.UI.gameGrid);

    setInterval(() => this.tick(), 1000/60);
  }

  initGrid(container) {
    for (let x = 0; x < 100; x++) {
      for (let y = 0; y < 100; y++) {
        const cell = document.createElement('div');
        cell.classList.add('cell');
        //cell.innerText = `${x},${y}`;
        //cell.style.background = 'green';

        cell.onclick = () => this.toggleColor(cell);
        container.appendChild(cell);
      }
    }
  }

  tick() {
    this.frame++;


  }

  toggleColor(cell) {
    cell.style.background = cell.style.background === 'green' ? 'red' : 'green';
  }

  onmousemove(evt) {
    if (evt.buttons === 1 && evt.ctrlKey) {
      const zoom = window.outerWidth / window.innerWidth;
      this.bgPosition.x += evt.movementX / zoom;
      this.bgPosition.y += evt.movementY / zoom;
      this.updateBGPos();
    }
  }

  updateBGPos() {
    this.UI.gameGrid.style.transform = `translate(${this.bgPosition.x}px, ${this.bgPosition.y}px)`;
    //this.game.style.left = `${this.bgPosition.x}px`;
    //this.game.style.top = `${this.bgPosition.y}px`;
  }
}

const app = new App();
