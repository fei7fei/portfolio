// Hero circuit board: a procedural 3D PCB with signal pulses running along its traces.
// Everything is generated in code (no model files). Loaded lazily by script.js.
import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.min.js";

const BG = 0x0a0c0f;
const ACCENT = 0x57e0a6;
const FOG_NEAR = 12;
const FOG_FAR = 36;

// Small seeded random generator so the board layout is the same on every visit
function seeded(seed) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Flat ribbon geometry for a set of polylines lying on the board (x, z) at height y
function ribbons(lines, width, y) {
  const pos = [];
  const idx = [];
  const half = width / 2;
  for (const line of lines) {
    for (let i = 0; i < line.length - 1; i++) {
      const a = line[i];
      const b = line[i + 1];
      const dx = b.x - a.x;
      const dz = b.y - a.y;
      const len = Math.hypot(dx, dz) || 1;
      const ux = dx / len;
      const uz = dz / len;
      // extend each segment by half the width so corners close cleanly
      const ax = a.x - ux * half;
      const az = a.y - uz * half;
      const bx = b.x + ux * half;
      const bz = b.y + uz * half;
      const nx = -uz * half;
      const nz = ux * half;
      const base = pos.length / 3;
      pos.push(ax + nx, y, az + nz, ax - nx, y, az - nz, bx + nx, y, bz + nz, bx - nx, y, bz - nz);
      idx.push(base, base + 2, base + 1, base + 1, base + 2, base + 3);
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  geo.setIndex(idx);
  return geo;
}

function buildBoard(rand) {
  const group = new THREE.Group();
  const traces = [];
  const pins = [];
  const vias = [];

  const chips = [
    { x: 1.5, z: -3, w: 4.2, d: 4.2 },
    { x: -9, z: -7, w: 3, d: 2.2 },
    { x: 10.5, z: -9, w: 2.8, d: 2.8 },
    { x: -5.5, z: 3.5, w: 2.4, d: 1.5 },
    { x: 9, z: 2.5, w: 3.2, d: 1.8 },
    { x: -15, z: 0, w: 2.2, d: 2.2 },
    { x: 16, z: -3.5, w: 1.8, d: 1.8 },
    { x: -2, z: -13, w: 3.4, d: 2 },
  ];

  const V = (x, y) => new THREE.Vector2(x, y);
  const pitch = 0.42;

  for (const chip of chips) {
    const sides = [
      { n: V(1, 0), t: V(0, 1), half: chip.w / 2, len: chip.d },
      { n: V(-1, 0), t: V(0, 1), half: chip.w / 2, len: chip.d },
      { n: V(0, 1), t: V(1, 0), half: chip.d / 2, len: chip.w },
      { n: V(0, -1), t: V(1, 0), half: chip.d / 2, len: chip.w },
    ];

    for (const side of sides) {
      const count = Math.max(1, Math.floor((side.len - 0.5) / pitch));
      const routed = rand() > 0.22;
      const l1 = 0.5 + rand() * 2.4;
      const turn = rand() < 0.3 ? 0 : rand() < 0.5 ? -1 : 1;
      const l2 = 0.8 + rand() * 3;
      const l3 = 2 + rand() * 8;
      const fullTurn = turn !== 0 && rand() < 0.45;

      for (let i = 0; i < count; i++) {
        const o = (i - (count - 1) / 2) * pitch;
        const center = V(chip.x, chip.z);
        const edge = center.clone().add(side.n.clone().multiplyScalar(side.half)).add(side.t.clone().multiplyScalar(o));
        pins.push([edge.clone().add(side.n.clone().multiplyScalar(-0.06)), edge.clone().add(side.n.clone().multiplyScalar(0.24))]);
        if (!routed) continue;

        const start = edge.clone().add(side.n.clone().multiplyScalar(0.24));
        const line = [start];
        // keep bus spacing even through 45 degree bends
        const k = -turn * o * 0.4142;
        const p1 = start.clone().add(side.n.clone().multiplyScalar(Math.max(0.2, l1 + k)));
        line.push(p1);

        if (turn !== 0) {
          const diag = side.n.clone().add(side.t.clone().multiplyScalar(turn)).normalize();
          const p2 = p1.clone().add(diag.multiplyScalar(l2));
          line.push(p2);
          const out = fullTurn ? side.t.clone().multiplyScalar(turn) : side.n.clone();
          line.push(p2.clone().add(out.multiplyScalar(l3 + rand() * 1.4)));
        } else {
          line.push(p1.clone().add(side.n.clone().multiplyScalar(l3 + rand() * 1.4)));
        }

        traces.push(line);
        vias.push(line[line.length - 1]);
      }
    }

    // Package body with a faint outline
    const body = new THREE.Mesh(
      new THREE.BoxGeometry(chip.w, 0.32, chip.d),
      new THREE.MeshBasicMaterial({ color: 0x0f1715 })
    );
    body.position.set(chip.x, 0.16, chip.z);
    group.add(body);

    const edges = new THREE.LineSegments(
      new THREE.EdgesGeometry(body.geometry),
      new THREE.LineBasicMaterial({ color: 0x2a3f35 })
    );
    edges.position.copy(body.position);
    group.add(edges);

    // Pin-1 marker
    const dot = new THREE.Mesh(new THREE.CircleGeometry(0.12, 16), new THREE.MeshBasicMaterial({ color: 0x24362e }));
    dot.rotation.x = -Math.PI / 2;
    dot.position.set(chip.x - chip.w / 2 + 0.4, 0.33, chip.z - chip.d / 2 + 0.4);
    group.add(dot);
  }

  // Substrate
  const substrate = new THREE.Mesh(new THREE.PlaneGeometry(60, 44), new THREE.MeshBasicMaterial({ color: 0x0b1210 }));
  substrate.rotation.x = -Math.PI / 2;
  group.add(substrate);

  // Copper traces and pins
  group.add(new THREE.Mesh(ribbons(traces, 0.085, 0.01), new THREE.MeshBasicMaterial({ color: 0x18291f })));
  group.add(new THREE.Mesh(ribbons(pins, 0.16, 0.02), new THREE.MeshBasicMaterial({ color: 0x31463b })));

  // Vias at trace ends
  const viaGeo = new THREE.RingGeometry(0.09, 0.19, 18);
  viaGeo.rotateX(-Math.PI / 2);
  const viaMesh = new THREE.InstancedMesh(viaGeo, new THREE.MeshBasicMaterial({ color: 0x2c4237 }), vias.length);
  const m = new THREE.Matrix4();
  vias.forEach((v, i) => viaMesh.setMatrixAt(i, m.makeTranslation(v.x, 0.02, v.y)));
  group.add(viaMesh);

  // Scattered passive components (resistors and capacitors) for texture
  const passives = 140;
  const smd = new THREE.InstancedMesh(
    new THREE.BoxGeometry(0.34, 0.12, 0.17),
    new THREE.MeshBasicMaterial({ color: 0x16201c }),
    passives
  );
  const q = new THREE.Quaternion();
  const up = new THREE.Vector3(0, 1, 0);
  const s = new THREE.Vector3(1, 1, 1);
  let placed = 0;
  while (placed < passives) {
    const x = (rand() - 0.5) * 50;
    const z = (rand() - 0.5) * 36;
    const clash = chips.some((c) => Math.abs(x - c.x) < c.w / 2 + 1 && Math.abs(z - c.z) < c.d / 2 + 1);
    if (clash) continue;
    q.setFromAxisAngle(up, rand() < 0.5 ? 0 : Math.PI / 2);
    m.compose(new THREE.Vector3(x, 0.06, z), q, s);
    smd.setMatrixAt(placed++, m);
  }
  group.add(smd);

  return { group, traces };
}

// Glowing pulses: each is a bright head with a fading tail that runs along one trace
function buildPulses(traces, count, rand) {
  const TAIL = 12;
  const SPACING = 0.11;
  const total = count * TAIL;
  const positions = new Float32Array(total * 3);
  const alphas = new Float32Array(total);
  const sizes = new Float32Array(total);

  const paths = traces.map((line) => {
    const lengths = [0];
    for (let i = 1; i < line.length; i++) lengths.push(lengths[i - 1] + line[i].distanceTo(line[i - 1]));
    return { line, lengths, length: lengths[lengths.length - 1] };
  });

  const pulses = Array.from({ length: count }, () => spawn({}, true));

  function spawn(p, initial = false) {
    p.path = paths[Math.floor(rand() * paths.length)];
    p.speed = 3.2 + rand() * 4;
    p.d = initial ? rand() * p.path.length : -rand() * 6;
    return p;
  }

  function pointAt(path, d, out) {
    const { line, lengths } = path;
    let i = 1;
    while (i < lengths.length - 1 && lengths[i] < d) i++;
    const a = line[i - 1];
    const b = line[i];
    const seg = lengths[i] - lengths[i - 1] || 1;
    const t = Math.min(Math.max((d - lengths[i - 1]) / seg, 0), 1);
    out[0] = a.x + (b.x - a.x) * t;
    out[1] = 0.05;
    out[2] = a.y + (b.y - a.y) * t;
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geo.setAttribute("aAlpha", new THREE.BufferAttribute(alphas, 1));
  geo.setAttribute("aSize", new THREE.BufferAttribute(sizes, 1));

  const material = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    uniforms: {
      uColor: { value: new THREE.Color(ACCENT) },
      uScale: { value: 400 },
    },
    vertexShader: `
      attribute float aAlpha;
      attribute float aSize;
      uniform float uScale;
      varying float vAlpha;
      void main() {
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        gl_Position = projectionMatrix * mv;
        float fade = smoothstep(${FOG_FAR.toFixed(1)}, ${FOG_NEAR.toFixed(1)}, -mv.z);
        vAlpha = aAlpha * fade;
        gl_PointSize = aSize * uScale / -mv.z;
      }`,
    fragmentShader: `
      uniform vec3 uColor;
      varying float vAlpha;
      void main() {
        float d = length(gl_PointCoord - 0.5);
        float a = smoothstep(0.5, 0.0, d);
        gl_FragColor = vec4(uColor, a * a * vAlpha);
      }`,
  });

  const points = new THREE.Points(geo, material);
  points.frustumCulled = false;
  const tmp = [0, 0, 0];

  function update(dt) {
    pulses.forEach((p, n) => {
      p.d += p.speed * dt;
      if (p.d - TAIL * SPACING > p.path.length) spawn(p);
      for (let j = 0; j < TAIL; j++) {
        const k = n * TAIL + j;
        const d = p.d - j * SPACING;
        const visible = d >= 0 && d <= p.path.length;
        pointAt(p.path, Math.min(Math.max(d, 0), p.path.length), tmp);
        positions[k * 3] = tmp[0];
        positions[k * 3 + 1] = tmp[1];
        positions[k * 3 + 2] = tmp[2];
        const falloff = 1 - j / TAIL;
        alphas[k] = visible ? falloff * (j === 0 ? 1 : 0.7) : 0;
        sizes[k] = j === 0 ? 0.55 : 0.32 * falloff + 0.06;
      }
    });
    geo.attributes.position.needsUpdate = true;
    geo.attributes.aAlpha.needsUpdate = true;
    geo.attributes.aSize.needsUpdate = true;
  }

  return { points, material, update };
}

export function initPCB(canvas, { reduceMotion }) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: "low-power" });
  renderer.setClearColor(0x000000, 0);

  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(BG, FOG_NEAR, FOG_FAR);

  const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 100);
  const camBase = new THREE.Vector3(0, 12.5, 15);
  const target = new THREE.Vector3(0, 0, -2);

  const rand = seeded(20270);
  const { group, traces } = buildBoard(rand);
  scene.add(group);

  const small = window.innerWidth < 768;
  const pulses = buildPulses(traces, small ? 10 : 22, rand);
  group.add(pulses.points);

  // Pointer tilt (fine pointers only)
  const pointer = { x: 0, y: 0, tx: 0, ty: 0 };
  if (window.matchMedia("(hover: hover) and (pointer: fine)").matches) {
    window.addEventListener("pointermove", (e) => {
      pointer.tx = e.clientX / window.innerWidth - 0.5;
      pointer.ty = e.clientY / window.innerHeight - 0.5;
    }, { passive: true });
  }

  function resize() {
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    if (!w || !h) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 1.75);
    renderer.setPixelRatio(dpr);
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    pulses.material.uniforms.uScale.value = (h * dpr) / (2 * Math.tan((camera.fov * Math.PI) / 360));
    if (!running) render(0);
  }

  let running = false;
  let visible = true;
  let frame = 0;
  let last = performance.now();
  let time = 0;

  function render(dt) {
    time += dt;
    pointer.x += (pointer.tx - pointer.x) * Math.min(dt * 3, 1);
    pointer.y += (pointer.ty - pointer.y) * Math.min(dt * 3, 1);

    // Slow drift, cursor tilt, and a gentle rise as the page scrolls
    group.rotation.y = pointer.x * 0.12 + Math.sin(time * 0.06) * 0.03;
    group.position.x = Math.sin(time * 0.05) * 0.5;
    const scroll = Math.min(window.scrollY, 1200);
    camera.position.set(camBase.x + pointer.x * 1.2, camBase.y - pointer.y * 0.8 + scroll * 0.004, camBase.z - scroll * 0.003);
    camera.lookAt(target);

    pulses.update(dt);
    renderer.render(scene, camera);
  }

  function loop(now) {
    const dt = Math.min((now - last) / 1000, 0.05);
    last = now;
    render(dt);
    frame = requestAnimationFrame(loop);
  }

  function play() {
    if (running || reduceMotion.matches || !visible || document.hidden) return;
    running = true;
    last = performance.now();
    frame = requestAnimationFrame(loop);
  }

  function pause() {
    running = false;
    cancelAnimationFrame(frame);
  }

  new ResizeObserver(resize).observe(canvas);
  resize();

  // Reduced motion: one still frame with pulses parked mid-trace
  pulses.update(1.5);
  render(0);

  new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
    visible ? play() : pause();
  }).observe(canvas);

  document.addEventListener("visibilitychange", () => (document.hidden ? pause() : play()));
  reduceMotion.addEventListener("change", () => (reduceMotion.matches ? pause() : play()));

  canvas.classList.add("is-ready");
  play();
}
