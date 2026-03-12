import React, {useEffect, useMemo, useRef, useState} from 'react';
import './App.css';
import ControlPanel from './components/ControlPanel';
import SudokuBoard from './components/SudokuBoard';
import Modal from './components/Modal';
import {ApiClient} from './services/apiClient';
import {Sudoku} from './utils/sudoku';
import {Storage} from './utils/storage';
import {Time} from './utils/time';

/**
 * @typedef {{
 *   row: number,
 *   col: number,
 * }} Pos
 */

/**
 * @typedef {{
 *   type: 'setValue'|'toggleNote',
 *   pos: Pos,
 *   prevValue: (number|null),
 *   nextValue: (number|null),
 *   noteDigit: (number|null),
 * }} HistoryEntry
 */

/**
 * PUBLIC_INTERFACE
 * Main application component for Smart Sudoku Companion.
 * @return {JSX.Element}
 */
function App() {
    const initialSettings = useMemo(() => Storage.loadSettings(), []);
    const [theme, setTheme] = useState(initialSettings.theme); // 'retro' | 'dark' | 'light'
    const [accent, setAccent] = useState(initialSettings.accent); // 'softgray' | 'retro'
    const [noteMode, setNoteMode] = useState(initialSettings.noteMode);

    const [difficulty, setDifficulty] = useState('easy');
    const [backendEnabled] = useState(ApiClient.isBackendEnabled());

    const [board, setBoard] = useState(() => Sudoku.createEmptyBoard());
    const [selected, setSelected] = useState({row: 0, col: 0});
    const [conflicts, setConflicts] = useState({});
    const [statusMsg, setStatusMsg] = useState('Welcome. Start a new game to begin.');
    const [errorMsg, setErrorMsg] = useState('');

    const [elapsedMs, setElapsedMs] = useState(0);
    const [paused, setPaused] = useState(false);

    const [history, setHistory] = useState(/** @type {HistoryEntry[]} */ ([]));
    const [redoStack, setRedoStack] = useState(/** @type {HistoryEntry[]} */ ([]));

    const [stats, setStats] = useState(() => Storage.loadStats());
    const [statsOpen, setStatsOpen] = useState(false);
    const [settingsOpen, setSettingsOpen] = useState(false);

    const timerRef = useRef(/** @type {?number} */ (null));
    const lastTickRef = useRef(Date.now());

    useEffect(() => {
        document.documentElement.setAttribute('data-theme', theme);
        document.documentElement.setAttribute('data-accent', accent);
        Storage.saveSettings({theme, accent, noteMode});
    }, [theme, accent, noteMode]);

    useEffect(() => {
        // Timer loop
        if (paused) {
            if (timerRef.current) {
                window.clearInterval(timerRef.current);
                timerRef.current = null;
            }
            return;
        }

        lastTickRef.current = Date.now();
        timerRef.current = window.setInterval(() => {
            const now = Date.now();
            const delta = now - lastTickRef.current;
            lastTickRef.current = now;
            setElapsedMs((prev) => prev + delta);
        }, Time.prefersReducedMotion() ? 1000 : 250);

        return () => {
            if (timerRef.current) {
                window.clearInterval(timerRef.current);
                timerRef.current = null;
            }
        };
    }, [paused]);

    useEffect(() => {
        const grid = Sudoku.toNumberGrid(board);
        setConflicts(Sudoku.findConflicts(grid));
    }, [board]);

    useEffect(() => {
        // Attempt to load saved game on mount.
        const save = Storage.loadGame();
        if (!save) return;

        try {
            if (save && save.version === 1 && save.board) {
                setBoard(save.board);
                setDifficulty(save.difficulty || 'easy');
                setSelected(save.selected || {row: 0, col: 0});
                setElapsedMs(save.elapsedMs || 0);
                setPaused(Boolean(save.paused));
                setHistory(save.history || []);
                setRedoStack(save.redoStack || []);
                setStatusMsg('Loaded saved game.');
            }
        } catch (e) {
            // Ignore corrupted saves.
        }
    }, []);

    /**
     * Persist current game.
     */
    function persistGame() {
        Storage.saveGame({
            version: 1,
            difficulty,
            board,
            selected,
            elapsedMs,
            paused,
            history,
            redoStack,
            savedAt: new Date().toISOString(),
        });
        setStatusMsg('Game saved locally.');
    }

    /**
     * Clear game state.
     */
    function resetHistory() {
        setHistory([]);
        setRedoStack([]);
    }

    /**
     * Normalize backend puzzle response to number grid.
     * @param {any} data
     * @return {number[][]|null}
     */
    function normalizePuzzleData(data) {
        if (!data) return null;
        if (Array.isArray(data) && data.length === 9) return data;
        if (data.puzzle && Array.isArray(data.puzzle)) return data.puzzle;
        if (data.grid && Array.isArray(data.grid)) return data.grid;
        return null;
    }

    /**
     * Start a new game.
     * @param {string} nextDifficulty
     */
    async function startNewGame(nextDifficulty) {
        setErrorMsg('');
        setStatusMsg('Generating puzzle...');
        setDifficulty(nextDifficulty);
        setElapsedMs(0);
        setPaused(false);
        resetHistory();

        if (backendEnabled) {
            const res = await ApiClient.getPuzzle(nextDifficulty);
            const puzzleGrid = normalizePuzzleData(res.data);
            if (res.ok && puzzleGrid) {
                setBoard(Sudoku.fromNumberGrid(puzzleGrid));
                setSelected({row: 0, col: 0});
                setStatusMsg('New puzzle ready.');
                return;
            }
            setErrorMsg(`Backend unavailable, using offline generator. (${res.error || 'unknown error'})`);
        }

        // Offline fallback
        const game = Sudoku.createNewGame(nextDifficulty);
        setBoard(game.board);
        setSelected({row: 0, col: 0});
        setStatusMsg('New offline puzzle ready.');
    }

    /**
     * Start daily puzzle.
     */
    async function startDailyPuzzle() {
        setErrorMsg('');
        if (!backendEnabled) {
            setErrorMsg('Daily puzzle requires backend API (configure REACT_APP_API_BASE or REACT_APP_BACKEND_URL).');
            return;
        }
        setStatusMsg('Loading daily puzzle...');
        setElapsedMs(0);
        setPaused(false);
        resetHistory();

        const today = new Date();
        const iso = today.toISOString().slice(0, 10);
        const res = await ApiClient.getDailyPuzzle(iso);
        const puzzleGrid = normalizePuzzleData(res.data);
        if (res.ok && puzzleGrid) {
            setBoard(Sudoku.fromNumberGrid(puzzleGrid));
            setSelected({row: 0, col: 0});
            setStatusMsg(`Daily puzzle loaded (${iso}).`);
            return;
        }
        setErrorMsg(res.error || 'Failed to load daily puzzle.');
        setStatusMsg('Unable to load daily puzzle.');
    }

    /**
     * Select cell.
     * @param {number} row
     * @param {number} col
     */
    function handleSelect(row, col) {
        setSelected({row, col});
    }

    /**
     * Apply digit input (value or note depending on mode).
     * @param {(number|null)} digit
     * @param {{noteMode: boolean}} options
     */
    function handleInputDigit(digit, options) {
        const {row, col} = selected;
        const cell = board[row][col];
        if (cell.given) {
            setStatusMsg('This is a given cell.');
            return;
        }

        const nextBoard = Sudoku.cloneBoard(board);
        const nextCell = nextBoard[row][col];

        if (options.noteMode && digit) {
            const prev = Boolean(nextCell.notes[digit]);
            nextCell.notes[digit] = !prev;

            /** @type {HistoryEntry} */
            const entry = {
                type: 'toggleNote',
                pos: {row, col},
                prevValue: cell.value,
                nextValue: cell.value,
                noteDigit: digit,
            };
            setHistory((h) => h.concat([entry]));
            setRedoStack([]);
            setBoard(nextBoard);
            setStatusMsg(`Note ${digit} ${prev ? 'removed' : 'added'}.`);
            return;
        }

        const prevValue = cell.value;
        nextCell.value = digit;
        // Clear notes on direct entry.
        if (digit) {
            for (let d = 1; d <= 9; d += 1) nextCell.notes[d] = false;
        }

        /** @type {HistoryEntry} */
        const entry = {
            type: 'setValue',
            pos: {row, col},
            prevValue,
            nextValue: digit,
            noteDigit: null,
        };
        setHistory((h) => h.concat([entry]));
        setRedoStack([]);
        setBoard(nextBoard);

        if (digit === null) setStatusMsg('Cell cleared.');
        else setStatusMsg(`Entered ${digit}.`);

        const grid = Sudoku.toNumberGrid(nextBoard);
        if (Sudoku.isSolved(grid)) {
            handleWin(nextDifficultyFromDifficulty(difficulty), elapsedMs);
        }
    }

    /**
     * Map difficulty to stable key.
     * @param {string} d
     * @return {string}
     */
    function nextDifficultyFromDifficulty(d) {
        if (d === 'easy' || d === 'medium' || d === 'hard') return d;
        return 'easy';
    }

    /**
     * Handle win: update stats and submit to backend if available.
     * @param {string} d
     * @param {number} timeMs
     */
    async function handleWin(d, timeMs) {
        setPaused(true);
        setStatusMsg('Puzzle solved! Nice work.');
        Storage.clearSavedGame();

        const nextStats = {...stats};
        nextStats.gamesPlayed = (nextStats.gamesPlayed || 0) + 1;
        nextStats.gamesWon = (nextStats.gamesWon || 0) + 1;
        nextStats.currentStreak = (nextStats.currentStreak || 0) + 1;
        nextStats.bestStreak = Math.max(nextStats.bestStreak || 0, nextStats.currentStreak);

        const bestTimesMs = {...(nextStats.bestTimesMs || {})};
        const prevBest = bestTimesMs[d];
        if (!prevBest || timeMs < prevBest) {
            bestTimesMs[d] = timeMs;
        }
        nextStats.bestTimesMs = bestTimesMs;

        setStats(nextStats);
        Storage.saveStats(nextStats);

        if (backendEnabled) {
            await ApiClient.submitStats({difficulty: d, elapsedMs: timeMs, mistakes: 0, hintsUsed: 0});
        }
    }

    /**
     * Undo last action.
     */
    function handleUndo() {
        if (!history.length) return;

        const last = history[history.length - 1];
        const nextBoard = Sudoku.cloneBoard(board);
        const {row, col} = last.pos;

        if (last.type === 'setValue') {
            nextBoard[row][col].value = last.prevValue;
        } else if (last.type === 'toggleNote' && last.noteDigit) {
            const digit = last.noteDigit;
            nextBoard[row][col].notes[digit] = !nextBoard[row][col].notes[digit];
        }

        setBoard(nextBoard);
        setHistory((h) => h.slice(0, h.length - 1));
        setRedoStack((s) => s.concat([last]));
        setStatusMsg('Undo.');
    }

    /**
     * Redo action.
     */
    function handleRedo() {
        if (!redoStack.length) return;

        const last = redoStack[redoStack.length - 1];
        const nextBoard = Sudoku.cloneBoard(board);
        const {row, col} = last.pos;

        if (last.type === 'setValue') {
            nextBoard[row][col].value = last.nextValue;
        } else if (last.type === 'toggleNote' && last.noteDigit) {
            const digit = last.noteDigit;
            nextBoard[row][col].notes[digit] = !nextBoard[row][col].notes[digit];
        }

        setBoard(nextBoard);
        setRedoStack((s) => s.slice(0, s.length - 1));
        setHistory((h) => h.concat([last]));
        setStatusMsg('Redo.');
    }

    /**
     * Request hint from backend or offline solver.
     */
    async function handleHint() {
        setErrorMsg('');
        const grid = Sudoku.toNumberGrid(board);

        if (backendEnabled) {
            const res = await ApiClient.getHint({grid});
            if (res.ok && res.data) {
                const row = res.data.row ?? (res.data.pos && res.data.pos.row);
                const col = res.data.col ?? (res.data.pos && res.data.pos.col);
                const value = res.data.value ?? res.data.digit;
                if (typeof row === 'number' && typeof col === 'number' && typeof value === 'number') {
                    setSelected({row, col});
                    handleApplyHint(row, col, value);
                    return;
                }
            }
        }

        const hint = Sudoku.getHintFromGrid(grid);
        if (!hint) {
            setStatusMsg('No hint available.');
            return;
        }
        setSelected({row: hint.row, col: hint.col});
        handleApplyHint(hint.row, hint.col, hint.value);
    }

    /**
     * Apply hint to board.
     * @param {number} row
     * @param {number} col
     * @param {number} value
     */
    function handleApplyHint(row, col, value) {
        const cell = board[row][col];
        if (cell.given) {
            setStatusMsg('Hint points to a given cell (unexpected).');
            return;
        }
        const nextBoard = Sudoku.cloneBoard(board);
        nextBoard[row][col].value = value;
        for (let d = 1; d <= 9; d += 1) nextBoard[row][col].notes[d] = false;

        /** @type {HistoryEntry} */
        const entry = {
            type: 'setValue',
            pos: {row, col},
            prevValue: cell.value,
            nextValue: value,
            noteDigit: null,
        };

        setHistory((h) => h.concat([entry]));
        setRedoStack([]);
        setBoard(nextBoard);
        setStatusMsg('Hint applied.');
    }

    function handleErase() {
        handleInputDigit(null, {noteMode: false});
    }

    function handleTogglePause() {
        setPaused((p) => !p);
        setStatusMsg(paused ? 'Resumed.' : 'Paused.');
    }

    function handleToggleTheme() {
        const next = theme === 'retro' ? 'dark' : theme === 'dark' ? 'light' : 'retro';
        setTheme(next);
    }

    function handleOpenSettings() {
        setSettingsOpen(true);
    }

    function handleOpenStats() {
        setStatsOpen(true);
    }

    function handleNewGameButton() {
        startNewGame(difficulty);
    }

    const canUndo = history.length > 0;
    const canRedo = redoStack.length > 0;

    return (
        <div className="App">
            <a className="skipLink" href="#main">
                Skip to game
            </a>

            <header className="topbar">
                <div className="brand">
                    <div className="brandMark" aria-hidden="true">
                        S
                    </div>
                    <div className="brandText">
                        <div className="brandTitle">Smart Sudoku Companion</div>
                        <div className="brandSubtitle">Retro minimal UI • Accessible • Offline-friendly</div>
                    </div>
                </div>

                <div className="topbarActions">
                    <button className="btn btnGhost" onClick={handleNewGameButton}>
                        New Game
                    </button>
                    <button className="btn btnGhost" onClick={persistGame}>
                        Save
                    </button>
                    <button
                        className="btn btnGhost"
                        onClick={() => {
                            const save = Storage.loadGame();
                            if (!save) {
                                setStatusMsg('No saved game found.');
                                return;
                            }
                            setBoard(save.board);
                            setDifficulty(save.difficulty || 'easy');
                            setSelected(save.selected || {row: 0, col: 0});
                            setElapsedMs(save.elapsedMs || 0);
                            setPaused(Boolean(save.paused));
                            setHistory(save.history || []);
                            setRedoStack(save.redoStack || []);
                            setStatusMsg('Loaded saved game.');
                        }}
                    >
                        Load
                    </button>
                    <button className="btn btnGhost" onClick={handleOpenStats}>
                        Stats
                    </button>
                    <button className="btn btnGhost" onClick={handleOpenSettings}>
                        Settings
                    </button>
                    <button
                        className="btn btnSecondary"
                        onClick={handleToggleTheme}
                        aria-label={`Theme: ${theme}. Click to change theme.`}
                    >
                        Theme
                    </button>
                </div>
            </header>

            <main id="main" className="layout" role="main">
                <section className="gameColumn" aria-label="Sudoku game">
                    <ControlPanel
                        difficulty={difficulty}
                        onNewGame={(d) => startNewGame(d)}
                        onDaily={startDailyPuzzle}
                        backendEnabled={backendEnabled}
                        noteMode={noteMode}
                        onToggleNoteMode={() => setNoteMode((v) => !v)}
                        onInputDigit={handleInputDigit}
                        onUndo={handleUndo}
                        onRedo={handleRedo}
                        canUndo={canUndo}
                        canRedo={canRedo}
                        onHint={handleHint}
                        onErase={handleErase}
                        elapsedMs={elapsedMs}
                        paused={paused}
                        onTogglePause={handleTogglePause}
                    />

                    <SudokuBoard
                        board={board}
                        selected={selected}
                        conflicts={conflicts}
                        onSelect={handleSelect}
                        onInputDigit={handleInputDigit}
                        noteMode={noteMode}
                    />
                </section>

                <aside className="sideColumn" aria-label="Info panel">
                    <div className="card">
                        <div className="cardTitle">Status</div>
                        <div className="statusLine" role="status" aria-live="polite">
                            {statusMsg}
                        </div>
                        {errorMsg ? (
                            <div className="errorLine" role="alert">
                                {errorMsg}
                            </div>
                        ) : null}
                        <div className="meta">
                            <div className="pill">
                                API: <strong>{backendEnabled ? 'enabled' : 'offline'}</strong>
                            </div>
                            <div className="pill">
                                Notes: <strong>{noteMode ? 'on' : 'off'}</strong>
                            </div>
                        </div>
                    </div>

                    <div className="card">
                        <div className="cardTitle">Tips</div>
                        <ul className="tipList">
                            <li>Use arrow keys to move. Type 1–9 to fill.</li>
                            <li>Toggle Notes to add pencil marks.</li>
                            <li>Conflicts highlight in red for quick correction.</li>
                            <li>Save stores your progress in this browser.</li>
                        </ul>
                    </div>
                </aside>
            </main>

            <footer className="footer">
                <span>Keyboard accessible • Responsive • Retro-soft-gray palette</span>
            </footer>

            <Modal
                open={statsOpen}
                title="Statistics"
                onClose={() => setStatsOpen(false)}
                footer={
                    <div className="modalFooterActions">
                        <button
                            className="btn btnSecondary"
                            onClick={() => {
                                const cleared = {
                                    bestTimesMs: {},
                                    gamesPlayed: 0,
                                    gamesWon: 0,
                                    currentStreak: 0,
                                    bestStreak: 0,
                                };
                                setStats(cleared);
                                Storage.saveStats(cleared);
                                setStatusMsg('Stats cleared.');
                            }}
                        >
                            Clear Stats
                        </button>
                        <button className="btn btnPrimary" onClick={() => setStatsOpen(false)}>
                            Done
                        </button>
                    </div>
                }
            >
                <div className="statsGrid">
                    <div className="statCard">
                        <div className="statLabel">Played</div>
                        <div className="statValue">{stats.gamesPlayed}</div>
                    </div>
                    <div className="statCard">
                        <div className="statLabel">Won</div>
                        <div className="statValue">{stats.gamesWon}</div>
                    </div>
                    <div className="statCard">
                        <div className="statLabel">Streak</div>
                        <div className="statValue">{stats.currentStreak}</div>
                    </div>
                    <div className="statCard">
                        <div className="statLabel">Best Streak</div>
                        <div className="statValue">{stats.bestStreak}</div>
                    </div>
                </div>

                <div className="bestTimes">
                    <h3 className="subheading">Best Times</h3>
                    <div className="bestTimesTable" role="table" aria-label="Best times by difficulty">
                        {['easy', 'medium', 'hard'].map((d) => (
                            <div key={d} className="bestTimesRow" role="row">
                                <div role="cell" className="bestTimesCell">
                                    {d}
                                </div>
                                <div role="cell" className="bestTimesCell">
                                    {stats.bestTimesMs && stats.bestTimesMs[d] ? Time.formatDuration(stats.bestTimesMs[d]) : '—'}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </Modal>

            <Modal
                open={settingsOpen}
                title="Settings"
                onClose={() => setSettingsOpen(false)}
                footer={
                    <div className="modalFooterActions">
                        <button className="btn btnPrimary" onClick={() => setSettingsOpen(false)}>
                            Done
                        </button>
                    </div>
                }
            >
                <div className="settingsGrid">
                    <div className="settingRow">
                        <div>
                            <div className="settingLabel">Accent</div>
                            <div className="settingHint">Soft Gray is the primary style guide. Retro adds neon scanlines.</div>
                        </div>
                        <select className="select" value={accent} onChange={(e) => setAccent(e.target.value)} aria-label="Accent theme">
                            <option value="softgray">Soft Gray</option>
                            <option value="retro">Retro Neon</option>
                        </select>
                    </div>

                    <div className="settingRow">
                        <div>
                            <div className="settingLabel">Notes mode default</div>
                            <div className="settingHint">Start new sessions with Notes on/off.</div>
                        </div>
                        <button className={`btn ${noteMode ? 'btnSuccess' : 'btnSecondary'}`} onClick={() => setNoteMode((v) => !v)}>
                            {noteMode ? 'On' : 'Off'}
                        </button>
                    </div>

                    <div className="settingRow">
                        <div>
                            <div className="settingLabel">Clear saved game</div>
                            <div className="settingHint">Remove the locally saved in-progress puzzle.</div>
                        </div>
                        <button
                            className="btn btnSecondary"
                            onClick={() => {
                                Storage.clearSavedGame();
                                setStatusMsg('Saved game cleared.');
                            }}
                        >
                            Clear
                        </button>
                    </div>

                    <div className="settingRow">
                        <div>
                            <div className="settingLabel">Backend URL</div>
                            <div className="settingHint">Configured via REACT_APP_API_BASE / REACT_APP_BACKEND_URL.</div>
                        </div>
                        <div className="monoSmall">{process.env.REACT_APP_API_BASE || process.env.REACT_APP_BACKEND_URL || '(not set)'}</div>
                    </div>
                </div>
            </Modal>
        </div>
    );
}

export default App;
