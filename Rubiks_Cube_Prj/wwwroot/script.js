// Imports
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import TWEEN from 'tween';

// --- Timing Constants ---
const DURATION_ROTATE = 750;
const DURATION_PAUSE = 1250;
const DURATION_RANDOM_ROTATE = 150;
const DURATION_RANDOM_PAUSE = 50;

// ── Scene, Camera & Renderer --------------------------------------------------
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x333333);
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(0, 0, 8);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.getElementById('canvas-container').appendChild(renderer.domElement);
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;

// ── Lights --------------------------------------------------------------------
scene.add(new THREE.AmbientLight(0xffffff, 0.6));
const dirLight = new THREE.DirectionalLight(0xffffff, 0.6);
dirLight.position.set(10, 20, 5);
scene.add(dirLight);

// ── Cube Constants ------------------------------------------------------------
const CUBE_SIZE = 3;
const CUBIE_WIDTH = 1;
const CUBIE_SPACING = 0.05;
const STEP = CUBIE_WIDTH + CUBIE_SPACING;
const HALF_IDX = (CUBE_SIZE - 1) / 2;

// ── Materials -----------------------------------------------------------------
const colors = { black: 0x000000, white: 0xffffff, yellow: 0xffff00, green: 0x00ff00, blue: 0x0000ff, red: 0xff0000, orange: 0xffa500 };
const faceMats = [
    new THREE.MeshStandardMaterial({ color: colors.red }), new THREE.MeshStandardMaterial({ color: colors.orange }),
    new THREE.MeshStandardMaterial({ color: colors.white }), new THREE.MeshStandardMaterial({ color: colors.yellow }),
    new THREE.MeshStandardMaterial({ color: colors.blue }), new THREE.MeshStandardMaterial({ color: colors.green }),
];
const blackMat = new THREE.MeshStandardMaterial({ color: colors.black });

// ── Build Cubies -------------------------------------------------------------
const cubies = [];
const rubiksCube = new THREE.Group();
scene.add(rubiksCube);
for (let xi = 0; xi < CUBE_SIZE; xi++) {
    for (let yi = 0; yi < CUBE_SIZE; yi++) {
        for (let zi = 0; zi < CUBE_SIZE; zi++) {
            if (xi === HALF_IDX && yi === HALF_IDX && zi === HALF_IDX) continue;
            const pos = new THREE.Vector3((xi - HALF_IDX) * STEP, (yi - HALF_IDX) * STEP, (zi - HALF_IDX) * STEP);
            const mats = [
                pos.x > 0.1 ? faceMats[0] : blackMat, pos.x < -0.1 ? faceMats[1] : blackMat,
                pos.y > 0.1 ? faceMats[2] : blackMat, pos.y < -0.1 ? faceMats[3] : blackMat,
                pos.z > 0.1 ? faceMats[4] : blackMat, pos.z < -0.1 ? faceMats[5] : blackMat
            ];
            const mesh = new THREE.Mesh(new RoundedBoxGeometry(CUBIE_WIDTH, CUBIE_WIDTH, CUBIE_WIDTH, 4, 0.1), mats);
            mesh.position.copy(pos);
            cubies.push(mesh);
            rubiksCube.add(mesh);
        }
    }
}

// ── Systematic Rotation Definitions -----------------------------------------
const ROTATIONS = {
    'R+': { name: 'R+', axis: 'x', coord: STEP, dir: 1, desc: '(x, y, z) → (x, z, -y)' },
    'R-': { name: 'R-', axis: 'x', coord: STEP, dir: -1, desc: '(x, y, z) → (x, -z, y)' },
    'L+': { name: 'L+', axis: 'x', coord: -STEP, dir: 1, desc: '(x, y, z) → (x, z, -y)' },
    'L-': { name: 'L-', axis: 'x', coord: -STEP, dir: -1, desc: '(x, y, z) → (x, -z, y)' },
    'M+': { name: 'M+', axis: 'x', coord: 0, dir: 1, desc: '(x, y, z) → (x, z, -y)' },
    'M-': { name: 'M-', axis: 'x', coord: 0, dir: -1, desc: '(x, y, z) → (x, -z, y)' },
    'U+': { name: 'U+', axis: 'y', coord: STEP, dir: -1, desc: '(x, y, z) → (z, y, -x)' },
    'U-': { name: 'U-', axis: 'y', coord: STEP, dir: 1, desc: '(x, y, z) → (-z, y, x)' },
    'D+': { name: 'D+', axis: 'y', coord: -STEP, dir: -1, desc: '(x, y, z) → (z, y, -x)' },
    'D-': { name: 'D-', axis: 'y', coord: -STEP, dir: 1, desc: '(x, y, z) → (-z, y, x)' },
    'E+': { name: 'E+', axis: 'y', coord: 0, dir: -1, desc: '(x, y, z) → (z, y, -x)' },
    'E-': { name: 'E-', axis: 'y', coord: 0, dir: 1, desc: '(x, y, z) → (-z, y, x)' },
    'F+': { name: 'F+', axis: 'z', coord: STEP, dir: -1, desc: '(x, y, z) → (-y, x, z)' },
    'F-': { name: 'F-', axis: 'z', coord: STEP, dir: 1, desc: '(x, y, z) → (y, -x, z)' },
    'B+': { name: 'B+', axis: 'z', coord: -STEP, dir: -1, desc: '(x, y, z) → (-y, x, z)' },
    'B-': { name: 'B-', axis: 'z', coord: -STEP, dir: 1, desc: '(x, y, z) → (y, -x, z)' },
    'S+': { name: 'S+', axis: 'z', coord: 0, dir: -1, desc: '(x, y, z) → (-y, x, z)' },
    'S-': { name: 'S-', axis: 'z', coord: 0, dir: 1, desc: '(x, y, z) → (y, -x, z)' },
};
const ROTATION_SEQUENCE = [
    ROTATIONS['L+'], ROTATIONS['L-'], ROTATIONS['M+'], ROTATIONS['M-'], ROTATIONS['R+'], ROTATIONS['R-'],
    ROTATIONS['D+'], ROTATIONS['D-'], ROTATIONS['E+'], ROTATIONS['E-'], ROTATIONS['U+'], ROTATIONS['U-'],
    ROTATIONS['B+'], ROTATIONS['B-'], ROTATIONS['S+'], ROTATIONS['S-'], ROTATIONS['F+'], ROTATIONS['F-'],
];

// ── HUD & Telemetry -----------------------------------------------------------
const hudMoveInfo = document.getElementById('hud-move-info');
const hudCubeState = document.getElementById('hud-cube-state');
const playPauseBtn = document.getElementById('play-pause-btn');
const manualControlsContainer = document.getElementById('manual-controls');
const randomizeBtn = document.getElementById('randomize-btn');

function updateHudState() {
    let stateText = '';
    cubies.forEach((c, i) => {
        const p = c.position;
        stateText += `Cubie ${String(i).padStart(2)}: Pos(${p.x.toFixed(2)}, ${p.y.toFixed(2)}, ${p.z.toFixed(2)}) \n`;
    });
    hudCubeState.textContent = stateText;
}

function logFullCubeState(label) {
    console.group(label);
    cubies.forEach((c, i) => {
        const p = c.position, q = c.quaternion;
        console.log(`Cubie ${i}: Pos(${p.x.toFixed(2)}, ${p.y.toFixed(2)}, ${p.z.toFixed(2)}) | Quat(${q.x.toFixed(2)}, ${q.y.toFixed(2)}, ${q.z.toFixed(2)}, ${q.w.toFixed(2)})`);
    });
    console.groupEnd();
}

// ── Helpers -------------------------------------------------------------------
const snap = v => Math.round(v / STEP) * STEP;
function findSliceByCoord(axisChar, coord) { return cubies.filter(c => Math.abs(c.position[axisChar] - coord) < 0.1); }
function sliceCentre(slice, axisChar) {
    const sum = new THREE.Vector3();
    slice.forEach(c => sum.add(c.position));
    sum.multiplyScalar(1 / slice.length);
    sum[axisChar] = slice[0].position[axisChar];
    return sum;
}

// ── Rotation Logic ------------------------------------------------------------
let isAnimating = false;
let isPaused = false;
let shouldPauseAfterMove = false;

function rotateSlice(normal, axisChar, coord, dir, duration, onComplete) {
    isAnimating = true;
    updateManualControlsState();
    const slice = findSliceByCoord(axisChar, coord);
    const centre = sliceCentre(slice, axisChar);
    const angle = dir * Math.PI / 2;
    slice.forEach(c => { c._prePos = c.position.clone(); c._preQuat = c.quaternion.clone(); });
    new TWEEN.Tween({ t: 0 })
        .to({ t: 1 }, duration)
        .easing(TWEEN.Easing.Quadratic.InOut)
        .onUpdate(({ t }) => {
            const dq = new THREE.Quaternion().setFromAxisAngle(normal, angle * t);
            slice.forEach(c => {
                c.position.copy(c._prePos).sub(centre).applyQuaternion(dq).add(centre);
                c.quaternion.copy(c._preQuat).premultiply(dq);
            });
        })
        .onComplete(() => {
            slice.forEach(c => {
                c.position.set(snap(c.position.x), snap(c.position.y), snap(c.position.z));
                const e = new THREE.Euler().setFromQuaternion(c.quaternion, 'XYZ');
                e.x = Math.round(e.x / (Math.PI / 2)) * (Math.PI / 2); e.y = Math.round(e.y / (Math.PI / 2)) * (Math.PI / 2); e.z = Math.round(e.z / (Math.PI / 2)) * (Math.PI / 2);
                c.quaternion.setFromEuler(e);
                delete c._prePos; delete c._preQuat;
            });
            isAnimating = false;
            if (shouldPauseAfterMove) { isPaused = true; shouldPauseAfterMove = false; }
            updateManualControlsState();
            if (onComplete) onComplete();
        })
        .start();
}

// ── Animation Sequencer & Controls --------------------------------------------
let nextMoveTimeoutId = null;
let currentRotationIndex = 0;

function runNextRotation() {
    const move = ROTATION_SEQUENCE[currentRotationIndex];
    const dirLabel = move.dir < 0 ? 'CW' : 'CCW';
    hudMoveInfo.textContent = `Auto Move: ${move.name} (${dirLabel}) \nTransformation: ${move.desc} `;
    const rotNormal = new THREE.Vector3(move.axis === 'x' ? 1 : 0, move.axis === 'y' ? 1 : 0, move.axis === 'z' ? 1 : 0);
    const onComplete = () => {
        logFullCubeState(`After Rotation(${move.name})`);
        currentRotationIndex = (currentRotationIndex + 1) % ROTATION_SEQUENCE.length;
        scheduleNextRotation();
    };
    rotateSlice(rotNormal, move.axis, move.coord, move.dir, DURATION_ROTATE, onComplete);
}

function scheduleNextRotation() {
    if (isPaused) return;
    nextMoveTimeoutId = setTimeout(runNextRotation, DURATION_PAUSE);
}

function updateManualControlsState() {
    const buttons = manualControlsContainer.getElementsByTagName('button');
    for (const btn of buttons) {
        btn.disabled = !isPaused || isAnimating;
    }
}

playPauseBtn.addEventListener('click', () => {
    if (isAnimating) {
        shouldPauseAfterMove = true;
        playPauseBtn.textContent = '▶️';
        console.log("Animation: OFF (pending current move)");
    } else {
        isPaused = !isPaused;
        if (isPaused) {
            clearTimeout(nextMoveTimeoutId);
            playPauseBtn.textContent = '▶️';
            console.log("Animation: OFF");
        } else {
            playPauseBtn.textContent = '⏸️';
            console.log("Animation: ON");
            scheduleNextRotation();
        }
    }
    updateManualControlsState();
});

manualControlsContainer.addEventListener('click', (event) => {
    if (event.target.tagName !== 'BUTTON' || event.target.id === 'randomize-btn' || !isPaused || isAnimating) return;
    const moveId = event.target.id.replace('btn-', '');
    const move = ROTATIONS[moveId];
    if (!move) return;

    console.log(`Manual Move Triggered: ${move.name}`);
    const dirLabel = move.dir < 0 ? 'CW' : 'CCW';
    hudMoveInfo.textContent = `Manual Move: ${move.name} (${dirLabel})\nTransformation: ${move.desc}`;

    isPaused = false;
    const rotNormal = new THREE.Vector3(move.axis === 'x' ? 1 : 0, move.axis === 'y' ? 1 : 0, move.axis === 'z' ? 1 : 0);
    rotateSlice(rotNormal, move.axis, move.coord, move.dir, DURATION_ROTATE, () => {
        logFullCubeState(`After Rotation (${move.name})`);
        isPaused = true;
        updateManualControlsState();
    });
});

// ── Randomizer Logic ------------------------------------------------------------
const MOVES_BY_AXIS = {
    x: ['R+', 'R-', 'L+', 'L-', 'M+', 'M-'],
    y: ['U+', 'U-', 'D+', 'D-', 'E+', 'E-'],
    z: ['F+', 'F-', 'B+', 'B-', 'S+', 'S-']
};
const INVERSE_MOVES = {
    'R+': 'R-', 'R-': 'R+', 'L+': 'L-', 'L-': 'L+', 'M+': 'M-', 'M-': 'M+',
    'U+': 'U-', 'U-': 'U+', 'D+': 'D-', 'D-': 'D+', 'E+': 'E-', 'E-': 'E+',
    'F+': 'F-', 'F-': 'F+', 'B+': 'B-', 'B-': 'B+', 'S+': 'S-', 'S-': 'S+'
};

function generateScrambleSequence() {
    const axisPool = [
        ...'xxxxxxx'.split(''),
        ...'yyyyyyy'.split(''),
        ...'zzzzzz'.split('')
    ];
    for (let i = axisPool.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [axisPool[i], axisPool[j]] = [axisPool[j], axisPool[i]];
    }

    const sequence = [];
    let lastMoveName = null;

    for (const axis of axisPool) {
        const possibleMoves = MOVES_BY_AXIS[axis];
        let chosenMoveName;
        do {
            chosenMoveName = possibleMoves[Math.floor(Math.random() * possibleMoves.length)];
        } while (lastMoveName && chosenMoveName === INVERSE_MOVES[lastMoveName]);

        sequence.push(ROTATIONS[chosenMoveName]);
        lastMoveName = chosenMoveName;
    }
    console.log("Generated Scramble Sequence:", sequence.map(m => m.name).join(' '));
    return sequence;
}

let currentScrambleIndex = 0;
function runScrambleSequence(sequence) {
    const move = sequence[currentScrambleIndex];
    const dirLabel = move.dir < 0 ? 'CW' : 'CCW';
    hudMoveInfo.textContent = `Scrambling: ${move.name} (${dirLabel}) [${currentScrambleIndex + 1}/20]`;

    const rotNormal = new THREE.Vector3(move.axis === 'x' ? 1 : 0, move.axis === 'y' ? 1 : 0, move.axis === 'z' ? 1 : 0);
    const onComplete = () => {
        logFullCubeState(`After Scramble Move ${currentScrambleIndex + 1} (${move.name})`);
        currentScrambleIndex++;
        if (currentScrambleIndex < sequence.length) {
            setTimeout(() => runScrambleSequence(sequence), DURATION_RANDOM_PAUSE);
        } else {
            console.log("Scramble complete.");
            hudMoveInfo.textContent = "Scramble Complete. Paused.";
            isPaused = true;
            updateManualControlsState();
        }
    };
    rotateSlice(rotNormal, move.axis, move.coord, move.dir, DURATION_RANDOM_ROTATE, onComplete);
}

randomizeBtn.addEventListener('click', () => {
    if (!isPaused || isAnimating) return;

    console.log("--- Scramble Started ---");
    isPaused = false;

    const sequence = generateScrambleSequence();
    currentScrambleIndex = 0;
    runScrambleSequence(sequence);
});

// ── Animation Loop & Window Resize --------------------------------------------
function animate() {
    requestAnimationFrame(animate);
    if (!isPaused) TWEEN.update();
    controls.update();
    updateHudState();
    renderer.render(scene, camera);
}

// --- Start Everything ---
logFullCubeState('Initial State');
animate();
console.log("Animation: ON");
updateManualControlsState();
scheduleNextRotation();

window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});