class PieceLogic {
    constructor(game) {
        this.game = game;
        this.selectedPiece = null;
        this.selectedRow = null;
        this.selectedCol = null;
        this.turn = game.savedTurn || '';

        this.elements = {
            board: document.getElementById('chessboard'),
            moveLog: document.getElementById('move-log'),
            turnIndicator: null
        };

        this.setupClickEvents();
        this.showTurn();

        if (this.game.isGameStarted && this.turn) {
            this.checkGameStatus();
        }
    }

    _getTurnIndicator() {
        if (this.elements.turnIndicator) return this.elements.turnIndicator;

        let turnDisplay = document.getElementById('turn-indicator');
        if (!turnDisplay) {
            turnDisplay = document.createElement('div');
            turnDisplay.id = 'turn-indicator';
            turnDisplay.style.textAlign = 'center';
            turnDisplay.style.fontWeight = 'bold';
            turnDisplay.style.marginTop = '10px';
            document.querySelector('.side-panel').prepend(turnDisplay);
        }
        this.elements.turnIndicator = turnDisplay;
        return turnDisplay;
    }

    isInsideBoard(row, col) {
        return row >= 0 && row < 8 && col >= 0 && col < 8;
    }

    clearHighlights() {
        document.querySelectorAll('.green-highlight, .red-highlight, .selected-piece')
            .forEach(sq => sq.classList.remove('green-highlight', 'red-highlight', 'selected-piece'));
    }

    clearSelection() {
        this.selectedPiece = null;
        this.selectedRow = null;
        this.selectedCol = null;
        this.clearHighlights();
    }

    setupClickEvents() {
        this.elements.board.addEventListener('click', (event) => {
            if (!this.game.isGameStarted) return;
            const square = event.target.closest('.square');
            if (!square) return;

            const row = Number(square.dataset.row);
            const col = Number(square.dataset.col);
            const clickedPiece = this.game.board[row][col];

            if (this.selectedPiece) {
                if (square.classList.contains('green-highlight') || square.classList.contains('red-highlight')) {
                    this.tryToMove(row, col);
                } else if (this.selectedRow === row && this.selectedCol === col) {
                    this.clearSelection();
                } else if (clickedPiece && clickedPiece.color === this.turn) {
                    this.selectPiece(row, col, clickedPiece);
                } else {
                    this.clearSelection();
                }
            } else if (clickedPiece && clickedPiece.color === this.turn) {
                this.selectPiece(row, col, clickedPiece);
            }
        });
    }

    selectPiece(row, col, piece) {
        this.clearHighlights();

        this.selectedPiece = piece;
        this.selectedRow = row;
        this.selectedCol = col;

        this.game.getSquare(row, col).classList.add('selected-piece');

        const potentialMoves = this.getPotentialMoves(row, col);

        for (const [targetRow, targetCol] of potentialMoves) {
            const targetPiece = this.game.board[targetRow][targetCol];
            this.game.board[targetRow][targetCol] = piece;
            this.game.board[row][col] = null;

            const isLegal = !this.isKingInCheck(piece.color);

            this.game.board[row][col] = piece;
            this.game.board[targetRow][targetCol] = targetPiece;

            if (isLegal) {
                const targetSquare = this.game.getSquare(targetRow, targetCol);
                targetSquare.classList.add(targetPiece ? 'red-highlight' : 'green-highlight');
            }
        }
    }

    tryToMove(row, col) {
        const fromRow = this.selectedRow;
        const fromCol = this.selectedCol;
        const piece = this.selectedPiece;

        this.game.board[fromRow][fromCol] = null;
        this.game.board[row][col] = piece;

        if (piece.name === 'Pawn' && ((piece.color === 'white' && row === 0) || (piece.color === 'black' && row === 7))) {
            piece.name = 'Queen';
        }

        this.game.drawPiece(fromRow, fromCol);
        this.game.drawPiece(row, col);

        this.logMove(piece, fromRow, fromCol, row, col);
        this.clearSelection();

        this.turn = this.turn === 'white' ? 'black' : 'white';
        this.showTurn();
        this.game.saveGame();
        this.checkGameStatus();
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
                let [targetRow, targetCol] = [row + dr, col + dc];
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

        switch (piece.name) {
            case 'Pawn':
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
                [[direction, -1], [direction, 1]].forEach(([dr, dc]) => {
                    r = row + dr;
                    c = col + dc;
                    if (this.isInsideBoard(r, c)) {
                        const targetPiece = this.game.board[r][c];
                        if (targetPiece && targetPiece.color === opponentColor) {
                            moves.push([r, c]);
                        }
                    }
                });
                break;
            case 'King':
                addSingleMoves(this.getDirections('king_queen'));
                break;
            case 'Knight':
                addSingleMoves(this.getDirections('knight'));
                break;
            case 'Rook':
                addSlidingMoves(this.getDirections('rook'));
                break;
            case 'Queen':
                addSlidingMoves(this.getDirections('king_queen'));
                break;
            case 'Bishop':
                addSlidingMoves(this.getDirections('bishop'));
                break;
        }
        return moves;
    }

    findKing(color) {
        for (let r = 0; r < 8; r++) {
            for (let c = 0; c < 8; c++) {
                const piece = this.game.board[r][c];
                if (piece?.name === 'King' && piece.color === color) {
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

                        if (isLegal) return true;
                    }
                }
            }
        }
        return false;
    }

    checkGameStatus() {
        const inCheck = this.isKingInCheck(this.turn);
        const hasMoves = this.hasLegalMoves(this.turn);

        const endGame = (message) => {
            setTimeout(() => {
                alert(message);
                this.clearMoveLog();
                this.game.toggleGame();
            }, 100);
        };

        if (inCheck && !hasMoves) {
            const winner = this.turn === 'white' ? 'Black' : 'White';
            endGame(`CHECKMATE! ${winner} wins!`);
            return;
        }

        if (!inCheck && !hasMoves) {
            endGame("STALEMATE! The game is a draw.");
            return;
        }

        if (inCheck && hasMoves) {
            const turnDisplay = this._getTurnIndicator();
            turnDisplay.textContent += ' (CHECK!)';
            turnDisplay.style.color = 'red';
        }
    }

    showTurn() {
        const turnDisplay = this._getTurnIndicator();
        turnDisplay.textContent = `Current Turn: ${this.turn.toUpperCase()}`;
        turnDisplay.style.color = '';
    }

    logMove(piece, fromRow, fromCol, toRow, toCol) {
        if (!this.elements.moveLog) return;

        const fromSquare = String.fromCharCode(97 + fromCol) + (8 - fromRow);
        const toSquare = String.fromCharCode(97 + toCol) + (8 - toRow);
        const pieceColor = piece.color.charAt(0).toUpperCase() + piece.color.slice(1);

        const moveEntry = document.createElement('div');
        moveEntry.className = 'move-entry';
        moveEntry.textContent = `${pieceColor} ${piece.name}: ${fromSquare} → ${toSquare}`;

        this.elements.moveLog.appendChild(moveEntry);
        this.elements.moveLog.scrollTop = this.elements.moveLog.scrollHeight;
    }

    clearMoveLog() {
        if (this.elements.moveLog) {
            this.elements.moveLog.innerHTML = '';
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