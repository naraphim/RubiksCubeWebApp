// script.js

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import TWEEN from 'tween';

// ── Timing Constants ─────────────────────────────────────────────────────────
const DURATION_ROTATE       = 750;
const DURATION_PAUSE        = 1250;
const DURATION_RANDOM_ROT   = 150;
const DURATION_RANDOM_PAUSE = 50;

// ── THREE.JS Setup ───────────────────────────────────────────────────────────
const scene    = new THREE.Scene();
scene.background = new THREE.Color(0x333333);

const camera   = new THREE.PerspectiveCamera(75, window.innerWidth/window.innerHeight, 0.1, 1000);
camera.position.set(0,0,8);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.getElementById('canvas-container').appendChild(renderer.domElement);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;

scene.add(new THREE.AmbientLight(0xffffff, 0.6));
const dirLight = new THREE.DirectionalLight(0xffffff, 0.6);
dirLight.position.set(10,20,5);
scene.add(dirLight);

// ── Axis Gizmo ───────────────────────────────────────────────────────────────
const gizmoContainer = document.getElementById('gizmo-container');
const gizmoRenderer  = new THREE.WebGLRenderer({ antialias: true, alpha: true });
gizmoRenderer.setSize(gizmoContainer.clientWidth, gizmoContainer.clientHeight);
gizmoContainer.appendChild(gizmoRenderer.domElement);

const gizmoScene  = new THREE.Scene();
const gizmoCamera = new THREE.OrthographicCamera(-2.5,2.5,2.5,-2.5,0.1,100);
gizmoCamera.position.set(0,0,10);

const gizmo       = new THREE.Group();
const axisLength  = 1.5, headLength = 0.5, headWidth = 0.35;
[
  { dir:[1,0,0],   col:0xcc2222 },
  { dir:[-1,0,0],  col:0xcc2222 },
  { dir:[0,1,0],   col:0x2222cc },
  { dir:[0,-1,0],  col:0x2222cc },
  { dir:[0,0,1],   col:0x22cc22 },
  { dir:[0,0,-1],  col:0x22cc22 }
].forEach(({dir,col}) => {
  gizmo.add(new THREE.ArrowHelper(
    new THREE.Vector3(...dir),
    new THREE.Vector3(0,0,0),
    axisLength, col, headLength, headWidth
  ));
});
gizmoScene.add(gizmo);

// ── Cube Construction ────────────────────────────────────────────────────────
const CUBE_SIZE     = 3;
const CUBIE_WIDTH   = 1;
const CUBIE_SPACING = 0.05;
const STEP          = CUBIE_WIDTH + CUBIE_SPACING;  // 1.05
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
      if (xi===HALF_IDX && yi===HALF_IDX && zi===HALF_IDX) continue;
      const pos = new THREE.Vector3(
        (xi-HALF_IDX)*STEP,
        (yi-HALF_IDX)*STEP,
        (zi-HALF_IDX)*STEP
      );
      const mats = [
        pos.x>0.1  ? faceMats[0] : blackMat,
        pos.x<-0.1 ? faceMats[1] : blackMat,
        pos.y>0.1  ? faceMats[2] : blackMat,
        pos.y<-0.1 ? faceMats[3] : blackMat,
        pos.z>0.1  ? faceMats[4] : blackMat,
        pos.z<-0.1 ? faceMats[5] : blackMat
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
  'R+': { name:'R+', axis:'x', coord: STEP, dir:  1, desc:'(x,y,z)->(x,z,-y)' },
  'R-': { name:'R-', axis:'x', coord: STEP, dir: -1, desc:'(x,y,z)->(x,-z,y)' },
  'L+': { name:'L+', axis:'x', coord:-STEP, dir:  1, desc:'(x,y,z)->(x,z,-y)' },
  'L-': { name:'L-', axis:'x', coord:-STEP, dir: -1, desc:'(x,y,z)->(x,-z,y)' },
  'M+': { name:'M+', axis:'x', coord:   0, dir:  1, desc:'(x,y,z)->(x,z,-y)' },
  'M-': { name:'M-', axis:'x', coord:   0, dir: -1, desc:'(x,y,z)->(x,-z,y)' },

  'U+': { name:'U+', axis:'y', coord: STEP, dir: -1, desc:'(x,y,z)->(z,y,-x)' },
  'U-': { name:'U-', axis:'y', coord: STEP, dir:  1, desc:'(x,y,z)->(-z,y,x)' },
  'D+': { name:'D+', axis:'y', coord:-STEP, dir: -1, desc:'(x,y,z)->(z,y,-x)' },
  'D-': { name:'D-', axis:'y', coord:-STEP, dir:  1, desc:'(x,y,z)->(-z,y,x)' },
  'E+': { name:'E+', axis:'y', coord:   0, dir: -1, desc:'(x,y,z)->(z,y,-x)' },
  'E-': { name:'E-', axis:'y', coord:   0, dir:  1, desc:'(x,y,z)->(-z,y,x)' },

  'F+': { name:'F+', axis:'z', coord: STEP, dir: -1, desc:'(x,y,z)->(-y,x,z)' },
  'F-': { name:'F-', axis:'z', coord: STEP, dir:  1, desc:'(x,y,z)->(y,-x,z)' },
  'B+': { name:'B+', axis:'z', coord:-STEP, dir: -1, desc:'(x,y,z)->(-y,x,z)' },
  'B-': { name:'B-', axis:'z', coord:-STEP, dir:  1, desc:'(x,y,z)->(y,-x,z)' },
  'S+': { name:'S+', axis:'z', coord:   0, dir: -1, desc:'(x,y,z)->(-y,x,z)' },
  'S-': { name:'S-', axis:'z', coord:   0, dir:  1, desc:'(x,y,z)->(y,-x,z)' }
};
const ROTATION_SEQUENCE = Object.values(ROTATIONS);

// ── HUD & Controls ──────────────────────────────────────────────────────────
const hudMoveInfo            = document.getElementById('hud-move-info');
const hudCubeState           = document.getElementById('hud-cube-state');
const playPauseBtn           = document.getElementById('play-pause-btn');
const manualControlsContainer= document.getElementById('manual-controls');
const randomizeBtn           = document.getElementById('randomize-btn');
const solveBtn               = document.getElementById('solve-btn');
const resetBtn               = document.getElementById('reset-btn');

// ── State Display & Console Logging ──────────────────────────────────────────
function updateHudState() {
  let txt = '';
  cubies.forEach((c,i) => {
    const p = c.position;
    txt += `Cubie ${ String(i).padStart(2) }: Pos(${ p.x.toFixed(2) }, ${ p.y.toFixed(2) }, ${ p.z.toFixed(2) }) \n`;
  });
  hudCubeState.textContent = txt;
}

function logFullCubeState(label) {
  console.group(label);
  cubies.forEach((c,i) => {
    const p = c.position, q = c.quaternion;
    console.log(
      `Cubie ${ i }: Pos(${ p.x.toFixed(2) }, ${ p.y.toFixed(2) }, ${ p.z.toFixed(2) })` +
      ` | Quat(${ q.x.toFixed(2) }, ${ q.y.toFixed(2) }, ${ q.z.toFixed(2) }, ${ q.w.toFixed(2) })`
    );
  });
  console.groupEnd();
}

// ── Input Logging ────────────────────────────────────────────────────────────
const pointerDown   = new THREE.Vector2();
const CLICK_TOLERANCE = 5;
renderer.domElement.addEventListener('mousedown', e => {
  console.log(`Mousedown at(${ e.clientX }, ${ e.clientY })`);
  pointerDown.set(e.clientX,e.clientY);
});
renderer.domElement.addEventListener('mouseup', e => {
  console.log(`Mouseup at(${ e.clientX }, ${ e.clientY })`);
  const up = new THREE.Vector2(e.clientX,e.clientY);
  if (pointerDown.distanceTo(up)>=CLICK_TOLERANCE) {
    console.log(`Drag from(${ pointerDown.x }, ${ pointerDown.y }) -> (${ e.clientX },${ e.clientY })`);
  }
});
renderer.domElement.addEventListener('contextmenu', e => e.preventDefault());

// ── Helpers ─────────────────────────────────────────────────────────────────
const snap = v => Math.round(v/STEP)*STEP;
function findSliceByCoord(axisChar,coord) {
  return cubies.filter(c=>Math.abs(c.position[axisChar]-coord)<0.1);
}
function sliceCentre(slice,axisChar) {
  const sum = new THREE.Vector3();
  slice.forEach(c=>sum.add(c.position));
  sum.multiplyScalar(1/slice.length);
  sum[axisChar] = slice[0].position[axisChar];
  return sum;
}

// ── Rotation Logic ───────────────────────────────────────────────────────────
let isAnimating = false,
    isPaused    = false,
    shouldPauseAfterMove = false;

function rotateSlice(normal,axisChar,coord,dir,duration,onComplete) {
  isAnimating = true;
  updateManualControlsState();
  const slice = findSliceByCoord(axisChar,coord),
        centre= sliceCentre(slice,axisChar),
        angle = dir*Math.PI/2;
  slice.forEach(c=>{
    c._prePos = c.position.clone();
    c._preQuat= c.quaternion.clone();
  });
  new TWEEN.Tween({t:0})
    .to({t:1},duration)
    .easing(TWEEN.Easing.Quadratic.InOut)
    .onUpdate(({t})=>{
      const dq = new THREE.Quaternion().setFromAxisAngle(normal,angle*t);
      slice.forEach(c=>{
        c.position.copy(c._prePos).sub(centre).applyQuaternion(dq).add(centre);
        c.quaternion.copy(c._preQuat).premultiply(dq);
      });
    })
    .onComplete(()=>{
      slice.forEach(c=>{
        c.position.set(snap(c.position.x),snap(c.position.y),snap(c.position.z));
        const e = new THREE.Euler().setFromQuaternion(c.quaternion,'XYZ');
        e.x = Math.round(e.x/(Math.PI/2))*(Math.PI/2);
        e.y = Math.round(e.y/(Math.PI/2))*(Math.PI/2);
        e.z = Math.round(e.z/(Math.PI/2))*(Math.PI/2);
        c.quaternion.setFromEuler(e);
        delete c._prePos; delete c._preQuat;
      });
      isAnimating=false;
      if(shouldPauseAfterMove){ isPaused=true; shouldPauseAfterMove=false; }
      updateManualControlsState();
      if(onComplete) onComplete();
    })
    .start();
}

// ── Sequencer & Controls ─────────────────────────────────────────────────────
let nextMoveTimeoutId = null,
    currentRotationIndex = 0;

function runNextRotation() {
  const m = ROTATION_SEQUENCE[currentRotationIndex],
        dirLab = m.dir<0?'CW':'CCW';
  hudMoveInfo.textContent = `Auto Move: ${ m.name } (${ dirLab }) \n${ m.desc } `;
  console.log(`Auto Move: ${ m.name } (${ dirLab })`);
  const normal = new THREE.Vector3(
    m.axis==='x'?1:0,
    m.axis==='y'?1:0,
    m.axis==='z'?1:0
  );
  rotateSlice(normal,m.axis,m.coord,m.dir,DURATION_ROTATE,()=>{
    logFullCubeState(`After ${ m.name } `);
    currentRotationIndex=(currentRotationIndex+1)%ROTATION_SEQUENCE.length;
    scheduleNextRotation();
  });
}

function scheduleNextRotation() {
  if(!isPaused) nextMoveTimeoutId=setTimeout(runNextRotation,DURATION_PAUSE);
}

function updateManualControlsState() {
  const btns = manualControlsContainer.getElementsByTagName('button');
  for(const b of btns) b.disabled = !isPaused||isAnimating;
  randomizeBtn.disabled = !isPaused||isAnimating;
  solveBtn.disabled     = !isPaused||isAnimating;
  resetBtn.disabled     = isAnimating;
}

playPauseBtn.addEventListener('click',()=>{
  if(isAnimating){
    shouldPauseAfterMove=true;
    playPauseBtn.textContent='▶️';
    console.log("Animation: OFF (pending)");
  } else {
    isPaused = !isPaused;
    if(isPaused){
      clearTimeout(nextMoveTimeoutId);
      playPauseBtn.textContent='▶️';
      console.log("Animation: OFF");
    } else {
      playPauseBtn.textContent='⏸️';
      console.log("Animation: ON");
      scheduleNextRotation();
    }
  }
  updateManualControlsState();
});

manualControlsContainer.addEventListener('click',e=>{
  if(e.target.tagName!=='BUTTON'||!isPaused||isAnimating) return;
  const mv = ROTATIONS[e.target.id.replace('btn-','')];
  if(!mv) return;
  console.log(`Manual Move: ${ mv.name } `);
  hudMoveInfo.textContent = `Manual Move: ${ mv.name } `;
  isPaused=false;
  const normal = new THREE.Vector3(
    mv.axis==='x'?1:0,
    mv.axis==='y'?1:0,
    mv.axis==='z'?1:0
  );
  rotateSlice(normal,mv.axis,mv.coord,mv.dir,DURATION_ROTATE,()=>{
    logFullCubeState(`After ${ mv.name } `);
    isPaused=true;
    updateManualControlsState();
  });
});

resetBtn.addEventListener('click',()=>{
  if(isAnimating) return;
  console.log("Reset");
  TWEEN.removeAll();
  clearTimeout(nextMoveTimeoutId);
  cubies.forEach(c=>{
    c.position.copy(c.userData.initialPosition);
    c.quaternion.copy(c.userData.initialQuaternion);
  });
  isAnimating=false; shouldPauseAfterMove=false; isPaused=false;
  playPauseBtn.textContent='⏸️';
  hudMoveInfo.textContent="Cube Reset";
  logFullCubeState("After Reset");
  currentRotationIndex=0;
  scheduleNextRotation();
  updateManualControlsState();
});

// ── Scrambler Setup: define axes, inverse map, generator, and 20-move listener ──

// Allowed moves by axis
const MOVES_BY_AXIS = {
    x: ['R+', 'R-', 'L+', 'L-', 'M+', 'M-'],
    y: ['U+', 'U-', 'D+', 'D-', 'E+', 'E-'],
    z: ['F+', 'F-', 'B+', 'B-', 'S+', 'S-']
};

// Inverse of each move, so we can avoid immediate backtracking
const INVERSE_MOVES = {
    'R+': 'R-', 'R-': 'R+',
    'L+': 'L-', 'L-': 'L+',
    'M+': 'M-', 'M-': 'M+',
    'U+': 'U-', 'U-': 'U+',
    'D+': 'D-', 'D-': 'D+',
    'E+': 'E-', 'E-': 'E+',
    'F+': 'F-', 'F-': 'F+',
    'B+': 'B-', 'B-': 'B+',
    'S+': 'S-', 'S-': 'S+'
};

// Generate one random move, avoiding immediate inverse of lastName
function generateRandomMove(lastName) {
    let mv;
    do {
        // pick a random axis
        const axes = ['x', 'y', 'z'];
        const axis = axes[Math.floor(Math.random() * axes.length)];
        // pick a random move on that axis
        const opts = MOVES_BY_AXIS[axis];
        const name = opts[Math.floor(Math.random() * opts.length)];
        mv = ROTATIONS[name];
    } while (lastName && mv.name === INVERSE_MOVES[lastName]);
    return mv;
}

// Attach the 20-move scrambler to the “randomize” button
randomizeBtn.addEventListener('click', () => {
    if (!isPaused || isAnimating) return;
    console.log("Scramble Start");
    isPaused = false;

    // Build exactly 20 random moves
    const seq = [];
    for (let i = 0; i < 20; i++) {
        seq.push(generateRandomMove(i ? seq[i - 1].name : null));
    }

    let idx = 0;
    const run = () => {
        const mv = seq[idx];
        hudMoveInfo.textContent = `Scramble ${idx + 1}/20: ${mv.name}`;
        console.log(`Scramble Move ${idx + 1}: ${mv.name}`);

        // Determine rotation axis vector
        const normal = new THREE.Vector3(
            mv.axis === 'x' ? 1 : 0,
            mv.axis === 'y' ? 1 : 0,
            mv.axis === 'z' ? 1 : 0
        );

        // Perform the rotation
        rotateSlice(normal, mv.axis, mv.coord, mv.dir, DURATION_RANDOM_ROT, () => {
            logFullCubeState(`After Scramble ${idx + 1} (${mv.name})`);
            idx++;
            if (idx < seq.length) {
                setTimeout(run, DURATION_RANDOM_PAUSE);
            } else {
                console.log("Scramble Complete");
                hudMoveInfo.textContent = "Scramble Complete";
                isPaused = true;
                updateManualControlsState();
            }
        });
    };

    run();
});

// ── Log & Fresh Solutions Generator ─────────────────────────────────────────
const logBtn = (() => {
    const b = document.createElement('button');
    b.id = 'log-btn'; b.textContent = '📝'; b.title = 'Log & fresh solutions';
    Object.assign(b.style, {
        fontSize: '2vw', background: 'none', border: 'none',
        cursor: 'pointer', padding: '0', color: 'black'
    });
    document.getElementById('hud-controls').appendChild(b);
    return b;
})();

let directoryHandle = null;

logBtn.addEventListener('click', async () => {
    try {
        if (!directoryHandle) directoryHandle = await window.showDirectoryPicker();
        const logHandle = await directoryHandle.getFileHandle('cube_log.jsonl', { create: true });
        const solHandle = await directoryHandle.getFileHandle('solutions.json', { create: true });
        const logW = await logHandle.createWritable();
        // clone
        const sim = cubies.map((c, i) => ({
            index: i, pos: c.userData.initialPosition.clone(),
            quat: c.userData.initialQuaternion.clone()
        }));
        // pos→ID
        function posKey(v) { return [v.x, v.y, v.z].map(n => n.toFixed(2)).join(','); }
        const map = new Map();
        sim.forEach(c => map.set(posKey(c.pos), c.index));
        function findID(v) {
            return map.get(posKey(new THREE.Vector3(
                Math.round(v.x / STEP) * STEP,
                Math.round(v.y / STEP) * STEP,
                Math.round(v.z / STEP) * STEP
            )));
        }
        const direct = {};
        const lines = []; let prev = sim.map(c => findID(c.pos));
        lines.push(JSON.stringify({ move: null, state: prev }));
        let last = null;
        for (let i = 0; i < 100; i++) {
            const mv = generateRandomMove(last); last = mv.name;
            // apply
            const norm = new THREE.Vector3(mv.axis === 'x' ? 1 : 0, mv.axis === 'y' ? 1 : 0, mv.axis === 'z' ? 1 : 0);
            const ang = mv.dir * Math.PI / 2;
            const cen = new THREE.Vector3(
                mv.axis === 'x' ? mv.coord : 0,
                mv.axis === 'y' ? mv.coord : 0,
                mv.axis === 'z' ? mv.coord : 0
            );
            const dq = new THREE.Quaternion().setFromAxisAngle(norm, ang);
            sim.forEach(c => {
                if (Math.abs(c.pos[mv.axis] - mv.coord) < 0.01) {
                    const r = c.pos.clone().sub(cen).applyQuaternion(dq).add(cen);
                    c.pos.set(Math.round(r.x / STEP) * STEP, Math.round(r.y / STEP) * STEP, Math.round(r.z / STEP) * STEP);
                    c.quat.premultiply(dq);
                    const e = new THREE.Euler().setFromQuaternion(c.quat, 'XYZ');
                    e.x = Math.round(e.x / (Math.PI / 2)) * (Math.PI / 2);
                    e.y = Math.round(e.y / (Math.PI / 2)) * (Math.PI / 2);
                    e.z = Math.round(e.z / (Math.PI / 2)) * (Math.PI / 2);
                    c.quat.setFromEuler(e);
                }
            });
            const curr = sim.map(c => findID(c.pos));
            const s = prev[0], d = curr[0];
            direct[s] = direct[s] || {}; direct[s][d] = [mv.name];
            prev = curr; lines.push(JSON.stringify({ move: mv.name, state: curr }));
        }
        await logW.write(lines.join('\n') + '\n'); await logW.close();
        console.log('cube_log.jsonl written');
        // trivial
        for (let i = 0; i < 26; i++) { direct[i] = direct[i] || {}; direct[i][i] = []; }
        const solW = await solHandle.createWritable();
        await solW.write(JSON.stringify(direct, null, 2)); await solW.close();
        console.log('solutions.json written');
        alert('Log & fresh solutions updated');
    } catch (e) {
        console.error('Error in logBtn:', e);
        alert('Error: ' + e);
    }
});

// ── Animation Loop & Resize ─────────────────────────────────────────────────
function animate() {
    requestAnimationFrame(animate);
    if (!isPaused) TWEEN.update();
    controls.update();
    updateHudState();
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

// ── Start Everything ────────────────────────────────────────────────────────
logFullCubeState('Initial State');
console.log('Animation: ON');
isPaused = false;
scheduleNextRotation();
animate();
updateManualControlsState();
