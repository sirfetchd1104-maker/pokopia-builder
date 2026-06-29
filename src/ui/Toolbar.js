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
    this.materialSelect = document.querySelector("#materialSelect");
    this.materialColor = document.querySelector("#materialColor");
    this.materialMemo = document.querySelector("#materialMemo");
    this.shapeSelect = document.querySelector("#shapeSelect");
    this.rotationSelect = document.querySelector("#rotationSelect");
    this.batchDirection = document.querySelector("#batchDirection");
    this.batchCount = document.querySelector("#batchCount");
    this.symmetryMode = document.querySelector("#symmetryMode");
    this.layerMode = document.querySelector("#layerMode");
    this.layerValue = document.querySelector("#layerValue");

    this.renderMaterials(materials);
    this.updateBatchCountVisibility();

    this.materialSelect.addEventListener("change", () => {
      const material = this.getCurrentMaterial();
      this.materialColor.value = material.color;
      this.materialMemo.value = material.memo;
      onMaterialChange(material.id);
    });
    this.materialColor.addEventListener("input", () => {
      const updated = onMaterialUpdate(this.materialSelect.value, {
        color: this.materialColor.value,
        memo: this.materialMemo.value,
      });
      if (updated) this.updateCurrentOption(updated);
    });
    this.materialMemo.addEventListener("input", () => {
      const updated = onMaterialUpdate(this.materialSelect.value, {
        color: this.materialColor.value,
        memo: this.materialMemo.value,
      });
      if (updated) this.updateCurrentOption(updated);
    });
    document.querySelector("#addMaterialButton").addEventListener("click", () => onMaterialAdd());
    document.querySelector("#removeMaterialButton").addEventListener("click", () => {
      onMaterialRemove(this.materialSelect.value);
    });
    this.shapeSelect.addEventListener("change", () => onShapeChange(this.shapeSelect.value));
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
    this.materialSelect.replaceChildren();
    for (const material of materials) {
      const option = document.createElement("option");
      option.value = material.id;
      option.textContent = getMaterialLabel(material);
      option.dataset.color = material.color;
      option.dataset.memo = material.memo;
      this.materialSelect.append(option);
    }
    if (selectId) {
      this.materialSelect.value = selectId;
    }
    const current = this.getCurrentMaterial();
    this.materialColor.value = current.color;
    this.materialMemo.value = current.memo;
  }

  getCurrentMaterial() {
    const option = this.materialSelect.selectedOptions[0] ?? this.materialSelect.options[0];
    return {
      id: option.value,
      color: option.dataset.color,
      memo: option.dataset.memo ?? "",
    };
  }

  updateCurrentOption(material) {
    const option = this.materialSelect.selectedOptions[0];
    if (!option) return;
    option.textContent = getMaterialLabel(material);
    option.dataset.color = material.color;
    option.dataset.memo = material.memo;
  }

  setShape(shape) {
    this.shapeSelect.value = shape;
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
    onBatchChange({
      direction,
      count: direction === "off" ? 1 : clampNumber(this.batchCount.value, 1, 64),
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
