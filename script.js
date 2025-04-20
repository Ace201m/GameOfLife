// Game of Life with p5.js
let cols, rows;
let resolution = 10;
let grid;
let running = false;
let drawing = false;
let erasing = false;
let tool = 'pen'; // 'pen' or 'eraser'
let penColor = '#ffffff';
let soundEnabled = false;
let colorMixing = true;
let winnerColor = null;

// Track history of alive/dead ratio for music wave
let history = [];
const HISTORY_LENGTH = 1000;

let osc = null;
let playingSound = false;
let audioStarted = false;

function startOscillator() {
  if (!osc) {
    osc = new p5.Oscillator('sine');
    osc.amp(0.0, 0.05);
    osc.start();
  }
}

function resumeAudioContext() {
  if (getAudioContext().state !== 'running') {
    getAudioContext().resume();
  }
}

function setup() {
  const canvas = createCanvas(800, 600);
  canvas.parent(document.querySelector('main'));
  cols = width / resolution;
  rows = height / resolution;
  grid = make2DArray(cols, rows);
  const penColorInput = document.getElementById('penColor');
  penColorInput.oninput = (e) => {
    penColor = e.target.value;
  };
  // Start with 4 random colors for alive cells
  const colorChoices = [
    [173, 216, 230], // light blue
    [255, 99, 132],  // pink/red
    [255, 206, 86],  // yellow
    [75, 192, 192]   // teal
  ];
  for (let i = 0; i < cols; i++) {
    for (let j = 0; j < rows; j++) {
      let alive = floor(random(2));
      let colorIdx = floor(random(4));
      grid[i][j] = {
        alive: alive,
        color: alive ? colorChoices[colorIdx] : [0, 0, 0]
      };
    }
  }
  const startPauseBtn = document.getElementById('startPauseBtn');
  const stopBtn = document.getElementById('stopBtn');
  const penBtn = document.getElementById('penBtn');
  const eraserBtn = document.getElementById('eraserBtn');
  const clearBtn = document.getElementById('clearBtn');

  function updateButtons() {
    startPauseBtn.textContent = running ? 'Pause' : 'Start';
    stopBtn.style.display = running ? 'none' : 'inline-block';
  }

  startPauseBtn.onclick = () => {
    removeWinner();
    if (!audioStarted) {
      resumeAudioContext();
      startOscillator();
      audioStarted = true;
    }
    running = !running;
    if (running) {
      loop();
    } else {
      noLoop();
    }
    updateButtons();
  };

  stopBtn.onclick = () => {
    running = false;
    for (let i = 0; i < cols; i++) {
      for (let j = 0; j < rows; j++) {
        let alive = floor(random(2));
        let colorIdx = floor(random(4));
        grid[i][j] = {
          alive: alive,
          color: alive ? colorChoices[colorIdx] : [0, 0, 0]
        };
      }
    }
    removeWinner();
    redraw();
    updateButtons();
  };

  penBtn.onclick = () => {
    tool = 'pen';
    penBtn.classList.add('active');
    eraserBtn.classList.remove('active');
  };
  eraserBtn.onclick = () => {
    tool = 'eraser';
    eraserBtn.classList.add('active');
    penBtn.classList.remove('active');
  };

  clearBtn.onclick = () => {
    running = false;
    for (let i = 0; i < cols; i++) {
      for (let j = 0; j < rows; j++) {
        grid[i][j] = { alive: 0, color: [0, 0, 0] };
      }
    }
    removeWinner();
    redraw();
    updateButtons();
  };

  updateButtons();
  noLoop();

  // Add mouse event listeners for drawing/erasing
  canvas.elt.addEventListener('mousedown', (e) => {
    if (!running) {
      if (e.button === 0) drawing = true;
      if (e.button === 2) erasing = true;
    }
  });
  canvas.elt.addEventListener('mouseup', () => {
    drawing = false;
    erasing = false;
  });
  canvas.elt.addEventListener('mouseleave', () => {
    drawing = false;
    erasing = false;
  });
  // Prevent context menu on right click
  canvas.elt.addEventListener('contextmenu', e => e.preventDefault());
}

function draw() {
  background(0);

  // Draw border around the grid
  stroke(255, 0, 0);
  strokeWeight(3);
  noFill();
  rect(0, 0, cols * resolution, rows * resolution);
  strokeWeight(1);

  // Draw grid lines for visibility
  stroke(80);
  for (let i = 0; i <= cols; i++) {
    line(i * resolution, 0, i * resolution, rows * resolution);
  }
  for (let j = 0; j <= rows; j++) {
    line(0, j * resolution, cols * resolution, j * resolution);
  }

  // Draw music wave in background (before cells)
  push();
  noFill();
  strokeWeight(2);
  if (document.body.classList.contains('space')) {
    stroke(0, 200, 255, 120);
  } else {
    stroke(191, 167, 111, 120);
  }
  beginShape();
  let waveY = height - 40;
  let waveH = 60;
  for (let i = 0; i < history.length; i++) {
    let x = map(i, 0, HISTORY_LENGTH - 1, 0, width);
    let y = waveY - (history[i] * waveH) + waveH / 2;
    vertex(x, y);
  }
  endShape();
  pop();

  // Draw cells
  for (let i = 0; i < cols; i++) {
    for (let j = 0; j < rows; j++) {
      let x = i * resolution;
      let y = j * resolution;
      if (grid[i][j].alive == 1) {
        fill(...grid[i][j].color);
        stroke(0);
        rect(x, y, resolution - 1, resolution - 1);
      } else {
        fill(30);
        stroke(50);
        rect(x, y, resolution - 1, resolution - 1);
      }
    }
  }

  // (Removed as per request)

  // Calculate and store alive ratio for music wave
  let aliveCount = 0;
  let total = cols * rows;
  for (let i = 0; i < cols; i++) {
    for (let j = 0; j < rows; j++) {
      if (grid[i][j].alive) aliveCount++;
    }
  }
  let ratio = aliveCount / total;
  history.push(ratio);
  if (history.length > HISTORY_LENGTH) history.shift();

  // Play sound if running, stop if not or if sound is disabled
  if (running && osc && soundEnabled) {
    if (!playingSound) {
      osc.amp(0.2, 0.1);
      playingSound = true;
    }
    // Map ratio to frequency (e.g. 100Hz to 1200Hz)
    let freq = map(ratio, 0, 1, 100, 1200);
    osc.freq(freq, 0.1);
  } else if (osc && playingSound) {
    osc.amp(0.0, 0.2);
    playingSound = false;
  }

  // Only update the grid if running
  if (running) {
    let next = make2DArray(cols, rows);
    for (let i = 0; i < cols; i++) {
      for (let j = 0; j < rows; j++) {
        let state = grid[i][j].alive;
        let colorSum = [0,0,0];
        let colorCount = 0;
        let colorMap = {};
        let sum = 0;
        for (let xoff = -1; xoff <= 1; xoff++) {
          for (let yoff = -1; yoff <= 1; yoff++) {
            let col = (i + xoff + cols) % cols;
            let row = (j + yoff + rows) % rows;
            let neighbor = grid[col][row];
            sum += neighbor.alive;
            if (neighbor.alive) {
              colorSum[0] += neighbor.color[0];
              colorSum[1] += neighbor.color[1];
              colorSum[2] += neighbor.color[2];
              colorCount++;
              // For majority color
              let key = neighbor.color.join(',');
              colorMap[key] = (colorMap[key] || 0) + 1;
            }
          }
        }
        sum -= state;
        if (state == 1 && (sum < 2 || sum > 3)) {
          next[i][j] = {alive: 0, color: [0,0,0]};
        } else if (state == 0 && sum == 3) {
          let newColor;
          if (colorMixing) {
            // Mix colors of the 3 neighbors
            newColor = colorCount ? [
              Math.round(colorSum[0]/colorCount),
              Math.round(colorSum[1]/colorCount),
              Math.round(colorSum[2]/colorCount)
            ] : [255,255,255];
          } else {
            // Majority color wins
            let maxCount = 0;
            let majority = [255,255,255];
            for (let key in colorMap) {
              if (colorMap[key] > maxCount) {
                maxCount = colorMap[key];
                majority = key.split(',').map(Number);
              }
            }
            newColor = majority;
          }
          next[i][j] = {alive: 1, color: newColor};
        } else {
          next[i][j] = state ? {alive: 1, color: grid[i][j].color.slice()} : {alive: 0, color: [0,0,0]};
        }
      }
    }
    grid = next;
  }

  // Check for winner (only one color remains among alive cells)
  let colorSet = new Set();
  for (let i = 0; i < cols; i++) {
    for (let j = 0; j < rows; j++) {
      if (grid[i][j].alive) {
        colorSet.add(grid[i][j].color.join(','));
      }
    }
  }
  if (running && colorSet.size === 1 && colorSet.size !== 0) {
    running = false;
    winnerColor = Array.from(colorSet)[0].split(',').map(Number);
    noLoop();
    // Show winner message
    setTimeout(() => {
      showWinner();
    }, 100);
  }
}

function showWinner() {
  const winnerDiv = document.createElement('div');
  winnerDiv.textContent = 'Winner!';
  winnerDiv.style.position = 'fixed';
  winnerDiv.style.top = '50%';
  winnerDiv.style.left = '50%';
  winnerDiv.style.transform = 'translate(-50%, -50%)';
  winnerDiv.style.background = 'rgba(0,0,0,0.85)';
  winnerDiv.style.color = `rgb(${winnerColor.join(',')})`;
  winnerDiv.style.fontSize = '3em';
  winnerDiv.style.fontFamily = 'MedievalSharp, Arial, sans-serif';
  winnerDiv.style.padding = '1em 2em';
  winnerDiv.style.border = `4px solid rgb(${winnerColor.join(',')})`;
  winnerDiv.style.borderRadius = '20px';
  winnerDiv.style.zIndex = '1000';
  winnerDiv.id = 'winnerDiv';
  document.body.appendChild(winnerDiv);
}

// Remove winner message on stop/reset
function removeWinner() {
  const winnerDiv = document.getElementById('winnerDiv');
  if (winnerDiv) winnerDiv.remove();
}

function mouseDragged() {
  if (!running) {
    let i = Math.floor(mouseX / resolution);
    let j = Math.floor(mouseY / resolution);
    if (i >= 0 && i < cols && j >= 0 && j < rows) {
      if (tool === 'pen') {
        let c = color(penColor);
        grid[i][j] = {alive: 1, color: [red(c), green(c), blue(c)]};
      }
      if (tool === 'eraser') {
        grid[i][j] = {alive: 0, color: [0,0,0]};
      }
    }
    redraw();
  }
}

function mousePressed() {
  if (!running) {
    let i = Math.floor(mouseX / resolution);
    let j = Math.floor(mouseY / resolution);
    if (i >= 0 && i < cols && j >= 0 && j < rows) {
      if (tool === 'pen') {
        let c = color(penColor);
        grid[i][j] = {alive: 1, color: [red(c), green(c), blue(c)]};
      }
      if (tool === 'eraser') {
        grid[i][j] = {alive: 0, color: [0,0,0]};
      }
    }
  }
}

function make2DArray(cols, rows) {
  let arr = new Array(cols);
  for (let i = 0; i < arr.length; i++) {
    arr[i] = new Array(rows);
  }
  return arr;
}

document.addEventListener('DOMContentLoaded', () => {
  const themeSelect = document.getElementById('themeSelect');
  function applyTheme(theme) {
    document.body.classList.remove('medieval', 'space');
    document.body.classList.add(theme);
  }
  themeSelect.addEventListener('change', (e) => {
    applyTheme(e.target.value);
  });
  // Set initial theme
  applyTheme(themeSelect.value);
  const soundToggle = document.getElementById('soundToggle');
  soundToggle.checked = false;
  soundToggle.addEventListener('change', (e) => {
    soundEnabled = e.target.checked;
    if (!soundEnabled && osc) {
      osc.amp(0.0, 0.2);
      playingSound = false;
    }
  });
  const colorMixToggle = document.getElementById('colorMixToggle');
  colorMixToggle.checked = true;
  colorMixToggle.addEventListener('change', (e) => {
    colorMixing = e.target.checked;
  });
});
