class ChessGame {
    constructor() {
        this.board = Array(8).fill().map(() => Array(8).fill(null));

        this.points = { white: 0, black: 0 };
        this.kings = { white: 0, black: 0 };
        this.maxPoints = 64;

        this.isGameStarted = false;

        this.initialize();
    }

    initialize() {
        this.createBoardSquares();
        this.enableDragAndDrop();
        this.connectButtons();
        this.loadSavedGame();
    }

    createBoardSquares() {
        const board = document.getElementById('chessboard');
        board.innerHTML = '';

        for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
                const squareColor = (row + col) % 2 === 0 ? 'white' : 'black';
                const square = document.createElement('div');
                square.className = 'square ' + squareColor;
                square.dataset.row = row;
                square.dataset.col = col;
                board.appendChild(square);
            }
        }
    }

    enableDragAndDrop() {
        const pieces = document.querySelectorAll('.piece');
        const squares = document.querySelectorAll('.square');

        pieces.forEach(piece => {
            piece.addEventListener('dragstart', e => {
                if (this.isGameStarted) return;
                const data = {
                    name: e.target.dataset.piece,
                    cost: Number(e.target.dataset.cost)
                };
                e.dataTransfer.setData('piece', JSON.stringify(data));
            });
        });

        squares.forEach(square => {
            square.addEventListener('dragover', e => {
                if (this.isGameStarted) return;
                e.preventDefault();

                const row = Number(square.dataset.row);
                const isPlacementRow = row <= 1 || row >= 6;
                square.classList.toggle('valid-drop', isPlacementRow);
                square.classList.toggle('invalid-drop', !isPlacementRow);
            });

            square.addEventListener('dragleave', () => {
                square.classList.remove('valid-drop', 'invalid-drop');
            });

            square.addEventListener('drop', e => this.handlePieceDrop(e));
        });
    }

    connectButtons() {
        document.getElementById('game-button').addEventListener('click', () => this.toggleGame());
        document.getElementById('reset-black').addEventListener('click', () => this.resetSide('black'));
        document.getElementById('reset-white').addEventListener('click', () => this.resetSide('white'));
    }

    handlePieceDrop(event) {
        event.preventDefault();
        if (this.isGameStarted) return;

        const square = event.target;
        const row = Number(square.dataset.row);
        const col = Number(square.dataset.col);

        square.classList.remove('valid-drop', 'invalid-drop');

        const color = row <= 1 ? 'black' : row >= 6 ? 'white' : null;
        if (!color) {
            alert('You can only place pieces on the first two or last two rows.');
            return;
        }

        if (this.board[row][col]) {
            alert('There is already a piece here.');
            return;
        }

        const piece = JSON.parse(event.dataTransfer.getData('piece'));
        piece.color = color;


        if (piece.name === 'King' && this.kings[color] >= 1) {
            alert('Only one King per side allowed.');
            return;
        }

        if (this.points[color] + piece.cost > this.maxPoints) {
            alert('Not enough remaining points.');
            return;
        }

        this.board[row][col] = piece;
        this.points[color] += piece.cost;
        if (piece.name === 'King') this.kings[color]++;

        square.innerHTML = `<div class="piece-on-board ${color}"><img src="./image/${color[0]}${piece.name}.png"></div>`;

        this.updatePointDisplays();
        this.updateGameButtonState();
        this.saveGame();
    }

    toggleGame() {
        if (!this.isGameStarted && (this.kings.white !== 1 || this.kings.black !== 1)) {
            alert('Each side must have one King before starting.');
            return;
        }

        this.isGameStarted = !this.isGameStarted;

        if (this.isGameStarted) {
            const firstMove = Math.random() < 0.5 ? 'white' : 'black';
            alert(firstMove.charAt(0).toUpperCase() + firstMove.slice(1) + ' moves first.');
            if (window.pieceLogic) {
                window.pieceLogic.turn = firstMove;
                window.pieceLogic.showTurn();
            }
        } else {
            for (let row = 0; row < 8; row++) {
                for (let col = 0; col < 8; col++) {
                    this.board[row][col] = null;
                    const square = document.querySelector(
                        '[data-row="' + row + '"][data-col="' + col + '"]'
                    );
                    square.innerHTML = '';
                }
            }
            
            this.points = { white: 0, black: 0 };
            this.kings = { white: 0, black: 0 };
            this.updatePointDisplays();
            this.updateGameButtonState();
        }

        const gameBtn = document.getElementById('game-button');
        gameBtn.textContent = this.isGameStarted ? 'Stop Game' : 'Start Game';
        gameBtn.className = this.isGameStarted ? 'stop' : 'start';

        document.getElementById('reset-black').disabled = this.isGameStarted;
        document.getElementById('reset-white').disabled = this.isGameStarted;

        this.saveGame();
    }

    resetSide(color) {
        const startRow = color === 'black' ? 0 : 6;
        const endRow = startRow + 1;

        for (let row = startRow; row <= endRow; row++) {
            for (let col = 0; col < 8; col++) {
                const piece = this.board[row][col];
                if (piece?.name === 'King') this.kings[color]--;
                this.board[row][col] = null;

                const square = document.querySelector(
                    '[data-row="' + row + '"][data-col="' + col + '"]'
                );
                square.innerHTML = '';
            }
        }

        this.points[color] = 0;
        this.updatePointDisplays();
        this.updateGameButtonState();
        this.saveGame();
    }

    updatePointDisplays() {
        for (const color of ['white', 'black']) {
            const used = this.points[color];
            const remaining = this.maxPoints - used;
            document.querySelector('#' + color + '-points span').textContent = used;
            document.querySelector('#' + color + '-remaining span').textContent = remaining;
        }
    }

    updateGameButtonState() {
        const startBtn = document.getElementById('game-button');
        startBtn.disabled = !(this.kings.white === 1 && this.kings.black === 1);
    }

    saveGame() {
        const gameData = {
            board: this.board,
            points: this.points,
            kings: this.kings,
            started: this.isGameStarted
        };
        localStorage.setItem('chessGame', JSON.stringify(gameData));
    }

    loadSavedGame() {
        const saved = localStorage.getItem('chessGame');
        if (!saved) return;

        const game = JSON.parse(saved);
        this.board = game.board;
        this.points = game.points;
        this.kings = game.kings;
        this.isGameStarted = game.started;

        for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
                const piece = this.board[row][col];
                if (piece) {
                    const square = document.querySelector(
                        '[data-row="' + row + '"][data-col="' + col + '"]'
                    );
                    square.innerHTML = `<div class="piece-on-board ${piece.color}"><img src="./image/${piece.color[0]}${piece.name}.png"></div>`;
                }
            }
        }

        this.updatePointDisplays();
        this.updateGameButtonState();

        if (this.isGameStarted) {
            const btn = document.getElementById('game-button');
            btn.textContent = 'Stop Game';
            btn.className = 'stop';
            document.getElementById('reset-black').disabled = true;
            document.getElementById('reset-white').disabled = true;
        }
    }
}

const game = new ChessGame();
window.game = game;