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
  document.body.classList.add("mobile-viewer");
  const touchCam = new TouchOrbitCamera(sceneManager.camera, canvas);

  // Mobile language toggle
  const mobileLangSelect = document.querySelector("#langSelect");
  mobileLangSelect.value = getLang();
  mobileLangSelect.addEventListener("change", () => {
    setLang(mobileLangSelect.value);
    document.querySelector("#mobileBlockCount").textContent = t("mobile_blocks", blocks.count);
  });

  function mobileLoadFile(file) {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        blocks.load(JSON.parse(reader.result));
        document.querySelector("#mobileBlockCount").textContent = t("mobile_blocks", blocks.count);
        mobileToast(t("toast_loaded"));
      } catch {
        mobileToast(t("toast_load_error"));
      }
    };
    reader.readAsText(file);
  }

  document.querySelector("#mobileLoadInput").addEventListener("change", (e) => {
    if (e.target.files?.[0]) mobileLoadFile(e.target.files[0]);
    e.target.value = "";
  });

  function mobileToast(message) {
    const el = document.querySelector("#toast");
    el.textContent = message;
    el.classList.add("visible");
    clearTimeout(mobileToast.t);
    mobileToast.t = setTimeout(() => el.classList.remove("visible"), 1500);
  }

  let restored = false;
  try {
    const saved = localStorage.getItem("pokopia-builder-autosave");
    if (saved) {
      blocks.load(JSON.parse(saved));
      restored = true;
    }
  } catch {}

  if (!restored) blocks.addBlock({ x: 0, y: 0, z: 0 }, "default", "cube");
  document.querySelector("#mobileBlockCount").textContent = t("mobile_blocks", blocks.count);
  mobileToast(restored ? t("toast_autosave") : t("toast_viewer"));

  function mobileAnimate() {
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
};

input.onPrimaryAction = () => {
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
    copyTargetBlock();
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
const versionBtn = document.querySelector("#versionButton");
versionBtn.textContent = t("patch_button");
versionBtn.addEventListener("click", () => patchModal.open());

if (patchModal.shouldShow()) {
  patchModal.open();
}

requestAnimationFrame(animate);

} // end PC editor mode
