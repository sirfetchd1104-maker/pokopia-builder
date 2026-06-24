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

const isMobile = "ontouchstart" in window || navigator.maxTouchPoints > 0;
const canvas = document.querySelector("#scene");

let sceneManager;
try {
  sceneManager = new SceneManager(canvas);
} catch (error) {
  document.querySelector("#app").innerHTML =
    '<div style="display:grid;place-items:center;height:100vh;color:#eef3f0;font-family:sans-serif;text-align:center;padding:2rem">' +
    "<h2>WebGL을 사용할 수 없습니다</h2>" +
    "<p>브라우저가 WebGL을 지원하는지 확인해 주세요.</p>" +
    `<p style="color:#aab6b0;font-size:13px">${error.message}</p>` +
    "</div>";
  throw error;
}

const grid = new GridManager(sceneManager.scene);
const blocks = new BlockManager(sceneManager.scene);
const saveManager = new SaveManager(blocks);

if (isMobile) {
  document.body.classList.add("mobile-viewer");
  const touchCam = new TouchOrbitCamera(sceneManager.camera, canvas);

  function mobileLoadFile(file) {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        blocks.load(JSON.parse(reader.result));
        document.querySelector("#mobileBlockCount").textContent = `블록 ${blocks.count}개`;
        mobileToast("설계를 불러왔습니다.");
      } catch {
        mobileToast("파일을 읽을 수 없습니다.");
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
  document.querySelector("#mobileBlockCount").textContent = `블록 ${blocks.count}개`;
  mobileToast(restored ? "자동 저장된 설계를 불러왔습니다." : "뷰어 모드");

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
    toast("새 색상을 추가했습니다.");
  },
  onMaterialRemove: (materialId) => {
    if (materialId === "default") {
      toast("기본 색상은 삭제할 수 없습니다.");
      return;
    }
    if (!blocks.removeMaterial(materialId)) return;
    toolbar.renderMaterials(blocks.getMaterialOptions());
    state.selectedMaterial = "default";
    sidebar.setMaterial(getMaterialLabel(blocks.getMaterial("default")));
    markChanged();
    toast("색상을 삭제했습니다.");
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
      toast("설계를 불러왔습니다.");
    } catch (error) {
      toast(error.message);
    }
  },
  onReset: () => {
    if (!window.confirm("현재 배치된 모든 요소를 초기화할까요? 저장하지 않은 내용은 사라집니다.")) return;
    const allBlocks = blocks.getAllBlocks();
    blocks.clear();
    if (allBlocks.length > 0) {
      undoManager.push({ added: [], removed: allBlocks });
    }
    state.clipboard = [];
    markChanged();
    toast("설계를 초기화했습니다.");
  },
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
    toast(added.length > 1 ? `${added.length}개를 배치했습니다.` : "블록을 배치했습니다.");
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
    toast("블록을 삭제했습니다.");
  }
};

document.addEventListener("keydown", (event) => {
  if (document.pointerLockElement === canvas && event.ctrlKey && (event.code === "KeyD" || event.code === "KeyW")) {
    input.keys.add(event.code);
    event.preventDefault();
    event.stopPropagation();
    if (!event.repeat) {
      toast(event.code === "KeyD" ? "북마크 단축키를 막았습니다." : "창 닫기 단축키를 막았습니다.");
    }
    return;
  }

  if (!event.ctrlKey) return;
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
  if (event.ctrlKey || event.altKey) return;
  if (!event.repeat && (event.code === "Digit1" || event.code === "Digit2" || event.code === "Digit3")) {
    const shapes = { Digit1: "cube", Digit2: "wedge", Digit3: "corner" };
    const labels = { cube: "블록", wedge: "지붕", corner: "모서리" };
    state.selectedShape = shapes[event.code];
    sidebar.setShape(state.selectedShape);
    toast(`블록 종류: ${labels[state.selectedShape]}`);
  }
  if (event.code === "KeyR" && !event.repeat) {
    state.selectedRotation = (state.selectedRotation + 1) % 4;
    toolbar.setRotation(state.selectedRotation);
    sidebar.setRotation(state.selectedRotation);
    toast(`회전: ${state.selectedRotation * 90}°`);
  }
  if (event.code === "KeyE" && !event.repeat) {
    const directions = ["off", "forward", "right", "up"];
    const currentIndex = directions.indexOf(state.batch.direction);
    const nextDirection = directions[(currentIndex + 1) % directions.length];
    const count = nextDirection === "off" ? 1 : state.batch.count;
    state.batch = { direction: nextDirection, count: count === 1 && nextDirection !== "off" ? 2 : count };
    toolbar.setBatch(state.batch);
    sidebar.setBatch(state.batch);
    const labels = { off: "끄기", forward: "앞으로", right: "오른쪽", up: "위로" };
    toast(`일괄배치: ${labels[nextDirection]}`);
  }
  if (event.code === "KeyT" && !event.repeat) {
    const modes = ["off", "x", "z"];
    const currentIndex = modes.indexOf(state.symmetryMode);
    state.symmetryMode = modes[(currentIndex + 1) % modes.length];
    toolbar.setSymmetry(state.symmetryMode);
    sidebar.setSymmetry(state.symmetryMode);
    const labels = { off: "끄기", x: "좌우 대칭", z: "앞뒤 대칭" };
    toast(`대칭: ${labels[state.symmetryMode]}`);
  }
});

window.addEventListener("beforeunload", (event) => {
  if (!state.hasUnsavedChanges) return;
  event.preventDefault();
  event.returnValue = "";
});

function performMoveAll(code) {
  const dirs = {
    ArrowUp: [0, 0, -1, "앞"],
    ArrowDown: [0, 0, 1, "뒤"],
    ArrowLeft: [-1, 0, 0, "좌"],
    ArrowRight: [1, 0, 0, "우"],
    Period: [0, 1, 0, "위"],
    Comma: [0, -1, 0, "아래"],
  };
  const [dx, dy, dz, label] = dirs[code];
  const before = blocks.getAllBlocks();
  const moved = blocks.moveAll(dx, dy, dz);
  if (moved.length > 0) {
    undoManager.push({ added: moved, removed: before });
    markChanged();
    toast(`전체 이동: ${label}`);
  } else {
    toast("더 이상 이동할 수 없습니다.");
  }
}

function performUndo() {
  const op = undoManager.undo();
  if (!op) {
    toast("되돌릴 작업이 없습니다.");
    return;
  }
  applyUndoRedo(op);
  toast("실행 취소했습니다.");
}

function performRedo() {
  const op = undoManager.redo();
  if (!op) {
    toast("다시 실행할 작업이 없습니다.");
    return;
  }
  applyUndoRedo(op);
  toast("다시 실행했습니다.");
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
    toast("복사할 블록을 조준해 주세요.");
    return;
  }

  const block = blocks.getBlock(state.removeCell);
  if (!block) {
    toast("복사할 블록을 찾지 못했습니다.");
    return;
  }

  state.clipboard = [{ x: 0, y: 0, z: 0, materialId: block.materialId, shape: block.shape, rotation: block.rotation }];
  sidebar.setClipboard(state.clipboard.length);
  toast("블록 1개를 복사했습니다.");
}

function pasteClipboard() {
  if (state.clipboard.length === 0) {
    toast("클립보드가 비어 있습니다.");
    return;
  }
  if (!state.selectedCell) {
    toast("붙여넣을 위치를 조준해 주세요.");
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
    toast("붙여넣었습니다.");
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
  return material.memo?.trim() || material.label || material.id;
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
toast(restored ? "자동 저장된 설계를 불러왔습니다." : "준비 완료");
requestAnimationFrame(animate);

} // end PC editor mode
