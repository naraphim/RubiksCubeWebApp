// script.js

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
    new THREE.MeshStandardMaterial({ color: colors.red }),
    new THREE.MeshStandardMaterial({ color: colors.orange }),
    new THREE.MeshStandardMaterial({ color: colors.white }),
    new THREE.MeshStandardMaterial({ color: colors.yellow }),
    new THREE.MeshStandardMaterial({ color: colors.blue }),
    new THREE.MeshStandardMaterial({ color: colors.green })
];
const blackMat = new THREE.MeshStandardMaterial({ color: colors.black });

const cubies = [];
const rubiksCube = new THREE.Group();
scene.add(rubiksCube);

// build cubies
for (let x = 0; x < CUBE_SIZE; x++) {
    for (let y = 0; y < CUBE_SIZE; y++) {
        for (let z = 0; z < CUBE_SIZE; z++) {
            if (x === HALF && y === HALF && z === HALF) continue;
            const pos = new THREE.Vector3(
                (x - HALF) * STEP, (y - HALF) * STEP, (z - HALF) * STEP
            );
            const mats = [
                pos.x > 0.1 ? faceMats[0] : blackMat,
                pos.x < -0.1 ? faceMats[1] : blackMat,
                pos.y > 0.1 ? faceMats[2] : blackMat,
                pos.y < -0.1 ? faceMats[3] : blackMat,
                pos.z > 0.1 ? faceMats[4] : blackMat,
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
    'R+': { axis: 'x', coord: STEP, dir: 1, desc: 'R+' },
    'R-': { axis: 'x', coord: STEP, dir: -1, desc: 'R-' },
    'L+': { axis: 'x', coord: -STEP, dir: 1, desc: 'L+' },
    'L-': { axis: 'x', coord: -STEP, dir: -1, desc: 'L-' },
    'M+': { axis: 'x', coord: 0, dir: 1, desc: 'M+' },
    'M-': { axis: 'x', coord: 0, dir: -1, desc: 'M-' },

    'U+': { axis: 'y', coord: STEP, dir: -1, desc: 'U+' },
    'U-': { axis: 'y', coord: STEP, dir: 1, desc: 'U-' },
    'D+': { axis: 'y', coord: -STEP, dir: -1, desc: 'D+' },
    'D-': { axis: 'y', coord: -STEP, dir: 1, desc: 'D-' },
    'E+': { axis: 'y', coord: 0, dir: -1, desc: 'E+' },
    'E-': { axis: 'y', coord: 0, dir: 1, desc: 'E-' },

    'F+': { axis: 'z', coord: STEP, dir: -1, desc: 'F+' },
    'F-': { axis: 'z', coord: STEP, dir: 1, desc: 'F-' },
    'B+': { axis: 'z', coord: -STEP, dir: -1, desc: 'B+' },
    'B-': { axis: 'z', coord: -STEP, dir: 1, desc: 'B-' },
    'S+': { axis: 'z', coord: 0, dir: -1, desc: 'S+' },
    'S-': { axis: 'z', coord: 0, dir: 1, desc: 'S-' }
};
const SEQ = Object.values(ROTATIONS);

// ── Helpers: c_state & fc_state ────────────────────────────────────────────────
function getState() {
    return cubies.map(c => {
        const p = c.position;
        const key = `${p.x.toFixed(2)},${p.y.toFixed(2)},${p.z.toFixed(2)}`;
        return initialMap.get(key);
    });
}

// fc_state: “face→cubie” (54 entries)
const FACELET_TO_SLOT = [
    6, 7, 8, 14, 15, 16, 22, 23, 24,
    17, 18, 19, 20, 21, 22, 23, 24, 25,
    2, 5, 8, 11, 13, 16, 19, 22, 25,
    0, 1, 2, 9, 10, 11, 17, 18, 19,
    0, 1, 2, 3, 4, 5, 6, 7, 8,
    0, 3, 6, 9, 12, 14, 17, 20, 23
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

// ── Build & track all 54 facelet positions ───────────────────────────────────
const faceletPos = [];
const faceletOrig = [];

// helper to push 9 positions for a face
function buildFace(face, rowMap, colMap) {
    // row=0..2, col=0..2
    for (let r = 0; r < 3; r++) {
        for (let c = 0; c < 3; c++) {
            let x, y, z;
            switch (face) {
                case 'U': y = STEP; z = -(r - 1) * STEP; x = (c - 1) * STEP; break;
                case 'R': x = STEP; y = (1 - r) * STEP; z = (c - 1) * STEP; break;
                case 'F': z = STEP; y = (1 - r) * STEP; x = (c - 1) * STEP; break;
                case 'D': y = -STEP; z = (r - 1) * STEP; x = (c - 1) * STEP; break;
                case 'L': x = -STEP; y = (1 - r) * STEP; z = (1 - c) * STEP; break;
                case 'B': z = -STEP; y = (1 - r) * STEP; x = (1 - c) * STEP; break;
            }
            const v = new THREE.Vector3(x, y, z);
            faceletPos.push(v.clone());
            faceletOrig.push(v.clone());
        }
    }
}
// build in U,R,F,D,L,B order
;['U', 'R', 'F', 'D', 'L', 'B'].forEach(f => buildFace(f));

// f_state: facelet→facelet (initially identity)
let f_state = Array.from({ length: 54 }, (_, i) => i);

// ── HUD & Telemetry Setup ────────────────────────────────────────────────────
const hudMoveInfo = document.getElementById('hud-move-info');
const hudCubeState = document.getElementById('hud-cube-state');
const playBtn = document.getElementById('play-pause-btn');
const randBtn = document.getElementById('randomize-btn');
const resetBtn = document.getElementById('reset-btn');
const mCtrls = document.getElementById('manual-controls');

// inject state‐line
const stateLine = document.createElement('pre');
stateLine.style.cssText = `
  margin: .5em 0;
  font-size: .75em;
  white-space: pre-wrap;
  word-break: break-word;
`;
mCtrls.parentNode.insertBefore(stateLine, mCtrls);
mCtrls.style.cssText = `display:flex;gap:.5em;flex-wrap:wrap;`;

const logBtn = document.createElement('button');
logBtn.id = 'log-btn';
logBtn.textContent = '📝';
logBtn.title = 'Generate 20k cube_log.jsonl';
logBtn.disabled = true;
mCtrls.appendChild(logBtn);

function updateHUD() {
    let txt = '';
    cubies.forEach((c, i) => {
        const p = c.position;
        txt += `Cubie ${i.toString().padStart(2)}: Pos(${p.x.toFixed(2)},${p.y.toFixed(2)},${p.z.toFixed(2)})\n`;
    });
    hudCubeState.textContent = txt;

    const c_state = getState();
    const fc_state = computeFCState(c_state);
    stateLine.textContent =
        `c_state:[${c_state.join(',')}]\n` +
        `fc_state:[${fc_state.join(',')}]\n` +
        `f_state:  [${f_state.join(',')}]`;
}

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

// ── Logging 20k moves ─────────────────────────────────────────────────────────
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
            rotateFacelets(m);

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

// ── Facelet‐rotation helper ───────────────────────────────────────────────────
function rotateFacelets(m) {
    // find which facelets lie on the slice
    const slice = faceletPos
        .map((v, i) => Math.abs(v[m.axis] - m.coord) < 0.1 ? i : -1)
        .filter(i => i >= 0);

    // record pre‐positions
    const pre = slice.map(i => faceletPos[i].clone());

    const center = slice
        .reduce((s, i) => s.add(faceletPos[i]), new THREE.Vector3())
        .multiplyScalar(1 / slice.length);
    center[m.axis] = faceletPos[slice[0]][m.axis];

    const quat = new THREE.Quaternion().setFromAxisAngle(
        new THREE.Vector3(
            m.axis === 'x' ? 1 : 0,
            m.axis === 'y' ? 1 : 0,
            m.axis === 'z' ? 1 : 0
        ),
        m.dir * Math.PI / 2
    );

    // rotate them
    slice.forEach((i, j) => {
        faceletPos[i]
            .copy(pre[j])
            .sub(center)
            .applyQuaternion(quat)
            .add(center);
        // snap
        faceletPos[i].set(
            Math.round(faceletPos[i].x / STEP) * STEP,
            Math.round(faceletPos[i].y / STEP) * STEP,
            Math.round(faceletPos[i].z / STEP) * STEP
        );
    });

    // re‐compute f_state: for each current index i, find k so that faceletPos[i]==faceletOrig[k]
    const lookup = faceletOrig.map((orig, i) => [orig.toArray().map(n => n.toFixed(3)).join(','), i]);
    const map = new Map(lookup);
    f_state = faceletPos
        .map(v => {
            const key = v.toArray().map(n => n.toFixed(3)).join(',');
            return map.get(key);
        });
}

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

    slice.forEach(c => { c._p = c.position.clone(); c._q = c.quaternion.clone(); });

    new TWEEN.Tween({ t: 0 })
        .to({ t: 1 }, dur)
        .easing(TWEEN.Easing.Quadratic.InOut)
        .onUpdate(({ t }) => {
            const dq = new THREE.Quaternion().setFromAxisAngle(
                new THREE.Vector3(axis === 'x' ? 1 : 0, axis === 'y' ? 1 : 0, axis === 'z' ? 1 : 0),
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

            // when done, also rotate the facelets
            rotateFacelets({ axis, coord, dir });

            isAnimating = false;
            if (pauseAfter) { isPaused = true; pauseAfter = false; }
            logFull(`After ${desc}`);
            updateHUD();
            updateControls();
            if (onDone) onDone();
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
        pauseAfter = true; playBtn.textContent = '▶️';
    } else {
        isPaused = !isPaused;
        if (isPaused) {
            clearTimeout(nextId); playBtn.textContent = '▶️';
        } else {
            playBtn.textContent = '⏸️'; runNext();
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
        isPaused = true; updateControls();
    }, m.desc);
});

randBtn.addEventListener('click', () => {
    if (!isPaused || isAnimating) return;
    isPaused = false;
    let last = null, seq = [];
    for (let i = 0; i < 20; i++) {
        let pick;
        do { pick = SEQ[Math.floor(Math.random() * SEQ.length)]; }
        while (last && pick.desc[0] === last[0] && pick.desc[1] !== last[1]);
        seq.push(pick); last = pick.desc;
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
    // also reset facelets
    faceletPos.forEach((v, i) => v.copy(faceletOrig[i]));
    f_state = Array.from({ length: 54 }, (_, i) => i);

    isPaused = true; playBtn.textContent = '▶️';
    hudMoveInfo.textContent = 'Reset';
    logFull('After Reset');
    updateHUD(); updateControls();
});

// instantRotate for logging
function instantRotate(m) {
    const { axis, coord, dir } = m;
    const slice = cubies.filter(c => Math.abs(c.position[axis] - coord) < 0.1);
    const centre = slice.reduce((s, c) => s.add(c.position), new THREE.Vector3())
        .multiplyScalar(1 / slice.length);
    centre[axis] = slice[0].position[axis];
    const quat = new THREE.Quaternion().setFromAxisAngle(
        new THREE.Vector3(axis === 'x' ? 1 : 0, axis === 'y' ? 1 : 0, axis === 'z' ? 1 : 0),
        dir * Math.PI / 2
    );
    slice.forEach(c => {
        c.position.copy(c.position).sub(centre).applyQuaternion(quat).add(centre);
        c.quaternion.premultiply(quat);
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

    // also update facelets instantly
    rotateFacelets({ axis, coord, dir });
}

// ── Animation Loop & Resize ───────────────────────────────────────────────────
function animate() {
    requestAnimationFrame(animate);
    if (!isPaused) TWEEN.update();
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