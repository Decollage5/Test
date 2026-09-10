(() => {
  const COLS = 10;
  const ROWS = 20;
  const BLOCK = 24;

  const boardCanvas = document.getElementById('board');
  const boardCtx = boardCanvas.getContext('2d');
  const nextCanvas = document.getElementById('next');
  const nextCtx = nextCanvas.getContext('2d');

  const scoreEl = document.getElementById('score');
  const levelEl = document.getElementById('level');
  const linesEl = document.getElementById('lines');
  const overlay = document.getElementById('overlay');
  const overlayText = document.getElementById('overlay-text');
  const startBtn = document.getElementById('start-btn');

  const COLORS = {
    I: '#3ee0e0',
    J: '#3e6fe0',
    L: '#e0973e',
    O: '#e0d63e',
    S: '#5be03e',
    T: '#b03ee0',
    Z: '#e03e4f',
  };

  const SHAPES = {
    I: [
      [0, 0, 0, 0],
      [1, 1, 1, 1],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
    ],
    J: [
      [1, 0, 0],
      [1, 1, 1],
      [0, 0, 0],
    ],
    L: [
      [0, 0, 1],
      [1, 1, 1],
      [0, 0, 0],
    ],
    O: [
      [1, 1],
      [1, 1],
    ],
    S: [
      [0, 1, 1],
      [1, 1, 0],
      [0, 0, 0],
    ],
    T: [
      [0, 1, 0],
      [1, 1, 1],
      [0, 0, 0],
    ],
    Z: [
      [1, 1, 0],
      [0, 1, 1],
      [0, 0, 0],
    ],
  };

  const PIECE_TYPES = Object.keys(SHAPES);

  function createMatrix(w, h) {
    const matrix = [];
    while (h--) matrix.push(new Array(w).fill(0));
    return matrix;
  }

  function randomPiece() {
    const type = PIECE_TYPES[Math.floor(Math.random() * PIECE_TYPES.length)];
    return {
      type,
      matrix: SHAPES[type].map((row) => row.slice()),
      x: Math.floor(COLS / 2) - Math.ceil(SHAPES[type][0].length / 2),
      y: -1,
    };
  }

  function rotateMatrix(matrix) {
    const n = matrix.length;
    const result = createMatrix(n, n);
    for (let y = 0; y < n; y++) {
      for (let x = 0; x < n; x++) {
        result[x][n - 1 - y] = matrix[y][x];
      }
    }
    return result;
  }

  let board = createMatrix(COLS, ROWS);
  let current = null;
  let next = null;
  let score = 0;
  let level = 1;
  let linesCleared = 0;
  let dropCounter = 0;
  let dropInterval = 1000;
  let lastTime = 0;
  let running = false;
  let paused = false;
  let animationId = null;

  function collide(piece, offsetX = 0, offsetY = 0) {
    const { matrix, x, y } = piece;
    for (let row = 0; row < matrix.length; row++) {
      for (let col = 0; col < matrix[row].length; col++) {
        if (!matrix[row][col]) continue;
        const boardX = x + col + offsetX;
        const boardY = y + row + offsetY;
        if (boardX < 0 || boardX >= COLS || boardY >= ROWS) return true;
        if (boardY >= 0 && board[boardY][boardX]) return true;
      }
    }
    return false;
  }

  function merge() {
    const { matrix, x, y, type } = current;
    for (let row = 0; row < matrix.length; row++) {
      for (let col = 0; col < matrix[row].length; col++) {
        if (matrix[row][col] && y + row >= 0) {
          board[y + row][x + col] = type;
        }
      }
    }
  }

  function sweep() {
    let cleared = 0;
    outer: for (let y = ROWS - 1; y >= 0; y--) {
      for (let x = 0; x < COLS; x++) {
        if (!board[y][x]) continue outer;
      }
      board.splice(y, 1);
      board.unshift(new Array(COLS).fill(0));
      cleared++;
      y++;
    }
    if (cleared > 0) {
      const points = [0, 100, 300, 500, 800];
      score += (points[cleared] || 0) * level;
      linesCleared += cleared;
      level = Math.floor(linesCleared / 10) + 1;
      dropInterval = Math.max(100, 1000 - (level - 1) * 80);
      updateStats();
    }
  }

  function spawn() {
    current = next || randomPiece();
    next = randomPiece();
    current.y = -1;
    drawNext();
    if (collide(current)) {
      gameOver();
    }
  }

  function hardDrop() {
    while (!collide(current, 0, 1)) {
      current.y++;
      score += 2;
    }
    lockPiece();
  }

  function softDrop() {
    if (!collide(current, 0, 1)) {
      current.y++;
      score += 1;
      updateStats();
    } else {
      lockPiece();
    }
    dropCounter = 0;
  }

  function lockPiece() {
    merge();
    sweep();
    spawn();
    updateStats();
  }

  function move(dir) {
    if (!collide(current, dir, 0)) {
      current.x += dir;
    }
  }

  function rotate() {
    const rotated = rotateMatrix(current.matrix);
    const prevMatrix = current.matrix;
    current.matrix = rotated;
    const kicks = [0, -1, 1, -2, 2];
    for (const kick of kicks) {
      if (!collide(current, kick, 0)) {
        current.x += kick;
        return;
      }
    }
    current.matrix = prevMatrix;
  }

  function updateStats() {
    scoreEl.textContent = score;
    levelEl.textContent = level;
    linesEl.textContent = linesCleared;
  }

  function drawCell(ctx, x, y, size, color) {
    ctx.fillStyle = color;
    ctx.fillRect(x * size, y * size, size - 1, size - 1);
    ctx.fillStyle = 'rgba(255,255,255,0.15)';
    ctx.fillRect(x * size, y * size, size - 1, 3);
  }

  function draw() {
    boardCtx.fillStyle = '#000';
    boardCtx.fillRect(0, 0, boardCanvas.width, boardCanvas.height);

    for (let y = 0; y < ROWS; y++) {
      for (let x = 0; x < COLS; x++) {
        const cell = board[y][x];
        if (cell) drawCell(boardCtx, x, y, BLOCK, COLORS[cell]);
      }
    }

    if (current) {
      const { matrix, x, y, type } = current;
      for (let row = 0; row < matrix.length; row++) {
        for (let col = 0; col < matrix[row].length; col++) {
          if (matrix[row][col] && y + row >= 0) {
            drawCell(boardCtx, x + col, y + row, BLOCK, COLORS[type]);
          }
        }
      }
    }
  }

  function drawNext() {
    nextCtx.fillStyle = '#000';
    nextCtx.fillRect(0, 0, nextCanvas.width, nextCanvas.height);
    if (!next) return;
    const size = 20;
    const matrix = SHAPES[next.type];
    const offsetX = Math.floor((5 - matrix[0].length) / 2);
    const offsetY = Math.floor((5 - matrix.length) / 2);
    for (let row = 0; row < matrix.length; row++) {
      for (let col = 0; col < matrix[row].length; col++) {
        if (matrix[row][col]) {
          drawCell(nextCtx, col + offsetX, row + offsetY, size, COLORS[next.type]);
        }
      }
    }
  }

  function update(time = 0) {
    if (!running || paused) return;
    const delta = time - lastTime;
    lastTime = time;
    dropCounter += delta;
    if (dropCounter > dropInterval) {
      if (!collide(current, 0, 1)) {
        current.y++;
      } else {
        lockPiece();
      }
      dropCounter = 0;
    }
    draw();
    animationId = requestAnimationFrame(update);
  }

  function gameOver() {
    running = false;
    cancelAnimationFrame(animationId);
    overlayText.textContent = `Game Over! Punkte: ${score}`;
    startBtn.textContent = 'Neu starten';
    overlay.classList.remove('hidden');
  }

  function reset() {
    board = createMatrix(COLS, ROWS);
    score = 0;
    level = 1;
    linesCleared = 0;
    dropInterval = 1000;
    dropCounter = 0;
    lastTime = 0;
    next = randomPiece();
    updateStats();
    spawn();
  }

  function startGame() {
    reset();
    running = true;
    paused = false;
    overlay.classList.add('hidden');
    animationId = requestAnimationFrame(update);
  }

  function togglePause() {
    if (!running) return;
    paused = !paused;
    if (paused) {
      overlayText.textContent = 'Pause';
      startBtn.textContent = 'Weiter';
      overlay.classList.remove('hidden');
    } else {
      overlay.classList.add('hidden');
      lastTime = performance.now();
      animationId = requestAnimationFrame(update);
    }
  }

  document.addEventListener('keydown', (event) => {
    if (!running) return;
    if (event.key === 'p' || event.key === 'P') {
      togglePause();
      return;
    }
    if (paused) return;
    switch (event.key) {
      case 'ArrowLeft':
        event.preventDefault();
        move(-1);
        break;
      case 'ArrowRight':
        event.preventDefault();
        move(1);
        break;
      case 'ArrowDown':
        event.preventDefault();
        softDrop();
        break;
      case 'ArrowUp':
        event.preventDefault();
        rotate();
        break;
      case ' ':
        event.preventDefault();
        hardDrop();
        break;
      default:
        return;
    }
    draw();
  });

  startBtn.addEventListener('click', () => {
    if (paused) {
      togglePause();
    } else {
      startGame();
    }
  });

  overlayText.textContent = 'Tetris';
  draw();
})();
