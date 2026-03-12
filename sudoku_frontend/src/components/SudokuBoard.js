import React, {useEffect, useMemo, useRef} from 'react';
import PropTypes from 'prop-types';

/**
 * Create a stable key for a cell.
 * @param {number} r
 * @param {number} c
 * @return {string}
 */
function keyOf(r, c) {
    return `${r}-${c}`;
}

/**
 * Convert notes map to display digits.
 * @param {{[digit: number]: boolean}} notes
 * @return {string[]}
 */
function getNoteDigits(notes) {
    const digits = [];
    for (let d = 1; d <= 9; d += 1) {
        if (notes && notes[d]) digits.push(String(d));
    }
    return digits;
}

/**
 * PUBLIC_INTERFACE
 * Sudoku grid component with keyboard navigation.
 * @param {{
 *   board: Array<Array<{value:(number|null), given:boolean, notes:Object}>>,
 *   selected: {row:number, col:number},
 *   conflicts: Object,
 *   onSelect: function(number, number): void,
 *   onInputDigit: function((number|null), {noteMode:boolean}): void,
 *   noteMode: boolean,
 * }} props
 * @return {JSX.Element}
 */
function SudokuBoard(props) {
    const {board, selected, conflicts, onSelect, onInputDigit, noteMode} = props;
    const gridRef = useRef(null);

    const selectedKey = keyOf(selected.row, selected.col);

    const ariaHelp = useMemo(() => {
        return 'Use arrow keys to move. Type 1-9 to enter a number. Backspace or Delete clears. Toggle notes mode to enter pencil marks.';
    }, []);

    useEffect(() => {
        // Keep focus on grid container for consistent keyboard control.
        if (gridRef.current && document.activeElement !== gridRef.current) {
            gridRef.current.focus();
        }
    }, [selectedKey]);

    /**
     * @param {KeyboardEvent} e
     */
    function handleKeyDown(e) {
        const {key} = e;
        if (key === 'ArrowUp' || key === 'ArrowDown' || key === 'ArrowLeft' || key === 'ArrowRight') {
            e.preventDefault();
            let nextRow = selected.row;
            let nextCol = selected.col;
            if (key === 'ArrowUp') nextRow = Math.max(0, selected.row - 1);
            if (key === 'ArrowDown') nextRow = Math.min(8, selected.row + 1);
            if (key === 'ArrowLeft') nextCol = Math.max(0, selected.col - 1);
            if (key === 'ArrowRight') nextCol = Math.min(8, selected.col + 1);
            onSelect(nextRow, nextCol);
            return;
        }

        if (/^[1-9]$/.test(key)) {
            e.preventDefault();
            onInputDigit(Number(key), {noteMode});
            return;
        }

        if (key === 'Backspace' || key === 'Delete' || key === '0') {
            e.preventDefault();
            onInputDigit(null, {noteMode: false});
        }
    }

    return (
        <div className="boardWrap">
            <div className="srOnly" id="sudokuKeyboardHelp">
                {ariaHelp}
            </div>
            <div
                className="sudokuGrid"
                role="grid"
                aria-label="Sudoku grid"
                aria-describedby="sudokuKeyboardHelp"
                tabIndex={0}
                ref={gridRef}
                onKeyDown={handleKeyDown}
            >
                {board.map((row, r) =>
                    row.map((cell, c) => {
                        const k = keyOf(r, c);
                        const isSelected = k === selectedKey;
                        const isConflict = Boolean(conflicts && conflicts[k]);
                        const isBoxBorderRight = (c + 1) % 3 === 0 && c !== 8;
                        const isBoxBorderBottom = (r + 1) % 3 === 0 && r !== 8;

                        const className = [
                            'cell',
                            cell.given ? 'cellGiven' : 'cellEditable',
                            isSelected ? 'cellSelected' : '',
                            isConflict ? 'cellConflict' : '',
                            isBoxBorderRight ? 'cellBoxRight' : '',
                            isBoxBorderBottom ? 'cellBoxBottom' : '',
                        ]
                            .filter(Boolean)
                            .join(' ');

                        const labelParts = [`Row ${r + 1}`, `Column ${c + 1}`];
                        if (cell.given) labelParts.push('given');
                        if (cell.value) labelParts.push(`value ${cell.value}`);
                        if (!cell.value) {
                            const noteDigits = getNoteDigits(cell.notes);
                            if (noteDigits.length) labelParts.push(`notes ${noteDigits.join(',')}`);
                            else labelParts.push('empty');
                        }
                        if (isConflict) labelParts.push('conflict');

                        const noteDigits = getNoteDigits(cell.notes);

                        return (
                            <button
                                key={k}
                                type="button"
                                className={className}
                                onClick={() => onSelect(r, c)}
                                role="gridcell"
                                aria-label={labelParts.join(', ')}
                                aria-selected={isSelected}
                                disabled={false}
                                data-row={r}
                                data-col={c}
                            >
                                {cell.value ? (
                                    <span className="cellValue">{cell.value}</span>
                                ) : (
                                    <span className="cellNotes" aria-hidden="true">
                                        {noteDigits.map((d) => (
                                            <span key={d} className="noteDigit">
                                                {d}
                                            </span>
                                        ))}
                                    </span>
                                )}
                            </button>
                        );
                    })
                )}
            </div>
        </div>
    );
}

SudokuBoard.propTypes = {
    board: PropTypes.arrayOf(PropTypes.array).isRequired,
    selected: PropTypes.shape({row: PropTypes.number.isRequired, col: PropTypes.number.isRequired}).isRequired,
    conflicts: PropTypes.object,
    onSelect: PropTypes.func.isRequired,
    onInputDigit: PropTypes.func.isRequired,
    noteMode: PropTypes.bool.isRequired,
};

export default SudokuBoard;
