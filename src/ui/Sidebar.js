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
    const shapeLabels = { cube: "블록", wedge: "지붕", corner: "모서리" };
    this.shapeLabel.textContent = shapeLabels[shape] ?? "블록";
  }

  setRotation(rotation) {
    this.rotationLabel.textContent = `${rotation * 90}°`;
  }

  setBatch(batch) {
    if (batch.direction === "off") {
      this.batchLabel.textContent = "끄기";
      return;
    }
    const directionLabels = { forward: "앞", right: "오른쪽", up: "위" };
    this.batchLabel.textContent = `${batch.count}개 ${directionLabels[batch.direction] ?? "앞"}`;
  }

  setSymmetry(mode) {
    const labels = { off: "끄기", x: "좌우", z: "앞뒤" };
    this.symmetryLabel.textContent = labels[mode] ?? "끄기";
  }

  setLayer(filter) {
    if (filter.mode === "only") {
      this.layerLabel.textContent = `${filter.value}층만`;
    } else if (filter.mode === "below") {
      this.layerLabel.textContent = `${filter.value}층 이하`;
    } else {
      this.layerLabel.textContent = "전체";
    }
  }

  setClipboard(count) {
    this.clipboardLabel.textContent = count > 0 ? `${count}개` : "비어 있음";
  }
}
