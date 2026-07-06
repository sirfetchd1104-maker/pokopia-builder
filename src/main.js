import * as THREE from "three";
import { SceneManager } from "./core/SceneManager.js";
import { CameraController } from "./core/CameraController.js";
import { TouchOrbitCamera } from "./core/TouchOrbitCamera.js";
import { InputManager } from "./core/InputManager.js";
import { BlockManager } from "./systems/BlockManager.js";
import { GridManager } from "./systems/GridManager.js";
import { SaveManager } from "./systems/SaveManager.js";
import { UndoManager } from "./systems/UndoManager.js";
import { Toolbar } from "./ui/Toolbar.js";
import { Sidebar } from "./ui/Sidebar.js";
import { t, getLang, setLang, applyLang } from "./i18n.js";
import { PatchNotesModal } from "./ui/PatchNotes.js";
import { DotView } from "./ui/DotView.js";

const isMobile = "ontouchstart" in window || navigator.maxTouchPoints > 0;
const canvas = document.querySelector("#scene");

let sceneManager;
try {
  sceneManager = new SceneManager(canvas);
} catch (error) {
  document.querySelector("#app").innerHTML =
    '<div style="display:grid;place-items:center;height:100vh;color:#eef3f0;font-family:sans-serif;text-align:center;padding:2rem">' +
    `<h2>${t("webgl_title")}</h2>` +
    `<p>${t("webgl_msg")}</p>` +
    `<p style="color:#aab6b0;font-size:13px">${error.message}</p>` +
    "</div>";
  throw error;
}

const grid = new GridManager(sceneManager.scene);
const blocks = new BlockManager(sceneManager.scene);
const saveManager = new SaveManager(blocks);

// Apply saved language on load
applyLang();

if (isMobile) {
  document.body.classList.add("mobile-editor");
  const touchCam = new TouchOrbitCamera(sceneManager.camera, canvas);
  const undoMgr = new UndoManager();
  const SHARE_API_MOBILE = "https://pokopia-builder-api.sirfetchd1104.workers.dev";
  const AUTOSAVE_KEY = "pokopia-builder-autosave";

  const mobileState = {
    selectedMaterial: "default",
    selectedShape: "cube",
    selectedRotation: 0,
    selectedCell: null,
    removeCell: null,
  };

  // ── Toast ──
  function mobileToast(message) {
    const el = document.querySelector("#toast");
    el.textContent = message;
    el.classList.add("visible");
    clearTimeout(mobileToast.t);
    mobileToast.t = setTimeout(() => el.classList.remove("visible"), 1500);
  }

  // ── Utility ──
  function updateBlockCount() {
    document.querySelector("#mobileBlockCount").textContent = t("mobile_blocks", blocks.count);
  }

  function autoSave() {
    try { localStorage.setItem(AUTOSAVE_KEY, JSON.stringify(blocks.serialize())); } catch {}
  }

  function markChanged() {
    autoSave();
    updateBlockCount();
  }

  // ── Raycast from touch position ──
  function raycastAt(sx, sy) {
    const hit = sceneManager.raycastFromScreen(sx, sy, [grid.ground, ...blocks.getRaycastTargets()]);
    return blocks.getPlacementFromHit(hit);
  }

  // ── Touch Gestures ──
  touchCam.onTap = (sx, sy) => {
    const result = raycastAt(sx, sy);
    if (!result?.placeCell) return;
    const target = {
      ...result.placeCell,
      materialId: mobileState.selectedMaterial,
      shape: mobileState.selectedShape,
      rotation: mobileState.selectedRotation,
    };
    const added = blocks.addBlocks([target]);
    if (added.length > 0) {
      undoMgr.push({ added, removed: [] });
      markChanged();
      mobileToast(t("toast_placed"));
    }
  };

  touchCam.onLongPress = (sx, sy) => {
    const result = raycastAt(sx, sy);
    const target = result?.removeCell ?? result?.placeCell;
    if (!target) return;
    const removed = blocks.removeBlocks([target]);
    if (removed.length > 0) {
      undoMgr.push({ added: [], removed });
      markChanged();
      mobileToast(t("toast_removed"));
      if (navigator.vibrate) navigator.vibrate(30);
    }
  };

  // ── Undo / Redo ──
  function applyUndoRedo(op) {
    if (op.removed.length > 0) blocks.removeBlocks(op.removed);
    if (op.added.length > 0) blocks.addBlocks(op.added);
    markChanged();
  }

  document.querySelector("#mobileUndoBtn").addEventListener("click", () => {
    const op = undoMgr.undo();
    if (!op) { mobileToast(t("toast_no_undo")); return; }
    applyUndoRedo(op);
    mobileToast(t("toast_undo"));
  });

  document.querySelector("#mobileRedoBtn").addEventListener("click", () => {
    const op = undoMgr.redo();
    if (!op) { mobileToast(t("toast_no_redo")); return; }
    applyUndoRedo(op);
    mobileToast(t("toast_redo"));
  });

  // ── Shape Buttons ──
  function updateMobileShapeUI() {
    document.querySelectorAll(".mobile-shape-btn").forEach((btn) => {
      btn.classList.toggle("active", btn.dataset.shape === mobileState.selectedShape);
    });
  }

  document.querySelector("#mobileShapeCube").addEventListener("click", () => {
    mobileState.selectedShape = "cube";
    updateMobileShapeUI();
    mobileToast(t("toast_shape", t("shape_cube")));
  });
  document.querySelector("#mobileShapeWedge").addEventListener("click", () => {
    mobileState.selectedShape = "wedge";
    updateMobileShapeUI();
    mobileToast(t("toast_shape", t("shape_wedge")));
  });
  document.querySelector("#mobileShapeCorner").addEventListener("click", () => {
    mobileState.selectedShape = "corner";
    updateMobileShapeUI();
    mobileToast(t("toast_shape", t("shape_corner")));
  });

  // ── Rotation Button ──
  document.querySelector("#mobileRotateBtn").addEventListener("click", () => {
    mobileState.selectedRotation = (mobileState.selectedRotation + 1) % 4;
    document.querySelector("#mobileRotateBtn").textContent = mobileState.selectedRotation * 90 + "°";
    mobileToast(t("toast_rotation", mobileState.selectedRotation * 90));
  });

  // ── Color Picker ──
  function updateMobileColorIndicator() {
    const mat = blocks.getMaterial(mobileState.selectedMaterial);
    document.querySelector("#mobileColorIndicator").style.background = mat.color;
  }

  function openMobileColorPicker() {
    const modal = document.querySelector("#mobileColorModal");
    const list = document.querySelector("#mobileColorList");
    list.replaceChildren();
    for (const mat of blocks.getMaterialOptions()) {
      const btn = document.createElement("button");
      btn.className = "mobile-color-item";
      if (mat.id === mobileState.selectedMaterial) btn.classList.add("active");
      btn.innerHTML = `<span class="mobile-color-dot" style="background:${mat.color}"></span><span class="mobile-color-name">${mat.memo?.trim() || mat.label || mat.id}</span>`;
      btn.addEventListener("click", () => {
        mobileState.selectedMaterial = mat.id;
        updateMobileColorIndicator();
        closeMobileColorPicker();
        mobileToast(t("toast_color_selected", mat.memo?.trim() || mat.label));
      });
      list.append(btn);
    }
    modal.classList.remove("hidden");
  }

  function closeMobileColorPicker() {
    document.querySelector("#mobileColorModal").classList.add("hidden");
  }

  document.querySelector("#mobileColorBtn").addEventListener("click", openMobileColorPicker);
  document.querySelector("#mobileColorModalClose").addEventListener("click", closeMobileColorPicker);
  document.querySelector("#mobileColorModal").addEventListener("click", (e) => {
    if (e.target.id === "mobileColorModal") closeMobileColorPicker();
  });

  // ── Save / Share ──
  document.querySelector("#mobileSaveBtn").addEventListener("click", () => {
    saveManager.download();
    mobileToast(t("toast_saved_mobile"));
  });

  document.querySelector("#mobileShareBtn").addEventListener("click", async () => {
    const data = blocks.serialize();
    if (!data.blocks || data.blocks.length === 0) {
      mobileToast(t("toast_share_empty"));
      return;
    }
    mobileToast(t("toast_share_loading"));
    try {
      const res = await fetch(SHARE_API_MOBILE + "/api/share", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error();
      const { code } = await res.json();
      const shareUrl = location.origin + location.pathname + "#s=" + code;
      try {
        await navigator.clipboard.writeText(shareUrl);
        mobileToast(t("toast_share_ok"));
      } catch {
        window.prompt(t("toast_share_ok"), shareUrl);
      }
    } catch {
      mobileToast(t("toast_share_fail"));
    }
  });

  // ── File Load ──
  document.querySelector("#mobileLoadInput").addEventListener("change", (e) => {
    if (!e.target.files?.[0]) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        blocks.load(JSON.parse(reader.result));
        undoMgr.clear();
        updateMobileColorIndicator();
        markChanged();
        mobileToast(t("toast_loaded"));
      } catch {
        mobileToast(t("toast_load_error"));
      }
    };
    reader.readAsText(e.target.files[0]);
    e.target.value = "";
  });

  // ── Language Toggle ──
  const mobileLangSelect = document.querySelector("#langSelect");
  mobileLangSelect.value = getLang();
  mobileLangSelect.addEventListener("change", () => {
    setLang(mobileLangSelect.value);
    updateBlockCount();
  });

  // ── Auto-load shared design from URL ──
  const mobileHash = location.hash.slice(1);
  const mobileShareCode = new URLSearchParams(mobileHash).get("s");
  let sharedLoaded = false;

  if (mobileShareCode) {
    (async () => {
      try {
        const res = await fetch(SHARE_API_MOBILE + "/api/share/" + mobileShareCode);
        if (!res.ok) { mobileToast(t("toast_shared_not_found")); return; }
        const data = await res.json();
        blocks.load(data);
        updateMobileColorIndicator();
        markChanged();
        mobileToast(t("toast_shared_loaded"));
        history.replaceState(null, "", location.pathname);
      } catch {
        mobileToast(t("toast_shared_not_found"));
      }
    })();
    sharedLoaded = true;
  }

  if (!sharedLoaded) {
    let restored = false;
    try {
      const saved = localStorage.getItem(AUTOSAVE_KEY);
      if (saved) {
        blocks.load(JSON.parse(saved));
        restored = true;
      }
    } catch {}

    if (!restored) blocks.addBlock({ x: 0, y: 0, z: 0 }, "default", "cube");
    updateBlockCount();
    mobileToast(restored ? t("toast_autosave") : t("toast_ready"));
  }

  // ── Init UI ──
  updateMobileColorIndicator();

  // ── Joystick ──
  const joystickBase = document.querySelector(".joystick-base");
  const joystickKnob = document.querySelector("#joystickKnob");
  const joy = { x: 0, y: 0, active: false, touchId: null };
  const JOYSTICK_RADIUS = 26; // max knob offset from center
  const JOYSTICK_SPEED = 8;

  joystickBase.addEventListener("touchstart", (e) => {
    e.preventDefault();
    e.stopPropagation();
    const touch = e.changedTouches[0];
    joy.active = true;
    joy.touchId = touch.identifier;
    updateJoystick(touch);
  }, { passive: false });

  window.addEventListener("touchmove", (e) => {
    if (!joy.active) return;
    for (const touch of e.changedTouches) {
      if (touch.identifier === joy.touchId) {
        updateJoystick(touch);
        break;
      }
    }
  }, { passive: true });

  window.addEventListener("touchend", (e) => {
    if (!joy.active) return;
    for (const touch of e.changedTouches) {
      if (touch.identifier === joy.touchId) {
        joy.active = false;
        joy.touchId = null;
        joy.x = 0;
        joy.y = 0;
        joystickKnob.style.transform = "translate(-50%, -50%)";
        joystickKnob.style.left = "50%";
        joystickKnob.style.top = "50%";
        break;
      }
    }
  });

  function updateJoystick(touch) {
    const rect = joystickBase.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    let dx = touch.clientX - cx;
    let dy = touch.clientY - cy;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist > JOYSTICK_RADIUS) {
      dx = (dx / dist) * JOYSTICK_RADIUS;
      dy = (dy / dist) * JOYSTICK_RADIUS;
    }

    joy.x = dx / JOYSTICK_RADIUS;  // -1 to 1 (right positive)
    joy.y = -dy / JOYSTICK_RADIUS; // -1 to 1 (up/forward positive)

    joystickKnob.style.left = `calc(50% + ${dx}px)`;
    joystickKnob.style.top = `calc(50% + ${dy}px)`;
    joystickKnob.style.transform = "translate(-50%, -50%)";
  }

  // ── Animation Loop ──
  let lastTime = performance.now();
  function mobileAnimate(now) {
    const delta = Math.min((now - lastTime) / 1000, 0.1);
    lastTime = now;

    // Apply joystick movement to camera target
    if (joy.active && (joy.x !== 0 || joy.y !== 0)) {
      const fwd_x = -Math.sin(touchCam.theta);
      const fwd_z = -Math.cos(touchCam.theta);
      const right_x = Math.cos(touchCam.theta);
      const right_z = -Math.sin(touchCam.theta);

      const moveX = (joy.x * right_x + joy.y * fwd_x) * JOYSTICK_SPEED * delta;
      const moveZ = (joy.x * right_z + joy.y * fwd_z) * JOYSTICK_SPEED * delta;

      touchCam.target.x += moveX;
      touchCam.target.z += moveZ;
      touchCam.applyPosition();
    }

    sceneManager.render();
    requestAnimationFrame(mobileAnimate);
  }
  requestAnimationFrame(mobileAnimate);
} else {
  // ── PC Editor Mode ──

const cameraController = new CameraController(sceneManager.camera, canvas);
const input = new InputManager(canvas);
const undoManager = new UndoManager();
const sidebar = new Sidebar();

const selectionBoxEdges = new THREE.EdgesGeometry(new THREE.BoxGeometry(1, 1, 1));
const selectionBox = new THREE.LineSegments(
  selectionBoxEdges,
  new THREE.LineBasicMaterial({ color: 0x4fc3f7, transparent: true, opacity: 0.85 })
);
selectionBox.visible = false;
selectionBox.renderOrder = 999;
sceneManager.scene.add(selectionBox);
const toolbar = new Toolbar({
  materials: blocks.getMaterialOptions(),
  onMaterialChange: (materialId) => {
    state.selectedMaterial = materialId;
    sidebar.setMaterial(getMaterialLabel(blocks.getMaterial(materialId)));
  },
  onMaterialUpdate: (materialId, updates) => {
    const updated = blocks.updateMaterial(materialId, updates);
    if (updated) {
      markChanged();
      sidebar.setMaterial(getMaterialLabel(updated));
    }
    return updated;
  },
  onMaterialAdd: () => {
    const created = blocks.addMaterial();
    toolbar.renderMaterials(blocks.getMaterialOptions(), created.id);
    state.selectedMaterial = created.id;
    sidebar.setMaterial(getMaterialLabel(created));
    markChanged();
    toast(t("toast_color_added"));
  },
  onMaterialRemove: (materialId) => {
    if (materialId === "default") {
      toast(t("toast_cant_remove"));
      return;
    }
    if (!blocks.removeMaterial(materialId)) return;
    toolbar.renderMaterials(blocks.getMaterialOptions());
    state.selectedMaterial = "default";
    sidebar.setMaterial(getMaterialLabel(blocks.getMaterial("default")));
    markChanged();
    toast(t("toast_color_removed"));
  },
  onShapeChange: (shape) => {
    state.selectedShape = shape;
    sidebar.setShape(shape);
    toast(t("toast_shape", t("shape_" + shape)));
  },
  onRotationChange: (rotation) => {
    state.selectedRotation = rotation;
    sidebar.setRotation(rotation);
  },
  onBatchChange: (batch) => {
    state.batch = batch;
    sidebar.setBatch(batch);
  },
  onSymmetryChange: (mode) => {
    state.symmetryMode = mode;
    sidebar.setSymmetry(mode);
  },
  onLayerChange: (filter) => {
    state.layerFilter = filter;
    blocks.setLayerFilter(filter);
    sidebar.setLayer(filter);
  },
  onSave: () => {
    saveManager.download();
    state.hasUnsavedChanges = false;
  },
  onLoad: async (file) => {
    try {
      await saveManager.loadFile(file);
      toolbar.renderMaterials(blocks.getMaterialOptions());
      state.selectedMaterial = blocks.getMaterialOptions()[0]?.id ?? "default";
      sidebar.setMaterial(getMaterialLabel(blocks.getMaterial(state.selectedMaterial)));
      markChanged();
      undoManager.clear();
      toast(t("toast_loaded"));
    } catch (error) {
      toast(error.message);
    }
  },
  onReset: () => {
    if (!window.confirm(t("confirm_reset"))) return;
    const allBlocks = blocks.getAllBlocks();
    blocks.clear();
    if (allBlocks.length > 0) {
      undoManager.push({ added: [], removed: allBlocks });
    }
    state.clipboard = [];
    markChanged();
    toast(t("toast_reset"));
  },
});

// Camera settings sliders
document.querySelector("#sensitivityRange").addEventListener("input", (e) => {
  cameraController.sensitivity = Number(e.target.value) / 10000;
});
document.querySelector("#speedRange").addEventListener("input", (e) => {
  cameraController.speed = Number(e.target.value);
});
document.querySelector("#zoomRange").addEventListener("input", (e) => {
  const spread = Number(e.target.value) * 5;
  cameraController.minFov = Math.max(5, 55 - spread);
  cameraController.maxFov = Math.min(120, 55 + spread);
  cameraController.camera.fov = Math.max(cameraController.minFov, Math.min(cameraController.maxFov, cameraController.camera.fov));
  cameraController.camera.updateProjectionMatrix();
});

// Language toggle
const langSelect = document.querySelector("#langSelect");
langSelect.value = getLang();
langSelect.addEventListener("change", () => {
  setLang(langSelect.value);
  grid.updateLabels();
  refreshSidebar();
});

function refreshSidebar() {
  sidebar.setMaterial(getMaterialLabel(blocks.getMaterial(state.selectedMaterial)));
  sidebar.setShape(state.selectedShape);
  sidebar.setRotation(state.selectedRotation);
  sidebar.setBatch(state.batch);
  sidebar.setSymmetry(state.symmetryMode);
  sidebar.setLayer(state.layerFilter);
  sidebar.setClipboard(state.clipboard.length);
}

const dotView = new DotView(blocks);
dotView.onClose(() => {
  document.querySelector("#scene").style.display = "";
  document.querySelector(".panel-left").style.display = "";
  document.querySelector(".panel-right").style.display = "";
  document.querySelector(".hint-bar").style.display = "";
});
document.querySelector("#dotViewButton").addEventListener("click", () => {
  if (document.pointerLockElement) document.exitPointerLock();
  if (!dotView.open()) {
    toast(t("toast_export_empty"));
    return;
  }
  document.querySelector("#scene").style.display = "none";
  document.querySelector(".panel-left").style.display = "none";
  document.querySelector(".panel-right").style.display = "none";
  document.querySelector(".hint-bar").style.display = "none";
});

const state = {
  selectedMaterial: "default",
  selectedShape: "cube",
  selectedRotation: 0,
  batch: { direction: "off", count: 1 },
  symmetryMode: "off",
  layerFilter: { mode: "all", value: 0 },
  clipboard: [],
  selectedCell: null,
  removeCell: null,
  hasUnsavedChanges: false,
  lastTime: performance.now(),
  boxSelect: { pointA: null, pointB: null },
};

input.onPrimaryAction = () => {
  if (state.boxSelect.pointA) clearBoxSelection();
  if (!state.selectedCell) return;
  const targets = getPlacementCells(state.selectedCell)
    .flatMap((cell) => getSymmetryCells(cell))
    .map((cell) => ({
      ...cell,
      materialId: state.selectedMaterial,
      shape: state.selectedShape,
      rotation: state.selectedRotation,
    }));
  const added = blocks.addBlocks(targets);
  if (added.length > 0) {
    undoManager.push({ added, removed: [] });
    markChanged();
    toast(added.length > 1 ? t("toast_placed_n", added.length) : t("toast_placed"));
  }
};

input.onSecondaryAction = () => {
  if (state.boxSelect.pointA) clearBoxSelection();
  const target = state.removeCell ?? state.selectedCell;
  if (!target) return;
  const cells = getSymmetryCells(target);
  const removed = blocks.removeBlocks(cells);
  if (removed.length > 0) {
    undoManager.push({ added: [], removed });
    markChanged();
    toast(t("toast_removed"));
  }
};

document.addEventListener("keydown", (event) => {
  const mod = event.ctrlKey || event.metaKey;
  if (document.pointerLockElement === canvas && mod && (event.code === "KeyD" || event.code === "KeyW")) {
    input.keys.add(event.code);
    event.preventDefault();
    event.stopPropagation();
    if (!event.repeat) {
      toast(event.code === "KeyD" ? t("toast_bookmark") : t("toast_close"));
    }
    return;
  }

  if (!mod) return;
  if (event.code === "KeyC") {
    event.preventDefault();
    if (state.boxSelect.pointA && state.boxSelect.pointB) {
      copySelectedBlocks();
    } else {
      copyTargetBlock();
    }
  }
  if (event.code === "KeyV") {
    event.preventDefault();
    pasteClipboard();
  }
  if (event.code === "KeyZ") {
    event.preventDefault();
    performUndo();
  }
  if (event.code === "KeyY") {
    event.preventDefault();
    performRedo();
  }
  if (event.code === "ArrowUp" || event.code === "ArrowDown" ||
      event.code === "ArrowLeft" || event.code === "ArrowRight" ||
      event.code === "Comma" || event.code === "Period") {
    event.preventDefault();
    performMoveAll(event.code);
  }
}, { capture: true });

window.addEventListener("keydown", (event) => {
  if (event.code === "Tab") {
    event.preventDefault();
    if (document.pointerLockElement === canvas) {
      document.exitPointerLock();
    } else {
      canvas.requestPointerLock();
    }
    return;
  }

  if (document.pointerLockElement !== canvas) return;
  if (event.ctrlKey || event.metaKey || event.altKey) return;
  if (!event.repeat && (event.code === "Digit1" || event.code === "Digit2" || event.code === "Digit3")) {
    const shapes = { Digit1: "cube", Digit2: "wedge", Digit3: "corner" };
    state.selectedShape = shapes[event.code];
    toolbar.setShape(state.selectedShape);
    sidebar.setShape(state.selectedShape);
    toast(t("toast_shape", t("shape_" + state.selectedShape)));
  }
  if (event.code === "KeyR" && !event.repeat) {
    state.selectedRotation = (state.selectedRotation + 1) % 4;
    toolbar.setRotation(state.selectedRotation);
    sidebar.setRotation(state.selectedRotation);
    toast(t("toast_rotation", state.selectedRotation * 90));
  }
  if (event.code === "KeyE" && !event.repeat) {
    const directions = ["off", "forward", "right", "up"];
    const currentIndex = directions.indexOf(state.batch.direction);
    const nextDirection = directions[(currentIndex + 1) % directions.length];
    const count = nextDirection === "off" ? 1 : state.batch.count;
    state.batch = { direction: nextDirection, count: count === 1 && nextDirection !== "off" ? 2 : count };
    toolbar.setBatch(state.batch);
    sidebar.setBatch(state.batch);
    toast(t("toast_batch", t("batch_dir_" + nextDirection)));
  }
  if (event.code === "KeyT" && !event.repeat) {
    const modes = ["off", "x", "z"];
    const labels = { off: "sym_label_off", x: "sym_label_lr", z: "sym_label_fb" };
    const currentIndex = modes.indexOf(state.symmetryMode);
    state.symmetryMode = modes[(currentIndex + 1) % modes.length];
    toolbar.setSymmetry(state.symmetryMode);
    sidebar.setSymmetry(state.symmetryMode);
    toast(t("toast_symmetry", t(labels[state.symmetryMode])));
  }
  if (event.code === "KeyF" && !event.repeat) {
    handleBoxSelectPoint();
  }
  if ((event.code === "Delete" || event.code === "Backspace") && !event.repeat && state.boxSelect.pointA && state.boxSelect.pointB) {
    deleteSelectedBlocks();
  }
});

window.addEventListener("beforeunload", (event) => {
  if (!state.hasUnsavedChanges) return;
  event.preventDefault();
  event.returnValue = "";
});

function performMoveAll(code) {
  const dirs = {
    ArrowUp: [0, 0, -1, "dir_front"],
    ArrowDown: [0, 0, 1, "dir_back"],
    ArrowLeft: [-1, 0, 0, "dir_left"],
    ArrowRight: [1, 0, 0, "dir_right"],
    Period: [0, 1, 0, "dir_up"],
    Comma: [0, -1, 0, "dir_down"],
  };
  const [dx, dy, dz, labelKey] = dirs[code];
  const before = blocks.getAllBlocks();
  const moved = blocks.moveAll(dx, dy, dz);
  if (moved.length > 0) {
    undoManager.push({ added: moved, removed: before });
    markChanged();
    toast(t("toast_moved", t(labelKey)));
  } else {
    toast(t("toast_cant_move"));
  }
}

function performUndo() {
  const op = undoManager.undo();
  if (!op) {
    toast(t("toast_no_undo"));
    return;
  }
  applyUndoRedo(op);
  toast(t("toast_undo"));
}

function performRedo() {
  const op = undoManager.redo();
  if (!op) {
    toast(t("toast_no_redo"));
    return;
  }
  applyUndoRedo(op);
  toast(t("toast_redo"));
}

function applyUndoRedo(operation) {
  if (operation.removed.length > 0) {
    blocks.removeBlocks(operation.removed);
  }
  if (operation.added.length > 0) {
    blocks.addBlocks(operation.added);
  }
  markChanged();
}

function updateGhost() {
  const hit = sceneManager.raycastFromCenter([grid.ground, ...blocks.getRaycastTargets()]);
  const result = blocks.getPlacementFromHit(hit);
  state.selectedCell = result?.placeCell ?? null;
  state.removeCell = result?.removeCell ?? null;

  if (state.selectedCell) {
    const previewCells = getPlacementCells(state.selectedCell)
      .flatMap((cell) => getSymmetryCells(cell));
    blocks.setGhost(previewCells, state.selectedShape, state.selectedMaterial, state.selectedRotation);
  } else {
    blocks.setGhost(null);
  }
}

function updateSidebar() {
  sidebar.setBlockCount(blocks.count);
  sidebar.setSelectedCell(state.selectedCell);
  sidebar.setCamera(sceneManager.camera.position);
  sidebar.setClipboard(state.clipboard.length);
  sidebar.setColorStats(blocks.getColorStats(), blocks.getMaterialOptions());
}

function copyTargetBlock() {
  if (!state.removeCell) {
    toast(t("toast_aim_copy"));
    return;
  }

  const block = blocks.getBlock(state.removeCell);
  if (!block) {
    toast(t("toast_copy_fail"));
    return;
  }

  state.clipboard = [{ x: 0, y: 0, z: 0, materialId: block.materialId, shape: block.shape, rotation: block.rotation }];
  sidebar.setClipboard(state.clipboard.length);
  toast(t("toast_copied"));
}

function pasteClipboard() {
  if (state.clipboard.length === 0) {
    toast(t("toast_clipboard_empty"));
    return;
  }
  if (!state.selectedCell) {
    toast(t("toast_aim_paste"));
    return;
  }

  const blocksToPlace = [];
  for (const copied of state.clipboard) {
    const base = {
      x: state.selectedCell.x + copied.x,
      y: state.selectedCell.y + copied.y,
      z: state.selectedCell.z + copied.z,
    };
    for (const cell of getSymmetryCells(base)) {
      blocksToPlace.push({ ...cell, materialId: copied.materialId, shape: copied.shape, rotation: copied.rotation });
    }
  }

  const added = blocks.addBlocks(blocksToPlace);
  if (added.length > 0) {
    undoManager.push({ added, removed: [] });
    markChanged();
    toast(t("toast_pasted"));
  }
}

function updateSelectionBox() {
  const { pointA, pointB } = state.boxSelect;
  if (!pointA) {
    selectionBox.visible = false;
    return;
  }
  if (!pointB) {
    selectionBox.position.set(pointA.x, pointA.y, pointA.z);
    selectionBox.scale.set(1.02, 1.02, 1.02);
    selectionBox.visible = true;
    return;
  }
  const minX = Math.min(pointA.x, pointB.x);
  const maxX = Math.max(pointA.x, pointB.x);
  const minY = Math.min(pointA.y, pointB.y);
  const maxY = Math.max(pointA.y, pointB.y);
  const minZ = Math.min(pointA.z, pointB.z);
  const maxZ = Math.max(pointA.z, pointB.z);
  const sizeX = maxX - minX + 1;
  const sizeY = maxY - minY + 1;
  const sizeZ = maxZ - minZ + 1;
  selectionBox.position.set(minX + (sizeX - 1) / 2, minY + (sizeY - 1) / 2, minZ + (sizeZ - 1) / 2);
  selectionBox.scale.set(sizeX + 0.02, sizeY + 0.02, sizeZ + 0.02);
  selectionBox.visible = true;
}

function clearBoxSelection() {
  state.boxSelect.pointA = null;
  state.boxSelect.pointB = null;
  updateSelectionBox();
}

function getSelectedBlocks() {
  const { pointA, pointB } = state.boxSelect;
  if (!pointA || !pointB) return [];
  const minX = Math.min(pointA.x, pointB.x);
  const maxX = Math.max(pointA.x, pointB.x);
  const minY = Math.min(pointA.y, pointB.y);
  const maxY = Math.max(pointA.y, pointB.y);
  const minZ = Math.min(pointA.z, pointB.z);
  const maxZ = Math.max(pointA.z, pointB.z);
  return blocks.getAllBlocks().filter((b) =>
    b.x >= minX && b.x <= maxX && b.y >= minY && b.y <= maxY && b.z >= minZ && b.z <= maxZ
  );
}

function handleBoxSelectPoint() {
  if (!state.removeCell) {
    toast(t("toast_aim_select"));
    return;
  }
  if (!state.boxSelect.pointA || state.boxSelect.pointB) {
    state.boxSelect.pointA = { x: state.removeCell.x, y: state.removeCell.y, z: state.removeCell.z };
    state.boxSelect.pointB = null;
    updateSelectionBox();
    toast(t("toast_select_start"));
  } else {
    state.boxSelect.pointB = { x: state.removeCell.x, y: state.removeCell.y, z: state.removeCell.z };
    updateSelectionBox();
    toast(t("toast_select_done", getSelectedBlocks().length));
  }
}

function copySelectedBlocks() {
  const selected = getSelectedBlocks();
  if (selected.length === 0) {
    toast(t("toast_select_empty"));
    return;
  }
  const origin = state.boxSelect.pointA;
  state.clipboard = selected.map((b) => ({
    x: b.x - origin.x, y: b.y - origin.y, z: b.z - origin.z,
    materialId: b.materialId, shape: b.shape, rotation: b.rotation,
  }));
  sidebar.setClipboard(state.clipboard.length);
  toast(t("toast_copied_n", selected.length));
}

function deleteSelectedBlocks() {
  const selected = getSelectedBlocks();
  if (selected.length === 0) {
    toast(t("toast_select_empty"));
    return;
  }
  const removed = blocks.removeBlocks(selected);
  if (removed.length > 0) {
    undoManager.push({ added: [], removed });
    markChanged();
  }
  clearBoxSelection();
  toast(t("toast_removed_n", removed.length));
}

function getSymmetryCells(cell) {
  const cells = [{ x: cell.x, y: cell.y, z: cell.z }];
  if (state.symmetryMode === "x" && cell.x !== 0) {
    cells.push({ x: -cell.x, y: cell.y, z: cell.z });
  }
  if (state.symmetryMode === "z" && cell.z !== 0) {
    cells.push({ x: cell.x, y: cell.y, z: -cell.z });
  }
  return cells;
}

function getPlacementCells(origin) {
  if (state.batch.direction === "off") {
    return [{ x: origin.x, y: origin.y, z: origin.z }];
  }
  const cells = [];
  const direction = getBatchDirectionVector(state.batch.direction);
  for (let index = 0; index < state.batch.count; index += 1) {
    cells.push({
      x: origin.x + direction.x * index,
      y: origin.y + direction.y * index,
      z: origin.z + direction.z * index,
    });
  }
  return cells;
}

function getBatchDirectionVector(direction) {
  if (direction === "right") return { x: 1, y: 0, z: 0 };
  if (direction === "up") return { x: 0, y: 1, z: 0 };
  return { x: 0, y: 0, z: -1 };
}

const AUTOSAVE_KEY = "pokopia-builder-autosave";

function autoSave() {
  try {
    localStorage.setItem(AUTOSAVE_KEY, JSON.stringify(blocks.serialize()));
  } catch { /* localStorage unavailable or full */ }
}

function markChanged() {
  state.hasUnsavedChanges = true;
  autoSave();
}

function getMaterialLabel(material) {
  if (material.memo?.trim()) return material.memo.trim();
  if (material.id === "default") return t("default_block");
  return material.label || material.id;
}

function toast(message) {
  const el = document.querySelector("#toast");
  el.textContent = message;
  el.classList.add("visible");
  clearTimeout(toast.timeout);
  toast.timeout = setTimeout(() => el.classList.remove("visible"), 1500);
}

function animate(time) {
  const delta = Math.min((time - state.lastTime) / 1000, 0.05);
  state.lastTime = time;

  cameraController.update(input, delta);
  updateGhost();
  updateSidebar();
  sceneManager.render();
  requestAnimationFrame(animate);
}

let restored = false;
try {
  const saved = localStorage.getItem(AUTOSAVE_KEY);
  if (saved) {
    blocks.load(JSON.parse(saved));
    toolbar.renderMaterials(blocks.getMaterialOptions());
    state.selectedMaterial = blocks.getMaterialOptions()[0]?.id ?? "default";
    restored = true;
  }
} catch { /* ignore corrupt data */ }

if (!restored) {
  blocks.addBlock({ x: 0, y: 0, z: 0 }, "default", "cube");
}

sidebar.setMaterial(getMaterialLabel(blocks.getMaterial(state.selectedMaterial)));
sidebar.setShape(state.selectedShape);
sidebar.setRotation(state.selectedRotation);
sidebar.setBatch(state.batch);
sidebar.setSymmetry(state.symmetryMode);
sidebar.setLayer(state.layerFilter);
toast(restored ? t("toast_autosave") : t("toast_ready"));

// Patch notes modal
const patchModal = new PatchNotesModal();
document.querySelector("#versionLabel").textContent = "v" + patchModal.getVersion();
const versionBtn = document.querySelector("#versionButton");
versionBtn.textContent = t("patch_button");
versionBtn.addEventListener("click", () => patchModal.open());

if (patchModal.shouldShow()) {
  patchModal.open();
}

// Guide modal
const guideOverlay = document.querySelector("#guideModal");
const guideTitle = document.querySelector("#guideModalTitle");
const guideBody = document.querySelector("#guideModalBody");

function openGuide() {
  guideTitle.textContent = t("guide_title");
  guideBody.innerHTML = renderGuide();
  guideOverlay.classList.remove("hidden");
}

function closeGuide() {
  guideOverlay.classList.add("hidden");
}

function renderGuide() {
  const lang = getLang();
  const sections = lang === "ko" ? [
    { title: "카메라", items: [
      ["Tab", "카메라 잠금 / 해제"],
      ["W A S D", "이동"],
      ["Space", "위로 이동"],
      ["Shift", "아래로 이동"],
      ["마우스 휠", "줌 인/아웃"],
    ]},
    { title: "건축", items: [
      ["좌클릭", "블록 설치"],
      ["우클릭", "블록 제거"],
      ["1 / 2 / 3", "블록 종류 (블록 / 지붕 / 모서리)"],
      ["R", "회전 (0° → 90° → 180° → 270°)"],
      ["E", "일괄배치 방향 전환 (끄기 → 앞 → 오른쪽 → 위)"],
      ["T", "대칭배치 전환 (끄기 → 좌우 → 앞뒤)"],
    ]},
    { title: "범위 선택", items: [
      ["F", "선택 시작점/끝점 지정 (블록 조준 후)"],
      ["Delete / Backspace", "선택 범위 블록 삭제"],
    ]},
    { title: "클립보드", items: [
      ["Ctrl+C", "복사 (범위 선택 또는 단일 블록)"],
      ["Ctrl+V", "붙여넣기"],
    ]},
    { title: "기록", items: [
      ["Ctrl+Z", "실행 취소"],
      ["Ctrl+Y", "다시 실행"],
    ]},
    { title: "전체 이동", items: [
      ["Ctrl+↑↓←→", "전체 블록 이동 (앞/뒤/좌/우)"],
      ["Ctrl+.", "전체 블록 위로"],
      ["Ctrl+,", "전체 블록 아래로"],
    ]},
  ] : [
    { title: "Camera", items: [
      ["Tab", "Lock / Unlock camera"],
      ["W A S D", "Move"],
      ["Space", "Move up"],
      ["Shift", "Move down"],
      ["Scroll", "Zoom in/out"],
    ]},
    { title: "Building", items: [
      ["Left Click", "Place block"],
      ["Right Click", "Remove block"],
      ["1 / 2 / 3", "Shape (Block / Wedge / Corner)"],
      ["R", "Rotate (0° → 90° → 180° → 270°)"],
      ["E", "Batch direction (Off → Fwd → Right → Up)"],
      ["T", "Symmetry (Off → L-R → F-B)"],
    ]},
    { title: "Box Select", items: [
      ["F", "Set start/end point (aim at a block)"],
      ["Delete / Backspace", "Delete selected blocks"],
    ]},
    { title: "Clipboard", items: [
      ["Ctrl+C", "Copy (selection or single block)"],
      ["Ctrl+V", "Paste"],
    ]},
    { title: "History", items: [
      ["Ctrl+Z", "Undo"],
      ["Ctrl+Y", "Redo"],
    ]},
    { title: "Move All", items: [
      ["Ctrl+↑↓←→", "Move all blocks (F/B/L/R)"],
      ["Ctrl+.", "Move all up"],
      ["Ctrl+,", "Move all down"],
    ]},
  ];

  let html = "";
  for (const section of sections) {
    html += `<h3>${section.title}</h3><ul>`;
    for (const [key, desc] of section.items) {
      html += `<li><kbd style="margin-right:8px">${key}</kbd> ${desc}</li>`;
    }
    html += "</ul>";
  }
  return html;
}

document.querySelector("#guideButton").addEventListener("click", () => openGuide());
document.querySelector("#guideModalClose").addEventListener("click", () => closeGuide());
document.querySelector("#guideModalOk").addEventListener("click", () => closeGuide());
guideOverlay.addEventListener("click", (e) => {
  if (e.target === guideOverlay) closeGuide();
});

// Share feature
const SHARE_API = "https://pokopia-builder-api.sirfetchd1104.workers.dev";

document.querySelector("#shareButton").addEventListener("click", async () => {
  const data = blocks.serialize();
  if (!data.blocks || data.blocks.length === 0) {
    toast(t("toast_share_empty"));
    return;
  }
  toast(t("toast_share_loading"));
  try {
    const res = await fetch(SHARE_API + "/api/share", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error();
    const { code } = await res.json();
    const shareUrl = location.origin + location.pathname + "#s=" + code;
    try {
      await navigator.clipboard.writeText(shareUrl);
      toast(t("toast_share_ok"));
    } catch {
      window.prompt(t("toast_share_ok"), shareUrl);
    }
  } catch {
    toast(t("toast_share_fail"));
  }
});

// Auto-load shared design from URL
(async () => {
  const hash = location.hash.slice(1);
  const code = new URLSearchParams(hash).get("s");
  if (!code) return;
  try {
    const res = await fetch(SHARE_API + "/api/share/" + code);
    if (!res.ok) { toast(t("toast_shared_not_found")); return; }
    const data = await res.json();
    blocks.load(data);
    toolbar.renderMaterials(blocks.getMaterialOptions());
    state.selectedMaterial = blocks.getMaterialOptions()[0]?.id ?? "default";
    sidebar.setMaterial(getMaterialLabel(blocks.getMaterial(state.selectedMaterial)));
    markChanged();
    undoManager.clear();
    toast(t("toast_shared_loaded"));
    history.replaceState(null, "", location.pathname);
  } catch {
    toast(t("toast_shared_not_found"));
  }
})();

requestAnimationFrame(animate);

} // end PC editor mode
