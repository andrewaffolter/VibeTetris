// Tetris Game Configuration
const COLS = 10;
const ROWS = 20;
const BLOCK_SIZE = 30;
const COLORS = [
    null,
    '#FF0D72', // I
    '#0DC2FF', // J
    '#0DFF72', // L
    '#F538FF', // O
    '#FF8E0D', // S
    '#FFE138', // T
    '#3877FF'  // Z
];

// Tetromino shapes
const SHAPES = [
    [],
    [[1, 1, 1, 1]], // I
    [[2, 0, 0], [2, 2, 2]], // J
    [[0, 0, 3], [3, 3, 3]], // L
    [[4, 4], [4, 4]], // O
    [[0, 5, 5], [5, 5, 0]], // S
    [[0, 6, 0], [6, 6, 6]], // T
    [[7, 7, 0], [0, 7, 7]]  // Z
];

class Tetris {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.nextCanvas = document.getElementById('nextCanvas');
        this.nextCtx = this.nextCanvas.getContext('2d');

        // Set canvas sizes
        this.setCanvasSize();
        window.addEventListener('resize', () => this.setCanvasSize());

        // Game state
        this.board = this.createBoard();
        this.score = 0;
        this.lines = 0;
        this.level = 1;
        this.gameOver = false;
        this.isPaused = false;
        this.isPlaying = false;

        // Current and next pieces
        this.piece = null;
        this.nextPiece = null;

        // Game loop
        this.dropCounter = 0;
        this.dropInterval = 1000;
        this.lastTime = 0;

        // Touch controls
        this.touchStartX = 0;
        this.touchStartY = 0;
        this.touchEndX = 0;
        this.touchEndY = 0;
        this.minSwipeDistance = 30;

        this.setupControls();
        this.updateDisplay();
    }

    setCanvasSize() {
        // Calculate optimal size for mobile
        const maxWidth = Math.min(window.innerWidth - 40, 300);
        const blockSize = Math.floor(maxWidth / COLS);

        this.canvas.width = COLS * blockSize;
        this.canvas.height = ROWS * blockSize;
        this.blockSize = blockSize;

        // Redraw if game is active
        if (this.isPlaying) {
            this.draw();
        }
    }

    createBoard() {
        return Array.from({ length: ROWS }, () => Array(COLS).fill(0));
    }

    createPiece() {
        const type = Math.floor(Math.random() * (SHAPES.length - 1)) + 1;
        return {
            shape: SHAPES[type],
            type: type,
            pos: { x: Math.floor(COLS / 2) - Math.floor(SHAPES[type][0].length / 2), y: 0 }
        };
    }

    draw() {
        // Clear canvas
        this.ctx.fillStyle = '#1a1a2e';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // Draw board
        this.drawBoard();

        // Draw current piece
        if (this.piece) {
            this.drawPiece(this.piece, this.ctx);
        }

        // Draw ghost piece
        if (this.piece && !this.isPaused) {
            this.drawGhost();
        }

        // Draw grid
        this.drawGrid();

        // Draw next piece
        this.drawNextPiece();
    }

    drawBoard() {
        this.board.forEach((row, y) => {
            row.forEach((value, x) => {
                if (value !== 0) {
                    this.drawBlock(x, y, COLORS[value], this.ctx);
                }
            });
        });
    }

    drawBlock(x, y, color, ctx) {
        const size = this.blockSize;
        ctx.fillStyle = color;
        ctx.fillRect(x * size, y * size, size, size);

        // Add shine effect
        ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.fillRect(x * size, y * size, size, size / 4);

        // Border
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.3)';
        ctx.lineWidth = 1;
        ctx.strokeRect(x * size, y * size, size, size);
    }

    drawPiece(piece, ctx) {
        piece.shape.forEach((row, y) => {
            row.forEach((value, x) => {
                if (value !== 0) {
                    this.drawBlock(piece.pos.x + x, piece.pos.y + y, COLORS[value], ctx);
                }
            });
        });
    }

    drawGhost() {
        const ghost = { ...this.piece, pos: { ...this.piece.pos } };
        while (!this.collision(ghost, { x: 0, y: 1 })) {
            ghost.pos.y++;
        }

        // Draw ghost with transparency
        ghost.shape.forEach((row, y) => {
            row.forEach((value, x) => {
                if (value !== 0) {
                    const size = this.blockSize;
                    const gx = (ghost.pos.x + x) * size;
                    const gy = (ghost.pos.y + y) * size;
                    this.ctx.strokeStyle = COLORS[value];
                    this.ctx.lineWidth = 2;
                    this.ctx.strokeRect(gx, gy, size, size);
                }
            });
        });
    }

    drawGrid() {
        this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
        this.ctx.lineWidth = 1;

        // Vertical lines
        for (let x = 0; x <= COLS; x++) {
            this.ctx.beginPath();
            this.ctx.moveTo(x * this.blockSize, 0);
            this.ctx.lineTo(x * this.blockSize, this.canvas.height);
            this.ctx.stroke();
        }

        // Horizontal lines
        for (let y = 0; y <= ROWS; y++) {
            this.ctx.beginPath();
            this.ctx.moveTo(0, y * this.blockSize);
            this.ctx.lineTo(this.canvas.width, y * this.blockSize);
            this.ctx.stroke();
        }
    }

    drawNextPiece() {
        if (!this.nextPiece) return;

        // Clear next canvas
        this.nextCtx.fillStyle = '#ffffff';
        this.nextCtx.fillRect(0, 0, this.nextCanvas.width, this.nextCanvas.height);

        const size = 25;
        const offsetX = (this.nextCanvas.width - this.nextPiece.shape[0].length * size) / 2;
        const offsetY = (this.nextCanvas.height - this.nextPiece.shape.length * size) / 2;

        this.nextPiece.shape.forEach((row, y) => {
            row.forEach((value, x) => {
                if (value !== 0) {
                    this.nextCtx.fillStyle = COLORS[value];
                    this.nextCtx.fillRect(
                        offsetX + x * size,
                        offsetY + y * size,
                        size,
                        size
                    );

                    // Border
                    this.nextCtx.strokeStyle = 'rgba(0, 0, 0, 0.3)';
                    this.nextCtx.lineWidth = 1;
                    this.nextCtx.strokeRect(
                        offsetX + x * size,
                        offsetY + y * size,
                        size,
                        size
                    );
                }
            });
        });
    }

    collision(piece, offset) {
        for (let y = 0; y < piece.shape.length; y++) {
            for (let x = 0; x < piece.shape[y].length; x++) {
                if (piece.shape[y][x] !== 0) {
                    const newX = piece.pos.x + x + offset.x;
                    const newY = piece.pos.y + y + offset.y;

                    if (newX < 0 || newX >= COLS || newY >= ROWS) {
                        return true;
                    }

                    if (newY >= 0 && this.board[newY][newX] !== 0) {
                        return true;
                    }
                }
            }
        }
        return false;
    }

    merge() {
        this.piece.shape.forEach((row, y) => {
            row.forEach((value, x) => {
                if (value !== 0) {
                    const boardY = this.piece.pos.y + y;
                    const boardX = this.piece.pos.x + x;
                    if (boardY >= 0) {
                        this.board[boardY][boardX] = value;
                    }
                }
            });
        });
    }

    clearLines() {
        let linesCleared = 0;

        outer: for (let y = ROWS - 1; y >= 0; y--) {
            for (let x = 0; x < COLS; x++) {
                if (this.board[y][x] === 0) {
                    continue outer;
                }
            }

            // Remove line and add new line at top
            this.board.splice(y, 1);
            this.board.unshift(Array(COLS).fill(0));
            linesCleared++;
            y++; // Check this row again
        }

        if (linesCleared > 0) {
            this.lines += linesCleared;

            // Scoring system
            const points = [0, 100, 300, 500, 800];
            this.score += points[linesCleared] * this.level;

            // Level up every 10 lines
            this.level = Math.floor(this.lines / 10) + 1;
            this.dropInterval = Math.max(100, 1000 - (this.level - 1) * 100);

            this.updateDisplay();
        }
    }

    rotate() {
        const rotated = this.piece.shape[0].map((_, i) =>
            this.piece.shape.map(row => row[i]).reverse()
        );

        const previousShape = this.piece.shape;
        this.piece.shape = rotated;

        // Wall kick: try to adjust position if rotation collides
        let offset = 0;
        while (this.collision(this.piece, { x: offset, y: 0 })) {
            offset = offset > 0 ? -(offset + 1) : -offset + 1;
            if (Math.abs(offset) > this.piece.shape[0].length) {
                this.piece.shape = previousShape;
                return;
            }
        }

        this.piece.pos.x += offset;
    }

    move(dir) {
        if (!this.collision(this.piece, { x: dir, y: 0 })) {
            this.piece.pos.x += dir;
        }
    }

    drop() {
        this.dropCounter = 0;
        if (!this.collision(this.piece, { x: 0, y: 1 })) {
            this.piece.pos.y++;
            this.score += 1;
        } else {
            this.merge();
            this.clearLines();
            this.piece = this.nextPiece;
            this.nextPiece = this.createPiece();

            if (this.collision(this.piece, { x: 0, y: 0 })) {
                this.endGame();
            }
        }
    }

    hardDrop() {
        while (!this.collision(this.piece, { x: 0, y: 1 })) {
            this.piece.pos.y++;
            this.score += 2;
        }
        this.drop();
    }

    update(time = 0) {
        if (!this.isPlaying || this.isPaused || this.gameOver) return;

        const deltaTime = time - this.lastTime;
        this.lastTime = time;
        this.dropCounter += deltaTime;

        if (this.dropCounter > this.dropInterval) {
            this.drop();
        }

        this.draw();
        requestAnimationFrame((time) => this.update(time));
    }

    start() {
        this.board = this.createBoard();
        this.score = 0;
        this.lines = 0;
        this.level = 1;
        this.gameOver = false;
        this.isPaused = false;
        this.isPlaying = true;
        this.dropCounter = 0;
        this.dropInterval = 1000;

        this.piece = this.createPiece();
        this.nextPiece = this.createPiece();

        this.updateDisplay();
        this.hideOverlay();

        document.getElementById('startBtn').style.display = 'none';
        document.getElementById('pauseBtn').style.display = 'inline-block';

        this.lastTime = performance.now();
        this.update(this.lastTime);
    }

    pause() {
        this.isPaused = !this.isPaused;
        document.getElementById('pauseBtn').textContent = this.isPaused ? 'Resume' : 'Pause';

        if (!this.isPaused) {
            this.lastTime = performance.now();
            this.update(this.lastTime);
        }
    }

    endGame() {
        this.gameOver = true;
        this.isPlaying = false;
        document.getElementById('finalScore').textContent = this.score;
        document.getElementById('overlayTitle').textContent = 'Game Over';
        document.getElementById('overlayMessage').innerHTML = `Your score: <span id="finalScore">${this.score}</span>`;
        this.showOverlay();

        document.getElementById('startBtn').style.display = 'inline-block';
        document.getElementById('pauseBtn').style.display = 'none';
    }

    showOverlay() {
        document.getElementById('gameOverlay').style.display = 'flex';
    }

    hideOverlay() {
        document.getElementById('gameOverlay').style.display = 'none';
    }

    updateDisplay() {
        document.getElementById('score').textContent = this.score;
        document.getElementById('level').textContent = this.level;
        document.getElementById('lines').textContent = this.lines;
    }

    setupControls() {
        // Keyboard controls
        document.addEventListener('keydown', (e) => {
            if (!this.isPlaying || this.isPaused || this.gameOver) return;

            switch (e.key) {
                case 'ArrowLeft':
                    e.preventDefault();
                    this.move(-1);
                    break;
                case 'ArrowRight':
                    e.preventDefault();
                    this.move(1);
                    break;
                case 'ArrowDown':
                    e.preventDefault();
                    this.drop();
                    break;
                case 'ArrowUp':
                    e.preventDefault();
                    this.rotate();
                    break;
                case ' ':
                    e.preventDefault();
                    this.hardDrop();
                    break;
            }
            this.draw();
        });

        // Touch controls
        this.canvas.addEventListener('touchstart', (e) => {
            e.preventDefault();
            if (!this.isPlaying || this.isPaused || this.gameOver) return;

            this.touchStartX = e.touches[0].clientX;
            this.touchStartY = e.touches[0].clientY;
        }, { passive: false });

        this.canvas.addEventListener('touchmove', (e) => {
            e.preventDefault();
        }, { passive: false });

        this.canvas.addEventListener('touchend', (e) => {
            e.preventDefault();
            if (!this.isPlaying || this.isPaused || this.gameOver) return;

            this.touchEndX = e.changedTouches[0].clientX;
            this.touchEndY = e.changedTouches[0].clientY;
            this.handleSwipe();
        }, { passive: false });

        // Button controls
        document.getElementById('startBtn').addEventListener('click', () => this.start());
        document.getElementById('pauseBtn').addEventListener('click', () => this.pause());
        document.getElementById('restartBtn').addEventListener('click', () => this.start());
    }

    handleSwipe() {
        const deltaX = this.touchEndX - this.touchStartX;
        const deltaY = this.touchEndY - this.touchStartY;
        const absDeltaX = Math.abs(deltaX);
        const absDeltaY = Math.abs(deltaY);

        // Tap (for rotation)
        if (absDeltaX < this.minSwipeDistance && absDeltaY < this.minSwipeDistance) {
            this.rotate();
            this.draw();
            return;
        }

        // Swipe
        if (absDeltaX > absDeltaY) {
            // Horizontal swipe
            if (deltaX > this.minSwipeDistance) {
                this.move(1); // Right
            } else if (deltaX < -this.minSwipeDistance) {
                this.move(-1); // Left
            }
        } else {
            // Vertical swipe
            if (deltaY > this.minSwipeDistance) {
                this.hardDrop(); // Down
            }
        }

        this.draw();
    }
}

// Initialize game when page loads
let game;
window.addEventListener('DOMContentLoaded', () => {
    game = new Tetris();
});
