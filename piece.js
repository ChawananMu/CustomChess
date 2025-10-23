class PieceLogic {
    constructor(game) {
        this.game = game;
        this.selectedPiece = null;
        this.selectedRow = null;
        this.selectedCol = null;
        this.turn = game.savedTurn || '';
        this.setupClickEvents();
        this.showTurn();
    }

    setupClickEvents() {
        const boardElement = document.getElementById('chessboard');

        boardElement.addEventListener('click', (event) => {
            // Only works when game started
            if (!this.game.isGameStarted) return;

            const square = event.target.closest('.square');
            if (!square) return;

            const row = Number(square.dataset.row);
            const col = Number(square.dataset.col);
            const clickedPiece = this.game.board[row][col];

            // --- Case 1: selecting a piece ---
            if (!this.selectedPiece) {
                if (!clickedPiece) return;

                const color = this.getPieceColor(row, col);
                if (color !== this.turn) return; // not your turn

                this.selectPiece(row, col, clickedPiece);
                return;
            }

            // --- Case 2: cancel selection (clicked same square) ---
            if (this.selectedRow === row && this.selectedCol === col) {
                this.clearSelection();
                return;
            }

            // --- Case 3: try to move ---
            this.tryToMove(row, col);
        });
    }

    selectPiece(row, col, piece) {
        this.clearHighlights();

        this.selectedPiece = piece;
        this.selectedRow = row;
        this.selectedCol = col;

        // Highlight the selected square
        this.getSquare(row, col).classList.add('selected-piece');

        // --- Pawn Logic ---
        if (piece.name === 'Pawn') {
            const color = piece.color;
            const direction = color === 'white' ? -1 : 1;
            const forwardRow = row + direction;

            // Forward move (if empty)
            if (this.isInsideBoard(forwardRow, col) && !this.game.board[forwardRow][col]) {
                this.getSquare(forwardRow, col).classList.add('green-highlight');
            }

            // Diagonal capture
            for (let offset of [-1, 1]) {
                const targetCol = col + offset;
                if (!this.isInsideBoard(forwardRow, targetCol)) continue;

                const targetPiece = this.game.board[forwardRow][targetCol];
                if (targetPiece && targetPiece.color !== color) {
                    this.getSquare(forwardRow, targetCol).classList.add('red-highlight');
                }
            }

            // --- King Logic (FIXED) ---
        } else if (piece.name === 'King') {
            const color = piece.color;

            // สร้าง Array ของทิศทางที่เป็นไปได้ (row offset, col offset)
            const moveOffsets = [
                [-1, -1], [-1, 0], [-1, 1], // บน (ซ้าย, กลาง, ขวา)
                [0, -1],           [0, 1], // กลาง (ซ้าย, ขวา)
                [1, -1], [1, 0], [1, 1] // ล่าง (ซ้าย, กลาง, ขวา)
            ];

            // วนลูปเช็คทั้ง 8 ทิศทาง
            for (const [dr, dc] of moveOffsets) {
                const targetRow = row + dr; // dr = delta row (การเปลี่ยนแปลงของแถว)
                const targetCol = col + dc; // dc = delta col (การเปลี่ยนแปลงของคอลัมน์)

                // 1. เช็คว่าอยู่ในกระดานหรือไม่
                if (!this.isInsideBoard(targetRow, targetCol)) {
                    continue; // ข้ามไปเช็คช่องถัดไป
                }

                const targetPiece = this.game.board[targetRow][targetCol];
                const targetSquare = this.getSquare(targetRow, targetCol);

                // 2. เช็คว่าเป็นช่องว่างหรือไม่
                if (!targetPiece) {
                    targetSquare.classList.add('green-highlight');
                }
                // 3. เช็คว่าเป็นหมากของศัตรูหรือไม่
                else if (targetPiece.color !== color) {
                    targetSquare.classList.add('red-highlight');
                }
            }
        }
    }

    tryToMove(row, col) {
        const clickedSquare = this.getSquare(row, col);
        const isMove = clickedSquare.classList.contains('green-highlight');
        const isCapture = clickedSquare.classList.contains('red-highlight');

        // If clicked an invalid tile
        if (!isMove && !isCapture) {
            this.clearSelection();
            return;
        }

        // Move the piece
        const fromRow = this.selectedRow;
        const fromCol = this.selectedCol;
        const piece = this.selectedPiece;
        const color = piece.color;

        // Update logical board
        this.game.board[row][col] = piece;
        this.game.board[fromRow][fromCol] = null;

        // Update visuals
        this.getSquare(row, col).innerHTML =
            `<div class="piece-on-board ${color}"><img src="./image/${color[0]}${piece.name}.png"></div>`;
        this.getSquare(fromRow, fromCol).innerHTML = '';

        // End turn
        this.clearSelection();
        this.turn = this.turn === 'white' ? 'black' : 'white';
        if (this.game.kings[this.turn] === 0) {
            alert(this.turn + ' have lost the game!');
            this.game.toggleGame();
            return;
        }
        this.showTurn();

        // Save game state after move
        this.game.saveGame();
    }

    clearSelection() {
        this.selectedPiece = null;
        this.selectedRow = null;
        this.selectedCol = null;
        this.clearHighlights();
    }

    // --- Utility functions ---
    getPieceColor(row, col) {
        const piece = this.game.board[row][col];
        return piece ? piece.color : null;
    }

    isInsideBoard(row, col) {
        return row >= 0 && row < 8 && col >= 0 && col < 8;
    }

    getSquare(row, col) {
        return document.querySelector(`[data-row="${row}"][data-col="${col}"]`);
    }

    clearHighlights() {
        document.querySelectorAll('.green-highlight, .red-highlight, .selected-piece')
            .forEach(sq => sq.classList.remove('green-highlight', 'red-highlight', 'selected-piece'));
    }

    showTurn() {
        let turnDisplay = document.getElementById('turn-indicator');
        if (!turnDisplay) {
            turnDisplay = document.createElement('div');
            turnDisplay.id = 'turn-indicator';
            turnDisplay.style.textAlign = 'center';
            turnDisplay.style.marginTop = '10px';
            document.querySelector('.button-container').appendChild(turnDisplay);
        }
        turnDisplay.textContent = `Current Turn: ${this.turn.toUpperCase()}`;
    }
}

// Wait until the board game is ready
if (window.game) {
    window.pieceLogic = new PieceLogic(window.game);
} else {
    window.addEventListener('DOMContentLoaded', () => {
        if (window.game) window.pieceLogic = new PieceLogic(window.game);
    });
}
