import React from 'react';
import PropTypes from 'prop-types';
import {Time} from '../utils/time';

/**
 * PUBLIC_INTERFACE
 * Control panel with game actions.
 * @param {{
 *   difficulty: string,
 *   onNewGame: function(string): void,
 *   onDaily: function(): void,
 *   backendEnabled: boolean,
 *   noteMode: boolean,
 *   onToggleNoteMode: function(): void,
 *   onInputDigit: function((number|null), {noteMode:boolean}): void,
 *   onUndo: function(): void,
 *   onRedo: function(): void,
 *   canUndo: boolean,
 *   canRedo: boolean,
 *   onHint: function(): void,
 *   onErase: function(): void,
 *   elapsedMs: number,
 *   paused: boolean,
 *   onTogglePause: function(): void,
 * }} props
 * @return {JSX.Element}
 */
function ControlPanel(props) {
    const {
        difficulty,
        onNewGame,
        onDaily,
        backendEnabled,
        noteMode,
        onToggleNoteMode,
        onInputDigit,
        onUndo,
        onRedo,
        canUndo,
        canRedo,
        onHint,
        onErase,
        elapsedMs,
        paused,
        onTogglePause,
    } = props;

    return (
        <div className="panel">
            <div className="panelTopRow">
                <div className="difficultyGroup" role="group" aria-label="Difficulty">
                    <label className="labelInline" htmlFor="difficultySelect">
                        Difficulty
                    </label>
                    <select
                        id="difficultySelect"
                        className="select"
                        value={difficulty}
                        onChange={(e) => onNewGame(e.target.value)}
                        aria-label="Select difficulty"
                    >
                        <option value="easy">Easy</option>
                        <option value="medium">Medium</option>
                        <option value="hard">Hard</option>
                    </select>
                </div>

                <div className="timerBadge" aria-label="Timer">
                    <span className="timerLabel">Time</span>
                    <span className="timerValue">{Time.formatDuration(elapsedMs)}</span>
                </div>

                <button className="btn btnSecondary" onClick={onTogglePause} aria-pressed={paused}>
                    {paused ? 'Resume' : 'Pause'}
                </button>

                <button className="btn btnGhost" onClick={onDaily} disabled={!backendEnabled} title="Daily puzzle">
                    Daily
                </button>
            </div>

            <div className="panelActions">
                <button className={`btn ${noteMode ? 'btnSuccess' : 'btnSecondary'}`} onClick={onToggleNoteMode}>
                    Notes: {noteMode ? 'On' : 'Off'}
                </button>

                <button className="btn btnSecondary" onClick={onHint}>
                    Hint
                </button>

                <button className="btn btnSecondary" onClick={onErase}>
                    Erase
                </button>

                <button className="btn btnSecondary" onClick={onUndo} disabled={!canUndo} aria-disabled={!canUndo}>
                    Undo
                </button>

                <button className="btn btnSecondary" onClick={onRedo} disabled={!canRedo} aria-disabled={!canRedo}>
                    Redo
                </button>
            </div>

            <div className="keypad" role="group" aria-label="Number keypad">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((d) => (
                    <button key={d} className="keyBtn" onClick={() => onInputDigit(d, {noteMode})}>
                        {d}
                    </button>
                ))}
                <button className="keyBtn keyBtnWide" onClick={() => onInputDigit(null, {noteMode: false})}>
                    Clear
                </button>
            </div>
        </div>
    );
}

ControlPanel.propTypes = {
    difficulty: PropTypes.string.isRequired,
    onNewGame: PropTypes.func.isRequired,
    onDaily: PropTypes.func.isRequired,
    backendEnabled: PropTypes.bool.isRequired,
    noteMode: PropTypes.bool.isRequired,
    onToggleNoteMode: PropTypes.func.isRequired,
    onInputDigit: PropTypes.func.isRequired,
    onUndo: PropTypes.func.isRequired,
    onRedo: PropTypes.func.isRequired,
    canUndo: PropTypes.bool.isRequired,
    canRedo: PropTypes.bool.isRequired,
    onHint: PropTypes.func.isRequired,
    onErase: PropTypes.func.isRequired,
    elapsedMs: PropTypes.number.isRequired,
    paused: PropTypes.bool.isRequired,
    onTogglePause: PropTypes.func.isRequired,
};

export default ControlPanel;
