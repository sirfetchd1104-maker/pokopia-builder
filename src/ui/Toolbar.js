export class Toolbar {
  constructor({
    materials,
    onMaterialChange,
    onMaterialUpdate,
    onMaterialAdd,
    onMaterialRemove,
    onShapeChange,
    onRotationChange,
    onBatchChange,
    onSymmetryChange,
    onLayerChange,
    onSave,
    onLoad,
    onReset,
  }) {
    this.materialSwatches = document.querySelector("#materialSwatches");
    this.materialColor = document.querySelector("#materialColor");
    this.materialMemo = document.querySelector("#materialMemo");
    this.shapePanel = document.querySelector("#shapePanel");
    this.rotationSelect = document.querySelector("#rotationSelect");
    this.batchDirection = document.querySelector("#batchDirection");
    this.batchCount = document.querySelector("#batchCount");
    this.symmetryMode = document.querySelector("#symmetryMode");
    this.layerMode = document.querySelector("#layerMode");
    this.layerValue = document.querySelector("#layerValue");

    this.selectedMaterialId = null;
    this.materials = [];
    this.onMaterialChange = onMaterialChange;
    this.renderMaterials(materials);
    this.updateBatchCountVisibility();

    this.materialColor.addEventListener("input", () => {
      const updated = onMaterialUpdate(this.selectedMaterialId, {
        color: this.materialColor.value,
        memo: this.materialMemo.value,
      });
      if (updated) this.updateCurrentSwatch(updated);
    });
    this.materialMemo.addEventListener("input", () => {
      const updated = onMaterialUpdate(this.selectedMaterialId, {
        color: this.materialColor.value,
        memo: this.materialMemo.value,
      });
      if (updated) this.updateCurrentSwatch(updated);
    });
    document.querySelector("#addMaterialButton").addEventListener("click", () => onMaterialAdd());
    document.querySelector("#removeMaterialButton").addEventListener("click", () => {
      onMaterialRemove(this.selectedMaterialId);
    });

    // Shape panel buttons
    this.shapePanel.addEventListener("click", (e) => {
      const btn = e.target.closest(".shape-btn");
      if (!btn) return;
      onShapeChange(btn.dataset.shape);
    });

    this.rotationSelect.addEventListener("change", () => onRotationChange(Number.parseInt(this.rotationSelect.value, 10)));
    this.batchDirection.addEventListener("change", () => {
      this.updateBatchCountVisibility();
      this.emitBatchChange(onBatchChange);
    });
    this.batchCount.addEventListener("input", () => this.emitBatchChange(onBatchChange));
    this.symmetryMode.addEventListener("change", () => onSymmetryChange(this.symmetryMode.value));
    this.layerMode.addEventListener("change", () => this.emitLayerChange(onLayerChange));
    this.layerValue.addEventListener("input", () => this.emitLayerChange(onLayerChange));
    document.querySelector("#saveButton").addEventListener("click", onSave);
    document.querySelector("#resetButton").addEventListener("click", onReset);
    document.querySelector("#loadInput").addEventListener("change", (event) => {
      onLoad(event.target.files?.[0]);
      event.target.value = "";
    });
  }

  renderMaterials(materials, selectId) {
    this.materials = materials;
    this.materialSwatches.replaceChildren();
    for (const material of materials) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "swatch-btn";
      btn.dataset.id = material.id;
      btn.dataset.color = material.color;
      btn.dataset.memo = material.memo ?? "";
      btn.style.backgroundColor = material.color;
      btn.title = getMaterialLabel(material);
      btn.addEventListener("click", () => this.selectMaterial(material.id));
      this.materialSwatches.append(btn);
    }
    const targetId = selectId || materials[0]?.id;
    this.selectMaterial(targetId, true);
  }

  selectMaterial(id, skipCallback) {
    this.selectedMaterialId = id;
    for (const btn of this.materialSwatches.querySelectorAll(".swatch-btn")) {
      btn.classList.toggle("active", btn.dataset.id === id);
    }
    const material = this.materials.find((m) => m.id === id) || this.materials[0];
    if (material) {
      this.materialColor.value = material.color;
      this.materialMemo.value = material.memo ?? "";
    }
    if (!skipCallback) this.onMaterialChange(id);
  }

  getCurrentMaterial() {
    const material = this.materials.find((m) => m.id === this.selectedMaterialId) || this.materials[0];
    return {
      id: material?.id ?? "default",
      color: material?.color ?? "#bc90e9",
      memo: material?.memo ?? "",
    };
  }

  updateCurrentSwatch(material) {
    const btn = this.materialSwatches.querySelector(`.swatch-btn[data-id="${material.id}"]`);
    if (!btn) return;
    btn.style.backgroundColor = material.color;
    btn.dataset.color = material.color;
    btn.dataset.memo = material.memo ?? "";
    btn.title = getMaterialLabel(material);
    // Update local materials array
    const m = this.materials.find((m) => m.id === material.id);
    if (m) { m.color = material.color; m.memo = material.memo; }
  }

  setShape(shape) {
    for (const btn of this.shapePanel.querySelectorAll(".shape-btn")) {
      btn.classList.toggle("active", btn.dataset.shape === shape);
    }
  }

  setRotation(rotation) {
    this.rotationSelect.value = String(rotation);
  }

  setBatch(batch) {
    this.batchDirection.value = batch.direction;
    this.batchCount.value = String(batch.count);
    this.updateBatchCountVisibility();
  }

  setSymmetry(mode) {
    this.symmetryMode.value = mode;
  }

  updateBatchCountVisibility() {
    this.batchCount.disabled = this.batchDirection.value === "off";
  }

  emitBatchChange(onBatchChange) {
    const direction = this.batchDirection.value;
    const max = direction === "brush" ? 8 : 64;
    onBatchChange({
      direction,
      count: direction === "off" ? 1 : clampNumber(this.batchCount.value, 1, max),
    });
  }

  emitLayerChange(onLayerChange) {
    onLayerChange({
      mode: this.layerMode.value,
      value: Number.parseInt(this.layerValue.value, 10) || 0,
    });
  }
}

function getMaterialLabel(material) {
  return material.memo?.trim() || material.label || material.id;
}

function clampNumber(value, min, max) {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed)) return min;
  return Math.max(min, Math.min(max, parsed));
}
