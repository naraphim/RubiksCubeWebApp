// script.js

// ── Imports & Timing Constants ────────────────────────────────────────────────
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import TWEEN from 'tween';

const DURATION_ROTATE        = 750;
const DURATION_PAUSE         = 1250;
const DURATION_RANDOM_ROTATE = 150;
const DURATION_RANDOM_PAUSE  = 50;

// ── Scene, Camera & Renderer ─────────────────────────────────────────────────
const scene    = new THREE.Scene();
scene.background = new THREE.Color(0x333333);

const camera   = new THREE.PerspectiveCamera(
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

// ── Input Logging ───────────────────────────────────────────────────────────
const pointerDown     = new THREE.Vector2();
const CLICK_TOLERANCE = 5;

renderer.domElement.addEventListener('mousedown', e => {
  console.log(`Mousedown at(${ e.clientX }, ${ e.clientY })`);
  pointerDown.set(e.clientX, e.clientY);
});
renderer.domElement.addEventListener('mouseup', e => {
  console.log(`Mouseup   at(${ e.clientX }, ${ e.clientY })`);
  const up = new THREE.Vector2(e.clientX, e.clientY);
  if (pointerDown.distanceTo(up) >= CLICK_TOLERANCE) {
    console.log(`Drag from(${ pointerDown.x }, ${ pointerDown.y }) → (${ e.clientX }, ${ e.clientY })`);
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
const gizmoRenderer  = new THREE.WebGLRenderer({ antialias: true, alpha: true });
gizmoRenderer.setSize(gizmoContainer.clientWidth, gizmoContainer.clientHeight);
gizmoContainer.appendChild(gizmoRenderer.domElement);

const gizmoScene  = new THREE.Scene();
const gizmoCamera = new THREE.OrthographicCamera(-2.5, 2.5, 2.5, -2.5, 0.1, 100);
gizmoCamera.position.set(0, 0, 10);

const gizmo      = new THREE.Group();
const axisLen    = 1.5, headLen = 0.5, headWid = 0.35;
[
  { dir: [ 1, 0, 0 ], col: 0xcc2222 },
  { dir: [-1, 0, 0 ], col: 0xcc2222 },
  { dir: [ 0, 1, 0 ], col: 0x2222cc },
  { dir: [ 0,-1, 0 ], col: 0x2222cc },
  { dir: [ 0, 0, 1 ], col: 0x22cc22 },
  { dir: [ 0, 0,-1 ], col: 0x22cc22 }
].forEach(({ dir, col }) => {
  gizmo.add(new THREE.ArrowHelper(
    new THREE.Vector3(...dir),
    new THREE.Vector3(0, 0, 0),
    axisLen, col, headLen, headWid
  ));
});
gizmoScene.add(gizmo);

// ── Cube Constants & Build Logic ─────────────────────────────────────────────
const CUBE_SIZE     = 3;
const CUBIE_WIDTH   = 1;
const CUBIE_SPACING = 0.05;
const STEP          = CUBIE_WIDTH + CUBIE_SPACING;
const HALF_IDX      = (CUBE_SIZE - 1) / 2;

const colors = {
  black:  0x000000,
  white:  0xffffff,
  yellow: 0xffff00,
  green:  0x00ff00,
  blue:   0x0000ff,
  red:    0xff0000,
  orange: 0xffa500
};

const faceMats = [
  new THREE.MeshStandardMaterial({ color: colors.red    }),
  new THREE.MeshStandardMaterial({ color: colors.orange }),
  new THREE.MeshStandardMaterial({ color: colors.white  }),
  new THREE.MeshStandardMaterial({ color: colors.yellow }),
  new THREE.MeshStandardMaterial({ color: colors.blue   }),
  new THREE.MeshStandardMaterial({ color: colors.green  })
];
const blackMat = new THREE.MeshStandardMaterial({ color: colors.black });

const cubies     = [];
const rubiksCube = new THREE.Group();
scene.add(rubiksCube);

for (let xi = 0; xi < CUBE_SIZE; xi++) {
  for (let yi = 0; yi < CUBE_SIZE; yi++) {
    for (let zi = 0; zi < CUBE_SIZE; zi++) {
      if (xi === HALF_IDX && yi === HALF_IDX && zi === HALF_IDX) continue;
      const pos = new THREE.Vector3(
        (xi - HALF_IDX) * STEP,
        (yi - HALF_IDX) * STEP,
        (zi - HALF_IDX) * STEP
      );
      const mats = [
        pos.x >  0.1 ? faceMats[0] : blackMat,
        pos.x < -0.1 ? faceMats[1] : blackMat,
        pos.y >  0.1 ? faceMats[2] : blackMat,
        pos.y < -0.1 ? faceMats[3] : blackMat,
        pos.z >  0.1 ? faceMats[4] : blackMat,
        pos.z < -0.1 ? faceMats[5] : blackMat
      ];
      const mesh = new THREE.Mesh(
        new RoundedBoxGeometry(CUBIE_WIDTH, CUBIE_WIDTH, CUBIE_WIDTH, 4, 0.1),
        mats
      );
      mesh.position.copy(pos);
      mesh.userData.initialPosition   = pos.clone();
      mesh.userData.initialQuaternion = mesh.quaternion.clone();
      cubies.push(mesh);
      rubiksCube.add(mesh);
    }
  }
}

// ── Rotation Definitions ─────────────────────────────────────────────────────
const ROTATIONS = {
  'R+': { axis:'x', coord: STEP, dir:  1, desc:'R+' },
  'R-': { axis:'x', coord: STEP, dir: -1, desc:'R-' },
  'L+': { axis:'x', coord:-STEP, dir:  1, desc:'L+' },
  'L-': { axis:'x', coord:-STEP, dir: -1, desc:'L-' },
  'M+': { axis:'x', coord:   0, dir:  1, desc:'M+' },
  'M-': { axis:'x', coord:   0, dir: -1, desc:'M-' },

  'U+': { axis:'y', coord: STEP, dir: -1, desc:'U+' },
  'U-': { axis:'y', coord: STEP, dir:  1, desc:'U-' },
  'D+': { axis:'y', coord:-STEP, dir: -1, desc:'D+' },
  'D-': { axis:'y', coord:-STEP, dir:  1, desc:'D-' },
  'E+': { axis:'y', coord:   0, dir: -1, desc:'E+' },
  'E-': { axis:'y', coord:   0, dir:  1, desc:'E-' },

  'F+': { axis:'z', coord: STEP, dir: -1, desc:'F+' },
  'F-': { axis:'z', coord: STEP, dir:  1, desc:'F-' },
  'B+': { axis:'z', coord:-STEP, dir: -1, desc:'B+' },
  'B-': { axis:'z', coord:-STEP, dir:  1, desc:'B-' },
  'S+': { axis:'z', coord:   0, dir: -1, desc:'S+' },
  'S-': { axis:'z', coord:   0, dir:  1, desc:'S-' }
};
const ROTATION_SEQUENCE = Object.values(ROTATIONS);

// ── State‐mapping for Logging ─────────────────────────────────────────────────
const initialMap = new Map(
  cubies.map((c,i) => {
    const p = c.userData.initialPosition;
    return [`${ p.x.toFixed(2) },${ p.y.toFixed(2) },${ p.z.toFixed(2) } `, i];
  })
);
function getState() {
  return cubies.map(c => {
    const p = c.position;
    return initialMap.get(`${ p.x.toFixed(2) },${ p.y.toFixed(2) },${ p.z.toFixed(2) } `);
  });
}

// ── Instant Move (for logging) ───────────────────────────────────────────────
function applyMoveInstant(m) {
  const slice = cubies.filter(c => Math.abs(c.position[m.axis] - m.coord) < 0.1);
  const centre = (() => {
    const sum = new THREE.Vector3();
    slice.forEach(c => sum.add(c.position));
    sum.multiplyScalar(1 / slice.length);
    sum[m.axis] = slice[0].position[m.axis];
    return sum;
  })();
  const normal = new THREE.Vector3(
    m.axis==='x'?1:0,
    m.axis==='y'?1:0,
    m.axis==='z'?1:0
  );
  const dq = new THREE.Quaternion().setFromAxisAngle(normal, m.dir * Math.PI/2);
  slice.forEach(c => {
    c.position.sub(centre).applyQuaternion(dq).add(centre);
    c.position.set(
      Math.round(c.position.x/STEP)*STEP,
      Math.round(c.position.y/STEP)*STEP,
      Math.round(c.position.z/STEP)*STEP
    );
    c.quaternion.premultiply(dq);
    const e = new THREE.Euler().setFromQuaternion(c.quaternion,'XYZ');
    e.x = Math.round(e.x/(Math.PI/2))*(Math.PI/2);
    e.y = Math.round(e.y/(Math.PI/2))*(Math.PI/2);
    e.z = Math.round(e.z/(Math.PI/2))*(Math.PI/2);
    c.quaternion.setFromEuler(e);
  });
}

// ── HUD & Controls ──────────────────────────────────────────────────────────
const hudMoveInfo   = document.getElementById('hud-move-info');
const hudCubeState  = document.getElementById('hud-cube-state');
const playPauseBtn  = document.getElementById('play-pause-btn');
const randomizeBtn  = document.getElementById('randomize-btn');
const resetBtn      = document.getElementById('reset-btn');
const manualCtrls   = document.getElementById('manual-controls');

// 📝 Add log button to HUD (right of play/pause)
const logBtn = document.createElement('button');
logBtn.id          = 'log-btn';
logBtn.textContent = '📝';
logBtn.title       = 'Generate 20,000‐move cube_log.jsonl';
logBtn.style.marginLeft = '0.5em';
logBtn.disabled    = true;
playPauseBtn.parentNode.appendChild(logBtn);

function updateHudState() {
  let txt = '';
  cubies.forEach((c,i)=>{
    const p = c.position;
    txt += `Cubie ${ String(i).padStart(2) }: Pos(${ p.x.toFixed(2) }, ${ p.y.toFixed(2) }, ${ p.z.toFixed(2) }) \n`;
  });
  hudCubeState.textContent = txt;
}

function logFullCubeState(label) {
  console.group(label);
  cubies.forEach((c,i)=>{
    const p=c.position, q=c.quaternion;
    console.log(
      `Cubie ${ i }: Pos(${ p.x.toFixed(2) }, ${ p.y.toFixed(2) }, ${ p.z.toFixed(2) }) `+
      `Quat(${ q.x.toFixed(2) }, ${ q.y.toFixed(2) }, ${ q.z.toFixed(2) }, ${ q.w.toFixed(2) })`
    );
  });
  console.groupEnd();
}

// ── Generate 20,000‐move Log ─────────────────────────────────────────────────
logBtn.addEventListener('click', async ()=>{
  try {
    const dirHandle = await window.showDirectoryPicker();
    const fileHandle = await dirHandle.getFileHandle('cube_log.jsonl',{create:true});
    const stream = await fileHandle.createWritable({keepExistingData:false});

    // initial state
    await stream.write(JSON.stringify({move:null, state:getState()}) + '\n');

    for(let i=0; i<20000; i++){
      const m = ROTATION_SEQUENCE[Math.floor(Math.random()*ROTATION_SEQUENCE.length)];
      applyMoveInstant(m);
      await stream.write(JSON.stringify({move:m.desc, state:getState()}) + '\n');
      if((i+1)%1000===0) console.log(`Logged ${ i + 1 } moves…`);
    }

    await stream.close();
    alert('cube_log.jsonl generation complete.');
  } catch(err) {
    console.error('Logging failed:', err);
    alert('Error: '+err.message);
  }
});

// ── Rotation Logic & Sequencer ───────────────────────────────────────────────
let isAnimating = false, isPaused = false, pauseAfter = false;
let nextTimeoutId = null, rotationIdx = 0;

function updateControls() {
  manualCtrls.querySelectorAll('button').forEach(b=>{
    b.disabled = !isPaused || isAnimating;
  });
  randomizeBtn.disabled = !isPaused || isAnimating;
  resetBtn.disabled     = isAnimating;
  playPauseBtn.disabled = isAnimating;
  logBtn.disabled       = !isPaused || isAnimating;
}

function rotateSlice(axis, coord, dir, duration, onComplete, desc) {
  isAnimating = true;
  updateControls();
  hudMoveInfo.textContent = desc;

  const slice  = cubies.filter(c => Math.abs(c.position[axis] - coord) < 0.1);
  const centre = (() => {
    const sum = new THREE.Vector3();
    slice.forEach(c => sum.add(c.position));
    sum.multiplyScalar(1 / slice.length);
    sum[axis] = slice[0].position[axis];
    return sum;
  })();
  const normal = new THREE.Vector3(
    axis==='x'?1:0,
    axis==='y'?1:0,
    axis==='z'?1:0
  );
  slice.forEach(c => {
    c._prePos = c.position.clone();
    c._preQuat = c.quaternion.clone();
  });

  new TWEEN.Tween({ t: 0 })
    .to({ t: 1 }, duration)
    .easing(TWEEN.Easing.Quadratic.InOut)
    .onUpdate(({ t }) => {
      const dq = new THREE.Quaternion().setFromAxisAngle(normal, dir * t * Math.PI/2);
      slice.forEach(c => {
        c.position.copy(c._prePos).sub(centre).applyQuaternion(dq).add(centre);
        c.quaternion.copy(c._preQuat).premultiply(dq);
      });
    })
    .onComplete(() => {
      slice.forEach(c => {
        c.position.set(
          Math.round(c.position.x/STEP)*STEP,
          Math.round(c.position.y/STEP)*STEP,
          Math.round(c.position.z/STEP)*STEP
        );
        const e = new THREE.Euler().setFromQuaternion(c.quaternion,'XYZ');
        e.x = Math.round(e.x/(Math.PI/2))*(Math.PI/2);
        e.y = Math.round(e.y/(Math.PI/2))*(Math.PI/2);
        e.z = Math.round(e.z/(Math.PI/2))*(Math.PI/2);
        c.quaternion.setFromEuler(e);
        delete c._prePos;
        delete c._preQuat;
      });

      isAnimating = false;
      if (pauseAfter) {
        isPaused = true;
        pauseAfter = false;
      }

      logFullCubeState(`After ${ desc } `);
      updateHudState();
      updateControls();
      if (onComplete) onComplete();
    })
    .start();
}

function runNextRotation() {
  if (!isPaused) {
    const m = ROTATION_SEQUENCE[rotationIdx++];
    if (rotationIdx >= ROTATION_SEQUENCE.length) rotationIdx = 0;
    rotateSlice(m.axis, m.coord, m.dir, DURATION_ROTATE, () => {
      setTimeout(runNextRotation, DURATION_PAUSE);
    }, m.desc);
  }
}

playPauseBtn.addEventListener('click', () => {
  if (isAnimating) {
    pauseAfter = true;
    playPauseBtn.textContent = '▶️';
  } else {
    isPaused = !isPaused;
    if (isPaused) {
      clearTimeout(nextTimeoutId);
      playPauseBtn.textContent = '▶️';
    } else {
      playPauseBtn.textContent = '⏸️';
      runNextRotation();
    }
  }
  updateControls();
});

manualCtrls.addEventListener('click', e => {
  if (e.target.tagName !== 'BUTTON' || !isPaused || isAnimating) return;
  const name = e.target.id.replace('btn-', '');
  const m = ROTATIONS[name];
  if (!m) return;
  isPaused = false;
  rotateSlice(m.axis, m.coord, m.dir, DURATION_ROTATE, () => {
    isPaused = true;
    updateControls();
  }, m.desc);
});

// ── Scramble (20 moves) ───────────────────────────────────────────────────────
randomizeBtn.addEventListener('click', () => {
  if (!isPaused || isAnimating) return;
  isPaused = false;
  let last = null, seq = [];
  for (let i = 0; i < 20; i++) {
    let pick;
    do {
      pick = ROTATION_SEQUENCE[Math.floor(Math.random()*ROTATION_SEQUENCE.length)];
    } while (last && pick.desc[0] === last[0] && pick.desc[1] !== last[1]);
    seq.push(pick);
    last = pick.desc;
  }
  let i = 0;
  (function step() {
    const m = seq[i++];
    rotateSlice(m.axis, m.coord, m.dir, DURATION_RANDOM_ROTATE, () => {
      if (i < seq.length) {
        setTimeout(step, DURATION_RANDOM_PAUSE);
      } else {
        isPaused = true;
        updateControls();
      }
    }, m.desc);
  })();
});

// ── Reset ────────────────────────────────────────────────────────────────────
resetBtn.addEventListener('click', () => {
  if (isAnimating) return;
  TWEEN.removeAll();
  clearTimeout(nextTimeoutId);
  cubies.forEach(c => {
    c.position.copy(c.userData.initialPosition);
    c.quaternion.copy(c.userData.initialQuaternion);
  });
  isPaused = true;
  playPauseBtn.textContent = '▶️';
  hudMoveInfo.textContent   = 'Reset';
  logFullCubeState('After Reset');
  updateHudState();
  updateControls();
});

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
logFullCubeState('Initial State');
updateHudState();
animate();
playPauseBtn.textContent = '⏸️';
updateControls();
runNextRotation();