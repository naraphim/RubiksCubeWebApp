// ── Imports & Timing Constants ────────────────────────────────────────────────
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import TWEEN from 'tween';

const DURATION_ROTATE = 750;
const DURATION_PAUSE = 1250;
const DURATION_RANDOM_ROTATE = 150;
const DURATION_RANDOM_PAUSE = 50;

// ── Scene, Camera & Renderer ─────────────────────────────────────────────────
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x333333);

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(0, 0, 8);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.getElementById('canvas-container').appendChild(renderer.domElement);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;

// ── Input Logging ───────────────────────────────────────────────────────────
const pointerDown = new THREE.Vector2();
const CLICK_TOLERANCE = 5;

renderer.domElement.addEventListener('mousedown', e => {
    console.log(`Mousedown at (${e.clientX}, ${e.clientY})`);
    pointerDown.set(e.clientX, e.clientY);
});
renderer.domElement.addEventListener('mouseup', e => {
    console.log(`Mouseup   at (${e.clientX}, ${e.clientY})`);
    const up = new THREE.Vector2(e.clientX, e.clientY);
    if (pointerDown.distanceTo(up) >= CLICK_TOLERANCE) {
        console.log(`Drag from (${pointerDown.x}, ${pointerDown.y}) → (${e.clientX}, ${e.clientY})`);
    }
});
renderer.domElement.addEventListener('contextmenu', e => e.preventDefault());

// ── Lights ───────────────────────────────────────────────────────────────────
scene.add(new THREE.AmbientLight(0xffffff, 0.6));
const dirLight = new THREE.DirectionalLight(0xffffff, 0.6);
dirLight.position.set(10, 20, 5);
scene.add(dirLight);

// ── Axis Gizmo Setup ─────────────────────────────────────────────────────────
const gizmoContainer = document.getElementById('gizmo-container');
const gizmoRenderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
gizmoRenderer.setSize(gizmoContainer.clientWidth, gizmoContainer.clientHeight);
gizmoContainer.appendChild(gizmoRenderer.domElement);

const gizmoScene = new THREE.Scene();
const gizmoCamera = new THREE.OrthographicCamera(-2.5, 2.5, 2.5, -2.5, 0.1, 100);
gizmoCamera.position.set(0, 0, 10);

const gizmo = new THREE.Group();
const axisLen = 1.5, headLen = 0.5, headWid = 0.35;
[
    { dir: [1, 0, 0], col: 0xcc2222 }, { dir: [-1, 0, 0], col: 0xcc2222 },
    { dir: [0, 1, 0], col: 0x2222cc }, { dir: [0, -1, 0], col: 0x2222cc },
    { dir: [0, 0, 1], col: 0x22cc22 }, { dir: [0, 0, -1], col: 0x22cc22 }
].forEach(({ dir, col }) => {
    gizmo.add(new THREE.ArrowHelper(
        new THREE.Vector3(...dir),
        new THREE.Vector3(0, 0, 0),
        axisLen, col, headLen, headWid
    ));
});

const sphereRadius = headWid / 1.8;
const sphereDist = axisLen + sphereRadius + 0.1;

const sphereGeo = new THREE.SphereGeometry(sphereRadius, 16, 16);

const sphereR = new THREE.Mesh(sphereGeo, new THREE.MeshBasicMaterial({ color: 0xcc2222 }));
sphereR.position.set(sphereDist, 0, 0);
gizmo.add(sphereR);

const sphereU = new THREE.Mesh(sphereGeo, new THREE.MeshBasicMaterial({ color: 0x2222cc }));
sphereU.position.set(0, sphereDist, 0);
gizmo.add(sphereU);

const sphereF = new THREE.Mesh(sphereGeo, new THREE.MeshBasicMaterial({ color: 0x22cc22 }));
sphereF.position.set(0, 0, sphereDist);
gizmo.add(sphereF);

gizmoScene.add(gizmo);


// ── Cube Constants & Build Logic ─────────────────────────────────────────────
const CUBE_SIZE = 3, CUBIE_W = 1, CUBIE_S = 0.05;
const STEP = CUBIE_W + CUBIE_S, HALF = (CUBE_SIZE - 1) / 2;

const colors = {
    black: 0x000000, white: 0xffffff, yellow: 0xffff00,
    green: 0x00ff00, blue: 0x0000ff, red: 0xff0000,
    orange: 0xffa500
};

const faceMats = [
    new THREE.MeshStandardMaterial({ color: colors.white }),
    new THREE.MeshStandardMaterial({ color: colors.red }),
    new THREE.MeshStandardMaterial({ color: colors.blue }),
    new THREE.MeshStandardMaterial({ color: colors.yellow }),
    new THREE.MeshStandardMaterial({ color: colors.orange }),
    new THREE.MeshStandardMaterial({ color: colors.green })
];
const blackMat = new THREE.MeshStandardMaterial({ color: colors.black });

const cubies = [];
const rubiksCube = new THREE.Group();
scene.add(rubiksCube);

for (let x = 0; x < CUBE_SIZE; x++) {
    for (let y = 0; y < CUBE_SIZE; y++) {
        for (let z = 0; z < CUBE_SIZE; z++) {
            if (x === HALF && y === HALF && z === HALF) continue;
            const pos = new THREE.Vector3(
                (x - HALF) * STEP, (y - HALF) * STEP, (z - HALF) * STEP
            );
            const mats = [
                pos.x > 0.1 ? faceMats[1] : blackMat,
                pos.x < -0.1 ? faceMats[4] : blackMat,
                pos.y > 0.1 ? faceMats[0] : blackMat,
                pos.y < -0.1 ? faceMats[3] : blackMat,
                pos.z > 0.1 ? faceMats[2] : blackMat,
                pos.z < -0.1 ? faceMats[5] : blackMat
            ];
            const mesh = new THREE.Mesh(
                new RoundedBoxGeometry(CUBIE_W, CUBIE_W, CUBIE_W, 4, 0.1),
                mats
            );
            mesh.position.copy(pos);
            mesh.userData.initialPosition = pos.clone();
            mesh.userData.initialQuaternion = mesh.quaternion.clone();
            cubies.push(mesh);
            rubiksCube.add(mesh);
        }
    }
}

// ── initialMap: “pos→slot” ─────────────────────────────────────────────────────
const initialMap = new Map();
cubies.forEach((c, i) => {
    const p = c.userData.initialPosition;
    const key = `${p.x.toFixed(2)},${p.y.toFixed(2)},${p.z.toFixed(2)}`;
    initialMap.set(key, i);
});

// ── Rotation Definitions ─────────────────────────────────────────────────────
const ROTATIONS = {
    'R+': { axis: 'x', coord: STEP, dir: -1, desc: 'R+' },
    'R-': { axis: 'x', coord: STEP, dir: 1, desc: 'R-' },
    'L+': { axis: 'x', coord: -STEP, dir: 1, desc: 'L+' },
    'L-': { axis: 'x', coord: -STEP, dir: -1, desc: 'L-' },
    'M+': { axis: 'x', coord: 0, dir: 1, desc: 'M+' },
    'M-': { axis: 'x', coord: 0, dir: -1, desc: 'M-' },
    'U+': { axis: 'y', coord: STEP, dir: -1, desc: 'U+' },
    'U-': { axis: 'y', coord: STEP, dir: 1, desc: 'U-' },
    'D+': { axis: 'y', coord: -STEP, dir: 1, desc: 'D+' },
    'D-': { axis: 'y', coord: -STEP, dir: -1, desc: 'D-' },
    'E+': { axis: 'y', coord: 0, dir: 1, desc: 'E+' },
    'E-': { axis: 'y', coord: 0, dir: -1, desc: 'E-' },
    'F+': { axis: 'z', coord: STEP, dir: -1, desc: 'F+' },
    'F-': { axis: 'z', coord: STEP, dir: 1, desc: 'F-' },
    'B+': { axis: 'z', coord: -STEP, dir: 1, desc: 'B+' },
    'B-': { axis: 'z', coord: -STEP, dir: -1, desc: 'B-' },
    'S+': { axis: 'z', coord: 0, dir: -1, desc: 'S+' },
    'S-': { axis: 'z', coord: 0, dir: 1, desc: 'S-' }
};
const SEQ = Object.values(ROTATIONS);

// ── Facelet State & Permutation Logic ────────────────────────────────────────
let f_state = Array.from({ length: 54 }, (_, i) => i);

// =================================================================================
// ▼▼▼ YOUR KNOWLEDGE GOES HERE ▼▼▼
// =================================================================================
// For each of the 18 moves below, replace the placeholder array `[...]` with the
// correct f_state array that results from applying that *one single move* to a
// solved cube. I have filled in 'L+' with the data you provided as an example.
// The code will use these to build the correct transformation logic automatically.
// =================================================================================
const SINGLE_MOVE_F_STATES = {
    'L+': [45, 46, 47, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 2, 1, 0, 21, 22, 23, 24, 25, 26, 18, 19, 20, 30, 31, 32, 33, 34, 35, 38, 41, 44, 37, 40, 43, 36, 39, 42, 29, 28, 27, 48, 49, 50, 51, 52, 53],
    'L-': [20, 19, 18, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 27, 28, 29, 21, 22, 23, 24, 25, 26, 47, 46, 45, 30, 31, 32, 33, 34, 35, 42, 39, 36, 43, 40, 37, 44, 41, 38, 0, 1, 2, 48, 49, 50, 51, 52, 53],
    'M+': [0, 1, 2, 48, 49, 50, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 5, 4, 3, 24, 25, 26, 27, 28, 29, 21, 22, 23, 33, 34, 35, 36, 37, 38, 39, 40, 41, 42, 43, 44, 45, 46, 47, 32, 31, 30, 51, 52, 53],
    'M-': [0, 1, 2, 23, 22, 21, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 30, 31, 32, 24, 25, 26, 27, 28, 29, 50, 49, 48, 33, 34, 35, 36, 37, 38, 39, 40, 41, 42, 43, 44, 45, 46, 47, 3, 4, 5, 51, 52, 53],
    'R+': [0, 1, 2, 3, 4, 5, 53, 51, 52, 11, 17, 14, 10, 13, 15, 9, 12, 16, 18, 19, 20, 21, 22, 23, 6, 7, 8, 27, 28, 29, 30, 31, 32, 24, 26, 25, 36, 37, 38, 39, 40, 41, 42, 43, 44, 45, 46, 47, 48, 49, 50, 35, 34, 33],
    'R-': [0, 1, 2, 3, 4, 5, 24, 25, 26, 15, 12, 9, 16, 13, 11, 14, 17, 10, 18, 19, 20, 21, 22, 23, 33, 35, 34, 27, 28, 29, 30, 31, 32, 53, 52, 51, 36, 37, 38, 39, 40, 41, 42, 43, 44, 45, 46, 47, 48, 49, 50, 7, 8, 6],
    'D+': [0, 1, 2, 3, 4, 5, 6, 7, 8, 45, 48, 51, 12, 13, 14, 15, 16, 17, 11, 19, 20, 10, 22, 23, 9, 25, 26, 29, 32, 35, 28, 31, 34, 27, 30, 33, 18, 21, 24, 39, 40, 41, 42, 43, 44, 38, 46, 47, 37, 49, 50, 36, 52, 53],
    'D-': [0, 1, 2, 3, 4, 5, 6, 7, 8, 24, 21, 18, 12, 13, 14, 15, 16, 17, 36, 19, 20, 37, 22, 23, 38, 25, 26, 33, 30, 27, 34, 31, 28, 35, 32, 29, 51, 48, 45, 39, 40, 41, 42, 43, 44, 9, 46, 47, 10, 49, 50, 11, 52, 53],
    'E+': [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 46, 49, 14, 15, 16, 52, 18, 17, 20, 21, 13, 23, 24, 25, 12, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 19, 22, 26, 42, 43, 44, 45, 41, 47, 48, 40, 50, 51, 39, 53],
    'E-': [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 26, 22, 14, 15, 16, 19, 18, 39, 20, 21, 40, 23, 24, 25, 41, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 52, 49, 46, 42, 43, 44, 45, 12, 47, 48, 13, 50, 51, 17, 53],
    'U+': [2, 5, 6, 1, 4, 8, 7, 0, 3, 9, 10, 11, 12, 13, 53, 47, 50, 17, 18, 19, 14, 21, 22, 16, 24, 15, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40, 41, 20, 23, 25, 45, 46, 44, 48, 49, 43, 51, 52, 42],
    'U-': [7, 3, 0, 8, 4, 1, 2, 6, 5, 9, 10, 11, 12, 13, 20, 25, 23, 17, 18, 19, 42, 21, 22, 43, 24, 44, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40, 41, 53, 50, 47, 45, 46, 15, 48, 49, 16, 51, 52, 14],
    'B+': [0, 1, 38, 3, 4, 41, 44, 7, 8, 9, 10, 6, 12, 13, 2, 15, 16, 5, 24, 21, 18, 26, 22, 19, 25, 20, 23, 27, 28, 11, 30, 31, 17, 33, 34, 14, 36, 37, 35, 39, 40, 32, 42, 43, 29, 45, 46, 47, 48, 49, 50, 51, 52, 53],
    'B-': [0, 1, 14, 3, 4, 17, 11, 7, 8, 9, 10, 29, 12, 13, 35, 15, 16, 32, 20, 23, 25, 19, 22, 26, 18, 24, 21, 27, 28, 44, 30, 31, 41, 33, 34, 38, 36, 37, 2, 39, 40, 5, 42, 43, 6, 45, 46, 47, 48, 49, 50, 51, 52, 53],
    'S+': [0, 37, 2, 3, 40, 5, 6, 7, 43, 9, 8, 11, 12, 4, 14, 15, 1, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 10, 29, 30, 13, 32, 33, 16, 35, 36, 34, 38, 39, 31, 41, 42, 28, 44, 45, 46, 47, 48, 49, 50, 51, 52, 53],
    'S-': [0, 16, 2, 3, 13, 5, 6, 7, 10, 9, 28, 11, 12, 31, 14, 15, 34, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 43, 29, 30, 40, 32, 33, 37, 35, 36, 1, 38, 39, 4, 41, 42, 8, 44, 45, 46, 47, 48, 49, 50, 51, 52, 53],
    'F+': [36, 1, 2, 39, 4, 5, 6, 42, 8, 7, 10, 11, 3, 13, 14, 0, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 9, 28, 29, 12, 31, 32, 15, 34, 35, 33, 37, 38, 30, 40, 41, 27, 43, 44, 51, 48, 45, 52, 49, 46, 53, 50, 47],
    'F-': [15, 1, 2, 12, 4, 5, 6, 9, 8, 27, 10, 11, 30, 13, 14, 33, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 42, 28, 29, 39, 31, 32, 36, 34, 35, 0, 37, 38, 3, 40, 41, 7, 43, 44, 47, 50, 53, 46, 49, 52, 45, 48, 51]
};
// =================================================================================
// ▲▲▲ END OF KNOWLEDGE INPUT SECTION ▲▲▲
// =================================================================================


// This function builds the final PERM object from your knowledge.
// YOU DO NOT NEED TO EDIT BELOW THIS LINE.
const PERM = {};
for (const moveName in SINGLE_MOVE_F_STATES) {
    // The f_state after one move from solved IS the permutation table.
    PERM[moveName] = SINGLE_MOVE_F_STATES[moveName];
}

const applyPerm = (state, perm) => {
    const newState = new Array(54);
    for (let i = 0; i < 54; i++) {
        newState[i] = state[perm[i]];
    }
    return newState;
};


// ── Helpers: c_state & fc_state ────────────────────────────────────────────────
function getState() {
    return cubies.map(c => {
        const p = c.position;
        const key = `${p.x.toFixed(2)},${p.y.toFixed(2)},${p.z.toFixed(2)}`;
        return initialMap.get(key);
    });
}

const FACELET_TO_SLOT = [
    6, 7, 8, 14, 15, 16, 22, 23, 24, 17, 18, 19, 20, 21, 22, 23, 24, 25,
    2, 5, 8, 11, 13, 16, 19, 22, 25, 0, 1, 2, 9, 10, 11, 17, 18, 19,
    0, 1, 2, 3, 4, 5, 6, 7, 8, 0, 3, 6, 9, 12, 14, 17, 20, 23
];
function invert26(a26) {
    const inv = new Array(26);
    a26.forEach((slot, cube) => inv[slot] = cube);
    return inv;
}
function computeFCState(c_state) {
    const s2c = invert26(c_state);
    return FACELET_TO_SLOT.map(slot => s2c[slot]);
}

// ── HUD & Telemetry Setup ────────────────────────────────────────────────────
const hud = document.getElementById('hud');
const hudMoveInfo = document.getElementById('hud-move-info');
const hudCubeState = document.getElementById('hud-cube-state');
const hudControls = document.getElementById('hud-controls');
const playBtn = document.getElementById('play-pause-btn');
const randBtn = document.getElementById('randomize-btn');
const resetBtn = document.getElementById('reset-btn');
const mCtrls = document.getElementById('manual-controls');

const hudState = document.createElement('pre');
hudState.id = 'hud-state';
hudState.style.cssText = `
  margin: .5em 0;
  font-size: .85em;
  white-space: pre-wrap;
  word-break: break-word;
`;
hud.insertBefore(hudState, hudControls);

// ── Flat-Net Display Logic ───────────────────────────────────────────────────
const netPositions = {
    // White Face (U)
    0: { r: 1, c: 4 }, 3: { r: 1, c: 5 }, 7: { r: 1, c: 6 },
    1: { r: 2, c: 4 }, 4: { r: 2, c: 5 }, 8: { r: 2, c: 6 },
    2: { r: 3, c: 4 }, 5: { r: 3, c: 5 }, 6: { r: 3, c: 6 },
    // Orange Face (L)
    36: { r: 6, c: 1 }, 37: { r: 6, c: 2 }, 38: { r: 6, c: 3 },
    39: { r: 5, c: 1 }, 40: { r: 5, c: 2 }, 41: { r: 5, c: 3 },
    42: { r: 4, c: 1 }, 43: { r: 4, c: 2 }, 44: { r: 4, c: 3 },
    // Blue Face (F)
    18: { r: 6, c: 4 }, 21: { r: 6, c: 5 }, 24: { r: 6, c: 6 },
    19: { r: 5, c: 4 }, 22: { r: 5, c: 5 }, 26: { r: 5, c: 6 },
    20: { r: 4, c: 4 }, 23: { r: 4, c: 5 }, 25: { r: 4, c: 6 },
    // Red Face (R)
    9: { r: 6, c: 9 }, 10: { r: 6, c: 8 }, 11: { r: 6, c: 7 },
    12: { r: 5, c: 9 }, 13: { r: 5, c: 8 }, 17: { r: 5, c: 7 },
    15: { r: 4, c: 9 }, 16: { r: 4, c: 8 }, 14: { r: 4, c: 7 },
    // Green Face (B)
    45: { r: 6, c: 12 }, 48: { r: 6, c: 11 }, 51: { r: 6, c: 10 },
    46: { r: 5, c: 12 }, 49: { r: 5, c: 11 }, 52: { r: 5, c: 10 },
    47: { r: 4, c: 12 }, 50: { r: 4, c: 11 }, 53: { r: 4, c: 10 },
    // Yellow Face (D)
    27: { r: 9, c: 4 }, 30: { r: 9, c: 5 }, 33: { r: 9, c: 6 },
    28: { r: 8, c: 4 }, 31: { r: 8, c: 5 }, 34: { r: 8, c: 6 },
    29: { r: 7, c: 4 }, 32: { r: 7, c: 5 }, 35: { r: 7, c: 6 }
};


function renderFlatNet() {
    const container = document.getElementById('flat-net');
    container.innerHTML = '';

    for (let i = 0; i < 54; i++) {
        const div = document.createElement('div');
        div.className = 'cell';
        div.textContent = f_state[i];

        const pos = netPositions[i];
        if (pos) {
            div.style.gridRowStart = pos.r;
            div.style.gridColumnStart = pos.c;
        }

        const originalStickerId = f_state[i];
        const faceGroup = Math.floor(originalStickerId / 9);
        const mat = faceMats[faceGroup];
        div.style.backgroundColor = mat.color.getStyle();

        container.appendChild(div);
    }
}

// Full-cube console logger
function logFull(label) {
    console.group(label);
    cubies.forEach((c, i) => {
        const p = c.position, q = c.quaternion;
        console.log(
            `Cubie ${i}: Pos(${p.x.toFixed(2)},${p.y.toFixed(2)},${p.z.toFixed(2)}) ` +
            `Quat(${q.x.toFixed(2)},${q.y.toFixed(2)},${q.z.toFixed(2)},${q.w.toFixed(2)})`
        );
    });
    console.groupEnd();
}

// Update HUD text
function updateHUD() {
    let txt = '';
    cubies.forEach((c, i) => {
        const p = c.position;
        txt += `Cubie ${i.toString().padStart(2)}: `
            + `Pos(${p.x.toFixed(2)},${p.y.toFixed(2)},${p.z.toFixed(2)})\n`;
    });
    hudCubeState.textContent = txt;

    const c_state = getState();
    const fc_state = computeFCState(c_state);
    hudState.textContent =
        `c_state : [${c_state.join(',')}]\n` +
        `fc_state: [${fc_state.join(',')}]\n` +
        `f_state : [${f_state.join(',')}]`;

    renderFlatNet();
}

// ── Logging 20k moves ─────────────────────────────────────────────────────────
const logBtn = document.getElementById('solve-btn');
logBtn.title = 'Generate 20k cube_log.jsonl';
logBtn.textContent = '📝';
logBtn.addEventListener('click', async () => {
    try {
        const dirH = await window.showDirectoryPicker();
        const fileH = await dirH.getFileHandle('cube_log.jsonl', { create: true });
        const w = await fileH.createWritable({ keepExistingData: false });

        const c0 = getState();
        const fc0 = computeFCState(c0);
        await w.write(JSON.stringify({ move: null, c_state: c0, fc_state: fc0, f_state }) + '\n');

        for (let i = 0; i < 20000; i++) {
            const m = SEQ[Math.floor(Math.random() * SEQ.length)];
            instantRotate(m);

            const ci = getState();
            const fci = computeFCState(ci);
            await w.write(JSON.stringify({ move: m.desc, c_state: ci, fc_state: fci, f_state }) + '\n');
            if ((i + 1) % 1000 === 0) console.log(`Logged ${i + 1}…`);
        }
        await w.close();
        alert('Done.');
    } catch (err) {
        console.error(err);
        alert(err.message);
    }
});

// ── Rotation & Animation ─────────────────────────────────────────────────────
let isAnimating = false, isPaused = false, pauseAfter = false;
let nextId, rotIdx = 0;

function updateControls() {
    mCtrls.querySelectorAll('button').forEach(b => {
        b.disabled = !isPaused || isAnimating;
    });
    randBtn.disabled = !isPaused || isAnimating;
    resetBtn.disabled = isAnimating;
    playBtn.disabled = isAnimating;
    logBtn.disabled = !isPaused || isAnimating;
}

function rotateSlice(axis, coord, dir, dur, onDone, desc) {
    isAnimating = true; updateControls();
    hudMoveInfo.textContent = desc;

    const slice = cubies.filter(c => Math.abs(c.position[axis] - coord) < 0.1);
    const centre = slice.reduce((s, c) => s.add(c.position), new THREE.Vector3())
        .multiplyScalar(1 / slice.length);
    centre[axis] = slice[0].position[axis];

    slice.forEach(c => {
        c._p = c.position.clone();
        c._q = c.quaternion.clone();
    });

    new TWEEN.Tween({ t: 0 })
        .to({ t: 1 }, dur)
        .easing(TWEEN.Easing.Quadratic.InOut)
        .onUpdate(({ t }) => {
            const dq = new THREE.Quaternion().setFromAxisAngle(
                new THREE.Vector3(
                    axis === 'x' ? 1 : 0,
                    axis === 'y' ? 1 : 0,
                    axis === 'z' ? 1 : 0
                ),
                dir * t * Math.PI / 2
            );
            slice.forEach(c => {
                c.position.copy(c._p).sub(centre).applyQuaternion(dq).add(centre);
                c.quaternion.copy(c._q).premultiply(dq);
            });
        })
        .onComplete(() => {
            slice.forEach(c => {
                c.position.set(
                    Math.round(c.position.x / STEP) * STEP,
                    Math.round(c.position.y / STEP) * STEP,
                    Math.round(c.position.z / STEP) * STEP
                );
                const e = new THREE.Euler().setFromQuaternion(c.quaternion, 'XYZ');
                e.x = Math.round(e.x / (Math.PI / 2)) * (Math.PI / 2);
                e.y = Math.round(e.y / (Math.PI / 2)) * (Math.PI / 2);
                e.z = Math.round(e.z / (Math.PI / 2)) * (Math.PI / 2);
                c.quaternion.setFromEuler(e);
                delete c._p; delete c._q;
            });

            const perm = PERM[desc];
            if (perm) {
                f_state = applyPerm(f_state, perm);
            }

            isAnimating = false;
            if (pauseAfter) { isPaused = true; pauseAfter = false; }
            logFull(`After ${desc}`);
            updateHUD(); updateControls();
            onDone && onDone();
        })
        .start();
}

function runNext() {
    if (!isPaused) {
        const m = SEQ[rotIdx++];
        if (rotIdx >= SEQ.length) rotIdx = 0;
        rotateSlice(m.axis, m.coord, m.dir, DURATION_ROTATE, () => {
            nextId = setTimeout(runNext, DURATION_PAUSE);
        }, m.desc);
    }
}

playBtn.addEventListener('click', () => {
    if (isAnimating) {
        pauseAfter = true;
        playBtn.textContent = '▶️';
    } else {
        isPaused = !isPaused;
        if (isPaused) {
            clearTimeout(nextId);
            playBtn.textContent = '▶️';
        } else {
            playBtn.textContent = '⏸️';
            runNext();
        }
    }
    updateControls();
});

mCtrls.addEventListener('click', e => {
    if (e.target.tagName !== 'BUTTON' || !isPaused || isAnimating) return;
    const name = e.target.id.replace('btn-', '');
    const m = ROTATIONS[name]; if (!m) return;
    isPaused = false;
    rotateSlice(m.axis, m.coord, m.dir, DURATION_ROTATE, () => {
        isPaused = true;
        updateControls();
    }, m.desc);
});

randBtn.addEventListener('click', () => {
    if (!isPaused || isAnimating) return;
    isPaused = false;
    let last = null, seq = [];
    for (let i = 0; i < 20; i++) {
        let pick;
        do {
            pick = SEQ[Math.floor(Math.random() * SEQ.length)];
        } while (last && pick.desc[0] === last[0] && pick.desc[1] !== last[1]);
        seq.push(pick);
        last = pick.desc;
    }
    let i = 0;
    (function step() {
        const m = seq[i++];
        rotateSlice(m.axis, m.coord, m.dir, DURATION_RANDOM_ROTATE, () => {
            if (i < seq.length) setTimeout(step, DURATION_RANDOM_PAUSE);
            else { isPaused = true; updateControls(); }
        }, m.desc);
    })();
});

resetBtn.addEventListener('click', () => {
    if (isAnimating) return;
    TWEEN.removeAll(); clearTimeout(nextId);
    cubies.forEach(c => {
        c.position.copy(c.userData.initialPosition);
        c.quaternion.copy(c.userData.initialQuaternion);
    });
    f_state = Array.from({ length: 54 }, (_, i) => i);

    isPaused = true;
    playBtn.textContent = '▶️';
    hudMoveInfo.textContent = 'Reset';
    logFull('After Reset');
    updateHUD();
    updateControls();
});

function instantRotate(m) {
    const { axis, coord, dir } = m;
    const slice = cubies.filter(c => Math.abs(c.position[axis] - coord) < 0.1);
    const centre = slice.reduce((s, c) => s.add(c.position), new THREE.Vector3())
        .multiplyScalar(1 / slice.length);
    centre[axis] = slice[0].position[axis];

    const dq = new THREE.Quaternion().setFromAxisAngle(
        new THREE.Vector3(
            axis === 'x' ? 1 : 0,
            axis === 'y' ? 1 : 0,
            axis === 'z' ? 1 : 0
        ),
        dir * Math.PI / 2
    );
    slice.forEach(c => {
        c.position.copy(c.position).sub(centre).applyQuaternion(dq).add(centre);
        c.quaternion.premultiply(dq);
        c.position.set(
            Math.round(c.position.x / STEP) * STEP,
            Math.round(c.position.y / STEP) * STEP,
            Math.round(c.position.z / STEP) * STEP
        );
        const e = new THREE.Euler().setFromQuaternion(c.quaternion, 'XYZ');
        e.x = Math.round(e.x / (Math.PI / 2)) * (Math.PI / 2);
        e.y = Math.round(e.y / (Math.PI / 2)) * (Math.PI / 2);
        e.z = Math.round(e.z / (Math.PI / 2)) * (Math.PI / 2);
        c.quaternion.setFromEuler(e);
    });
    const perm = PERM[m.desc];
    if (perm) {
        f_state = applyPerm(f_state, perm);
    }
}

// ── Animation Loop & Resize ───────────────────────────────────────────────────
function animate() {
    requestAnimationFrame(animate);
    TWEEN.update();
    controls.update();
    renderer.render(scene, camera);
    gizmo.quaternion.copy(camera.quaternion).invert();
    gizmoRenderer.render(gizmoScene, gizmoCamera);
}
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    gizmoRenderer.setSize(gizmoContainer.clientWidth, gizmoContainer.clientHeight);
    gizmoCamera.updateProjectionMatrix();
});

// ── Start Everything ─────────────────────────────────────────────────────────
logFull('Initial State');
updateHUD();
animate();
playBtn.textContent = '⏸️';
updateControls();
runNext();