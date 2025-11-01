class ChessGame {
    constructor() {
        this.board = Array(8).fill().map(() => Array(8).fill(null));
        this.points = { white: 0, black: 0 };
        this.kings = { white: 0, black: 0 };
        this.maxPoints = 64;
        this.isGameStarted = false;

        this.elements = {
            board: document.getElementById('chessboard'),
            gameButton: document.getElementById('game-button'),
            resetBlack: document.getElementById('reset-black'),
            resetWhite: document.getElementById('reset-white'),
            whitePoints: document.querySelector('#white-points span'),
            whiteRemaining: document.querySelector('#white-remaining span'),
            blackPoints: document.querySelector('#black-points span'),
            blackRemaining: document.querySelector('#black-remaining span')
        };

        this.initialize();
    }

    initialize() {
        this.createBoardSquares();
        this.enableDragAndDrop();
        this.connectButtons();
        this.loadSavedGame();
    }

    getSquare(row, col) {
        return this.elements.board.querySelector(`[data-row="${row}"][data-col="${col}"]`);
    }

    drawPiece(row, col) {
        const piece = this.board[row][col];
        const square = this.getSquare(row, col);
        if (!square) return;

        if (piece) {
            square.innerHTML = `<div class="piece-on-board ${piece.color}"><img src="./image/${piece.color[0]}${piece.name}.png" draggable="false"></div>`;
        } else {
            square.innerHTML = '';
        }
    }

    updateUI(shouldSave = true) {
        for (const color of ['white', 'black']) {
            const used = this.points[color];
            const remaining = this.maxPoints - used;
            const keyPrefix = color === 'white' ? 'white' : 'black';
            this.elements[`${keyPrefix}Points`].textContent = used;
            this.elements[`${keyPrefix}Remaining`].textContent = remaining;
        }

        this.elements.gameButton.disabled = !(this.kings.white === 1 && this.kings.black === 1);

        const isSetupPhase = !this.isGameStarted;
        this.elements.gameButton.textContent = this.isGameStarted ? 'Stop Game' : 'Start Game';
        this.elements.gameButton.className = this.isGameStarted ? 'stop' : 'start';
        this.elements.resetBlack.disabled = !isSetupPhase;
        this.elements.resetWhite.disabled = !isSetupPhase;

        if (shouldSave) {
            this.saveGame();
        }
    }

    createBoardSquares() {
        this.elements.board.innerHTML = '';
        for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
                const squareColor = (row + col) % 2 === 0 ? 'white' : 'black';
                const square = document.createElement('div');
                square.className = 'square ' + squareColor;
                square.dataset.row = row;
                square.dataset.col = col;
                this.elements.board.appendChild(square);
            }
        }
    }

    enableDragAndDrop() {
        const pieces = document.querySelectorAll('.piece');
        const squares = this.elements.board.querySelectorAll('.square');

        pieces.forEach(piece => {
            piece.addEventListener('dragstart', e => {
                if (this.isGameStarted) return;
                const pieceElement = e.target.closest('.piece') || e.target;
                const data = {
                    name: pieceElement.dataset.piece,
                    cost: Number(pieceElement.dataset.cost)
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
        this.elements.gameButton.addEventListener('click', () => this.toggleGame());
        this.elements.resetBlack.addEventListener('click', () => this.resetSide('black'));
        this.elements.resetWhite.addEventListener('click', () => this.resetSide('white'));
    }

    handlePieceDrop(event) {
        event.preventDefault();
        if (this.isGameStarted) return;

        const square = event.target;
        const row = Number(square.dataset.row);
        const col = Number(square.dataset.col);

        square.classList.remove('valid-drop', 'invalid-drop');

        const color = row <= 1 ? 'black' : (row >= 6 ? 'white' : null);
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

        this.drawPiece(row, col);
        this.updateUI();
    }

    resetSide(color) {
        const startRow = color === 'black' ? 0 : 6;
        const endRow = startRow + 1;

        for (let row = startRow; row <= endRow; row++) {
            for (let col = 0; col < 8; col++) {
                const piece = this.board[row][col];
                if (piece?.name === 'King') this.kings[color]--;
                this.board[row][col] = null;
                this.drawPiece(row, col);
            }
        }

        this.points[color] = 0;
        this.updateUI();
    }
    
    resetBoard() {
        this.isGameStarted = false;
        this.points = { white: 0, black: 0 };
        this.kings = { white: 0, black: 0 };

        for (let r = 0; r < 8; r++) {
            for (let c = 0; c < 8; c++) {
                this.board[r][c] = null;
                this.drawPiece(r, c); 
            }
        }

        if (window.pieceLogic) {
            window.pieceLogic.clearMoveLog();
            window.pieceLogic.turn = ''; 
            window.pieceLogic.showTurn();
            window.pieceLogic.clearSelection();
        }
        
        this.updateUI(); 
    }

    toggleGame() {
        if (!this.isGameStarted) {
            if (this.kings.white !== 1 || this.kings.black !== 1) {
                alert('Each side must have one King before starting.');
                return;
            }

            const pl = window.pieceLogic;
            if (!pl) {
                alert("Error: Piece logic not found.");
                return;
            }

            let firstMove = pl.turn || (Math.random() < 0.5 ? 'white' : 'black');
            const originalTurn = pl.turn;
            pl.turn = firstMove;

            const inCheck = pl.isKingInCheck(firstMove);
            const hasMoves = pl.hasLegalMoves(firstMove);

            pl.turn = originalTurn;

            if (inCheck && !hasMoves) {
                alert(`Invalid setup: ${firstMove.toUpperCase()} starts in CHECKMATE. Please change the board.`);
                return; 
            }
            if (!inCheck && !hasMoves) {
                alert(`Invalid setup: ${firstMove.toUpperCase()} starts in STALEMATE. Please change the board.`);
                return; 
            }

            this.isGameStarted = true;
            pl.turn = firstMove; 
            alert(firstMove.charAt(0).toUpperCase() + firstMove.slice(1) + ' moves first.');
            pl.showTurn();

        } else {
            this.resetBoard();
        }

        this.updateUI(); 
    }

    saveGame() {
        const gameData = {
            board: this.board,
            points: this.points,
            kings: this.kings,
            started: this.isGameStarted,
            turn: window.pieceLogic ? window.pieceLogic.turn : ''
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

        if (this.isGameStarted && game.turn) {
            if (window.pieceLogic) {
                window.pieceLogic.turn = game.turn;
                window.pieceLogic.showTurn();
            } else {
                this.savedTurn = game.turn;
            }
        }

        for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
                this.drawPiece(row, col);
            }
        }

        this.updateUI(false);
    }
}

const game = new ChessGame();
window.game = game;