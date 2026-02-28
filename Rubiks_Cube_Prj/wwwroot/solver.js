// solver.js

// ── Kociemba Mapping & Utilities ──────────────────────────────────────────────

// Maps standard Kociemba string index to our f_state array index
const kociembaMap = [
    // U1..U9 (White)
    0, 3, 7, 1, 4, 8, 2, 5, 6,
    // R1..R9 (Red)
    14, 16, 15, 17, 13, 12, 11, 10, 9,
    // F1..F9 (Blue)
    20, 23, 25, 19, 22, 26, 18, 21, 24,
    // D1..D9 (Yellow)
    29, 32, 35, 28, 31, 34, 27, 30, 33,
    // L1..L9 (Orange)
    42, 43, 44, 39, 40, 41, 36, 37, 38,
    // B1..B9 (Green)
    53, 50, 47, 52, 49, 46, 51, 48, 45
];

// Resolves a numeric f_state ID to its home face character
function getFaceLetter(id) {
    if (id <= 8) return 'U';
    if (id <= 17) return 'R';
    if (id <= 26) return 'F';
    if (id <= 35) return 'D';
    if (id <= 44) return 'L';
    return 'B';
}

// Converts our 54-element f_state to a standard Cube.js Kociemba string
export function faceletStringFromFstate(f_state) {
    return kociembaMap.map(k_idx => getFaceLetter(f_state[k_idx])).join("");
}

// Converts standard Kociemba notation ("U", "R2", "L'") into the machine array format
export function toPlusMinusArray(solutionStr) {
    if (typeof solutionStr !== "string" || solutionStr.trim().length === 0) {
        return [];
    }
    return solutionStr.trim().split(/\s+/).flatMap(tok => {
        const face = tok[0];

        // FIX: In the 3D engine, L+, D+, and B+ visually rotate Counter-Clockwise.
        // Standard notation dictates unmodified is Clockwise and ' is Counter-Clockwise.
        // Therefore, we must invert the +/- mapping for L, D, and B faces.
        const isInverted = face === 'L' || face === 'D' || face === 'B';

        if (tok.length === 1) {
            // Standard Clockwise
            return isInverted ? [face + "-"] : [face + "+"];
        } else if (tok[1] === "'") {
            // Standard Counter-Clockwise
            return isInverted ? [face + "+"] : [face + "-"];
        } else if (tok[1] === "2") {
            // Double move (180 degrees)
            return [face + "+", face + "+"];
        }
        return [];
    });
}

// Ensure scripts load sequentially to avoid ReferenceErrors and Race Conditions
export async function ensureSolverLoaded() {
    if (typeof window === 'undefined') return;

    // Provide mock require to satisfy solve.js if it somehow runs first
    if (typeof window.require === 'undefined') {
        window.require = function (module) {
            if (module === './cube') return window.Cube;
            return null;
        };
    }

    const loadScript = (src) => new Promise((resolve, reject) => {
        const s = document.createElement('script');
        s.src = src;
        s.onload = resolve;
        s.onerror = reject;
        document.head.appendChild(s);
    });

    // 1. Await Base CubeJS Logic
    if (!window.Cube) {
        try { await loadScript('solver/cubejs.js'); }
        catch (e) {
            try { await loadScript('cubejs.js'); }
            catch (err) { console.warn("Failed to load cubejs.js"); }
        }
    }

    // 2. Await Advanced Solver Extension (Guaranteeing Cube is instantiated)
    if (window.Cube && !window.Cube.prototype.solve) {
        try { await loadScript('solver/solve.js'); }
        catch (e) {
            try { await loadScript('solve.js'); }
            catch (err) { console.warn("Failed to load solve.js"); }
        }
    }

    if (!window.Cube || !window.Cube.prototype.solve) {
        throw new Error("Cube solver libraries (cubejs.js and solve.js) could not be loaded. Please ensure paths are correct.");
    }
}

// Patches a known bug in cubejs where depths 1-3 can sometimes fallback improperly
function patchCubeJsSolve() {
    if (!window.Cube || !window.Cube.prototype || window.Cube._isPatched) return;

    const originalSolve = window.Cube.prototype.solve;
    window.Cube.prototype.solve = function (maxDepth = 22) {
        if (this.isSolved()) return "";
        const moves = ["U", "U2", "U'", "R", "R2", "R'", "F", "F2", "F'", "D", "D2", "D'", "L", "L2", "L'", "B", "B2", "B'"];

        // Depth 1 Check
        for (let m1 of moves) {
            let c1 = this.clone(); c1.move(m1); if (c1.isSolved()) return m1;
        }
        // Depth 2 Check
        for (let m1 of moves) {
            let c1 = this.clone(); c1.move(m1);
            for (let m2 of moves) {
                if (m1[0] === m2[0]) continue;
                let c2 = c1.clone(); c2.move(m2); if (c2.isSolved()) return m1 + " " + m2;
            }
        }
        // Depth 3 Check
        for (let m1 of moves) {
            let c1 = this.clone(); c1.move(m1);
            for (let m2 of moves) {
                if (m1[0] === m2[0]) continue;
                let c2 = c1.clone(); c2.move(m2);
                for (let m3 of moves) {
                    if (m2[0] === m3[0]) continue;
                    let c3 = c2.clone(); c3.move(m3); if (c3.isSolved()) return m1 + " " + m2 + " " + m3;
                }
            }
        }
        return originalSolve.call(this, maxDepth);
    };
    window.Cube._isPatched = true;
}

// ── State Solvers ─────────────────────────────────────────────────────────────

export async function solveFState(f_state) {
    await ensureSolverLoaded();
    patchCubeJsSolve();

    if (!window.Cube._solverInitialized) {
        window.Cube.initSolver();
        window.Cube._solverInitialized = true;
    }

    const facelets = faceletStringFromFstate(f_state);
    const cube = window.Cube.fromString(facelets);
    const rawSol = cube.solve();

    if (rawSol === null) throw new Error("Cube state is unsolvable or max depth exceeded.");
    return toPlusMinusArray(rawSol);
}

// For c_state mapping (which natively drops orientation)
const corner_slots = [25, 8, 6, 23, 19, 2, 0, 17];
const edge_slots = [24, 16, 7, 14, 18, 11, 1, 9, 22, 5, 3, 20];
const center_slots = [15, 21, 13, 10, 4, 12];

export async function solveCState(c_state) {
    await ensureSolverLoaded();
    patchCubeJsSolve();

    if (!window.Cube._solverInitialized) {
        window.Cube.initSolver();
        window.Cube._solverInitialized = true;
    }

    const cube = new window.Cube();

    // Fill centers (c_state[i] tells us where piece i is now; we reverse it to map home_slots)
    for (let k = 0; k < 6; k++) {
        const home_slot = center_slots[k];
        const cubie_index = c_state.indexOf(home_slot);
        cube.center[k] = center_slots.indexOf(cubie_index);
    }
    // Fill corners
    for (let k = 0; k < 8; k++) {
        const home_slot = corner_slots[k];
        const cubie_index = c_state.indexOf(home_slot);
        cube.cp[k] = corner_slots.indexOf(cubie_index);
        cube.co[k] = 0; // Assume 0 since c_state lacks orientation
    }
    // Fill edges
    for (let k = 0; k < 12; k++) {
        const home_slot = edge_slots[k];
        const cubie_index = c_state.indexOf(home_slot);
        cube.ep[k] = edge_slots.indexOf(cubie_index);
        cube.eo[k] = 0; // Assume 0 since c_state lacks orientation
    }

    const rawSol = cube.solve();
    if (rawSol === null) throw new Error("c_state mapping produced an unsolvable state.");

    return toPlusMinusArray(rawSol);
}

// Parses string to find f_state or c_state and solves
export async function extractStateAndSolve(inputStr) {
    // Prefer f_state because it has flawless orientation data
    const fStateMatch = inputStr.match(/f_state\s*:\s*\[([\d,\s]+)\]/);
    if (fStateMatch) {
        const f_state = fStateMatch[1].split(',').map(s => parseInt(s.trim(), 10));
        return await solveFState(f_state);
    }

    // Fallback to c_state logic
    const cStateMatch = inputStr.match(/c_state\s*:\s*\[([\d,\s]+)\]/);
    if (cStateMatch) {
        const c_state = cStateMatch[1].split(',').map(s => parseInt(s.trim(), 10));
        return await solveCState(c_state);
    }

    // Catch raw JSON arrays
    try {
        const parsed = JSON.parse(inputStr);
        if (Array.isArray(parsed)) {
            if (parsed.length === 54) return await solveFState(parsed);
            if (parsed.length === 26) return await solveCState(parsed);
        }
    } catch (e) { }

    throw new Error("Could not find a valid f_state or c_state array in the input string.");
}

// ── UI Interception Logic (Main App) ──────────────────────────────────────────

if (typeof document !== 'undefined') {
    window.addEventListener('DOMContentLoaded', () => {
        const solveBtn = document.getElementById('solve-btn');
        if (solveBtn) {
            solveBtn.addEventListener('click', async () => {
                // Ensure we don't interfere when the cube is animating
                if (solveBtn.disabled) return;

                // Read from HUD without hacking into script.js locals
                const hudState = document.getElementById('hud-state');
                if (!hudState) return;

                try {
                    const moveArr = await extractStateAndSolve(hudState.textContent);
                    const moveStr = JSON.stringify(moveArr).replace(/"/g, ''); // -> e.g.[U+,R-,D+]

                    const moveInput = document.getElementById('move-array-input');
                    if (moveInput) {
                        moveInput.value = moveStr;
                        // Trigger execution sequence automatically
                        const execBtn = document.getElementById('execute-move-array-btn');
                        if (execBtn) execBtn.click();
                    }
                } catch (err) {
                    console.error("Solver error:", err);
                    alert("Failed to solve: " + err.message);
                }
            });
        }
    });
}