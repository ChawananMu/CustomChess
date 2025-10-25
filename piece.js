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
        const color = piece.color; // ดึงสีมาใช้ร่วมกัน

        // --- Pawn Logic ---
        if (piece.name === 'Pawn') {
            const direction = color === 'white' ? -1 : 1; // white เดินขึ้น (-1), black เดินลง (1)
            const startRow = color === 'white' ? [6,7] : [0,1]; // แถวเริ่มต้นของแต่ละสี

            // --- 1. Array สำหรับการเดิน (สีเขียว) ---
            // (เช็คเฉพาะช่องว่างด้านหน้า)
            const moveOffsets = [
                [direction, 0] // 1 ช่องด้านหน้า
            ];

            for (const [dr, dc] of moveOffsets) {
                const targetRow = row + dr;
                const targetCol = col + dc;

                if (!this.isInsideBoard(targetRow, targetCol)) continue;

                // Pawn เดินได้เฉพาะเมื่อช่อง "ว่าง" เทเท่านั้น
                if (!this.game.board[targetRow][targetCol]) {
                    this.getSquare(targetRow, targetCol).classList.add('green-highlight');

                    // (เพิ่ม) เช็คการเดิน 2 ช่อง: ถ้าอยู่แถวเริ่มต้น และ 1 ช่องหน้าว่าง
                    if (startRow.includes(row)) {
                        const twoSquareRow = row + (direction * 2);
                        // ถ้าช่องที่ 2 ก็ว่างด้วย
                        if (this.isInsideBoard(twoSquareRow, col) && !this.game.board[twoSquareRow][col]) {
                            this.getSquare(twoSquareRow, col).classList.add('green-highlight');
                        }
                    }
                }
            }

            // --- 2. Array สำหรับการกิน (สีแดง) ---
            // (เช็คเฉพาะช่องทแยงที่มีศัตรู)
            const captureOffsets = [
                [direction, -1], // ทแยงซ้าย
                [direction, 1] // ทแยงขวา
            ];

            for (const [dr, dc] of captureOffsets) {
                const targetRow = row + dr;
                const targetCol = col + dc;

                if (!this.isInsideBoard(targetRow, targetCol)) continue;

                const targetPiece = this.game.board[targetRow][targetCol];

                // Pawn กินได้เฉพาะเมื่อช่อง "มีศัตรู" เท่านั้น
                if (targetPiece && targetPiece.color !== color) {
                    this.getSquare(targetRow, targetCol).classList.add('red-highlight');
                }
            }

            // --- King Logic (FIXED) ---
        } else if (piece.name === 'King') {
            // สร้าง Array ของทิศทางที่เป็นไปได้ (row offset, col offset)
            const moveOffsets = [
                [-1, -1], [-1, 0], [-1, 1], // บน (ซ้าย, กลาง, ขวา)
                [0, -1], [0, 0], [0, 1], // กลาง (ซ้าย, ขวา)
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

        } else if (piece.name === 'Knight') {
            // สร้าง Array ของทิศทางที่เป็นไปได้ (row offset, col offset)
            const moveOffsets = [
                [0, 0], [-2, -1], [0, 0], [-2, 1], [0, 0],
                [-1, -2], [0, 0], [0, 0], [0, 0], [-1, 2],
                [0, 0], [0, 0], [0, 0], [0, 0], [0, 0],
                [1, -2], [0, 0], [0, 0], [0, 0], [1, 2],
                [0, 0], [2, -1], [0, 0], [2, 1], [0, 0],
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

        } else if (piece.name === 'Rook') {
            // สร้าง Array ของ "ทิศทาง" ที่ Rook เดินได้ (Delta Row, Delta Col)
            const directions = [
                [-1, 0], // ขึ้น (Up)
                [1, 0],  // ลง (Down)
                [0, -1], // ซ้าย (Left)
                [0, 1]   // ขวา (Right)
            ];

            // วนลูปเช็คทั้ง 4 ทิศทาง
            for (const [dr, dc] of directions) {

                // เริ่มต้นที่ช่องถัดไปจากตัว Rook
                let targetRow = row + dr;
                let targetCol = col + dc;

                // "สไลด์" ไปเรื่อยๆ ตราบใดที่ยังอยู่ในกระดาน
                while (this.isInsideBoard(targetRow, targetCol)) {

                    const targetPiece = this.game.board[targetRow][targetCol];
                    const targetSquare = this.getSquare(targetRow, targetCol);

                    // 1. ถ้าช่องนั้น "ว่าง"
                    if (!targetPiece) {
                        targetSquare.classList.add('green-highlight');

                        // เมื่อช่องว่าง ก็ให้สไลด์ต่อไปในทิศทางเดิม
                        targetRow += dr;
                        targetCol += dc;
                    }
                    // 2. ถ้าช่องนั้นมี "ศัตรู"
                    else if (targetPiece.color !== color) {
                        targetSquare.classList.add('red-highlight');

                        // กินได้ แต่ไปต่อไม่ได้แล้ว ให้หยุด loop ในทิศทางนี้
                        break;
                    }
                    // 3. ถ้าช่องนั้นมี "พวกเดียวกัน"
                    else {
                        // เดินทับไม่ได้ และไปต่อก็ไม่ได้ ให้หยุด loop ในทิศทางนี้
                        break;
                    }
                }
            }
        } else if (piece.name === 'Queen') {
            // สร้าง Array ของ "ทิศทาง" ที่ Rook เดินได้ (Delta Row, Delta Col)
            const directions = [
                [-1, -1], [-1, 0], [-1, 1], // บน (ซ้าย, กลาง, ขวา)
                [0, -1], [0, 0], [0, 1], // กลาง (ซ้าย, ขวา)
                [1, -1], [1, 0], [1, 1]   // ขวา (Right)
            ];

            // วนลูปเช็คทั้ง 4 ทิศทาง
            for (const [dr, dc] of directions) {

                // เริ่มต้นที่ช่องถัดไปจากตัว Rook
                let targetRow = row + dr;
                let targetCol = col + dc;

                // "สไลด์" ไปเรื่อยๆ ตราบใดที่ยังอยู่ในกระดาน
                while (this.isInsideBoard(targetRow, targetCol)) {

                    const targetPiece = this.game.board[targetRow][targetCol];
                    const targetSquare = this.getSquare(targetRow, targetCol);

                    // 1. ถ้าช่องนั้น "ว่าง"
                    if (!targetPiece) {
                        targetSquare.classList.add('green-highlight');

                        // เมื่อช่องว่าง ก็ให้สไลด์ต่อไปในทิศทางเดิม
                        targetRow += dr;
                        targetCol += dc;
                    }
                    // 2. ถ้าช่องนั้นมี "ศัตรู"
                    else if (targetPiece.color !== color) {
                        targetSquare.classList.add('red-highlight');

                        // กินได้ แต่ไปต่อไม่ได้แล้ว ให้หยุด loop ในทิศทางนี้
                        break;
                    }
                    // 3. ถ้าช่องนั้นมี "พวกเดียวกัน"
                    else {
                        // เดินทับไม่ได้ และไปต่อก็ไม่ได้ ให้หยุด loop ในทิศทางนี้
                        break;
                    }
                }
            }
        } else if (piece.name === 'Bishop') {
            // สร้าง Array ของ "ทิศทาง" ที่ Rook เดินได้ (Delta Row, Delta Col)
            const directions = [
                [-1, -1], [0, 0], [-1, 1], // บน (ซ้าย, กลาง, ขวา)
                [0, 0], [0, 0], [0, 0], // กลาง (ซ้าย, ขวา)
                [1, -1], [0, 0], [1, 1]   // ขวา (Right)
            ];

            // วนลูปเช็คทั้ง 4 ทิศทาง
            for (const [dr, dc] of directions) {

                // เริ่มต้นที่ช่องถัดไปจากตัว Rook
                let targetRow = row + dr;
                let targetCol = col + dc;

                // "สไลด์" ไปเรื่อยๆ ตราบใดที่ยังอยู่ในกระดาน
                while (this.isInsideBoard(targetRow, targetCol)) {

                    const targetPiece = this.game.board[targetRow][targetCol];
                    const targetSquare = this.getSquare(targetRow, targetCol);

                    // 1. ถ้าช่องนั้น "ว่าง"
                    if (!targetPiece) {
                        targetSquare.classList.add('green-highlight');

                        // เมื่อช่องว่าง ก็ให้สไลด์ต่อไปในทิศทางเดิม
                        targetRow += dr;
                        targetCol += dc;
                    }
                    // 2. ถ้าช่องนั้นมี "ศัตรู"
                    else if (targetPiece.color !== color) {
                        targetSquare.classList.add('red-highlight');

                        // กินได้ แต่ไปต่อไม่ได้แล้ว ให้หยุด loop ในทิศทางนี้
                        break;
                    }
                    // 3. ถ้าช่องนั้นมี "พวกเดียวกัน"
                    else {
                        // เดินทับไม่ได้ และไปต่อก็ไม่ได้ ให้หยุด loop ในทิศทางนี้
                        break;
                    }
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

        // --- 🟢 START: ADDED WIN CONDITION LOGIC ---
        // ตรวจสอบว่ามีหมากในช่องเป้าหมายหรือไม่ (กำลังจะกิน)
        const capturedPiece = this.game.board[row][col];
        if (capturedPiece) {
            // ถ้าหมากที่ถูกกินคือ King
            if (capturedPiece.name === 'King') {
                // อัปเดตจำนวน King ของสีนั้นๆ
                this.game.kings[capturedPiece.color]--;
            }
        }
        // --- 🟢 END: ADDED WIN CONDITION LOGIC ---


        // Update logical board
        this.game.board[fromRow][fromCol] = null;

        // Create a new piece object to avoid reference issues
        let newPiece = {
            name: piece.name,
            color: piece.color
        };

        // Check for pawn promotion
        if (newPiece.name === 'Pawn' && ((newPiece.color === 'white' && row === 0) || (newPiece.color === 'black' && row === 7))) {
            // Promote to Queen
            newPiece.name = 'Queen';
            // Save game immediately after promotion to ensure state is updated
            setTimeout(() => {
                this.game.saveGame();
            }, 0);
        }
        
        this.game.board[row][col] = newPiece;

        // Update visuals
        this.getSquare(row, col).innerHTML =
            `<div class="piece-on-board ${newPiece.color}"><img src="./image/${newPiece.color[0]}${newPiece.name}.png"></div>`;
        this.getSquare(fromRow, fromCol).innerHTML = '';

        // End turn
        this.clearSelection();
        this.turn = this.turn === 'white' ? 'black' : 'white';
        
        // --- 🟢 REVISED: WIN CONDITION CHECK ---
        // (โค้ดเดิม) ตรวจสอบว่าผู้เล่นใน "ตาถัดไป" มี King เหลือหรือไม่
        if (this.game.kings[this.turn] === 0) {
            // ถ้า 'white' (ตาของสีขาว) ไม่มี King แสดงว่า 'Black' (สีดำ) ชนะ
            const winner = this.turn === 'white' ? 'Black' : 'White';
            alert(`The ${this.turn} King has been captured! ${winner} wins!`);
            
            // หยุดเกมและรีเซ็ต
            this.game.toggleGame(); 
            return;
        }
        // --- 🟢 END: REVISED WIN CONDITION CHECK ---

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
            document.querySelector('.side-panel').prepend(turnDisplay);
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