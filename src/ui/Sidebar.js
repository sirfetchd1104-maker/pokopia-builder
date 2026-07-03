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
    this.colorStats = document.querySelector("#colorStats");
    this.colorStats.addEventListener("click", (e) => {
      if (e.target.closest(".color-stats-toggle")) {
        this._colorStatsExpanded = !this._colorStatsExpanded;
        this._colorStatsKey = null;
        if (this._lastColorStats) {
          this.setColorStats(this._lastColorStats.stats, this._lastColorStats.materials, true);
        }
      }
    });
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

  setColorStats(stats, materials, force) {
    this._lastColorStats = { stats, materials };
    const key = JSON.stringify(stats) + this._colorStatsExpanded;
    if (!force && key === this._colorStatsKey) return;
    this._colorStatsKey = key;

    const entries = materials
      .filter((m) => stats[m.id] > 0)
      .map((m) => ({ color: m.color, label: m.memo || m.label, count: stats[m.id] }));
    if (entries.length === 0) {
      this.colorStats.innerHTML = "";
      this._colorStatsExpanded = false;
      return;
    }
    const limit = 3;
    const hasMore = entries.length > limit;
    const expanded = this._colorStatsExpanded && hasMore;
    const toggleLabel = expanded ? "−" : "+";

    let html = `<div class="color-stats-header"><h4 class="color-stats-title" data-i18n="stat_color_stats">${t("stat_color_stats")}</h4>`;
    if (hasMore) {
      html += `<button class="color-stats-toggle" type="button">${toggleLabel}</button>`;
    }
    html += `</div>`;

    const visible = expanded ? entries : entries.slice(0, limit);
    for (const entry of visible) {
      html += `<div class="color-stats-row"><span class="color-dot" style="background:${entry.color}"></span><span class="color-label">${entry.label}</span><span class="color-count">${entry.count}</span></div>`;
    }
    this.colorStats.innerHTML = html;
  }
}
