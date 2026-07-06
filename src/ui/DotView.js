const CELL_SIZE = 8;
const GRID_COLOR = "#2a2c2e";
const BG_COLOR = "#222426";

export class DotView {
  constructor(blockManager) {
    this.blockManager = blockManager;
    this.overlay = document.querySelector("#dotView");
    this.canvas = document.querySelector("#dotViewCanvas");
    this.ctx = this.canvas.getContext("2d");
    this.floorLabel = document.querySelector("#dotViewFloorLabel");

    this.floors = [];
    this.floorIndex = 0;
    this.floorData = new Map();
    this.bounds = { minX: 0, maxX: 0, minZ: 0, maxZ: 0 };

    document.querySelector("#dotViewBack").addEventListener("click", () => this.close());
    document.querySelector("#dotViewPrev").addEventListener("click", () => this.prevFloor());
    document.querySelector("#dotViewNext").addEventListener("click", () => this.nextFloor());
    document.querySelector("#dotViewSave").addEventListener("click", () => this.savePNG());

    this._onKeyDown = (e) => {
      if (e.code === "ArrowLeft") this.prevFloor();
      if (e.code === "ArrowRight") this.nextFloor();
    };
  }

  open() {
    const allBlocks = this.blockManager.getAllBlocks();
    if (allBlocks.length === 0) return false;

    this.floorData.clear();
    let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;

    for (const block of allBlocks) {
      if (!this.floorData.has(block.y)) this.floorData.set(block.y, []);
      this.floorData.get(block.y).push(block);
      if (block.x < minX) minX = block.x;
      if (block.x > maxX) maxX = block.x;
      if (block.z < minZ) minZ = block.z;
      if (block.z > maxZ) maxZ = block.z;
    }

    this.bounds = { minX, maxX, minZ, maxZ };
    this.floors = [...this.floorData.keys()].sort((a, b) => a - b);
    this.floorIndex = 0;

    this.overlay.classList.remove("hidden");
    window.addEventListener("keydown", this._onKeyDown);
    this.renderFloor();
    return true;
  }

  close() {
    this.overlay.classList.add("hidden");
    window.removeEventListener("keydown", this._onKeyDown);
    if (this._onClose) this._onClose();
  }

  onClose(fn) {
    this._onClose = fn;
  }

  prevFloor() {
    if (this.floorIndex > 0) {
      this.floorIndex--;
      this.renderFloor();
    }
  }

  nextFloor() {
    if (this.floorIndex < this.floors.length - 1) {
      this.floorIndex++;
      this.renderFloor();
    }
  }

  renderFloor() {
    const y = this.floors[this.floorIndex];
    const blocks = this.floorData.get(y) || [];
    const { minX, maxX, minZ, maxZ } = this.bounds;

    const cols = maxX - minX + 1;
    const rows = maxZ - minZ + 1;
    const w = cols * CELL_SIZE + 1;
    const h = rows * CELL_SIZE + 1;

    this.canvas.width = w;
    this.canvas.height = h;

    // Background
    this.ctx.fillStyle = BG_COLOR;
    this.ctx.fillRect(0, 0, w, h);

    // Grid
    this.ctx.strokeStyle = GRID_COLOR;
    this.ctx.lineWidth = 1;
    for (let c = 0; c <= cols; c++) {
      const x = c * CELL_SIZE + 0.5;
      this.ctx.beginPath();
      this.ctx.moveTo(x, 0);
      this.ctx.lineTo(x, h);
      this.ctx.stroke();
    }
    for (let r = 0; r <= rows; r++) {
      const zy = r * CELL_SIZE + 0.5;
      this.ctx.beginPath();
      this.ctx.moveTo(0, zy);
      this.ctx.lineTo(w, zy);
      this.ctx.stroke();
    }

    // Blocks
    for (const block of blocks) {
      const col = block.x - minX;
      const row = block.z - minZ;
      const material = this.blockManager.getMaterial(block.materialId);
      this.ctx.fillStyle = material.color;
      this.ctx.fillRect(col * CELL_SIZE + 1, row * CELL_SIZE + 1, CELL_SIZE - 1, CELL_SIZE - 1);
    }

    this.floorLabel.textContent = `Y=${y} (${this.floorIndex + 1}/${this.floors.length})`;
  }

  savePNG() {
    const y = this.floors[this.floorIndex];
    this.canvas.toBlob((blob) => {
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `pokopia-floor-Y${y}-${new Date().toISOString().slice(0, 10)}.png`;
      link.click();
      URL.revokeObjectURL(url);
    });
  }
}
