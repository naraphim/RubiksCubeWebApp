// ──────────────────────────────────────────────────────────────────────────────
// script.js — Rubik’s Cube w/ full telemetry logging + cw/ccw outer & middle rotations
// now with corrected pause logic and restored mouse telemetry
// ──────────────────────────────────────────────────────────────────────────────

// Imports
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import TWEEN from 'tween';

// --- Timing Constants ---
const DURATION_ROTATE = 750;
const DURATION_PAUSE = 1250;

// ── Scene, Camera & Renderer --------------------------------------------------
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x333333);

const camera = new THREE.PerspectiveCamera(
    75,
    window.innerWidth / window.innerHeight,
    0.1,
    1000
);
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
const colors = {
    black: 0x000000,
    white: 0xffffff,
    yellow: 0xffff00,
    green: 0x00ff00,
    blue: 0x0000ff,
    red: 0xff0000,
    orange: 0xffa500,
};

const faceMats = [
    new THREE.MeshStandardMaterial({ color: colors.red }), // +X
    new THREE.MeshStandardMaterial({ color: colors.orange }), // -X
    new THREE.MeshStandardMaterial({ color: colors.white }), // +Y
    new THREE.MeshStandardMaterial({ color: colors.yellow }), // -Y
    new THREE.MeshStandardMaterial({ color: colors.blue }), // +Z
    new THREE.MeshStandardMaterial({ color: colors.green }), // -Z
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
                pos.z > 0.1 ? faceMats[4] : blackMat, pos.z < -0.1 ? faceMats[5] : blackMat,
            ];
            const mesh = new THREE.Mesh(new RoundedBoxGeometry(CUBIE_WIDTH, CUBIE_WIDTH, CUBIE_WIDTH, 4, 0.1), mats);
            mesh.position.copy(pos);
            cubies.push(mesh);
            rubiksCube.add(mesh);
        }
    }
}

// ── Systematic Rotation Definitions ------------------------------------------
const ROTATIONS = [
    { name: 'R+', axis: 'x', coord: STEP, dir: -1, desc: '(x, y, z) → (x, -z, y)' }, { name: 'R-', axis: 'x', coord: STEP, dir: 1, desc: '(x, y, z) → (x, z, -y)' },
    { name: 'L+', axis: 'x', coord: -STEP, dir: 1, desc: '(x, y, z) → (x, z, -y)' }, { name: 'L-', axis: 'x', coord: -STEP, dir: -1, desc: '(x, y, z) → (x, -z, y)' },
    { name: 'M+', axis: 'x', coord: 0, dir: 1, desc: '(x, y, z) → (x, z, -y)' }, { name: 'M-', axis: 'x', coord: 0, dir: -1, desc: '(x, y, z) → (x, -z, y)' },
    { name: 'U+', axis: 'y', coord: STEP, dir: -1, desc: '(x, y, z) → (z, y, -x)' }, { name: 'U-', axis: 'y', coord: STEP, dir: 1, desc: '(x, y, z) → (-z, y, x)' },
    { name: 'D+', axis: 'y', coord: -STEP, dir: 1, desc: '(x, y, z) → (-z, y, x)' }, { name: 'D-', axis: 'y', coord: -STEP, dir: -1, desc: '(x, y, z) → (z, y, -x)' },
    { name: 'E+', axis: 'y', coord: 0, dir: 1, desc: '(x, y, z) → (-z, y, x)' }, { name: 'E-', axis: 'y', coord: 0, dir: -1, desc: '(x, y, z) → (z, y, -x)' },
    { name: 'F+', axis: 'z', coord: STEP, dir: -1, desc: '(x, y, z) → (-y, x, z)' }, { name: 'F-', axis: 'z', coord: STEP, dir: 1, desc: '(x, y, z) → (y, -x, z)' },
    { name: 'B+', axis: 'z', coord: -STEP, dir: 1, desc: '(x, y, z) → (y, -x, z)' }, { name: 'B-', axis: 'z', coord: -STEP, dir: -1, desc: '(x, y, z) → (-y, x, z)' },
    { name: 'S+', axis: 'z', coord: 0, dir: -1, desc: '(x, y, z) → (-y, x, z)' }, { name: 'S-', axis: 'z', coord: 0, dir: 1, desc: '(x, y, z) → (y, -x, z)' },
];

// ── HUD & Telemetry -----------------------------------------------------------
const hudMoveInfo = document.getElementById('hud-move-info');
const hudCubeState = document.getElementById('hud-cube-state');
const playPauseBtn = document.getElementById('play-pause-btn');

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
function sliceCentre(slice, axisChar) { const sum = new THREE.Vector3(); slice.forEach(c => sum.add(c.position)); sum.multiplyScalar(1 / slice.length); sum[axisChar] = slice[0].position[axisChar]; return sum; }

// --- MODIFIED: Restore full input logging ---
const pointerDown = new THREE.Vector2();
const CLICK_TOLERANCE = 5;

renderer.domElement.addEventListener('mousedown', e => {
    pointerDown.set(e.clientX, e.clientY);
});

renderer.domElement.addEventListener('mouseup', e => {
    const x = e.clientX, y = e.clientY;
    const dist = Math.hypot(x - pointerDown.x, y - pointerDown.y);

    if (dist < CLICK_TOLERANCE) {
        console.log(`Click @(${x}, ${y})`);
        // Note: We are not calling handleClick(e) here because the animation is automated.
        // This is purely for telemetry.
    } else {
        console.log(`Drag from(${pointerDown.x}, ${pointerDown.y}) → (${x}, ${y})`);
    }
});
renderer.domElement.addEventListener('contextmenu', e => e.preventDefault());

// ── Rotation Logic ------------------------------------------------------------
let isAnimating = false;
let isPaused = false;
let shouldPauseAfterMove = false;

function rotateSlice(normal, axisChar, coord, dir, onComplete) {
    isAnimating = true;
    const slice = findSliceByCoord(axisChar, coord);
    const centre = sliceCentre(slice, axisChar);
    const angle = dir * (Math.PI / 2);

    slice.forEach(c => { c._prePos = c.position.clone(); c._preQuat = c.quaternion.clone(); });

    new TWEEN.Tween({ t: 0 })
        .to({ t: 1 }, DURATION_ROTATE)
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
                e.x = Math.round(e.x / (Math.PI / 2)) * (Math.PI / 2);
                e.y = Math.round(e.y / (Math.PI / 2)) * (Math.PI / 2);
                e.z = Math.round(e.z / (Math.PI / 2)) * (Math.PI / 2);
                c.quaternion.setFromEuler(e);
                delete c._prePos; delete c._preQuat;
            });
            isAnimating = false;
            if (shouldPauseAfterMove) { isPaused = true; shouldPauseAfterMove = false; }
            if (onComplete) onComplete();
        })
        .start();
}

// ── Animation Sequencer & Controls --------------------------------------------
let nextMoveTimeoutId = null;
let currentRotationIndex = 0;

function runNextRotation() {
    const move = ROTATIONS[currentRotationIndex];
    const dirLabel = move.dir < 0 ? 'CW' : 'CCW';
    hudMoveInfo.textContent = `Move: ${move.name} (${dirLabel}) \nTransformation: ${move.desc} `;
    const rotNormal = new THREE.Vector3(move.axis === 'x' ? 1 : 0, move.axis === 'y' ? 1 : 0, move.axis === 'z' ? 1 : 0);
    const onComplete = () => {
        logFullCubeState(`After Rotation(${move.name})`);
        currentRotationIndex = (currentRotationIndex + 1) % ROTATIONS.length;
        scheduleNextRotation();
    };
    rotateSlice(rotNormal, move.axis, move.coord, move.dir, onComplete);
}

function scheduleNextRotation() {
    if (isPaused) return;
    nextMoveTimeoutId = setTimeout(runNextRotation, DURATION_PAUSE);
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
scheduleNextRotation();

window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});