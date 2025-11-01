class PieceLogic {
    constructor(game) {
        this.game = game;
        this.selectedPiece = null;
        this.selectedRow = null;
        this.selectedCol = null;
        this.turn = game.savedTurn || '';
        this.setupClickEvents();
        this.showTurn();

        if (this.game.isGameStarted && this.turn) {
            this.checkGameStatus();
        }
    }

    setupClickEvents() {
        const boardElement = document.getElementById('chessboard');

        boardElement.addEventListener('click', (event) => {
            if (!this.game.isGameStarted) return;

            const square = event.target.closest('.square');
            if (!square) return;

            const row = Number(square.dataset.row);
            const col = Number(square.dataset.col);
            const clickedPiece = this.game.board[row][col];

            if (!this.selectedPiece) {
                if (!clickedPiece || clickedPiece.color !== this.turn) return;
                this.selectPiece(row, col, clickedPiece);
                return;
            }

            if (this.selectedRow === row && this.selectedCol === col) {
                this.clearSelection();
                return;
            }

            if (square.classList.contains('green-highlight') || square.classList.contains('red-highlight')) {
                this.tryToMove(row, col);
            } else {
                this.clearSelection();
                if (clickedPiece && clickedPiece.color === this.turn) {
                    this.selectPiece(row, col, clickedPiece);
                }
            }
        });
    }

    getDirections(pieceType) {
        const directions = {
            'king_queen': [[-1, -1], [-1, 0], [-1, 1], [0, -1], [0, 1], [1, -1], [1, 0], [1, 1]],
            'rook': [[-1, 0], [1, 0], [0, -1], [0, 1]],
            'bishop': [[-1, -1], [-1, 1], [1, -1], [1, 1]],
            'knight': [[-2, -1], [-2, 1], [-1, -2], [-1, 2], [1, -2], [1, 2], [2, -1], [2, 1]]
        };
        return directions[pieceType] || [];
    }

    getPotentialMoves(row, col) {
        const piece = this.game.board[row][col];
        if (!piece) return [];

        const moves = [];
        const color = piece.color;
        const opponentColor = color === 'white' ? 'black' : 'white';

        const addSingleMoves = (directions) => {
            for (const [dr, dc] of directions) {
                const targetRow = row + dr;
                const targetCol = col + dc;
                if (this.isInsideBoard(targetRow, targetCol)) {
                    const targetPiece = this.game.board[targetRow][targetCol];
                    if (!targetPiece || targetPiece.color === opponentColor) {
                        moves.push([targetRow, targetCol]);
                    }
                }
            }
        };

        const addSlidingMoves = (directions) => {
            for (const [dr, dc] of directions) {
                let targetRow = row + dr;
                let targetCol = col + dc;
                while (this.isInsideBoard(targetRow, targetCol)) {
                    const targetPiece = this.game.board[targetRow][targetCol];
                    if (!targetPiece) {
                        moves.push([targetRow, targetCol]); 
                        targetRow += dr;
                        targetCol += dc;
                    } else if (targetPiece.color === opponentColor) {
                        moves.push([targetRow, targetCol]); 
                        break;
                    } else {
                        break;
                    }
                }
            }
        };

        if (piece.name === 'Pawn') {
            const direction = color === 'white' ? -1 : 1;
            const startRow = (color === 'white') ? [6, 7] : [0, 1];

            let r = row + direction;
            let c = col;
            if (this.isInsideBoard(r, c) && !this.game.board[r][c]) {
                moves.push([r, c]);
                if (startRow.includes(row)) {
                    r = row + (direction * 2);
                    if (this.isInsideBoard(r, c) && !this.game.board[r][c]) {
                        moves.push([r, c]);
                    }
                }
            }

            const captureOffsets = [[direction, -1], [direction, 1]];
            for (const [dr, dc] of captureOffsets) {
                r = row + dr;
                c = col + dc;
                if (this.isInsideBoard(r, c)) {
                    const targetPiece = this.game.board[r][c];
                    if (targetPiece && targetPiece.color === opponentColor) {
                        moves.push([r, c]);
                    }
                }
            }
        } else if (piece.name === 'King') {
            addSingleMoves(this.getDirections('king_queen'));
        } else if (piece.name === 'Knight') {
            addSingleMoves(this.getDirections('knight'));
        } else if (piece.name === 'Rook') {
            addSlidingMoves(this.getDirections('rook'));
        } else if (piece.name === 'Queen') {
            addSlidingMoves(this.getDirections('king_queen'));
        } else if (piece.name === 'Bishop') {
            addSlidingMoves(this.getDirections('bishop'));
        }

        return moves;
    }

    findKing(color) {
        for (let r = 0; r < 8; r++) {
            for (let c = 0; c < 8; c++) {
                const piece = this.game.board[r][c];
                if (piece && piece.name === 'King' && piece.color === color) {
                    return { row: r, col: c };
                }
            }
        }
        return null; 
    }

    isKingInCheck(color) {
        const kingPos = this.findKing(color);
        if (!kingPos) return false; 
        const opponentColor = color === 'white' ? 'black' : 'white';

        for (let r = 0; r < 8; r++) {
            for (let c = 0; c < 8; c++) {
                const piece = this.game.board[r][c];
                if (piece && piece.color === opponentColor) {
                    const moves = this.getPotentialMoves(r, c);
                    for (const [moveR, moveC] of moves) {
                        if (moveR === kingPos.row && moveC === kingPos.col) {
                            return true;
                        }
                    }
                }
            }
        }
        return false;
    }

    hasLegalMoves(color) {
        for (let fromR = 0; fromR < 8; fromR++) {
            for (let fromC = 0; fromC < 8; fromC++) {
                const piece = this.game.board[fromR][fromC];
                if (piece && piece.color === color) {

                    const potentialMoves = this.getPotentialMoves(fromR, fromC);

                    for (const [toR, toC] of potentialMoves) {

                        const targetPiece = this.game.board[toR][toC];
                        this.game.board[toR][toC] = piece;
                        this.game.board[fromR][fromC] = null;

                        const isLegal = !this.isKingInCheck(color);

                        this.game.board[fromR][fromC] = piece;
                        this.game.board[toR][toC] = targetPiece;

                        if (isLegal) {
                            return true;
                        }
                    }
                }
            }
        }

        return false;
    }

    selectPiece(row, col, piece) {
        this.clearHighlights();

        this.selectedPiece = piece;
        this.selectedRow = row;
        this.selectedCol = col;

        this.getSquare(row, col).classList.add('selected-piece');

        const potentialMoves = this.getPotentialMoves(row, col);

        for (const [targetRow, targetCol] of potentialMoves) {

            const targetPiece = this.game.board[targetRow][targetCol];
            this.game.board[targetRow][targetCol] = piece;
            this.game.board[row][col] = null;

            const isLegal = !this.isKingInCheck(piece.color);

            this.game.board[row][col] = piece;
            this.game.board[targetRow][targetCol] = targetPiece;

            if (isLegal) {
                const targetSquare = this.getSquare(targetRow, targetCol);
                if (targetPiece) {
                    targetSquare.classList.add('red-highlight');
                } else {
                    targetSquare.classList.add('green-highlight');
                }
            }
        }
    }


    tryToMove(row, col) {

        const fromRow = this.selectedRow;
        const fromCol = this.selectedCol;
        const piece = this.selectedPiece;

        this.game.board[fromRow][fromCol] = null;

        let newPiece = {
            name: piece.name,
            color: piece.color,
            cost: piece.cost
        };

        if (newPiece.name === 'Pawn' && ((newPiece.color === 'white' && row === 0) || (newPiece.color === 'black' && row === 7))) {
            newPiece.name = 'Queen';
        }

        this.game.board[row][col] = newPiece;

        this.getSquare(row, col).innerHTML =
            `<div class="piece-on-board ${newPiece.color}"><img src="./image/${newPiece.color[0]}${newPiece.name}.png"></div>`;
        this.getSquare(fromRow, fromCol).innerHTML = '';

        this.logMove(newPiece, fromRow, fromCol, row, col);

        this.clearSelection();
        this.turn = this.turn === 'white' ? 'black' : 'white';
        this.showTurn();

        this.game.saveGame();

        this.checkGameStatus();
    }

    checkGameStatus() {
        const inCheck = this.isKingInCheck(this.turn);
        const hasMoves = this.hasLegalMoves(this.turn);

        if (inCheck && !hasMoves) {
            const winner = this.turn === 'white' ? 'Black' : 'White';
            setTimeout(() => {
                alert(`CHECKMATE! ${winner} wins!`);
                this.clearMoveLog();
                this.game.toggleGame();
            }, 100);
            return;
        }

        if (!inCheck && !hasMoves) {
            setTimeout(() => {
                alert("STALEMATE! The game is a draw.");
                this.clearMoveLog();
                this.game.toggleGame();
            }, 100);
            return;
        }

        if (inCheck && hasMoves) {
            const turnDisplay = document.getElementById('turn-indicator');
            if (turnDisplay) {
                turnDisplay.textContent += ' (CHECK!)';
                turnDisplay.style.color = 'red';
            }
        }
    }


    clearSelection() {
        this.selectedPiece = null;
        this.selectedRow = null;
        this.selectedCol = null;
        this.clearHighlights();
    }

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
            turnDisplay.style.fontWeight = 'bold';
            turnDisplay.style.marginTop = '10px';
            document.querySelector('.side-panel').prepend(turnDisplay);
        }
        turnDisplay.textContent = `Current Turn: ${this.turn.toUpperCase()}`;
        turnDisplay.style.color = '';
    }

    logMove(piece, fromRow, fromCol, toRow, toCol) {
        const moveLog = document.getElementById('move-log');
        if (!moveLog) return;

        const fromSquare = String.fromCharCode(97 + fromCol) + (8 - fromRow);
        const toSquare = String.fromCharCode(97 + toCol) + (8 - toRow);

        const moveEntry = document.createElement('div');
        moveEntry.className = 'move-entry';
        let pieceColor = piece.color.charAt(0).toUpperCase() + piece.color.slice(1);
        moveEntry.textContent = `${pieceColor} ${piece.name}: ${fromSquare} → ${toSquare}`;

        moveLog.appendChild(moveEntry);
        moveLog.scrollTop = moveLog.scrollHeight;
    }

    clearMoveLog() {
        const moveLog = document.getElementById('move-log');
        if (moveLog) {
            moveLog.innerHTML = '';
        }
    }
}

if (window.game) {
    window.pieceLogic = new PieceLogic(window.game);
} else {
    window.addEventListener('DOMContentLoaded', () => {
        if (window.game) window.pieceLogic = new PieceLogic(window.game);
    });
}