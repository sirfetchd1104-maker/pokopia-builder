import { t } from "../i18n.js";

export class PixelArtConverter {
  constructor({ blocks, undoManager, markChanged, toast, onMaterialsChanged }) {
    this.blocks = blocks;
    this.undoManager = undoManager;
    this.markChanged = markChanged;
    this.toast = toast;
    this.onMaterialsChanged = onMaterialsChanged;

    this.overlay = document.querySelector("#pixelArtModal");
    this.closeBtn = document.querySelector("#pixelArtModalClose");
    this.dropZone = document.querySelector("#pixelArtDropZone");
    this.fileInput = document.querySelector("#pixelArtFileInput");
    this.previewWrap = document.querySelector("#pixelArtPreviewWrap");
    this.previewCanvas = document.querySelector("#pixelArtPreviewCanvas");
    this.previewCtx = this.previewCanvas.getContext("2d");
    this.infoLabel = document.querySelector("#pixelArtInfo");
    this.controlsWrap = document.querySelector("#pixelArtControls");
    this.resolutionSlider = document.querySelector("#pixelArtResolution");
    this.resolutionValue = document.querySelector("#pixelArtResolutionValue");
    this.colorCountSlider = document.querySelector("#pixelArtColorCount");
    this.colorCountValue = document.querySelector("#pixelArtColorCountValue");
    this.orientXZ = document.querySelector("#pixelArtOrientXZ");
    this.orientXY = document.querySelector("#pixelArtOrientXY");
    this.applyBtn = document.querySelector("#pixelArtApply");

    this._sourceImage = null;
    this._orientation = "xz";
    this._maxRes = 32;
    this._colorCount = 8;
    this._palette = [];
    this._pixelMap = null; // Int8Array: palette index per pixel (-1 = transparent)
    this._width = 0;
    this._height = 0;
    this._processTimer = null;
    this._workCanvas = document.createElement("canvas");
    this._workCtx = this._workCanvas.getContext("2d");

    this._bindEvents();
  }

  _bindEvents() {
    this.closeBtn.addEventListener("click", () => this.close());
    this.overlay.addEventListener("click", (e) => {
      if (e.target === this.overlay) this.close();
    });

    this.fileInput.addEventListener("change", (e) => {
      if (e.target.files?.[0]) this._handleFileSelect(e.target.files[0]);
    });

    this.dropZone.addEventListener("dragover", (e) => {
      e.preventDefault();
      this.dropZone.classList.add("drag-over");
    });
    this.dropZone.addEventListener("dragleave", () => {
      this.dropZone.classList.remove("drag-over");
    });
    this.dropZone.addEventListener("drop", (e) => {
      e.preventDefault();
      this.dropZone.classList.remove("drag-over");
      const file = e.dataTransfer?.files?.[0];
      if (file) this._handleFileSelect(file);
    });

    this.resolutionSlider.addEventListener("input", () => {
      this._maxRes = Number(this.resolutionSlider.value);
      this.resolutionValue.textContent = this._maxRes;
      this._scheduleProcess();
    });

    this.colorCountSlider.addEventListener("input", () => {
      this._colorCount = Number(this.colorCountSlider.value);
      this.colorCountValue.textContent = this._colorCount;
      this._scheduleProcess();
    });

    this.orientXZ.addEventListener("click", () => {
      this._orientation = "xz";
      this.orientXZ.classList.add("active");
      this.orientXY.classList.remove("active");
    });

    this.orientXY.addEventListener("click", () => {
      this._orientation = "xy";
      this.orientXY.classList.add("active");
      this.orientXZ.classList.remove("active");
    });

    this.applyBtn.addEventListener("click", () => this._apply());
  }

  open() {
    this.overlay.classList.remove("hidden");
  }

  close() {
    this.overlay.classList.add("hidden");
    this._reset();
  }

  _reset() {
    this._sourceImage = null;
    this._palette = [];
    this._pixelMap = null;
    this.previewWrap.classList.add("hidden");
    this.controlsWrap.classList.add("hidden");
    this.applyBtn.classList.add("hidden");
    this.fileInput.value = "";
  }

  _handleFileSelect(file) {
    if (!file.type.startsWith("image/")) {
      this.toast(t("toast_pixelart_no_image"));
      return;
    }

    const img = new Image();
    img.onload = () => {
      this._sourceImage = img;
      this.previewWrap.classList.remove("hidden");
      this.controlsWrap.classList.remove("hidden");
      this.applyBtn.classList.remove("hidden");
      this._processImage();
    };
    img.onerror = () => {
      this.toast(t("toast_pixelart_no_image"));
    };
    img.src = URL.createObjectURL(file);
  }

  _scheduleProcess() {
    clearTimeout(this._processTimer);
    this._processTimer = setTimeout(() => {
      if (this._sourceImage) this._processImage();
    }, 100);
  }

  _processImage() {
    const img = this._sourceImage;
    const srcW = img.naturalWidth;
    const srcH = img.naturalHeight;

    // Calculate downscaled dimensions
    let outW, outH;
    if (srcW >= srcH) {
      outW = Math.min(srcW, this._maxRes);
      outH = Math.max(1, Math.round(outW * srcH / srcW));
    } else {
      outH = Math.min(srcH, this._maxRes);
      outW = Math.max(1, Math.round(outH * srcW / srcH));
    }

    // Draw downscaled
    this._workCanvas.width = outW;
    this._workCanvas.height = outH;
    this._workCtx.imageSmoothingEnabled = true;
    this._workCtx.drawImage(img, 0, 0, outW, outH);

    const imageData = this._workCtx.getImageData(0, 0, outW, outH);
    const data = imageData.data;

    // Extract non-transparent pixels
    const pixels = [];
    const totalPixels = outW * outH;
    const transparent = new Uint8Array(totalPixels);

    for (let i = 0; i < totalPixels; i++) {
      const off = i * 4;
      if (data[off + 3] < 128) {
        transparent[i] = 1;
      } else {
        pixels.push({ r: data[off], g: data[off + 1], b: data[off + 2], index: i });
      }
    }

    if (pixels.length === 0) {
      this.infoLabel.textContent = t("toast_pixelart_no_blocks");
      this._pixelMap = null;
      return;
    }

    // Quantize colors
    const palette = this._medianCut(pixels, this._colorCount);

    // Map each pixel to nearest palette color
    const pixelMap = new Int8Array(totalPixels).fill(-1);
    for (const p of pixels) {
      pixelMap[p.index] = this._findNearestColor(p.r, p.g, p.b, palette);
    }

    this._palette = palette;
    this._pixelMap = pixelMap;
    this._width = outW;
    this._height = outH;

    this._renderPreview();

    // Count non-transparent blocks
    let blockCount = 0;
    for (let i = 0; i < totalPixels; i++) {
      if (pixelMap[i] >= 0) blockCount++;
    }
    this.infoLabel.textContent = t("pixelart_info", outW, outH, palette.length, blockCount);
  }

  _medianCut(pixels, k) {
    if (pixels.length === 0) return [];

    if (k <= 1 || pixels.length <= 1) {
      let sumR = 0, sumG = 0, sumB = 0;
      for (const p of pixels) { sumR += p.r; sumG += p.g; sumB += p.b; }
      const n = pixels.length;
      return [{ r: Math.round(sumR / n), g: Math.round(sumG / n), b: Math.round(sumB / n), hex: this._rgbToHex(Math.round(sumR / n), Math.round(sumG / n), Math.round(sumB / n)) }];
    }

    let buckets = [pixels.slice()];

    while (buckets.length < k) {
      // Find bucket with largest color range * pixel count
      let bestIdx = 0, bestScore = -1;
      for (let i = 0; i < buckets.length; i++) {
        if (buckets[i].length <= 1) continue;
        const range = this._getColorRange(buckets[i]);
        const score = range.maxRange * buckets[i].length;
        if (score > bestScore) { bestScore = score; bestIdx = i; }
      }

      const bucket = buckets[bestIdx];
      if (bucket.length <= 1) break;

      const range = this._getColorRange(bucket);
      const channel = range.channel;

      bucket.sort((a, b) => a[channel] - b[channel]);
      const mid = Math.floor(bucket.length / 2);

      buckets.splice(bestIdx, 1, bucket.slice(0, mid), bucket.slice(mid));
    }

    return buckets.map((bucket) => {
      let sumR = 0, sumG = 0, sumB = 0;
      for (const p of bucket) { sumR += p.r; sumG += p.g; sumB += p.b; }
      const n = bucket.length;
      const r = Math.round(sumR / n);
      const g = Math.round(sumG / n);
      const b = Math.round(sumB / n);
      return { r, g, b, hex: this._rgbToHex(r, g, b) };
    });
  }

  _getColorRange(pixels) {
    let minR = 255, maxR = 0, minG = 255, maxG = 0, minB = 255, maxB = 0;
    for (const p of pixels) {
      if (p.r < minR) minR = p.r; if (p.r > maxR) maxR = p.r;
      if (p.g < minG) minG = p.g; if (p.g > maxG) maxG = p.g;
      if (p.b < minB) minB = p.b; if (p.b > maxB) maxB = p.b;
    }
    const rR = maxR - minR, rG = maxG - minG, rB = maxB - minB;
    if (rR >= rG && rR >= rB) return { channel: "r", maxRange: rR };
    if (rG >= rR && rG >= rB) return { channel: "g", maxRange: rG };
    return { channel: "b", maxRange: rB };
  }

  _findNearestColor(r, g, b, palette) {
    let bestIdx = 0, bestDist = Infinity;
    for (let i = 0; i < palette.length; i++) {
      const c = palette[i];
      const dist = (r - c.r) ** 2 + (g - c.g) ** 2 + (b - c.b) ** 2;
      if (dist < bestDist) { bestDist = dist; bestIdx = i; }
    }
    return bestIdx;
  }

  _rgbToHex(r, g, b) {
    return "#" + [r, g, b].map((v) => v.toString(16).padStart(2, "0")).join("");
  }

  _renderPreview() {
    const PREVIEW_MIN = 200;
    const cellSize = Math.max(1, Math.ceil(PREVIEW_MIN / Math.max(this._width, this._height)));
    const w = this._width * cellSize;
    const h = this._height * cellSize;

    this.previewCanvas.width = w;
    this.previewCanvas.height = h;

    // Background (checkerboard is handled by CSS)
    this.previewCtx.clearRect(0, 0, w, h);

    // Draw pixels
    for (let row = 0; row < this._height; row++) {
      for (let col = 0; col < this._width; col++) {
        const idx = this._pixelMap[row * this._width + col];
        if (idx < 0) continue;
        this.previewCtx.fillStyle = this._palette[idx].hex;
        this.previewCtx.fillRect(col * cellSize, row * cellSize, cellSize, cellSize);
      }
    }
  }

  _apply() {
    if (!this._pixelMap || this._palette.length === 0) {
      this.toast(t("toast_pixelart_no_image"));
      return;
    }

    // Create materials for each palette color
    const materialMap = [];
    for (const color of this._palette) {
      const mat = this.blocks.addMaterial();
      this.blocks.updateMaterial(mat.id, { color: color.hex });
      materialMap.push(mat.id);
    }

    // Generate block list (centered around origin)
    const offsetX = Math.floor(this._width / 2);
    const offsetZ = Math.floor(this._height / 2);
    const blockList = [];
    for (let row = 0; row < this._height; row++) {
      for (let col = 0; col < this._width; col++) {
        const idx = this._pixelMap[row * this._width + col];
        if (idx < 0) continue;

        let x, y, z;
        if (this._orientation === "xz") {
          x = (this._width - 1 - col) - offsetX;
          y = 0;
          z = (this._height - 1 - row) - offsetZ;
        } else {
          x = (this._width - 1 - col) - offsetX;
          y = (this._height - 1) - row;
          z = 0;
        }

        blockList.push({
          x, y, z,
          materialId: materialMap[idx],
          shape: "cube",
          rotation: 0,
        });
      }
    }

    if (blockList.length === 0) {
      this.toast(t("toast_pixelart_no_blocks"));
      return;
    }

    const added = this.blocks.addBlocks(blockList);
    if (added.length > 0) {
      this.undoManager.push({ added, removed: [] });
      this.markChanged();
    }

    if (this.onMaterialsChanged) this.onMaterialsChanged();
    this.toast(t("toast_pixelart_applied", added.length));
    this.close();
  }
}
