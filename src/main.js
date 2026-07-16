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
import { PixelArtConverter } from "./ui/PixelArtConverter.js";

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
    batch: { direction: "off", count: 1 },
    symmetryMode: "off",
    swapMode: false,
    boxSelectMode: false,
    boxSelect: { pointA: null, pointB: null },
  };

  // ── Batch / Symmetry helpers ──
  function mobileGetBatchDir(dir) {
    if (dir === "right") return { x: 1, y: 0, z: 0 };
    if (dir === "up") return { x: 0, y: 1, z: 0 };
    return { x: 0, y: 0, z: -1 }; // forward
  }

  function mobileGetPlacementCells(origin) {
    if (mobileState.batch.direction === "off") return [{ x: origin.x, y: origin.y, z: origin.z }];
    if (mobileState.batch.direction === "brush") return mobileGetBrushCells(origin, mobileState.batch.count);
    const d = mobileGetBatchDir(mobileState.batch.direction);
    const cells = [];
    for (let i = 0; i < mobileState.batch.count; i++) {
      cells.push({ x: origin.x + d.x * i, y: origin.y + d.y * i, z: origin.z + d.z * i });
    }
    return cells;
  }

  function mobileGetBrushCells(origin, size) {
    const half = Math.floor(size / 2);
    const cells = [];
    for (let dx = 0; dx < size; dx++) {
      for (let dz = 0; dz < size; dz++) {
        cells.push({ x: origin.x + dx - half, y: origin.y, z: origin.z + dz - half });
      }
    }
    return cells;
  }

  function mobileGetSymmetryCells(cell) {
    const cells = [{ x: cell.x, y: cell.y, z: cell.z }];
    if (mobileState.symmetryMode === "x" && cell.x !== 0) cells.push({ x: -cell.x, y: cell.y, z: cell.z });
    if (mobileState.symmetryMode === "z" && cell.z !== 0) cells.push({ x: cell.x, y: cell.y, z: -cell.z });
    return cells;
  }

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

  // ── Stats Modal ──
  function openMobileStatsModal() {
    const modal = document.querySelector("#mobileStatsModal");
    const list = document.querySelector("#mobileStatsList");
    list.replaceChildren();

    const stats = blocks.getColorStats();
    const materials = blocks.getMaterialOptions();
    const entries = materials
      .filter((m) => stats[m.id] > 0)
      .map((m) => ({ color: m.color, label: m.memo || m.label, count: stats[m.id] }));

    if (entries.length === 0) {
      const empty = document.createElement("div");
      empty.style.cssText = "text-align:center;padding:16px;color:#9ca3af;";
      empty.textContent = t("mobile_blocks", 0);
      list.append(empty);
    } else {
      for (const entry of entries) {
        const row = document.createElement("div");
        row.className = "mobile-color-item";
        row.innerHTML = `<span class="color-dot" style="background:${entry.color}"></span><span class="mobile-color-name">${entry.label}</span><span class="mobile-color-count">${entry.count}</span>`;
        list.append(row);
      }
      // Total row
      const total = entries.reduce((s, e) => s + e.count, 0);
      const totalRow = document.createElement("div");
      totalRow.className = "mobile-color-item";
      totalRow.style.borderTop = "1px solid rgba(255,255,255,0.1)";
      totalRow.innerHTML = `<span class="mobile-color-name" style="font-weight:600;">${t("mobile_blocks", total)}</span>`;
      list.append(totalRow);
    }

    modal.classList.remove("hidden");
  }

  document.querySelector("#mobileBlockCount").addEventListener("click", openMobileStatsModal);
  document.querySelector("#mobileStatsModalClose").addEventListener("click", () => {
    document.querySelector("#mobileStatsModal").classList.add("hidden");
  });
  document.querySelector("#mobileStatsModal").addEventListener("click", (e) => {
    if (e.target === e.currentTarget) e.currentTarget.classList.add("hidden");
  });

  // ── Mobile Box Select ──
  const mobileSelectionBox = new THREE.LineSegments(
    new THREE.EdgesGeometry(new THREE.BoxGeometry(1, 1, 1)),
    new THREE.LineBasicMaterial({ color: 0x4fc3f7, transparent: true, opacity: 0.85 })
  );
  mobileSelectionBox.visible = false;
  mobileSelectionBox.renderOrder = 999;
  sceneManager.scene.add(mobileSelectionBox);

  function mobileGetBoxSelectYRange(pA, pB) {
    const bothEmpty = !pA.fromBlock && !pB.fromBlock;
    const sameY = pA.y === pB.y;
    if (bothEmpty && sameY) {
      const allBlocks = blocks.getAllBlocks();
      const maxBlockY = allBlocks.length > 0 ? Math.max(...allBlocks.map(b => b.y)) : 0;
      return { minY: 0, maxY: Math.max(maxBlockY, pA.y) };
    }
    return { minY: Math.min(pA.y, pB.y), maxY: Math.max(pA.y, pB.y) };
  }

  function mobileUpdateSelectionBox() {
    const { pointA, pointB } = mobileState.boxSelect;
    if (!pointA) { mobileSelectionBox.visible = false; return; }
    if (!pointB) {
      mobileSelectionBox.position.set(pointA.x, pointA.y, pointA.z);
      mobileSelectionBox.scale.set(1.02, 1.02, 1.02);
      mobileSelectionBox.visible = true;
      return;
    }
    const minX = Math.min(pointA.x, pointB.x);
    const maxX = Math.max(pointA.x, pointB.x);
    const { minY, maxY } = mobileGetBoxSelectYRange(pointA, pointB);
    const minZ = Math.min(pointA.z, pointB.z);
    const maxZ = Math.max(pointA.z, pointB.z);
    const sizeX = maxX - minX + 1;
    const sizeY = maxY - minY + 1;
    const sizeZ = maxZ - minZ + 1;
    mobileSelectionBox.position.set(minX + (sizeX - 1) / 2, minY + (sizeY - 1) / 2, minZ + (sizeZ - 1) / 2);
    mobileSelectionBox.scale.set(sizeX + 0.02, sizeY + 0.02, sizeZ + 0.02);
    mobileSelectionBox.visible = true;
  }

  function mobileGetSelectedBlocks() {
    const { pointA, pointB } = mobileState.boxSelect;
    if (!pointA || !pointB) return [];
    const minX = Math.min(pointA.x, pointB.x);
    const maxX = Math.max(pointA.x, pointB.x);
    const { minY, maxY } = mobileGetBoxSelectYRange(pointA, pointB);
    const minZ = Math.min(pointA.z, pointB.z);
    const maxZ = Math.max(pointA.z, pointB.z);
    return blocks.getAllBlocks().filter((b) =>
      b.x >= minX && b.x <= maxX && b.y >= minY && b.y <= maxY && b.z >= minZ && b.z <= maxZ
    );
  }

  function mobileClearBoxSelection() {
    mobileState.boxSelect.pointA = null;
    mobileState.boxSelect.pointB = null;
    mobileState.boxSelect.rotationCenter = null;
    mobileUpdateSelectionBox();
  }

  function mobileDeleteSelectedBlocks() {
    const selected = mobileGetSelectedBlocks();
    if (selected.length === 0) { mobileToast(t("toast_select_empty")); return; }
    const removed = blocks.removeBlocks(selected);
    if (removed.length > 0) {
      undoMgr.push({ added: [], removed });
      markChanged();
    }
    mobileClearBoxSelection();
    mobileToast(t("toast_removed_n", removed.length));
  }

  // ── Raycast from touch position ──
  function raycastAt(sx, sy) {
    const hit = sceneManager.raycastFromScreen(sx, sy, [grid.ground, ...blocks.getRaycastTargets()]);
    return blocks.getPlacementFromHit(hit);
  }

  // ── Ghost Preview ──
  let lastTapScreen = null;

  function updateMobileGhost() {
    if (!lastTapScreen) { blocks.setGhost([]); return; }
    const result = raycastAt(lastTapScreen.sx, lastTapScreen.sy);
    if (result?.placeCell) {
      blocks.setGhost(
        [result.placeCell],
        mobileState.selectedShape,
        mobileState.selectedMaterial,
        mobileState.selectedRotation
      );
    } else {
      blocks.setGhost([]);
    }
  }

  // ── Touch Gestures ──
  touchCam.onTap = (sx, sy) => {
    const result = raycastAt(sx, sy);

    // Box select mode
    if (mobileState.boxSelectMode) {
      const cell = result?.removeCell
        ? { x: result.removeCell.x, y: result.removeCell.y, z: result.removeCell.z, fromBlock: true }
        : result?.placeCell
          ? { x: result.placeCell.x, y: result.placeCell.y, z: result.placeCell.z, fromBlock: false }
          : null;
      if (!cell) return;
      if (!mobileState.boxSelect.pointA || mobileState.boxSelect.pointB) {
        mobileState.boxSelect.pointA = cell;
        mobileState.boxSelect.pointB = null;
        mobileState.boxSelect.rotationCenter = null;
        mobileUpdateSelectionBox();
        updateBoxSelectBtn();
        mobileToast(t("toast_select_start"));
      } else {
        mobileState.boxSelect.pointB = cell;
        mobileState.boxSelect.rotationCenter = null;
        mobileUpdateSelectionBox();
        updateBoxSelectBtn();
        const count = mobileGetSelectedBlocks().length;
        mobileToast(t("toast_select_done", count));
      }
      return;
    }

    // Swap mode
    if (mobileState.swapMode) {
      if (!result?.removeCell) return;
      const targets = mobileGetSymmetryCells(result.removeCell);
      const replaced = blocks.replaceBlocks(
        targets.map((c) => ({ ...c, shape: mobileState.selectedShape, rotation: mobileState.selectedRotation }))
      );
      if (replaced.length > 0) {
        undoMgr.push({ removed: replaced.map((r) => r.old), added: replaced.map((r) => r.new) });
        markChanged();
        mobileToast(t("toast_replaced", replaced.length));
      }
      lastTapScreen = { sx, sy };
      updateMobileGhost();
      return;
    }

    // Normal placement
    if (!result?.placeCell) return;
    const targets = mobileGetPlacementCells(result.placeCell)
      .flatMap((cell) => mobileGetSymmetryCells(cell))
      .map((cell) => ({
        ...cell,
        materialId: mobileState.selectedMaterial,
        shape: mobileState.selectedShape,
        rotation: mobileState.selectedRotation,
      }));
    const added = blocks.addBlocks(targets);
    if (added.length > 0) {
      undoMgr.push({ added, removed: [] });
      markChanged();
      mobileToast(t("toast_placed"));
    }
    lastTapScreen = { sx, sy };
    updateMobileGhost();
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
    lastTapScreen = { sx, sy };
    updateMobileGhost();
  };

  touchCam.onCameraMove = () => {
    lastTapScreen = null;
    blocks.setGhost([]);
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

  // ── Shape Picker (modal) ──
  const SHAPES = ["cube", "wedge", "corner", "cylinder", "hCylinder", "halfCylinder", "halfCube", "window", "slopedWindow", "arch", "stair", "ladder", "rope", "fence"];

  function updateMobileShapeUI() {
    document.querySelector("#mobileShapeLabel").textContent = t("shape_" + mobileState.selectedShape);
  }

  function openMobileShapePicker() {
    const modal = document.querySelector("#mobileShapeModal");
    const list = document.querySelector("#mobileShapeList");
    list.replaceChildren();

    const SHAPE_ICONS = {
      cube: '<path d="M3 8l9-5 9 5v8l-9 5-9-5z"/><path d="M3 8l9 5 9-5"/><path d="M12 13v9"/>',
      wedge: '<path d="M4 20h16L20 4 4 20z"/>',
      corner: '<path d="M4 20h16V4L4 20z"/>',
      cylinder: '<ellipse cx="12" cy="6" rx="8" ry="3"/><path d="M4 6v12c0 1.66 3.58 3 8 3s8-1.34 8-3V6"/>',
      hCylinder: '<ellipse cx="6" cy="12" rx="3" ry="8"/><path d="M6 4h12c1.66 0 3 3.58 3 8s-1.34 8-3 8H6"/>',
      halfCylinder: '<path d="M4 20h16V12a8 8 0 0 0-16 0v8z"/>',
      halfCube: '<rect x="3" y="12" width="18" height="9" rx="1"/>',
      window: '<rect x="3" y="3" width="18" height="18" rx="1"/><rect x="7" y="7" width="10" height="10" rx="0"/>',
      slopedWindow: '<path d="M4 20L20 4"/><path d="M7 17L17 7"/><path d="M4 20l3-3M20 4l-3 3"/>',
      arch: '<path d="M4 20V4a16 16 0 0 1 16 16"/>',
      stair: '<path d="M4 20h5v-5h5v-5h5V4"/>',
      ladder: '<path d="M8 3v18M16 3v18M8 7h8M8 12h8M8 17h8"/>',
      rope: '<path d="M12 2v20" stroke-dasharray="3 2"/>',
      fence: '<path d="M6 3v18M18 3v18M6 8h12M6 15h12"/>',
    };
    for (const shape of SHAPES) {
      const btn = document.createElement("button");
      btn.className = "mobile-color-item";
      if (shape === mobileState.selectedShape) btn.classList.add("active");
      const label = t("shape_" + shape);
      const check = shape === mobileState.selectedShape ? "✓" : "";
      const svg = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${SHAPE_ICONS[shape]}</svg>`;
      btn.innerHTML = `${svg}<span class="mobile-color-name">${label}</span><span class="mobile-color-count">${check}</span>`;
      btn.addEventListener("click", () => {
        mobileState.selectedShape = shape;
        updateMobileShapeUI();
        closeMobileShapePicker();
        mobileToast(t("toast_shape", label));
        updateMobileGhost();
      });
      list.append(btn);
    }
    modal.classList.remove("hidden");
  }

  function closeMobileShapePicker() {
    document.querySelector("#mobileShapeModal").classList.add("hidden");
  }

  document.querySelector("#mobileShapeBtn").addEventListener("click", openMobileShapePicker);
  document.querySelector("#mobileShapeModalClose").addEventListener("click", closeMobileShapePicker);
  document.querySelector("#mobileShapeModal").addEventListener("click", (e) => {
    if (e.target.id === "mobileShapeModal") closeMobileShapePicker();
  });

  // ── Rotation Button ──
  document.querySelector("#mobileRotateBtn").addEventListener("click", () => {
    mobileState.selectedRotation = (mobileState.selectedRotation + 1) % 4;
    document.querySelector("#mobileRotateBtn").textContent = mobileState.selectedRotation * 90 + "°";
    mobileToast(t("toast_rotation", mobileState.selectedRotation * 90));
    updateMobileGhost();
  });

  // ── Batch Button ──
  const batchDirections = ["off", "forward", "right", "up", "brush"];
  const batchLabels = { off: "batch_off", forward: "batch_forward", right: "batch_right", up: "batch_up", brush: "batch_brush" };

  function updateBatchBtn() {
    const dir = mobileState.batch.direction;
    const n = mobileState.batch.count;
    const suffix = dir === "off" ? "" : dir === "brush" ? ` ${n}×${n}` : ` ×${n}`;
    document.querySelector("#mobileBatchValue").textContent = t(batchLabels[dir]) + suffix;
  }

  // ── Batch Modal ──
  const batchModal = document.querySelector("#mobileBatchModal");
  const batchDirList = document.querySelector("#mobileBatchDirList");
  const batchCountRow = document.querySelector("#mobileBatchCountRow");
  const batchCountLabel = document.querySelector("#mobileBatchCountLabel");

  function openBatchModal() {
    batchModal.classList.remove("hidden");
    renderBatchModal();
  }
  function closeBatchModal() {
    batchModal.classList.add("hidden");
  }
  function renderBatchModal() {
    batchDirList.innerHTML = "";
    for (const dir of batchDirections) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "mobile-batch-dir-btn" + (mobileState.batch.direction === dir ? " active" : "");
      btn.textContent = t(batchLabels[dir]);
      btn.addEventListener("click", () => {
        mobileState.batch.direction = dir;
        if (dir !== "off" && mobileState.batch.count < 2) mobileState.batch.count = 2;
        updateBatchBtn();
        updateMobileGhost();
        renderBatchModal();
      });
      batchDirList.appendChild(btn);
    }
    const isOff = mobileState.batch.direction === "off";
    batchCountRow.classList.toggle("hidden", isOff);
    if (!isOff) {
      const n = mobileState.batch.count;
      batchCountLabel.textContent = mobileState.batch.direction === "brush" ? `${n}×${n}` : `×${n}`;
    }
  }

  document.querySelector("#mobileBatchBtn").addEventListener("click", openBatchModal);
  document.querySelector("#mobileBatchModalClose").addEventListener("click", closeBatchModal);
  batchModal.addEventListener("click", (e) => { if (e.target === batchModal) closeBatchModal(); });

  document.querySelector("#mobileBatchCountDown").addEventListener("click", () => {
    if (mobileState.batch.count > 2) {
      mobileState.batch.count--;
      updateBatchBtn();
      updateMobileGhost();
      renderBatchModal();
    }
  });
  document.querySelector("#mobileBatchCountUp").addEventListener("click", () => {
    const max = mobileState.batch.direction === "brush" ? 8 : 16;
    if (mobileState.batch.count < max) {
      mobileState.batch.count++;
      updateBatchBtn();
      updateMobileGhost();
      renderBatchModal();
    }
  });

  // ── Symmetry Button ──
  const symModes = ["off", "x", "z"];
  const symLabels = { off: "sym_off", x: "sym_lr", z: "sym_fb" };

  document.querySelector("#mobileSymmetryBtn").addEventListener("click", () => {
    const idx = symModes.indexOf(mobileState.symmetryMode);
    mobileState.symmetryMode = symModes[(idx + 1) % symModes.length];
    document.querySelector("#mobileSymmetryValue").textContent = t(symLabels[mobileState.symmetryMode]);
    mobileToast(t("toast_symmetry", t(symLabels[mobileState.symmetryMode])));
    updateMobileGhost();
  });

  // ── Swap Button ──
  function updateSwapBtn() {
    document.querySelector("#mobileSwapValue").textContent = t(mobileState.swapMode ? "swap_on" : "batch_off");
    document.querySelector("#mobileSwapBtn").classList.toggle("mobile-swap-active", mobileState.swapMode);
  }

  document.querySelector("#mobileSwapBtn").addEventListener("click", () => {
    mobileState.swapMode = !mobileState.swapMode;
    updateSwapBtn();
    mobileToast(t(mobileState.swapMode ? "toast_swap_on" : "toast_swap_off"));
  });

  // ── Box Select Button ──
  function updateBoxSelectBtn() {
    const active = mobileState.boxSelectMode;
    const { pointA, pointB } = mobileState.boxSelect;
    const hasSelection = pointA && pointB;
    if (hasSelection) {
      const count = mobileGetSelectedBlocks().length;
      document.querySelector("#mobileBoxSelectValue").textContent = t("box_select_delete", count);
    } else {
      document.querySelector("#mobileBoxSelectValue").textContent = t(active ? "swap_on" : "batch_off");
    }
    document.querySelector("#mobileBoxSelectBtn").classList.toggle("mobile-boxselect-active", active);
    const moveLabel = document.querySelector("#mobileMoveLabel");
    if (moveLabel) moveLabel.style.display = hasSelection ? "" : "none";
  }

  document.querySelector("#mobileBoxSelectBtn").addEventListener("click", () => {
    const { pointA, pointB } = mobileState.boxSelect;
    if (mobileState.boxSelectMode && pointA && pointB) {
      // Selection complete → delete blocks, stay in mode
      mobileDeleteSelectedBlocks();
      updateBoxSelectBtn();
      return;
    }
    // Toggle mode
    mobileState.boxSelectMode = !mobileState.boxSelectMode;
    if (!mobileState.boxSelectMode) mobileClearBoxSelection();
    updateBoxSelectBtn();
    mobileToast(t(mobileState.boxSelectMode ? "toast_boxselect_on" : "toast_boxselect_off"));
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

    // Count blocks per material
    const colorCounts = {};
    for (const b of blocks.getAllBlocks()) {
      colorCounts[b.materialId] = (colorCounts[b.materialId] || 0) + 1;
    }

    for (const mat of blocks.getMaterialOptions()) {
      const row = document.createElement("div");
      row.className = "mobile-color-item";
      if (mat.id === mobileState.selectedMaterial) row.classList.add("active");
      const count = colorCounts[mat.id] || 0;

      // Color picker input
      const colorInput = document.createElement("input");
      colorInput.type = "color";
      colorInput.value = mat.color;
      colorInput.className = "mobile-color-input";
      colorInput.addEventListener("input", (e) => {
        blocks.updateMaterial(mat.id, { color: e.target.value });
        updateMobileColorIndicator();
        markChanged();
      });
      colorInput.addEventListener("click", (e) => e.stopPropagation());

      // Name
      const nameEl = document.createElement("input");
      nameEl.type = "text";
      nameEl.className = "mobile-color-name-input";
      nameEl.value = mat.memo?.trim() || "";
      nameEl.placeholder = mat.label || mat.id;
      nameEl.maxLength = 24;
      nameEl.addEventListener("change", (e) => {
        blocks.updateMaterial(mat.id, { memo: e.target.value });
        markChanged();
      });
      nameEl.addEventListener("click", (e) => e.stopPropagation());

      // Count
      const countEl = document.createElement("span");
      countEl.className = "mobile-color-count";
      countEl.textContent = count;

      // Delete button (not for default)
      const deleteBtn = document.createElement("button");
      deleteBtn.className = "mobile-color-delete";
      deleteBtn.innerHTML = "✕";
      deleteBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        if (mat.id === "default") { mobileToast(t("toast_cant_remove")); return; }
        blocks.removeMaterial(mat.id);
        if (mobileState.selectedMaterial === mat.id) mobileState.selectedMaterial = "default";
        updateMobileColorIndicator();
        markChanged();
        mobileToast(t("toast_color_removed"));
        openMobileColorPicker(); // refresh
      });

      row.append(colorInput, nameEl, countEl);
      if (mat.id !== "default") row.append(deleteBtn);
      row.addEventListener("click", () => {
        mobileState.selectedMaterial = mat.id;
        updateMobileColorIndicator();
        closeMobileColorPicker();
        mobileToast(t("toast_color_selected", mat.memo?.trim() || mat.label));
        updateMobileGhost();
      });
      list.append(row);
    }
    // Add color button
    const addBtn = document.createElement("button");
    addBtn.className = "mobile-color-item mobile-color-add";
    addBtn.innerHTML = `<span class="mobile-color-dot mobile-color-dot-add">+</span><span class="mobile-color-name">${t("add_color_title")}</span>`;
    addBtn.addEventListener("click", () => {
      const created = blocks.addMaterial();
      mobileState.selectedMaterial = created.id;
      updateMobileColorIndicator();
      markChanged();
      mobileToast(t("toast_color_added"));
      openMobileColorPicker(); // refresh list
    });
    list.append(addBtn);
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

  // ── Reset ──
  document.querySelector("#mobileResetBtn").addEventListener("click", () => {
    openResetModal((includeColors) => {
      blocks.clear();
      if (includeColors) resetMaterials();
      undoMgr.clear();
      lastTapScreen = null;
      blocks.setGhost([]);
      mobileState.selectedMaterial = "default";
      mobileState.selectedShape = "cube";
      mobileState.selectedRotation = 0;
      mobileState.batch = { direction: "off", count: 2 };
      mobileState.symmetryMode = "off";
      mobileState.swapMode = false;
      mobileState.boxSelectMode = false;
      mobileClearBoxSelection();
      updateMobileColorIndicator();
      updateMobileShapeUI();
      updateBatchBtn();
      updateSwapBtn();
      updateBoxSelectBtn();
      document.querySelector("#mobileRotateBtn").textContent = "0°";
      document.querySelector("#mobileSymmetryValue").textContent = t("sym_off");
      markChanged();
      mobileToast(includeColors ? t("toast_reset_all") : t("toast_reset"));
    });
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

  // ── Camera Vertical Buttons ──
  const CAM_VERTICAL_SPEED = 6;
  let camUpPressed = false, camDownPressed = false;

  const camUpBtn = document.querySelector("#mobileCamUp");
  const camDownBtn = document.querySelector("#mobileCamDown");

  camUpBtn.addEventListener("touchstart", (e) => { e.preventDefault(); camUpPressed = true; }, { passive: false });
  camUpBtn.addEventListener("touchend", () => { camUpPressed = false; });
  camUpBtn.addEventListener("touchcancel", () => { camUpPressed = false; });

  camDownBtn.addEventListener("touchstart", (e) => { e.preventDefault(); camDownPressed = true; }, { passive: false });
  camDownBtn.addEventListener("touchend", () => { camDownPressed = false; });
  camDownBtn.addEventListener("touchcancel", () => { camDownPressed = false; });

  // ── Patch Notes ──
  const mobilePatchModal = new PatchNotesModal();
  document.querySelector("#mobilePatchBtn").addEventListener("click", () => mobilePatchModal.open());
  if (mobilePatchModal.shouldShow()) mobilePatchModal.open();

  // ── Pixel Art Converter ──
  const pixelArtMobile = new PixelArtConverter({
    blocks,
    undoManager: undoMgr,
    markChanged,
    toast: mobileToast,
    onMaterialsChanged: () => {
      mobileState.selectedMaterial = blocks.getMaterialOptions()[0]?.id ?? "default";
      updateMobileColorIndicator();
    },
  });
  document.querySelector("#mobilePixelArtBtn").addEventListener("click", () => {
    pixelArtMobile.open();
  });
  document.querySelector("#mobileScreenshotBtn").addEventListener("click", () => {
    blocks.setGhost([]);
    sceneManager.captureScreenshot((blob) => {
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `pokopia-screenshot-${new Date().toISOString().slice(0, 10)}.png`;
      a.click();
      URL.revokeObjectURL(url);
      mobileToast(t("toast_screenshot_saved"));
    });
  });

  // ── Layer Filter ──
  const layerModes = ["all", "only", "below"];
  const layerLabels = { all: "layer_all", only: "layer_only", below: "layer_below" };
  let mobileLayerMode = "all";
  let mobileLayerValue = 0;

  function updateLayerBtn() {
    const label = t(layerLabels[mobileLayerMode]);
    document.querySelector("#mobileLayerValue").textContent = label + (mobileLayerMode !== "all" ? ` Y=${mobileLayerValue}` : "");
  }

  function updateLayerModal() {
    document.querySelector("#mobileLayerDisplay").textContent = `Y = ${mobileLayerValue}`;
    for (const mode of layerModes) {
      const btn = document.querySelector(`#mobileLayerMode${mode[0].toUpperCase() + mode.slice(1)}`);
      btn.classList.toggle("active", mobileLayerMode === mode);
    }
    // Dim +/- when mode is "all"
    const valueRow = document.querySelector(".mobile-layer-value-row");
    valueRow.style.opacity = mobileLayerMode === "all" ? "0.35" : "1";
  }

  function openLayerModal() {
    updateLayerModal();
    document.querySelector("#mobileLayerModal").classList.remove("hidden");
  }
  function closeLayerModal() {
    document.querySelector("#mobileLayerModal").classList.add("hidden");
  }

  document.querySelector("#mobileLayerBtn").addEventListener("click", openLayerModal);
  document.querySelector("#mobileLayerModalClose").addEventListener("click", closeLayerModal);
  document.querySelector("#mobileLayerModal").addEventListener("click", (e) => {
    if (e.target.id === "mobileLayerModal") closeLayerModal();
  });

  for (const mode of layerModes) {
    const btn = document.querySelector(`#mobileLayerMode${mode[0].toUpperCase() + mode.slice(1)}`);
    btn.addEventListener("click", () => {
      mobileLayerMode = mode;
      blocks.setLayerFilter({ mode: mobileLayerMode, value: mobileLayerValue });
      updateLayerBtn();
      updateLayerModal();
    });
  }

  document.querySelector("#mobileLayerPlus").addEventListener("click", () => {
    if (mobileLayerMode === "all") return;
    mobileLayerValue = Math.min(19, mobileLayerValue + 1);
    blocks.setLayerFilter({ mode: mobileLayerMode, value: mobileLayerValue });
    updateLayerBtn();
    updateLayerModal();
  });
  document.querySelector("#mobileLayerMinus").addEventListener("click", () => {
    if (mobileLayerMode === "all") return;
    mobileLayerValue = Math.max(0, mobileLayerValue - 1);
    blocks.setLayerFilter({ mode: mobileLayerMode, value: mobileLayerValue });
    updateLayerBtn();
    updateLayerModal();
  });

  // ── Move All Modal ──
  function openMoveModal() {
    document.querySelector("#mobileMoveModal").classList.remove("hidden");
  }
  function closeMoveModal() {
    document.querySelector("#mobileMoveModal").classList.add("hidden");
  }

  document.querySelector("#mobileMoveBtn").addEventListener("click", openMoveModal);
  document.querySelector("#mobileMoveModalClose").addEventListener("click", closeMoveModal);
  document.querySelector("#mobileMoveModal").addEventListener("click", (e) => {
    if (e.target.id === "mobileMoveModal") closeMoveModal();
  });

  const moveActions = {
    mobileMoveForward: [0, 0, -1],
    mobileMoveBack: [0, 0, 1],
    mobileMoveLeft: [-1, 0, 0],
    mobileMoveRight: [1, 0, 0],
    mobileMoveUp: [0, 1, 0],
    mobileMoveDown: [0, -1, 0],
  };
  function mobileMoveSelectedBlocks(dx, dy, dz) {
    const selected = mobileGetSelectedBlocks();
    if (selected.length === 0) { mobileToast(t("toast_select_empty")); return; }
    if (selected.some((b) => b.y + dy < 0)) { mobileToast(t("toast_cant_move")); return; }
    const removed = blocks.removeBlocks(selected);
    const moved = removed.map((b) => ({
      x: b.x + dx, y: b.y + dy, z: b.z + dz,
      materialId: b.materialId, shape: b.shape, rotation: b.rotation,
    }));
    const added = blocks.addBlocks(moved);
    if (removed.length > 0 || added.length > 0) {
      undoMgr.push({ added, removed });
      markChanged();
    }
    mobileState.boxSelect.pointA.x += dx; mobileState.boxSelect.pointA.y += dy; mobileState.boxSelect.pointA.z += dz;
    mobileState.boxSelect.pointB.x += dx; mobileState.boxSelect.pointB.y += dy; mobileState.boxSelect.pointB.z += dz;
    mobileUpdateSelectionBox();
    updateBoxSelectBtn();
    mobileToast(t("toast_selection_moved", added.length));
  }

  for (const [id, [dx, dy, dz]] of Object.entries(moveActions)) {
    document.querySelector("#" + id).addEventListener("click", () => {
      if (mobileState.boxSelect.pointA && mobileState.boxSelect.pointB) {
        mobileMoveSelectedBlocks(dx, dy, dz);
      } else {
        blocks.moveAll(dx, dy, dz);
        markChanged();
      }
      updateBlockCount();
    });
  }

  function mobileRotateSelectedBlocks(delta) {
    const selected = mobileGetSelectedBlocks();
    if (selected.length === 0) { mobileToast(t("toast_select_empty")); return; }
    const pA = mobileState.boxSelect.pointA;
    const pB = mobileState.boxSelect.pointB;
    if (!mobileState.boxSelect.rotationCenter) {
      mobileState.boxSelect.rotationCenter = getRotationCenter(pA, pB);
    }
    const { x: centerX, z: centerZ } = mobileState.boxSelect.rotationCenter;
    const removed = blocks.removeBlocks(selected);
    const rotated = removed.map((b) => ({
      x: centerX + (b.z - centerZ),
      y: b.y,
      z: centerZ - (b.x - centerX),
      materialId: b.materialId, shape: b.shape,
      rotation: ((b.rotation || 0) + delta) % 4,
    }));
    if (rotated.some((b) => b.y < 0)) {
      blocks.addBlocks(removed);
      mobileToast(t("toast_cant_move"));
      return;
    }
    const added = blocks.addBlocks(rotated);
    if (removed.length > 0 || added.length > 0) {
      undoMgr.push({ added, removed });
      markChanged();
    }
    const newAx = centerX + (pA.z - centerZ);
    const newAz = centerZ - (pA.x - centerX);
    const newBx = centerX + (pB.z - centerZ);
    const newBz = centerZ - (pB.x - centerX);
    pA.x = newAx; pA.z = newAz;
    pB.x = newBx; pB.z = newBz;
    mobileUpdateSelectionBox();
    updateBoxSelectBtn();
    mobileToast(t("toast_selection_rotated", added.length));
  }

  document.querySelector("#mobileMoveRotate").addEventListener("click", () => {
    if (mobileState.boxSelect.pointA && mobileState.boxSelect.pointB) {
      mobileRotateSelectedBlocks(1);
      updateBlockCount();
    } else {
      mobileToast(t("toast_select_empty"));
    }
  });

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

    // Apply vertical camera movement
    if (camUpPressed) { touchCam.target.y += CAM_VERTICAL_SPEED * delta; touchCam.applyPosition(); }
    if (camDownPressed) { touchCam.target.y -= CAM_VERTICAL_SPEED * delta; touchCam.applyPosition(); }

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
    toolbar.setShape(shape);
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
    openResetModal((includeColors) => {
      const allBlocks = blocks.getAllBlocks();
      blocks.clear();
      if (includeColors) resetMaterials();
      if (allBlocks.length > 0) {
        undoManager.push({ added: [], removed: allBlocks });
      }
      state.clipboard = [];
      if (includeColors) {
        toolbar.renderMaterials(blocks.getMaterialOptions());
        state.selectedMaterial = "default";
        sidebar.setMaterial(getMaterialLabel(blocks.getMaterial("default")));
      }
      markChanged();
      toast(includeColors ? t("toast_reset_all") : t("toast_reset"));
    });
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

// Pixel Art Converter
const pixelArt = new PixelArtConverter({
  blocks,
  undoManager,
  markChanged: () => { markChanged(); },
  toast,
  onMaterialsChanged: () => {
    toolbar.renderMaterials(blocks.getMaterialOptions());
  },
});
document.querySelector("#pixelArtButton").addEventListener("click", () => {
  if (document.pointerLockElement) document.exitPointerLock();
  pixelArt.open();
});

function takeScreenshot() {
  sceneManager.captureScreenshot((blob) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `pokopia-screenshot-${new Date().toISOString().slice(0, 10)}.png`;
    a.click();
    URL.revokeObjectURL(url);
    toast(t("toast_screenshot_saved"));
  });
}
document.querySelector("#screenshotButton").addEventListener("click", () => {
  if (document.pointerLockElement) document.exitPointerLock();
  blocks.setGhost([]);
  takeScreenshot();
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
  if (event.code === "KeyR") {
    event.preventDefault();
    if (state.boxSelect.pointA && state.boxSelect.pointB) {
      rotateSelectedBlocks(1);
    }
  }
  if (event.code === "ArrowUp" || event.code === "ArrowDown" ||
      event.code === "ArrowLeft" || event.code === "ArrowRight" ||
      event.code === "Comma" || event.code === "Period") {
    event.preventDefault();
    if (state.boxSelect.pointA && state.boxSelect.pointB) {
      const dirs = {
        ArrowUp: [0, 0, -1], ArrowDown: [0, 0, 1],
        ArrowLeft: [-1, 0, 0], ArrowRight: [1, 0, 0],
        Period: [0, 1, 0], Comma: [0, -1, 0],
      };
      const [dx, dy, dz] = dirs[event.code];
      moveSelectedBlocks(dx, dy, dz);
    } else {
      performMoveAll(event.code);
    }
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
  if (event.code === "KeyQ" && !event.repeat) {
    const SHAPES = ["cube","wedge","corner","cylinder","hCylinder","halfCylinder","halfCube","window","slopedWindow","arch","stair","ladder","rope","fence"];
    const idx = SHAPES.indexOf(state.selectedShape);
    state.selectedShape = SHAPES[(idx + 1) % SHAPES.length];
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
    const directions = ["off", "forward", "right", "up", "brush"];
    const currentIndex = directions.indexOf(state.batch.direction);
    const nextDirection = directions[(currentIndex + 1) % directions.length];
    let count = nextDirection === "off" ? 1 : state.batch.count;
    if (count === 1 && nextDirection !== "off") count = 2;
    if (nextDirection === "brush" && count > 8) count = 8;
    state.batch = { direction: nextDirection, count };
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
  if (event.code === "KeyG" && !event.repeat) {
    if (state.removeCell) {
      const targets = getSymmetryCells(state.removeCell);
      const replaced = blocks.replaceBlocks(
        targets.map((c) => ({ ...c, shape: state.selectedShape, rotation: state.selectedRotation }))
      );
      if (replaced.length > 0) {
        undoManager.push({ removed: replaced.map((r) => r.old), added: replaced.map((r) => r.new) });
        markChanged();
        toast(t("toast_replaced", replaced.length));
      }
    }
  }
  if (event.code === "KeyF" && !event.repeat) {
    handleBoxSelectPoint();
  }
  if (event.code === "KeyP" && !event.repeat) {
    blocks.setGhost([]);
    takeScreenshot();
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
    blocks.setGhost([]);
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
  const { minY, maxY } = getBoxSelectYRange(pointA, pointB);
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
  state.boxSelect.rotationCenter = null;
  updateSelectionBox();
}

function getSelectedBlocks() {
  const { pointA, pointB } = state.boxSelect;
  if (!pointA || !pointB) return [];
  const minX = Math.min(pointA.x, pointB.x);
  const maxX = Math.max(pointA.x, pointB.x);
  const { minY, maxY } = getBoxSelectYRange(pointA, pointB);
  const minZ = Math.min(pointA.z, pointB.z);
  const maxZ = Math.max(pointA.z, pointB.z);
  return blocks.getAllBlocks().filter((b) =>
    b.x >= minX && b.x <= maxX && b.y >= minY && b.y <= maxY && b.z >= minZ && b.z <= maxZ
  );
}

function getBoxSelectCell() {
  // 1. Block under crosshair
  if (state.removeCell) return { x: state.removeCell.x, y: state.removeCell.y, z: state.removeCell.z, fromBlock: true };
  // 2. Adjacent placement cell (ground/block face)
  if (state.selectedCell) return { x: state.selectedCell.x, y: state.selectedCell.y, z: state.selectedCell.z, fromBlock: false };
  // 3. Project ray onto Y-plane at current layer value
  const ray = sceneManager.raycaster;
  ray.setFromCamera(sceneManager.pointer, sceneManager.camera);
  const yPlane = state.layerFilter.value;
  const origin = ray.ray.origin;
  const dir = ray.ray.direction;
  if (Math.abs(dir.y) < 0.001) return null;
  const t_val = (yPlane - origin.y) / dir.y;
  if (t_val < 0) return null;
  const x = Math.round(origin.x + dir.x * t_val);
  const z = Math.round(origin.z + dir.z * t_val);
  return { x, y: yPlane, z, fromBlock: false };
}

function getBoxSelectYRange(pointA, pointB) {
  const bothEmpty = !pointA.fromBlock && !pointB.fromBlock;
  const sameY = pointA.y === pointB.y;
  if (bothEmpty && sameY) {
    const allBlocks = blocks.getAllBlocks();
    const maxBlockY = allBlocks.length > 0 ? Math.max(...allBlocks.map(b => b.y)) : 0;
    return { minY: 0, maxY: Math.max(maxBlockY, pointA.y) };
  }
  return { minY: Math.min(pointA.y, pointB.y), maxY: Math.max(pointA.y, pointB.y) };
}

function handleBoxSelectPoint() {
  const cell = getBoxSelectCell();
  if (!cell) {
    toast(t("toast_aim_select"));
    return;
  }
  if (!state.boxSelect.pointA || state.boxSelect.pointB) {
    state.boxSelect.pointA = cell;
    state.boxSelect.pointB = null;
    state.boxSelect.rotationCenter = null;
    updateSelectionBox();
    toast(t("toast_select_start"));
  } else {
    state.boxSelect.pointB = cell;
    state.boxSelect.rotationCenter = null;
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

function moveSelectedBlocks(dx, dy, dz) {
  const selected = getSelectedBlocks();
  if (selected.length === 0) {
    toast(t("toast_select_empty"));
    return;
  }
  if (selected.some((b) => b.y + dy < 0)) {
    toast(t("toast_cant_move"));
    return;
  }
  const removed = blocks.removeBlocks(selected);
  const moved = removed.map((b) => ({
    x: b.x + dx, y: b.y + dy, z: b.z + dz,
    materialId: b.materialId, shape: b.shape, rotation: b.rotation,
  }));
  const added = blocks.addBlocks(moved);
  if (removed.length > 0 || added.length > 0) {
    undoManager.push({ added, removed });
    markChanged();
  }
  // Shift selection box
  state.boxSelect.pointA.x += dx; state.boxSelect.pointA.y += dy; state.boxSelect.pointA.z += dz;
  state.boxSelect.pointB.x += dx; state.boxSelect.pointB.y += dy; state.boxSelect.pointB.z += dz;
  updateSelectionBox();
  toast(t("toast_selection_moved", added.length));
}

function getRotationCenter(pA, pB) {
  let cx = (pA.x + pB.x) / 2;
  let cz = (pA.z + pB.z) / 2;
  // Both must be same parity (both integer or both half-integer)
  // so rotation always produces exact integers without rounding
  const xIsHalf = cx % 1 !== 0;
  const zIsHalf = cz % 1 !== 0;
  if (xIsHalf !== zIsHalf) {
    if (!xIsHalf) cx += 0.5;
    else cz += 0.5;
  }
  return { x: cx, z: cz };
}

function rotateSelectedBlocks(delta) {
  const selected = getSelectedBlocks();
  if (selected.length === 0) {
    toast(t("toast_select_empty"));
    return;
  }
  const pA = state.boxSelect.pointA;
  const pB = state.boxSelect.pointB;
  if (!state.boxSelect.rotationCenter) {
    state.boxSelect.rotationCenter = getRotationCenter(pA, pB);
  }
  const { x: centerX, z: centerZ } = state.boxSelect.rotationCenter;
  const removed = blocks.removeBlocks(selected);
  const rotated = removed.map((b) => ({
    x: centerX + (b.z - centerZ),
    y: b.y,
    z: centerZ - (b.x - centerX),
    materialId: b.materialId,
    shape: b.shape,
    rotation: ((b.rotation || 0) + delta) % 4,
  }));
  if (rotated.some((b) => b.y < 0)) {
    blocks.addBlocks(removed);
    toast(t("toast_cant_move"));
    return;
  }
  const added = blocks.addBlocks(rotated);
  if (removed.length > 0 || added.length > 0) {
    undoManager.push({ added, removed });
    markChanged();
  }
  // Rotate selection box (exact integers, no rounding needed)
  const newAx = centerX + (pA.z - centerZ);
  const newAz = centerZ - (pA.x - centerX);
  const newBx = centerX + (pB.z - centerZ);
  const newBz = centerZ - (pB.x - centerX);
  pA.x = newAx; pA.z = newAz;
  pB.x = newBx; pB.z = newBz;
  updateSelectionBox();
  toast(t("toast_selection_rotated", added.length));
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
  if (state.batch.direction === "brush") {
    return getBrushCells(origin, state.batch.count);
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

function getBrushCells(origin, size) {
  const half = Math.floor(size / 2);
  const cells = [];
  for (let dx = 0; dx < size; dx++) {
    for (let dz = 0; dz < size; dz++) {
      cells.push({
        x: origin.x + dx - half,
        y: origin.y,
        z: origin.z + dz - half,
      });
    }
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

// ── Reset modal (shared: mobile + PC) ──
const resetOverlay = document.querySelector("#resetModal");
let resetCallback = null;

function openResetModal(callback) {
  resetCallback = callback;
  resetOverlay.classList.remove("hidden");
}

function closeResetModal() {
  resetOverlay.classList.add("hidden");
  resetCallback = null;
}

function resetMaterials() {
  const mats = blocks.getMaterialOptions();
  for (const mat of mats) {
    if (mat.id !== "default") blocks.removeMaterial(mat.id);
  }
  blocks.updateMaterial("default", { color: "#bc90e9", memo: "" });
}

document.querySelector("#resetModalClose").addEventListener("click", closeResetModal);
resetOverlay.addEventListener("click", (e) => { if (e.target === resetOverlay) closeResetModal(); });
document.querySelector("#resetBlocksOnly").addEventListener("click", () => {
  if (resetCallback) resetCallback(false);
  closeResetModal();
});
document.querySelector("#resetAll").addEventListener("click", () => {
  if (resetCallback) resetCallback(true);
  closeResetModal();
});
