import { t } from "../i18n.js";

export class Sidebar {
  constructor() {
    this.blockCount = document.querySelector("#blockCount");
    this.selectedCoord = document.querySelector("#selectedCoord");
    this.cameraCoord = document.querySelector("#cameraCoord");
    this.materialLabel = document.querySelector("#materialLabel");
    this.shapeLabel = document.querySelector("#shapeLabel");
    this.rotationLabel = document.querySelector("#rotationLabel");
    this.batchLabel = document.querySelector("#batchLabel");
    this.symmetryLabel = document.querySelector("#symmetryLabel");
    this.layerLabel = document.querySelector("#layerLabel");
    this.clipboardLabel = document.querySelector("#clipboardLabel");
  }

  setBlockCount(count) {
    this.blockCount.textContent = String(count);
  }

  setSelectedCell(cell) {
    this.selectedCoord.textContent = cell ? `${cell.x}, ${cell.y}, ${cell.z}` : "-";
  }

  setCamera(position) {
    this.cameraCoord.textContent = `${position.x.toFixed(1)}, ${position.y.toFixed(1)}, ${position.z.toFixed(1)}`;
  }

  setMaterial(label) {
    this.materialLabel.textContent = label;
  }

  setShape(shape) {
    const key = { cube: "shape_cube", wedge: "shape_wedge", corner: "shape_corner" };
    this.shapeLabel.textContent = t(key[shape] ?? "shape_cube");
  }

  setRotation(rotation) {
    this.rotationLabel.textContent = `${rotation * 90}°`;
  }

  setBatch(batch) {
    if (batch.direction === "off") {
      this.batchLabel.textContent = t("off");
      return;
    }
    const dirKey = { forward: "sidebar_dir_forward", right: "sidebar_dir_right", up: "sidebar_dir_up" };
    this.batchLabel.textContent = t("n_items", batch.count) + " " + t(dirKey[batch.direction] ?? "sidebar_dir_forward");
  }

  setSymmetry(mode) {
    const key = { off: "off", x: "sidebar_sym_lr", z: "sidebar_sym_fb" };
    this.symmetryLabel.textContent = t(key[mode] ?? "off");
  }

  setLayer(filter) {
    if (filter.mode === "only") {
      this.layerLabel.textContent = t("layer_only_n", filter.value);
    } else if (filter.mode === "below") {
      this.layerLabel.textContent = t("layer_below_n", filter.value);
    } else {
      this.layerLabel.textContent = t("all");
    }
  }

  setClipboard(count) {
    this.clipboardLabel.textContent = count > 0 ? t("n_items", count) : t("empty");
  }
}
