/**
 * @fileoverview Sudoku utilities (generator/solver/validation) for frontend fallback mode.
 * Backend may provide stronger puzzle generation; these utilities keep the app functional offline.
 */

/**
 * @typedef {{
 *   value: (number|null),
 *   given: boolean,
 *   notes: {[digit: number]: boolean},
 * }} Cell
 */

/**
 * Create an empty notes object.
 * @return {{[digit: number]: boolean}}
 */
function createEmptyNotes() {
    /** @type {{[digit: number]: boolean}} */
    const notes = {};
    for (let d = 1; d <= 9; d += 1) {
        notes[d] = false;
    }
    return notes;
}

/**
 * Create an empty board.
 * @return {Cell[][]}
 */
function createEmptyBoard() {
    /** @type {Cell[][]} */
    const board = [];
    for (let r = 0; r < 9; r += 1) {
        /** @type {Cell[]} */
        const row = [];
        for (let c = 0; c < 9; c += 1) {
            row.push({value: null, given: false, notes: createEmptyNotes()});
        }
        board.push(row);
    }
    return board;
}

/**
 * Deep clone a board.
 * @param {Cell[][]} board
 * @return {Cell[][]}
 */
function cloneBoard(board) {
    return board.map((row) =>
        row.map((cell) => ({
            value: cell.value,
            given: cell.given,
            notes: {...cell.notes},
        }))
    );
}

/**
 * Convert board to 2D number grid with 0 for empty.
 * @param {Cell[][]} board
 * @return {number[][]}
 */
function toNumberGrid(board) {
    return board.map((row) => row.map((cell) => cell.value || 0));
}

/**
 * Convert number grid (0 empty) to Cell board.
 * @param {number[][]} grid
 * @return {Cell[][]}
 */
function fromNumberGrid(grid) {
    /** @type {Cell[][]} */
    const board = [];
    for (let r = 0; r < 9; r += 1) {
        /** @type {Cell[]} */
        const row = [];
        for (let c = 0; c < 9; c += 1) {
            const v = grid[r][c];
            row.push({value: v ? v : null, given: Boolean(v), notes: createEmptyNotes()});
        }
        board.push(row);
    }
    return board;
}

/**
 * Check if placing val at (row,col) violates Sudoku rules.
 * @param {number[][]} grid
 * @param {number} row
 * @param {number} col
 * @param {number} val
 * @return {boolean}
 */
function isValidPlacement(grid, row, col, val) {
    for (let c = 0; c < 9; c += 1) {
        if (c !== col && grid[row][c] === val) {
            return false;
        }
    }
    for (let r = 0; r < 9; r += 1) {
        if (r !== row && grid[r][col] === val) {
            return false;
        }
    }
    const boxR = Math.floor(row / 3) * 3;
    const boxC = Math.floor(col / 3) * 3;
    for (let r = boxR; r < boxR + 3; r += 1) {
        for (let c = boxC; c < boxC + 3; c += 1) {
            if ((r !== row || c !== col) && grid[r][c] === val) {
                return false;
            }
        }
    }
    return true;
}

/**
 * Find conflicts for the current grid.
 * @param {number[][]} grid
 * @return {{[key: string]: boolean}} map of "r-c" keys that are in conflict
 */
function findConflicts(grid) {
    /** @type {{[key: string]: boolean}} */
    const conflicts = {};

    function mark(r, c) {
        conflicts[`${r}-${c}`] = true;
    }

    for (let r = 0; r < 9; r += 1) {
        /** @type {{[v: number]: number[]}} */
        const seen = {};
        for (let c = 0; c < 9; c += 1) {
            const v = grid[r][c];
            if (!v) continue;
            if (!seen[v]) seen[v] = [];
            seen[v].push(c);
        }
        Object.keys(seen).forEach((k) => {
            const cols = seen[Number(k)];
            if (cols.length > 1) {
                cols.forEach((c) => mark(r, c));
            }
        });
    }

    for (let c = 0; c < 9; c += 1) {
        /** @type {{[v: number]: number[]}} */
        const seen = {};
        for (let r = 0; r < 9; r += 1) {
            const v = grid[r][c];
            if (!v) continue;
            if (!seen[v]) seen[v] = [];
            seen[v].push(r);
        }
        Object.keys(seen).forEach((k) => {
            const rows = seen[Number(k)];
            if (rows.length > 1) {
                rows.forEach((r) => mark(r, c));
            }
        });
    }

    for (let boxR = 0; boxR < 3; boxR += 1) {
        for (let boxC = 0; boxC < 3; boxC += 1) {
            /** @type {{[v: number]: Array<[number, number]>}} */
            const seen = {};
            for (let r = boxR * 3; r < boxR * 3 + 3; r += 1) {
                for (let c = boxC * 3; c < boxC * 3 + 3; c += 1) {
                    const v = grid[r][c];
                    if (!v) continue;
                    if (!seen[v]) seen[v] = [];
                    seen[v].push([r, c]);
                }
            }
            Object.keys(seen).forEach((k) => {
                const positions = seen[Number(k)];
                if (positions.length > 1) {
                    positions.forEach(([r, c]) => mark(r, c));
                }
            });
        }
    }

    return conflicts;
}

/**
 * Solve Sudoku using backtracking.
 * Mutates grid.
 * @param {number[][]} grid
 * @return {boolean}
 */
function solveGrid(grid) {
    for (let r = 0; r < 9; r += 1) {
        for (let c = 0; c < 9; c += 1) {
            if (grid[r][c] === 0) {
                for (let v = 1; v <= 9; v += 1) {
                    if (isValidPlacement(grid, r, c, v)) {
                        grid[r][c] = v;
                        if (solveGrid(grid)) return true;
                        grid[r][c] = 0;
                    }
                }
                return false;
            }
        }
    }
    return true;
}

/**
 * Shuffle array in-place.
 * @param {number[]} arr
 */
function shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i -= 1) {
        const j = Math.floor(Math.random() * (i + 1));
        const tmp = arr[i];
        arr[i] = arr[j];
        arr[j] = tmp;
    }
}

/**
 * Generate a fully solved grid.
 * @return {number[][]}
 */
function generateSolvedGrid() {
    /** @type {number[][]} */
    const grid = [];
    for (let r = 0; r < 9; r += 1) {
        grid.push(new Array(9).fill(0));
    }

    // Seed diagonal boxes randomly for better variety.
    for (let box = 0; box < 3; box += 1) {
        const digits = [1, 2, 3, 4, 5, 6, 7, 8, 9];
        shuffle(digits);
        let idx = 0;
        for (let r = box * 3; r < box * 3 + 3; r += 1) {
            for (let c = box * 3; c < box * 3 + 3; c += 1) {
                grid[r][c] = digits[idx];
                idx += 1;
            }
        }
    }

    solveGrid(grid);
    return grid;
}

/**
 * Remove numbers to form a puzzle.
 * Note: This does not guarantee uniqueness; it is a lightweight offline fallback.
 * @param {number[][]} solved
 * @param {string} difficulty
 * @return {number[][]}
 */
function makePuzzleFromSolution(solved, difficulty) {
    const grid = solved.map((row) => row.slice());
    let removeCount = 40;
    if (difficulty === 'easy') removeCount = 36;
    if (difficulty === 'medium') removeCount = 44;
    if (difficulty === 'hard') removeCount = 52;

    while (removeCount > 0) {
        const r = Math.floor(Math.random() * 9);
        const c = Math.floor(Math.random() * 9);
        if (grid[r][c] !== 0) {
            grid[r][c] = 0;
            removeCount -= 1;
        }
    }
    return grid;
}

/**
 * Get a hint for current grid by solving and returning one empty cell's correct value.
 * @param {number[][]} grid
 * @return {{row: number, col: number, value: number}|null}
 */
function getHintFromGrid(grid) {
    const copy = grid.map((row) => row.slice());
    const solved = solveGrid(copy);
    if (!solved) return null;

    /** @type {Array<[number, number]>} */
    const empties = [];
    for (let r = 0; r < 9; r += 1) {
        for (let c = 0; c < 9; c += 1) {
            if (grid[r][c] === 0) empties.push([r, c]);
        }
    }
    if (!empties.length) return null;
    const [row, col] = empties[Math.floor(Math.random() * empties.length)];
    return {row, col, value: copy[row][col]};
}

/**
 * Determine whether grid is complete and valid (no zeros and no conflicts).
 * @param {number[][]} grid
 * @return {boolean}
 */
function isSolved(grid) {
    for (let r = 0; r < 9; r += 1) {
        for (let c = 0; c < 9; c += 1) {
            const v = grid[r][c];
            if (!v) return false;
            if (!isValidPlacement(grid, r, c, v)) return false;
        }
    }
    return true;
}

export const Sudoku = {
    /**
     * PUBLIC_INTERFACE
     * Create a new game state board (cells with given flags and notes).
     * @param {string} difficulty
     * @return {{board: Cell[][], solution: number[][], puzzle: number[][]}}
     */
    createNewGame(difficulty) {
        const solution = generateSolvedGrid();
        const puzzle = makePuzzleFromSolution(solution, difficulty);
        return {board: fromNumberGrid(puzzle), solution, puzzle};
    },

    /**
     * PUBLIC_INTERFACE
     * Convert cell-board to number grid.
     * @param {Cell[][]} board
     * @return {number[][]}
     */
    toNumberGrid,

    /**
     * PUBLIC_INTERFACE
     * Convert number grid to cell-board with given flags.
     * @param {number[][]} grid
     * @return {Cell[][]}
     */
    fromNumberGrid,

    /**
     * PUBLIC_INTERFACE
     * Create an empty board.
     * @return {Cell[][]}
     */
    createEmptyBoard,

    /**
     * PUBLIC_INTERFACE
     * Clone a board.
     * @param {Cell[][]} board
     * @return {Cell[][]}
     */
    cloneBoard,

    /**
     * PUBLIC_INTERFACE
     * Validate a placement for local conflict detection.
     * @param {number[][]} grid
     * @param {number} row
     * @param {number} col
     * @param {number} val
     * @return {boolean}
     */
    isValidPlacement,

    /**
     * PUBLIC_INTERFACE
     * Find conflicting cells.
     * @param {number[][]} grid
     * @return {{[key: string]: boolean}}
     */
    findConflicts,

    /**
     * PUBLIC_INTERFACE
     * Local hint (offline).
     * @param {number[][]} grid
     * @return {{row: number, col: number, value: number}|null}
     */
    getHintFromGrid,

    /**
     * PUBLIC_INTERFACE
     * Check solved.
     * @param {number[][]} grid
     * @return {boolean}
     */
    isSolved,
};
