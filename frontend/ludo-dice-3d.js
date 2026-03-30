import * as THREE from "./vendor/three/three.module.js";
import { RoundedBoxGeometry } from "./vendor/three/geometries/RoundedBoxGeometry.js";

const DIE_POSES = Object.freeze([
  { x: -0.3, y: 0.18, z: -0.1 },
  { x: -0.26, y: -0.22, z: 0.12 },
  { x: -0.28, y: 0.24, z: -0.08 },
  { x: -0.22, y: -0.26, z: 0.14 }
]);
const DIE_TONE_STYLES = Object.freeze({
  normal: {
    body: 0xf4f6f8,
    panel: 0xffffff,
    edge: 0xb9c2cc,
    edgeOpacity: 0.28,
    shadowOpacity: 0.16
  },
  dead: {
    body: 0xe5e9ef,
    panel: 0xf1f4f7,
    edge: 0xa9b2bd,
    edgeOpacity: 0.22,
    shadowOpacity: 0.11
  },
  used: {
    body: 0xd4dae2,
    panel: 0xe4e8ed,
    edge: 0x8f99a4,
    edgeOpacity: 0.18,
    shadowOpacity: 0.09
  }
});
const TAU = Math.PI * 2;
const instances = new Map();
let resizeBound = false;

function clampFace(face) {
  const value = Number(face);
  return Number.isInteger(value) && value >= 1 && value <= 6 ? value : 1;
}

function normalizeVariant(variant) {
  const total = DIE_POSES.length;
  const value = Number.isFinite(Number(variant)) ? Math.trunc(Number(variant)) : 0;
  return ((value % total) + total) % total;
}

function normalizeTone(tone) {
  return tone === "used" || tone === "dead" ? tone : "normal";
}

function faceToEuler(face) {
  switch (clampFace(face)) {
    case 1:
      return new THREE.Euler(0, 0, 0);
    case 2:
      return new THREE.Euler(0, -Math.PI / 2, 0);
    case 3:
      return new THREE.Euler(Math.PI / 2, 0, 0);
    case 4:
      return new THREE.Euler(-Math.PI / 2, 0, 0);
    case 5:
      return new THREE.Euler(0, Math.PI / 2, 0);
    case 6:
      return new THREE.Euler(Math.PI, 0, 0);
    default:
      return new THREE.Euler(0, 0, 0);
  }
}

function buildFinalQuaternion(face, variant = 0) {
  const base = new THREE.Quaternion().setFromEuler(faceToEuler(face));
  const pose = DIE_POSES[normalizeVariant(variant)];
  const tilt = new THREE.Quaternion().setFromEuler(new THREE.Euler(pose.x, pose.y, pose.z));
  return base.multiply(tilt);
}

function quaternionToAngles(quaternion) {
  const euler = new THREE.Euler().setFromQuaternion(quaternion, "XYZ");
  return {
    x: euler.x,
    y: euler.y,
    z: euler.z
  };
}

function applyAnglesToRig(rig, angles) {
  rig.dieGroup.quaternion.setFromEuler(new THREE.Euler(angles.x, angles.y, angles.z, "XYZ"));
}

function lerpNumber(start, end, progress) {
  return start + ((end - start) * progress);
}

function lerpAngles(fromAngles, toAngles, progress) {
  return {
    x: lerpNumber(fromAngles.x, toAngles.x, progress),
    y: lerpNumber(fromAngles.y, toAngles.y, progress),
    z: lerpNumber(fromAngles.z, toAngles.z, progress)
  };
}

function scheduleDieFrame(callback) {
  return window.setTimeout(() => callback(performance.now()), 16);
}

function cancelDieFrame(frameId) {
  window.clearTimeout(frameId);
}

function easeOutQuart(value) {
  return 1 - Math.pow(1 - value, 4);
}

function easeOutBack(value) {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(value - 1, 3) + c1 * Math.pow(value - 1, 2);
}

function createFaceTexture(face, anisotropy = 1) {
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 256;
  const context = canvas.getContext("2d");
  context.clearRect(0, 0, canvas.width, canvas.height);
  context.shadowColor = "rgba(11, 14, 20, 0.12)";
  context.shadowBlur = 12;
  context.shadowOffsetX = 0;
  context.shadowOffsetY = 6;
  context.fillStyle = "rgba(0, 0, 0, 0.08)";
  context.beginPath();
  context.roundRect(26, 28, 204, 204, 34);
  context.fill();
  context.shadowColor = "transparent";
  const gradient = context.createLinearGradient(36, 34, 214, 220);
  gradient.addColorStop(0, "#ffffff");
  gradient.addColorStop(0.56, "#f7f9fc");
  gradient.addColorStop(1, "#edf1f6");
  context.fillStyle = gradient;
  context.beginPath();
  context.roundRect(28, 26, 200, 200, 32);
  context.fill();
  context.strokeStyle = "rgba(185, 193, 204, 0.72)";
  context.lineWidth = 4;
  context.stroke();

  const pipLayouts = {
    1: [[128, 128]],
    2: [[74, 74], [182, 182]],
    3: [[74, 74], [128, 128], [182, 182]],
    4: [[74, 74], [182, 74], [74, 182], [182, 182]],
    5: [[74, 74], [182, 74], [128, 128], [74, 182], [182, 182]],
    6: [[74, 74], [182, 74], [74, 128], [182, 128], [74, 182], [182, 182]]
  };

  context.fillStyle = "#0b0d10";
  context.shadowColor = "rgba(0, 0, 0, 0.22)";
  context.shadowBlur = 10;
  context.shadowOffsetX = 2;
  context.shadowOffsetY = 4;
  (pipLayouts[clampFace(face)] || pipLayouts[1]).forEach(([x, y]) => {
    context.beginPath();
    context.arc(x, y, 28, 0, Math.PI * 2);
    context.fill();
  });

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = anisotropy;
  return texture;
}

function createFacePanelMaterial(face, anisotropy = 1) {
  return new THREE.MeshStandardMaterial({
    color: 0xffffff,
    roughness: 0.52,
    metalness: 0.02,
    map: createFaceTexture(face, anisotropy),
    transparent: true,
    alphaTest: 0.08,
    polygonOffset: true,
    polygonOffsetFactor: -1,
    polygonOffsetUnits: -1
  });
}

function createFacePanelMesh(face, anisotropy, position, rotation) {
  const panel = new THREE.Mesh(
    new THREE.PlaneGeometry(1.3, 1.3),
    createFacePanelMaterial(face, anisotropy)
  );
  panel.position.set(position[0], position[1], position[2]);
  panel.rotation.set(rotation[0], rotation[1], rotation[2]);
  return panel;
}

function createRenderer(className) {
  const renderer = new THREE.WebGLRenderer({
    alpha: true,
    antialias: true,
    powerPreference: "high-performance"
  });
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.08;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  renderer.domElement.className = className;
  return renderer;
}

function addSceneLights(scene) {
  const ambient = new THREE.AmbientLight(0xffffff, 0.82);
  const key = new THREE.DirectionalLight(0xffffff, 2.35);
  key.position.set(2.9, 4.1, 4.8);
  key.castShadow = true;
  key.shadow.mapSize.set(512, 512);
  const fill = new THREE.PointLight(0xdfebff, 0.28, 20);
  fill.position.set(-3.1, -2.6, 2.8);
  const rim = new THREE.DirectionalLight(0xf6eee2, 0.34);
  rim.position.set(-3.8, 2.4, -2.6);
  scene.add(ambient, key, fill, rim);
}

function createDieRig(anisotropy = 1) {
  const root = new THREE.Group();
  const dieGroup = new THREE.Group();
  root.add(dieGroup);

  const shadow = new THREE.Mesh(
    new THREE.CircleGeometry(1.22, 48),
    new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.16 })
  );
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.set(0, -1.08, 0);
  root.add(shadow);

  const bodyGeometry = new RoundedBoxGeometry(2.02, 2.02, 2.02, 6, 0.3);
  const body = new THREE.Mesh(
    bodyGeometry,
    new THREE.MeshPhysicalMaterial({
      color: 0xf4f6f8,
      roughness: 0.4,
      metalness: 0.01,
      clearcoat: 0.18,
      clearcoatRoughness: 0.36,
      reflectivity: 0.12
    })
  );
  body.castShadow = true;
  body.receiveShadow = true;
  dieGroup.add(body);
  const facePanels = [
    createFacePanelMesh(1, anisotropy, [0, 0, 1.04], [0, 0, 0]),
    createFacePanelMesh(6, anisotropy, [0, 0, -1.04], [0, Math.PI, 0]),
    createFacePanelMesh(2, anisotropy, [1.04, 0, 0], [0, Math.PI / 2, 0]),
    createFacePanelMesh(5, anisotropy, [-1.04, 0, 0], [0, -Math.PI / 2, 0]),
    createFacePanelMesh(3, anisotropy, [0, 1.04, 0], [-Math.PI / 2, 0, 0]),
    createFacePanelMesh(4, anisotropy, [0, -1.04, 0], [Math.PI / 2, 0, 0])
  ];
  dieGroup.add(...facePanels);
  const edges = new THREE.LineSegments(
    new THREE.EdgesGeometry(bodyGeometry, 18),
    new THREE.LineBasicMaterial({
      color: 0xb9c2cc,
      transparent: true,
      opacity: 0.28
    })
  );
  dieGroup.add(edges);

  const rig = {
    root,
    dieGroup,
    shadow,
    body,
    facePanels,
    edges
  };
  applyDieTone(rig, "normal");
  return rig;
}

function applyDieTone(rig, tone = "normal") {
  if (!rig?.body || !rig?.facePanels || !rig?.edges || !rig?.shadow) {
    return;
  }
  const style = DIE_TONE_STYLES[normalizeTone(tone)] || DIE_TONE_STYLES.normal;
  rig.body.material.color.setHex(style.body);
  rig.facePanels.forEach((panel) => {
    panel.material.color.setHex(style.panel);
    panel.material.opacity = 1;
    panel.material.needsUpdate = true;
  });
  rig.edges.material.color.setHex(style.edge);
  rig.edges.material.opacity = style.edgeOpacity;
  rig.shadow.material.opacity = style.shadowOpacity;
}

function disposeSceneGraph(scene) {
  scene.traverse((entry) => {
    if (entry.geometry && typeof entry.geometry.dispose === "function") {
      entry.geometry.dispose();
    }
    if (entry.material) {
      const materials = Array.isArray(entry.material) ? entry.material : [entry.material];
      materials.forEach((material) => {
        if (material?.map && typeof material.map.dispose === "function") {
          material.map.dispose();
        }
        if (material && typeof material.dispose === "function") {
          material.dispose();
        }
      });
    }
  });
}

function resetDieRig(rig, finalQuaternion) {
  rig.dieGroup.quaternion.copy(finalQuaternion);
  rig.dieGroup.position.set(0, 0, 0);
  rig.root.position.set(rig.baseX || 0, 0, 0);
  rig.root.rotation.set(0, 0, 0);
  rig.shadow.scale.setScalar(1);
}

class LudoDieScene {
  constructor(host) {
    this.host = host;
    this.disposed = false;
    this.frameId = null;
    this.animation = null;
    this.pendingRender = false;

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(34, 1, 0.1, 20);
    this.camera.position.set(0.12, 0.1, 3.25);
    this.renderer = createRenderer("ludo-three-die-canvas");
    addSceneLights(this.scene);
    const anisotropy = this.renderer.capabilities.getMaxAnisotropy?.() || 1;
    const rig = createDieRig(anisotropy);
    this.rig = rig;
    this.root = rig.root;
    this.dieGroup = rig.dieGroup;
    this.shadow = rig.shadow;
    this.root.baseX = 0;
    this.scene.add(this.root);

    this.resizeObserver = typeof ResizeObserver !== "undefined"
      ? new ResizeObserver(() => {
          this.resize();
          this.render();
        })
      : null;

    this.host.innerHTML = "";
    this.host.appendChild(this.renderer.domElement);
    this.resizeObserver?.observe(this.host);
    this.resize();
    this.applyFromDataset(true);
  }

  readOptions() {
    return {
      face: clampFace(this.host.dataset.ludoDieFace),
      variant: normalizeVariant(this.host.dataset.ludoDieVariant),
      tone: normalizeTone(this.host.dataset.ludoDieTone),
      rolling: this.host.dataset.ludoDieRolling === "1",
      durationMs: Math.max(900, Number(this.host.dataset.ludoDieDuration) || 1600),
      delayMs: Math.max(0, Number(this.host.dataset.ludoDieDelay) || 0)
    };
  }

  resize() {
    if (this.disposed) {
      return;
    }
    const rect = this.host.getBoundingClientRect();
    const width = Math.max(40, Math.round(rect.width || 64));
    const height = Math.max(40, Math.round(rect.height || 64));
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height, false);
  }

  applyFromDataset(initial = false) {
    const next = this.readOptions();
    this.state = next;
    applyDieTone(this.rig, next.tone);
    const finalQuaternion = buildFinalQuaternion(next.face, next.variant);
    const finalAngles = quaternionToAngles(finalQuaternion);

    if (!next.rolling) {
      this.animation = null;
      resetDieRig({ ...this.rig, baseX: 0 }, finalQuaternion);
      this.renderer.domElement.style.filter = "";
      this.render();
      return;
    }

    const fromAngles = quaternionToAngles(this.dieGroup.quaternion);
    const spinAngles = {
      x: finalAngles.x + ((6 + Math.floor(Math.random() * 3)) * TAU) + (next.face * 0.22),
      y: finalAngles.y - ((7 + Math.floor(Math.random() * 3)) * TAU) - (next.variant * 0.28),
      z: finalAngles.z + ((4 + Math.floor(Math.random() * 2)) * TAU) + 0.66
    };

    this.animation = {
      startedAt: performance.now() + next.delayMs,
      durationMs: next.durationMs,
      fromAngles,
      spinAngles,
      finalAngles,
      finalQuaternion
    };

    if (initial) {
      applyAnglesToRig(this, fromAngles);
    }
    this.scheduleFrame();
  }

  scheduleFrame() {
    if (this.disposed || this.frameId) {
      return;
    }
    this.frameId = scheduleDieFrame((now) => this.tick(now));
  }

  tick(now) {
    this.frameId = null;
    if (this.disposed) {
      return;
    }
    if (!this.animation) {
      if (this.pendingRender) {
        this.pendingRender = false;
        this.render();
      }
      return;
    }

    const { startedAt, durationMs, fromAngles, spinAngles, finalAngles, finalQuaternion } = this.animation;
    if (now < startedAt) {
      this.render();
      this.scheduleFrame();
      return;
    }

    const progress = Math.min((now - startedAt) / durationMs, 1);
    const spinPhase = 0.88;
    const lift = Math.sin(progress * Math.PI) * 0.4;
    this.dieGroup.position.y = lift;
    this.root.position.x = Math.sin(progress * Math.PI * 1.9) * 0.06;
    this.root.rotation.z = Math.sin(progress * Math.PI * 3) * 0.1;
    this.root.rotation.x = Math.sin(progress * Math.PI * 2.4) * 0.05;
    const shadowScale = 1 - (lift * 0.32);
    this.shadow.scale.set(shadowScale, shadowScale, 1);

    if (progress < spinPhase) {
      const spinProgress = progress / spinPhase;
      applyAnglesToRig(this, lerpAngles(fromAngles, spinAngles, spinProgress));
      const blur = 0.18 + (Math.sin(spinProgress * Math.PI) * 0.7);
      this.renderer.domElement.style.filter = `blur(${blur.toFixed(3)}px) saturate(0.99)`;
    } else {
      const settleProgress = easeOutBack((progress - spinPhase) / (1 - spinPhase));
      applyAnglesToRig(this, lerpAngles(spinAngles, finalAngles, settleProgress));
      const blur = Math.max(0, 0.22 * (1 - settleProgress));
      this.renderer.domElement.style.filter = blur > 0.02 ? `blur(${blur.toFixed(3)}px)` : "";
    }

    this.render();

    if (progress >= 1) {
      this.animation = null;
      resetDieRig({ ...this, baseX: 0 }, finalQuaternion);
      this.renderer.domElement.style.filter = "";
      this.render();
      return;
    }

    this.scheduleFrame();
  }

  render() {
    if (!this.disposed) {
      this.renderer.render(this.scene, this.camera);
    }
  }

  destroy() {
    if (this.disposed) {
      return;
    }
    this.disposed = true;
    if (this.frameId) {
      cancelDieFrame(this.frameId);
      this.frameId = null;
    }
    this.resizeObserver?.disconnect();
    disposeSceneGraph(this.scene);
    this.renderer.dispose();
    this.host.innerHTML = "";
  }
}

class LudoDiceGroupScene {
  constructor(host) {
    this.host = host;
    this.disposed = false;
    this.frameId = null;
    this.animations = [];

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(30, 1, 0.1, 24);
    this.camera.position.set(0.02, 0.1, 6.85);
    this.renderer = createRenderer("ludo-three-dice-group-canvas");
    addSceneLights(this.scene);

    const anisotropy = this.renderer.capabilities.getMaxAnisotropy?.() || 1;
    this.rigs = [-0.82, 0.78].map((baseX) => {
      const rig = createDieRig(anisotropy);
      rig.baseX = baseX;
      rig.root.position.x = baseX;
      rig.root.scale.setScalar(0.68);
      this.scene.add(rig.root);
      return rig;
    });

    this.resizeObserver = typeof ResizeObserver !== "undefined"
      ? new ResizeObserver(() => {
          this.resize();
          this.render();
        })
      : null;

    this.host.innerHTML = "";
    this.host.appendChild(this.renderer.domElement);
    this.resizeObserver?.observe(this.host);
    this.resize();
    this.applyFromDataset(true);
  }

  readOptions() {
    let parsed = [];
    try {
      parsed = JSON.parse(this.host.dataset.ludoDiceGroupStates || "[]");
    } catch (error) {
      parsed = [];
    }
    const normalized = Array.isArray(parsed)
      ? parsed.slice(0, 2).map((entry, index) => ({
          face: clampFace(entry?.face),
          variant: normalizeVariant(entry?.variant ?? index),
          tone: normalizeTone(entry?.tone),
          rolling: entry?.rolling === true || entry?.rolling === "1",
          durationMs: Math.max(900, Number(entry?.durationMs) || 1600),
          delayMs: Math.max(0, Number(entry?.delayMs) || 0)
        }))
      : [];
    while (normalized.length < 2) {
      normalized.push({
        face: normalized.length === 0 ? 5 : 2,
        variant: normalized.length === 0 ? 1 : 3,
        tone: "normal",
        rolling: false,
        durationMs: 1600,
        delayMs: 0
      });
    }
    return normalized;
  }

  resize() {
    if (this.disposed) {
      return;
    }
    const rect = this.host.getBoundingClientRect();
    const width = Math.max(90, Math.round(rect.width || 110));
    const height = Math.max(54, Math.round(rect.height || 72));
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height, false);
  }

  applyFromDataset(initial = false) {
    const states = this.readOptions();
    this.states = states;
    this.animations = states.map((state, index) => {
      const rig = this.rigs[index];
      applyDieTone(rig, state.tone);
      const finalQuaternion = buildFinalQuaternion(state.face, state.variant);
      if (!state.rolling) {
        resetDieRig(rig, finalQuaternion);
        return null;
      }

      const finalAngles = quaternionToAngles(finalQuaternion);
      const fromAngles = quaternionToAngles(rig.dieGroup.quaternion);
      const side = index === 0 ? -1 : 1;
      const spinAngles = {
        x: finalAngles.x + ((6 + Math.floor(Math.random() * 3)) * TAU) + ((index + 1) * 0.18),
        y: finalAngles.y + (side * ((6 + Math.floor(Math.random() * 2)) * TAU + 0.42)),
        z: finalAngles.z + ((4 + Math.floor(Math.random() * 2)) * TAU) + (side * 0.58)
      };

      if (initial) {
        applyAnglesToRig(rig, fromAngles);
      }

      return {
        startedAt: performance.now() + state.delayMs,
        durationMs: state.durationMs,
        fromAngles,
        spinAngles,
        finalAngles,
        finalQuaternion
      };
    });

    if (this.animations.some(Boolean)) {
      this.scheduleFrame();
    } else {
      this.render();
    }
  }

  scheduleFrame() {
    if (this.disposed || this.frameId) {
      return;
    }
    this.frameId = scheduleDieFrame((now) => this.tick(now));
  }

  tick(now) {
    this.frameId = null;
    if (this.disposed) {
      return;
    }

    let hasActiveAnimation = false;
    let blurStrength = 0;
    this.animations.forEach((animation, index) => {
      if (!animation) {
        return;
      }
      const rig = this.rigs[index];
      const side = index === 0 ? -1 : 1;
      if (now < animation.startedAt) {
        hasActiveAnimation = true;
        return;
      }

      const progress = Math.min((now - animation.startedAt) / animation.durationMs, 1);
      const lift = Math.sin(progress * Math.PI) * (0.42 + (index * 0.02));
      rig.dieGroup.position.y = lift;
      const spread = Math.sin(Math.min(progress / 0.62, 1) * Math.PI * 0.88) * 0.22;
      rig.root.position.x = rig.baseX + (spread * side) + (Math.sin(progress * Math.PI * 1.56) * 0.05 * side);
      rig.root.position.y = Math.sin(progress * Math.PI) * 0.03;
      rig.root.rotation.z = Math.sin(progress * Math.PI * 2.8) * (0.12 * side);
      rig.root.rotation.x = Math.sin(progress * Math.PI * 2.15) * 0.06;
      const shadowScale = 1 - (lift * 0.28);
      rig.shadow.scale.set(shadowScale, shadowScale, 1);

      if (progress < 0.84) {
        const spinProgress = progress / 0.84;
        applyAnglesToRig(rig, lerpAngles(animation.fromAngles, animation.spinAngles, spinProgress));
        blurStrength = Math.max(blurStrength, 0.2 + (Math.sin(spinProgress * Math.PI) * 0.62));
      } else {
        const settleProgress = easeOutBack((progress - 0.84) / 0.16);
        applyAnglesToRig(rig, lerpAngles(animation.spinAngles, animation.finalAngles, settleProgress));
        blurStrength = Math.max(blurStrength, Math.max(0, 0.16 * (1 - settleProgress)));
      }

      if (progress >= 1) {
        resetDieRig(rig, animation.finalQuaternion);
        this.animations[index] = null;
      } else {
        hasActiveAnimation = true;
      }
    });

    this.renderer.domElement.style.filter = blurStrength > 0.02
      ? `blur(${blurStrength.toFixed(3)}px) saturate(0.99)`
      : "";
    this.render();
    if (hasActiveAnimation) {
      this.scheduleFrame();
    } else {
      this.renderer.domElement.style.filter = "";
    }
  }

  render() {
    if (!this.disposed) {
      this.renderer.render(this.scene, this.camera);
    }
  }

  destroy() {
    if (this.disposed) {
      return;
    }
    this.disposed = true;
    if (this.frameId) {
      cancelDieFrame(this.frameId);
      this.frameId = null;
    }
    this.resizeObserver?.disconnect();
    disposeSceneGraph(this.scene);
    this.renderer.dispose();
    this.host.innerHTML = "";
  }
}

function cleanupDisconnected() {
  Array.from(instances.entries()).forEach(([element, instance]) => {
    if (!document.contains(element)) {
      instance.destroy();
      instances.delete(element);
    }
  });
}

function sync(root = document) {
  cleanupDisconnected();
  root.querySelectorAll("[data-ludo-three-die], [data-ludo-three-dice-group]").forEach((element) => {
    const existing = instances.get(element);
    if (existing) {
      existing.applyFromDataset();
      return;
    }
    const instance = element.hasAttribute("data-ludo-three-dice-group")
      ? new LudoDiceGroupScene(element)
      : new LudoDieScene(element);
    instances.set(element, instance);
  });

  if (!resizeBound) {
    resizeBound = true;
    window.addEventListener("resize", () => {
      instances.forEach((instance) => {
        instance.resize();
        instance.render();
      });
    });
  }
}

function destroy(root = document) {
  Array.from(instances.entries()).forEach(([element, instance]) => {
    if (root === document || root.contains(element)) {
      instance.destroy();
      instances.delete(element);
    }
  });
}

window.OpticoreLudoDice3D = {
  sync,
  destroy
};
window.dispatchEvent(new Event("opticore:ludo-dice-ready"));
