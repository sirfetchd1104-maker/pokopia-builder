import * as THREE from "three";

const BLOCK_SIZE = 1;
const INITIAL_CAPACITY = 16;
const GHOST_CAPACITY = 64;
const DEFAULT_MATERIALS = [
  { id: "default", label: "기본 블록", color: "#bc90e9", memo: "" },
  { id: "note-1", color: "#e07070", memo: "" },
  { id: "note-2", color: "#e8a84c", memo: "" },
  { id: "note-3", color: "#6cc26c", memo: "" },
  { id: "note-4", color: "#5ba4e0", memo: "" },
  { id: "note-5", color: "#cccccc", memo: "" },
];
const LEGACY_TYPE_TO_MATERIAL = {
  default: "default",
  stone: "note-1",
  wood: "note-2",
  brick: "note-2",
  glass: "note-3",
};

export const SHAPE_SIZES = {
  table2x2: { w: 2, d: 2, h: 1 },
  bed1x2:   { w: 1, d: 2, h: 1 },
  bed2x2:   { w: 2, d: 2, h: 1 },
  sofa:     { w: 2, d: 1, h: 1 },
  lamp:     { w: 1, d: 1, h: 3 },
  tree:     { w: 3, d: 3, h: 4 },
};

export function isMultiCellShape(shape) {
  return SHAPE_SIZES[shape] != null;
}

export function getMultiCellAnchorOffset(shape, rotation) {
  if (CUSTOM_FOOTPRINTS[shape]) return { x: 0, z: 0 };
  const size = SHAPE_SIZES[shape];
  if (!size) return { x: 0, z: 0 };
  const cx = -Math.floor((size.w - 1) / 2);
  const cz = -Math.floor((size.d - 1) / 2);
  const rot = rotation || 0;
  switch (rot) {
    case 1: return { x: -cz, z: cx };
    case 2: return { x: -cx, z: -cz };
    case 3: return { x: cz, z: -cx };
    default: return { x: cx, z: cz };
  }
}

// Custom footprints: list of {dx, dy, dz} relative to anchor (rotation 0)
const CUSTOM_FOOTPRINTS = {
  tree: (() => {
    const cells = [];
    // y=0: trunk only (anchor = center)
    cells.push({ dx: 0, dy: 0, dz: 0 });
    // y=1~3: full 3×3 leaves centered on trunk
    for (let dy = 1; dy < 4; dy++)
      for (let dx = -1; dx <= 1; dx++)
        for (let dz = -1; dz <= 1; dz++)
          cells.push({ dx, dy, dz });
    return cells;
  })(),
};

// Render offset for shapes whose anchor ≠ geometry origin
const SHAPE_RENDER_OFFSETS = {
  tree: { dx: -1, dz: -1 },
};

export function getObjectFootprint(anchor, shape, rotation) {
  const size = SHAPE_SIZES[shape];
  if (!size) return [{ x: anchor.x, y: anchor.y, z: anchor.z }];
  const rot = rotation || 0;
  const custom = CUSTOM_FOOTPRINTS[shape];
  const offsets = custom || [];
  if (custom) {
    const cells = [];
    for (const { dx, dy, dz } of offsets) {
      let rx, rz;
      switch (rot) {
        case 1: rx = dz; rz = -dx; break;
        case 2: rx = -dx; rz = -dz; break;
        case 3: rx = -dz; rz = dx; break;
        default: rx = dx; rz = dz; break;
      }
      cells.push({ x: anchor.x + rx, y: anchor.y + dy, z: anchor.z + rz });
    }
    return cells;
  }
  const cells = [];
  for (let dx = 0; dx < size.w; dx++) {
    for (let dz = 0; dz < size.d; dz++) {
      for (let dy = 0; dy < size.h; dy++) {
        let rx, rz;
        switch (rot) {
          case 1: rx = dz; rz = -dx; break;
          case 2: rx = -dx; rz = -dz; break;
          case 3: rx = -dz; rz = dx; break;
          default: rx = dx; rz = dz; break;
        }
        cells.push({ x: anchor.x + rx, y: anchor.y + dy, z: anchor.z + rz });
      }
    }
  }
  return cells;
}

export class BlockManager {
  constructor(scene) {
    this.scene = scene;
    this.blocks = new Map();
    this.materials = new Map(DEFAULT_MATERIALS.map((item) => [item.id, { ...item }]));
    this.layerFilter = { mode: "all", value: 0 };
    this.instanceBlocks = {
      cube: [],
      wedge: [],
      corner: [],
      cylinder: [],
      hCylinder: [],
      halfCylinder: [],
      halfCube: [],
      window: [],
      slopedWindow: [],
      arch: [],
      stair: [],
      ladder: [],
      rope: [],
      fence: [],
      chair: [],
      table: [],
      table2x2: [],
      bed1x2: [],
      bed2x2: [],
      sofa: [],
      lamp: [],
      tree: [],
      bush: [],
      _occupied: [],
    };

    this.geometries = {
      cube: new THREE.BoxGeometry(BLOCK_SIZE, BLOCK_SIZE, BLOCK_SIZE),
      wedge: createWedgeGeometry(),
      corner: createCornerGeometry(),
      cylinder: createCylinderGeometry(),
      hCylinder: createHorizontalCylinderGeometry(),
      halfCylinder: createHalfCylinderGeometry(),
      halfCube: createHalfCubeGeometry(),
      window: createWindowGeometry(),
      slopedWindow: createSlopedWindowGeometry(),
      arch: createArchGeometry(),
      stair: createStairGeometry(),
      ladder: createLadderGeometry(),
      rope: createRopeGeometry(),
      fence: createFenceGeometry(),
      chair: createChairGeometry(),
      table: createTableGeometry(),
      table2x2: createTable2x2Geometry(),
      bed1x2: createBed1x2Geometry(),
      bed2x2: createBed2x2Geometry(),
      sofa: createSofaGeometry(),
      lamp: createLampGeometry(),
      tree: createTreeGeometry(),
      bush: createBushGeometry(),
      _occupied: new THREE.BoxGeometry(BLOCK_SIZE, BLOCK_SIZE, BLOCK_SIZE),
    };
    this.material = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.78,
      metalness: 0.02,
    });
    this.vertexColorMaterial = new THREE.MeshStandardMaterial({
      vertexColors: true,
      roughness: 0.78,
      metalness: 0.02,
    });
    this.vertexColorShapes = new Set(["tree"]);

    const shapeNames = Object.keys(this.geometries).filter((s) => s !== "_occupied");
    this.meshCapacity = {};
    this.meshes = {};
    for (const s of shapeNames) {
      this.meshCapacity[s] = INITIAL_CAPACITY;
      this.meshes[s] = this.createMesh(s, INITIAL_CAPACITY);
    }
    this.mesh = this.meshes.cube;
    scene.add(...Object.values(this.meshes));

    this.ghostMaterial = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.45,
      roughness: 0.5,
    });
    this.ghostVertexColorMaterial = new THREE.MeshStandardMaterial({
      vertexColors: true,
      transparent: true,
      opacity: 0.45,
      roughness: 0.5,
    });
    this.ghostCapacity = GHOST_CAPACITY;
    this.ghosts = {};
    for (const s of shapeNames) {
      this.ghosts[s] = this.createGhostMesh(s);
    }
    scene.add(...Object.values(this.ghosts));

    this.glassMaterial = new THREE.MeshStandardMaterial({
      color: 0x000000,
      transparent: true,
      opacity: 0.2,
      roughness: 0.1,
      metalness: 0.0,
      side: THREE.DoubleSide,
    });
    const glassT = 0.08;
    const glassInner = 0.5 - glassT;
    const n707 = 1 / Math.SQRT2;
    this.glassGeometries = {
      window: new THREE.PlaneGeometry(glassInner * 2, glassInner * 2),
      slopedWindow: new THREE.PlaneGeometry(glassInner * 2, glassInner * 2).applyMatrix4(
        new THREE.Matrix4().set(0,-1,-n707,0, 0,1,-n707,0, 1,0,0,0, 0,0,0,1)
      ),
    };
    this.glassShapes = new Set(["window", "slopedWindow"]);
    this.glassCapacity = {};
    this.glassMeshes = {};
    for (const s of this.glassShapes) {
      this.glassCapacity[s] = INITIAL_CAPACITY;
      this.glassMeshes[s] = this.createGlassMesh(s, INITIAL_CAPACITY);
    }
    scene.add(...Object.values(this.glassMeshes));

    this.thinShapes = new Set(["ladder", "rope", "fence", "window", "slopedWindow", "_occupied"]);
    this.hitboxMaterial = new THREE.MeshBasicMaterial({ visible: false });
    this.hitboxCapacity = {};
    this.hitboxes = {};
    for (const s of this.thinShapes) {
      this.hitboxCapacity[s] = INITIAL_CAPACITY;
      this.hitboxes[s] = this.createHitboxMesh(s, INITIAL_CAPACITY);
    }
    scene.add(...Object.values(this.hitboxes));

    this.matrix = new THREE.Matrix4();
    this.normalMatrix = new THREE.Matrix3();
    this.color = new THREE.Color();
    this.tempPosition = new THREE.Vector3();
    this.tempQuaternion = new THREE.Quaternion();
    this.tempScale = new THREE.Vector3(0.99, 0.99, 0.99);
    this.yAxis = new THREE.Vector3(0, 1, 0);
  }

  get count() {
    let n = 0;
    for (const b of this.blocks.values()) {
      if (b.shape !== "_occupied") n++;
    }
    return n;
  }

  addBlock(cell, materialId = "default", shape = "cube", rotation = 0) {
    return this.addBlocks([{ ...cell, materialId, shape, rotation }]);
  }

  addBlocks(blocks) {
    const added = [];
    for (const block of blocks) {
      const materialId = this.materials.has(block.materialId) ? block.materialId : "default";
      const shape = this.getValidShape(block.shape);
      const rotation = this.getValidRotation(block.rotation);
      const normalized = normalizeCell(block);
      const key = getKey(normalized);
      if (!this.blocks.has(key)) {
        const entry = { ...normalized, materialId, shape, rotation };
        if (block.anchorKey) entry.anchorKey = block.anchorKey;
        this.blocks.set(key, entry);
        added.push({ ...entry });
      }
    }
    if (added.length > 0) this.rebuildMeshes();
    return added;
  }

  replaceBlocks(updates) {
    const replaced = [];
    for (const update of updates) {
      const key = getKey(normalizeCell(update));
      const existing = this.blocks.get(key);
      if (!existing || existing.shape === "_occupied" || isMultiCellShape(existing.shape)) continue;
      const oldBlock = { ...existing };
      const newShape = this.getValidShape(update.shape);
      const newRotation = this.getValidRotation(update.rotation);
      if (oldBlock.shape === newShape && oldBlock.rotation === newRotation) continue;
      existing.shape = newShape;
      existing.rotation = newRotation;
      replaced.push({ old: oldBlock, new: { ...existing } });
    }
    if (replaced.length > 0) this.rebuildMeshes();
    return replaced;
  }

  removeBlock(cell) {
    const removed = this.removeBlocks([cell]);
    return removed.length > 0 ? removed[0] : null;
  }

  removeBlocks(cells) {
    const keysToRemove = new Set();
    for (const cell of cells) {
      const key = getKey(normalizeCell(cell));
      const existing = this.blocks.get(key);
      if (!existing) continue;
      // If it's an occupied cell, find the anchor and remove the whole object
      if (existing.shape === "_occupied" && existing.anchorKey) {
        this._collectMultiCellKeys(existing.anchorKey, keysToRemove);
      } else if (isMultiCellShape(existing.shape)) {
        // It's a multi-cell anchor — remove anchor + all occupied cells
        this._collectMultiCellKeys(key, keysToRemove);
      } else {
        keysToRemove.add(key);
      }
    }
    const removed = [];
    for (const key of keysToRemove) {
      const existing = this.blocks.get(key);
      if (existing) {
        removed.push({ ...existing });
        this.blocks.delete(key);
      }
    }
    if (removed.length > 0) this.rebuildMeshes();
    return removed;
  }

  _collectMultiCellKeys(anchorKey, keysSet) {
    keysSet.add(anchorKey);
    const anchor = this.blocks.get(anchorKey);
    if (!anchor || !isMultiCellShape(anchor.shape)) return;
    const footprint = getObjectFootprint(anchor, anchor.shape, anchor.rotation);
    for (const cell of footprint) {
      keysSet.add(getKey(cell));
    }
  }

  canPlaceMultiCell(anchor, shape, rotation) {
    const footprint = getObjectFootprint(anchor, shape, rotation);
    for (const cell of footprint) {
      if (this.blocks.has(getKey(cell))) return false;
    }
    return true;
  }

  placeMultiCell(anchor, shape, materialId, rotation) {
    const anchorKey = getKey(anchor);
    const footprint = getObjectFootprint(anchor, shape, rotation);
    const blocks = [];
    // Anchor block
    blocks.push({ ...anchor, materialId, shape, rotation });
    // Occupied cells (skip anchor itself)
    for (const cell of footprint) {
      const key = getKey(cell);
      if (key === anchorKey) continue;
      blocks.push({ ...cell, materialId, shape: "_occupied", rotation: 0, anchorKey });
    }
    return this.addBlocks(blocks);
  }

  getAllBlocks() {
    return [...this.blocks.values()].map((b) => ({ ...b }));
  }

  clear() {
    this.blocks.clear();
    this.rebuildMeshes();
  }

  _regenerateOccupiedCells() {
    for (const [key, block] of [...this.blocks.entries()]) {
      if (!isMultiCellShape(block.shape)) continue;
      const footprint = getObjectFootprint(block, block.shape, block.rotation);
      for (const cell of footprint) {
        const cellKey = getKey(cell);
        if (cellKey === key) continue; // skip anchor
        if (!this.blocks.has(cellKey)) {
          this.blocks.set(cellKey, {
            ...cell,
            materialId: block.materialId,
            shape: "_occupied",
            rotation: 0,
            anchorKey: key,
          });
        }
      }
    }
  }

  load(data) {
    const blocks = Array.isArray(data) ? data : data.blocks;
    if (!Array.isArray(blocks)) {
      throw new Error("JSON 안에 blocks 배열이 필요합니다.");
    }

    if (Array.isArray(data.materials)) {
      this.materials = new Map(DEFAULT_MATERIALS.map((item) => [item.id, { ...item }]));
      for (const material of data.materials) {
        if (!material?.id || !isHexColor(material.color)) continue;
        this.materials.set(material.id, {
          id: material.id,
          label: material.label || material.id,
          color: material.color,
          memo: material.memo || "",
        });
      }
    }

    this.blocks.clear();
    for (const block of blocks) {
      if (!isFiniteCell(block)) continue;
      if (block.shape === "_occupied") continue; // skip saved occupied blocks (shouldn't exist)
      const legacyType = LEGACY_TYPE_TO_MATERIAL[block.type] ?? "default";
      const materialId = this.materials.has(block.materialId) ? block.materialId : legacyType;
      this.blocks.set(getKey(block), {
        x: Math.round(block.x),
        y: Math.max(0, Math.round(block.y)),
        z: Math.round(block.z),
        materialId: this.materials.has(materialId) ? materialId : "default",
        shape: this.getValidShape(block.shape),
        rotation: this.getValidRotation(block.rotation),
      });
    }
    this._regenerateOccupiedCells();
    this.rebuildMeshes();
  }

  setLayerFilter(filter) {
    this.layerFilter = {
      mode: filter?.mode ?? "all",
      value: Math.max(0, Math.round(filter?.value ?? 0)),
    };
    this.rebuildMeshes();
  }

  addMaterial() {
    let counter = 1;
    let id = `note-${counter}`;
    while (this.materials.has(id)) {
      counter++;
      id = `note-${counter}`;
    }
    const hue = Math.floor(Math.random() * 360);
    const material = {
      id,
      label: `색상 ${counter}`,
      color: hslToHex(hue, 55, 55),
      memo: "",
    };
    this.materials.set(id, material);
    return material;
  }

  removeMaterial(id) {
    if (id === "default") return false;
    if (!this.materials.has(id)) return false;
    this.materials.delete(id);
    for (const block of this.blocks.values()) {
      if (block.materialId === id) {
        block.materialId = "default";
      }
    }
    this.rebuildMeshes();
    return true;
  }

  updateMaterial(id, updates) {
    const existing = this.materials.get(id);
    if (!existing) return null;
    const next = {
      ...existing,
      ...updates,
      color: isHexColor(updates.color) ? updates.color : existing.color,
    };
    next.label = next.memo?.trim() || existing.label;
    this.materials.set(id, next);
    this.rebuildMeshes();
    return next;
  }

  getMaterialOptions() {
    return [...this.materials.values()].map((material) => ({ ...material }));
  }

  getMaterial(id) {
    return this.materials.get(id) ?? this.materials.get("default");
  }

  getColorStats() {
    const stats = {};
    for (const block of this.blocks.values()) {
      if (block.shape === "_occupied") continue;
      stats[block.materialId] = (stats[block.materialId] || 0) + 1;
    }
    return stats;
  }

  getBlock(cell) {
    return this.blocks.get(getKey(normalizeCell(cell))) ?? null;
  }

  moveAll(dx, dy, dz) {
    // Filter out _occupied blocks — they'll be regenerated after move
    const entries = [...this.blocks.values()].filter((b) => b.shape !== "_occupied");
    if (entries.length === 0) return [];

    const moved = [];
    const newMap = new Map();
    for (const block of entries) {
      const newY = block.y + dy;
      if (newY < 0) return [];
      const entry = { ...block, x: block.x + dx, y: newY, z: block.z + dz };
      const key = getKey(entry);
      newMap.set(key, entry);
      moved.push(entry);
    }

    this.blocks = newMap;
    this._regenerateOccupiedCells();
    this.rebuildMeshes();
    return moved;
  }

  serialize() {
    return {
      version: 2,
      materials: this.getMaterialOptions(),
      blocks: [...this.blocks.values()]
        .filter((b) => b.shape !== "_occupied")
        .map(({ anchorKey, ...rest }) => rest)
        .sort((a, b) => getKey(a).localeCompare(getKey(b))),
    };
  }

  rebuildMeshes() {
    this.instanceBlocks = { cube: [], wedge: [], corner: [], cylinder: [], hCylinder: [], halfCylinder: [], halfCube: [], window: [], slopedWindow: [], arch: [], stair: [], ladder: [], rope: [], fence: [], chair: [], table: [], table2x2: [], bed1x2: [], bed2x2: [], sofa: [], lamp: [], tree: [], bush: [], _occupied: [] };
    for (const block of this.blocks.values()) {
      if (this.isVisibleInLayer(block)) {
        if (this.instanceBlocks[block.shape]) {
          this.instanceBlocks[block.shape].push(block);
        }
      }
    }

    for (const shape of Object.keys(this.meshes)) {
      const items = this.instanceBlocks[shape];
      const needed = items.length;
      const capacity = this.meshCapacity[shape];

      if (needed > capacity || (capacity > 32 && needed < capacity / 4)) {
        this.scene.remove(this.meshes[shape]);
        this.meshCapacity[shape] = Math.max(needed * 2, INITIAL_CAPACITY);
        this.meshes[shape] = this.createMesh(shape, this.meshCapacity[shape]);
        this.scene.add(this.meshes[shape]);
      }

      const mesh = this.meshes[shape];
      const renderOff = SHAPE_RENDER_OFFSETS[shape];
      for (let i = 0; i < items.length; i++) {
        const block = items[i];
        this.tempPosition.set(block.x, block.y, block.z);
        const rot = block.rotation || 0;
        if (renderOff) {
          let rx, rz;
          switch (rot) {
            case 1: rx = renderOff.dz; rz = -renderOff.dx; break;
            case 2: rx = -renderOff.dx; rz = -renderOff.dz; break;
            case 3: rx = -renderOff.dz; rz = renderOff.dx; break;
            default: rx = renderOff.dx; rz = renderOff.dz; break;
          }
          this.tempPosition.x += rx;
          this.tempPosition.z += rz;
        }
        if (rot !== 0) {
          this.tempQuaternion.setFromAxisAngle(this.yAxis, rot * Math.PI / 2);
        } else {
          this.tempQuaternion.identity();
        }
        this.matrix.compose(this.tempPosition, this.tempQuaternion, this.tempScale);
        mesh.setMatrixAt(i, this.matrix);
        if (this.vertexColorShapes.has(shape)) {
          this.color.set(0xffffff);
        } else {
          this.color.set(this.getMaterial(block.materialId).color);
        }
        mesh.setColorAt(i, this.color);
      }

      mesh.count = needed;
      mesh.instanceMatrix.needsUpdate = true;
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
      mesh.boundingSphere = null;
      mesh.boundingBox = null;
    }

    for (const shape of this.thinShapes) {
      const items = this.instanceBlocks[shape];
      const needed = items.length;
      const capacity = this.hitboxCapacity[shape];

      if (needed > capacity || (capacity > 32 && needed < capacity / 4)) {
        this.scene.remove(this.hitboxes[shape]);
        this.hitboxCapacity[shape] = Math.max(needed * 2, INITIAL_CAPACITY);
        this.hitboxes[shape] = this.createHitboxMesh(shape, this.hitboxCapacity[shape]);
        this.scene.add(this.hitboxes[shape]);
      }

      const hb = this.hitboxes[shape];
      for (let i = 0; i < items.length; i++) {
        const block = items[i];
        this.tempPosition.set(block.x, block.y, block.z);
        this.tempQuaternion.identity();
        this.matrix.compose(this.tempPosition, this.tempQuaternion, this.tempScale);
        hb.setMatrixAt(i, this.matrix);
      }
      hb.count = needed;
      hb.instanceMatrix.needsUpdate = true;
      hb.boundingSphere = null;
      hb.boundingBox = null;
    }

    for (const shape of this.glassShapes) {
      const items = this.instanceBlocks[shape];
      const needed = items.length;
      const capacity = this.glassCapacity[shape];

      if (needed > capacity || (capacity > 32 && needed < capacity / 4)) {
        this.scene.remove(this.glassMeshes[shape]);
        this.glassCapacity[shape] = Math.max(needed * 2, INITIAL_CAPACITY);
        this.glassMeshes[shape] = this.createGlassMesh(shape, this.glassCapacity[shape]);
        this.scene.add(this.glassMeshes[shape]);
      }

      const gm = this.glassMeshes[shape];
      for (let i = 0; i < items.length; i++) {
        const block = items[i];
        this.tempPosition.set(block.x, block.y, block.z);
        const rot = block.rotation || 0;
        if (rot !== 0) {
          this.tempQuaternion.setFromAxisAngle(this.yAxis, rot * Math.PI / 2);
        } else {
          this.tempQuaternion.identity();
        }
        this.matrix.compose(this.tempPosition, this.tempQuaternion, this.tempScale);
        gm.setMatrixAt(i, this.matrix);
      }
      gm.count = needed;
      gm.instanceMatrix.needsUpdate = true;
      gm.boundingSphere = null;
      gm.boundingBox = null;
    }

    this.mesh = this.meshes.cube;
    this.material.needsUpdate = true;
  }

  setGhost(cells, shape = "cube", materialId = "default", rotation = 0) {
    const validShape = this.getValidShape(shape);

    for (const ghost of Object.values(this.ghosts)) {
      ghost.visible = false;
      ghost.count = 0;
    }

    if (!cells || cells.length === 0) return;

    if (cells.length > this.ghostCapacity) {
      for (const s of Object.keys(this.ghosts)) {
        this.scene.remove(this.ghosts[s]);
      }
      this.ghostCapacity = Math.max(cells.length * 2, GHOST_CAPACITY);
      for (const s of Object.keys(this.ghosts)) {
        this.ghosts[s] = this.createGhostMesh(s);
        this.scene.add(this.ghosts[s]);
      }
    }

    const ghost = this.ghosts[validShape];
    const rot = this.getValidRotation(rotation);
    if (this.vertexColorShapes.has(validShape)) {
      this.color.set(0xffffff);
    } else {
      this.color.set(this.getMaterial(materialId).color);
    }

    const renderOff = SHAPE_RENDER_OFFSETS[validShape];
    for (let i = 0; i < cells.length; i++) {
      this.tempPosition.set(cells[i].x, cells[i].y, cells[i].z);
      if (renderOff) {
        let rx, rz;
        switch (rot) {
          case 1: rx = renderOff.dz; rz = -renderOff.dx; break;
          case 2: rx = -renderOff.dx; rz = -renderOff.dz; break;
          case 3: rx = -renderOff.dz; rz = renderOff.dx; break;
          default: rx = renderOff.dx; rz = renderOff.dz; break;
        }
        this.tempPosition.x += rx;
        this.tempPosition.z += rz;
      }
      if (rot !== 0) {
        this.tempQuaternion.setFromAxisAngle(this.yAxis, rot * Math.PI / 2);
      } else {
        this.tempQuaternion.identity();
      }
      this.matrix.compose(this.tempPosition, this.tempQuaternion, this.tempScale);
      ghost.setMatrixAt(i, this.matrix);
      ghost.setColorAt(i, this.color);
    }

    ghost.count = cells.length;
    ghost.visible = true;
    ghost.instanceMatrix.needsUpdate = true;
    if (ghost.instanceColor) ghost.instanceColor.needsUpdate = true;
  }

  getPlacementFromHit(hit) {
    if (!hit) return null;

    if (hit.object.userData.kind === "blocks") {
      const block = this.getBlockFromInstance(hit.object.userData.shape, hit.instanceId);
      if (!block) return null;

      hit.object.getMatrixAt(hit.instanceId, this.matrix);
      this.matrix.premultiply(hit.object.matrixWorld);
      this.normalMatrix.getNormalMatrix(this.matrix);
      const normal = hit.face.normal.clone().applyMatrix3(this.normalMatrix);
      snapNormal(normal);
      return {
        removeCell: block,
        placeCell: normalizeCell({
          x: block.x + normal.x,
          y: block.y + normal.y,
          z: block.z + normal.z,
        }),
      };
    }

    const point = hit.point.clone();
    return {
      removeCell: null,
      placeCell: normalizeCell({
        x: Math.round(point.x),
        y: 0,
        z: Math.round(point.z),
      }),
    };
  }

  getRaycastTargets() {
    return [...Object.values(this.meshes), ...Object.values(this.hitboxes)];
  }

  getBlockFromInstance(shape, instanceId) {
    if (instanceId == null || instanceId < 0) return null;
    return this.instanceBlocks[shape]?.[instanceId] ?? null;
  }

  isVisibleInLayer(block) {
    if (this.layerFilter.mode === "only") return block.y === this.layerFilter.value;
    if (this.layerFilter.mode === "below") return block.y <= this.layerFilter.value;
    return true;
  }

  getValidShape(shape) {
    if (this.geometries[shape]) return shape;
    return "cube";
  }

  getValidRotation(rotation) {
    const r = Number.parseInt(rotation, 10);
    if (r === 1 || r === 2 || r === 3) return r;
    return 0;
  }

  createMesh(shape, capacity) {
    const mat = this.vertexColorShapes.has(shape) ? this.vertexColorMaterial : this.material;
    const mesh = new THREE.InstancedMesh(this.geometries[shape], mat, capacity);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.userData.kind = "blocks";
    mesh.userData.shape = shape;
    return mesh;
  }

  createHitboxMesh(shape, capacity) {
    const mesh = new THREE.InstancedMesh(this.geometries.cube, this.hitboxMaterial, capacity);
    mesh.userData.kind = "blocks";
    mesh.userData.shape = shape;
    return mesh;
  }

  createGlassMesh(shape, capacity) {
    const mesh = new THREE.InstancedMesh(this.glassGeometries[shape], this.glassMaterial, capacity);
    mesh.count = 0;
    mesh.renderOrder = 1;
    return mesh;
  }

  createGhostMesh(shape) {
    const mat = this.vertexColorShapes.has(shape) ? this.ghostVertexColorMaterial : this.ghostMaterial;
    const mesh = new THREE.InstancedMesh(this.geometries[shape], mat, this.ghostCapacity);
    mesh.count = 0;
    mesh.visible = false;
    mesh.frustumCulled = false;
    return mesh;
  }
}

function createWedgeGeometry() {
  const s = 0.5;
  const n = 1 / Math.SQRT2;

  const A = [-s, -s, -s];
  const B = [s, -s, -s];
  const C = [-s, s, -s];
  const D = [-s, -s, s];
  const E = [s, -s, s];
  const F = [-s, s, s];

  const faces = [
    { verts: [A, B, E, A, E, D], normal: [0, -1, 0] },
    { verts: [A, F, C, A, D, F], normal: [-1, 0, 0] },
    { verts: [A, C, B], normal: [0, 0, -1] },
    { verts: [D, E, F], normal: [0, 0, 1] },
    { verts: [B, F, E, B, C, F], normal: [n, n, 0] },
  ];

  const positions = [];
  const normals = [];

  for (const face of faces) {
    for (const v of face.verts) {
      positions.push(v[0], v[1], v[2]);
      normals.push(face.normal[0], face.normal[1], face.normal[2]);
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute("normal", new THREE.Float32BufferAttribute(normals, 3));
  geometry.computeBoundingBox();
  geometry.computeBoundingSphere();
  return geometry;
}

function createCornerGeometry() {
  const s = 0.5;
  const n = 1 / Math.SQRT2;

  const A = [-s, -s, -s];
  const B = [s, -s, -s];
  const C = [-s, s, -s];
  const D = [-s, -s, s];
  const E = [s, -s, s];

  const faces = [
    { verts: [A, B, E, A, E, D], normal: [0, -1, 0] },
    { verts: [A, C, B], normal: [0, 0, -1] },
    { verts: [A, D, C], normal: [-1, 0, 0] },
    { verts: [B, C, E], normal: [n, n, 0] },
    { verts: [E, C, D], normal: [0, n, n] },
  ];

  const positions = [];
  const normals = [];

  for (const face of faces) {
    for (const v of face.verts) {
      positions.push(v[0], v[1], v[2]);
      normals.push(face.normal[0], face.normal[1], face.normal[2]);
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute("normal", new THREE.Float32BufferAttribute(normals, 3));
  geometry.computeBoundingBox();
  geometry.computeBoundingSphere();
  return geometry;
}

function createCylinderGeometry() {
  const geo = new THREE.CylinderGeometry(0.5, 0.5, 1, 16);
  geo.computeBoundingBox();
  geo.computeBoundingSphere();
  return geo;
}

function createBushGeometry() {
  const seg = 16, r = 0.5, s = 0.5;
  const yMid = 0.0; // cylinder bottom=-0.5, hemisphere top=0.5
  const positions = [], normals = [];
  // Cylinder side (y=-0.5 to 0)
  for (let i = 0; i < seg; i++) {
    const t0 = (i/seg)*Math.PI*2, t1 = ((i+1)/seg)*Math.PI*2;
    const x0=Math.cos(t0)*r, z0=Math.sin(t0)*r;
    const x1=Math.cos(t1)*r, z1=Math.sin(t1)*r;
    const nx0=Math.cos(t0), nz0=Math.sin(t0), nx1=Math.cos(t1), nz1=Math.sin(t1);
    positions.push(x0,-s,z0, x1,yMid,z1, x1,-s,z1);
    normals.push(nx0,0,nz0, nx1,0,nz1, nx1,0,nz1);
    positions.push(x0,-s,z0, x0,yMid,z0, x1,yMid,z1);
    normals.push(nx0,0,nz0, nx0,0,nz0, nx1,0,nz1);
  }
  // Hemisphere dome (y=0 to 0.5)
  const Nr = 12, Nt = seg;
  for (let ir = 0; ir < Nr; ir++) {
    const phi0 = (ir/Nr)*Math.PI/2, phi1 = ((ir+1)/Nr)*Math.PI/2;
    const y0 = yMid + Math.sin(phi0)*r, y1 = yMid + Math.sin(phi1)*r;
    const cr0 = Math.cos(phi0)*r, cr1 = Math.cos(phi1)*r;
    for (let it = 0; it < Nt; it++) {
      const t0 = (it/Nt)*Math.PI*2, t1 = ((it+1)/Nt)*Math.PI*2;
      const x00=Math.cos(t0)*cr0, z00=Math.sin(t0)*cr0;
      const x10=Math.cos(t0)*cr1, z10=Math.sin(t0)*cr1;
      const x01=Math.cos(t1)*cr0, z01=Math.sin(t1)*cr0;
      const x11=Math.cos(t1)*cr1, z11=Math.sin(t1)*cr1;
      const nx00=Math.cos(t0)*Math.cos(phi0), nz00=Math.sin(t0)*Math.cos(phi0), ny0=Math.sin(phi0);
      const nx10=Math.cos(t0)*Math.cos(phi1), nz10=Math.sin(t0)*Math.cos(phi1), ny1=Math.sin(phi1);
      const nx01=Math.cos(t1)*Math.cos(phi0), nz01=Math.sin(t1)*Math.cos(phi0);
      const nx11=Math.cos(t1)*Math.cos(phi1), nz11=Math.sin(t1)*Math.cos(phi1);
      positions.push(x00,y0,z00, x11,y1,z11, x01,y0,z01);
      normals.push(nx00,ny0,nz00, nx11,ny1,nz11, nx01,ny0,nz01);
      positions.push(x00,y0,z00, x10,y1,z10, x11,y1,z11);
      normals.push(nx00,ny0,nz00, nx10,ny1,nz10, nx11,ny1,nz11);
    }
  }
  // Bottom cap
  for (let i = 0; i < seg; i++) {
    const t0=(i/seg)*Math.PI*2, t1=((i+1)/seg)*Math.PI*2;
    positions.push(0,-s,0, Math.cos(t1)*r,-s,Math.sin(t1)*r, Math.cos(t0)*r,-s,Math.sin(t0)*r);
    normals.push(0,-1,0, 0,-1,0, 0,-1,0);
  }
  return buildGeo(positions, normals);
}

function createHalfCylinderGeometry() {
  const segments = 12;
  const r = 0.5;
  const halfLen = 0.5;
  const bottom = -0.5;
  const positions = [];
  const normals = [];

  for (let i = 0; i < segments; i++) {
    const t1 = (i / segments) * Math.PI;
    const t2 = ((i + 1) / segments) * Math.PI;
    const x1 = Math.cos(t1) * r, y1 = bottom + Math.sin(t1) * r;
    const x2 = Math.cos(t2) * r, y2 = bottom + Math.sin(t2) * r;
    const nx1 = Math.cos(t1), ny1 = Math.sin(t1);
    const nx2 = Math.cos(t2), ny2 = Math.sin(t2);

    positions.push(x1, y1, -halfLen, x2, y2, -halfLen, x2, y2, halfLen);
    normals.push(nx1, ny1, 0, nx2, ny2, 0, nx2, ny2, 0);
    positions.push(x1, y1, -halfLen, x2, y2, halfLen, x1, y1, halfLen);
    normals.push(nx1, ny1, 0, nx2, ny2, 0, nx1, ny1, 0);
  }

  for (let i = 0; i < segments; i++) {
    const t1 = (i / segments) * Math.PI;
    const t2 = ((i + 1) / segments) * Math.PI;
    positions.push(0, bottom, halfLen, Math.cos(t1) * r, bottom + Math.sin(t1) * r, halfLen, Math.cos(t2) * r, bottom + Math.sin(t2) * r, halfLen);
    normals.push(0, 0, 1, 0, 0, 1, 0, 0, 1);
  }

  for (let i = 0; i < segments; i++) {
    const t1 = (i / segments) * Math.PI;
    const t2 = ((i + 1) / segments) * Math.PI;
    positions.push(0, bottom, -halfLen, Math.cos(t2) * r, bottom + Math.sin(t2) * r, -halfLen, Math.cos(t1) * r, bottom + Math.sin(t1) * r, -halfLen);
    normals.push(0, 0, -1, 0, 0, -1, 0, 0, -1);
  }

  positions.push(-r, bottom, -halfLen, r, bottom, -halfLen, r, bottom, halfLen);
  normals.push(0, -1, 0, 0, -1, 0, 0, -1, 0);
  positions.push(-r, bottom, -halfLen, r, bottom, halfLen, -r, bottom, halfLen);
  normals.push(0, -1, 0, 0, -1, 0, 0, -1, 0);

  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute("normal", new THREE.Float32BufferAttribute(normals, 3));
  geo.computeBoundingBox();
  geo.computeBoundingSphere();
  return geo;
}

function createHorizontalCylinderGeometry() {
  const geo = new THREE.CylinderGeometry(0.5, 0.5, 1, 16);
  geo.rotateX(Math.PI / 2);
  geo.computeBoundingBox();
  geo.computeBoundingSphere();
  return geo;
}

function createHalfCubeGeometry() {
  const geo = new THREE.BoxGeometry(1, 0.5, 1);
  geo.translate(0, -0.25, 0);
  geo.computeBoundingBox();
  geo.computeBoundingSphere();
  return geo;
}

function addBoxVerts(positions, normals, x1, y1, z1, x2, y2, z2) {
  const minX = Math.min(x1, x2), maxX = Math.max(x1, x2);
  const minY = Math.min(y1, y2), maxY = Math.max(y1, y2);
  const minZ = Math.min(z1, z2), maxZ = Math.max(z1, z2);
  const faces = [
    { verts: [minX,minY,maxZ, maxX,minY,maxZ, maxX,maxY,maxZ, minX,minY,maxZ, maxX,maxY,maxZ, minX,maxY,maxZ], normal: [0,0,1] },
    { verts: [minX,minY,minZ, minX,maxY,minZ, maxX,maxY,minZ, minX,minY,minZ, maxX,maxY,minZ, maxX,minY,minZ], normal: [0,0,-1] },
    { verts: [minX,maxY,minZ, minX,maxY,maxZ, maxX,maxY,maxZ, minX,maxY,minZ, maxX,maxY,maxZ, maxX,maxY,minZ], normal: [0,1,0] },
    { verts: [minX,minY,minZ, maxX,minY,minZ, maxX,minY,maxZ, minX,minY,minZ, maxX,minY,maxZ, minX,minY,maxZ], normal: [0,-1,0] },
    { verts: [maxX,minY,minZ, maxX,maxY,minZ, maxX,maxY,maxZ, maxX,minY,minZ, maxX,maxY,maxZ, maxX,minY,maxZ], normal: [1,0,0] },
    { verts: [minX,minY,minZ, minX,minY,maxZ, minX,maxY,maxZ, minX,minY,minZ, minX,maxY,maxZ, minX,maxY,minZ], normal: [-1,0,0] },
  ];
  for (const face of faces) {
    for (let i = 0; i < face.verts.length; i += 3) {
      positions.push(face.verts[i], face.verts[i+1], face.verts[i+2]);
      normals.push(face.normal[0], face.normal[1], face.normal[2]);
    }
  }
}

function createWindowGeometry() {
  const s = 0.5;
  const t = 0.08;
  const d = t / 2;
  const positions = [];
  const normals = [];

  addBoxVerts(positions, normals, -s, -s, -d, s, -s + t, d);
  addBoxVerts(positions, normals, -s, s - t, -d, s, s, d);
  addBoxVerts(positions, normals, -s, -s + t, -d, -s + t, s - t, d);
  addBoxVerts(positions, normals, s - t, -s + t, -d, s, s - t, d);

  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute("normal", new THREE.Float32BufferAttribute(normals, 3));
  geo.computeBoundingBox();
  geo.computeBoundingSphere();
  return geo;
}

function createSlopedWindowGeometry() {
  // Reuse window frame, scale+rotate onto wedge slope
  const geo = createWindowGeometry();
  const n = 1 / Math.SQRT2;
  geo.applyMatrix4(new THREE.Matrix4().set(
    0, -1, -n, 0,
    0,  1, -n, 0,
    1,  0,  0, 0,
    0,  0,  0, 1
  ));
  return geo;
}

function createArchGeometry() {
  const segments = 12;
  const r = 1.0;
  const s = 0.5;
  const cx = -s, cy = -s;
  const positions = [];
  const normals = [];

  for (let i = 0; i < segments; i++) {
    const t1 = (i / segments) * Math.PI / 2;
    const t2 = ((i + 1) / segments) * Math.PI / 2;
    const x1 = cx + Math.cos(t1) * r, y1 = cy + Math.sin(t1) * r;
    const x2 = cx + Math.cos(t2) * r, y2 = cy + Math.sin(t2) * r;
    const nx1 = Math.cos(t1), ny1 = Math.sin(t1);
    const nx2 = Math.cos(t2), ny2 = Math.sin(t2);

    positions.push(x1, y1, -s, x2, y2, -s, x2, y2, s);
    normals.push(nx1, ny1, 0, nx2, ny2, 0, nx2, ny2, 0);
    positions.push(x1, y1, -s, x2, y2, s, x1, y1, s);
    normals.push(nx1, ny1, 0, nx2, ny2, 0, nx1, ny1, 0);
  }

  for (let i = 0; i < segments; i++) {
    const t1 = (i / segments) * Math.PI / 2;
    const t2 = ((i + 1) / segments) * Math.PI / 2;
    const x1 = cx + Math.cos(t1) * r, y1 = cy + Math.sin(t1) * r;
    const x2 = cx + Math.cos(t2) * r, y2 = cy + Math.sin(t2) * r;
    positions.push(cx, cy, s, x1, y1, s, x2, y2, s);
    normals.push(0, 0, 1, 0, 0, 1, 0, 0, 1);
  }

  for (let i = 0; i < segments; i++) {
    const t1 = (i / segments) * Math.PI / 2;
    const t2 = ((i + 1) / segments) * Math.PI / 2;
    const x1 = cx + Math.cos(t1) * r, y1 = cy + Math.sin(t1) * r;
    const x2 = cx + Math.cos(t2) * r, y2 = cy + Math.sin(t2) * r;
    positions.push(cx, cy, -s, x2, y2, -s, x1, y1, -s);
    normals.push(0, 0, -1, 0, 0, -1, 0, 0, -1);
  }

  positions.push(cx, cy, -s, s, cy, -s, s, cy, s);
  normals.push(0, -1, 0, 0, -1, 0, 0, -1, 0);
  positions.push(cx, cy, -s, s, cy, s, cx, cy, s);
  normals.push(0, -1, 0, 0, -1, 0, 0, -1, 0);

  positions.push(cx, cy, -s, cx, cy, s, cx, s, s);
  normals.push(-1, 0, 0, -1, 0, 0, -1, 0, 0);
  positions.push(cx, cy, -s, cx, s, s, cx, s, -s);
  normals.push(-1, 0, 0, -1, 0, 0, -1, 0, 0);

  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute("normal", new THREE.Float32BufferAttribute(normals, 3));
  geo.computeBoundingBox();
  geo.computeBoundingSphere();
  return geo;
}

function createStairGeometry() {
  const s = 0.5;
  const stepH = 1 / 4;
  const stepD = 1 / 4;
  const positions = [];
  const normals = [];

  for (let i = 0; i < 4; i++) {
    const y0 = -s + i * stepH;
    const y1 = y0 + stepH;
    const z0 = -s + i * stepD;
    const z1 = s;
    addBoxVerts(positions, normals, -s, y0, z0, s, y1, z1);
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute("normal", new THREE.Float32BufferAttribute(normals, 3));
  geo.computeBoundingBox();
  geo.computeBoundingSphere();
  return geo;
}

function createLadderGeometry() {
  const positions = [];
  const normals = [];
  const w = 0.08;
  const railW = 0.08;
  const inset = 0.15; // 양쪽 여백으로 폭 줄임

  // Left rail
  addBoxVerts(positions, normals, -0.5 + inset, -0.5, 0.5 - w, -0.5 + inset + railW, 0.5, 0.5);
  // Right rail
  addBoxVerts(positions, normals, 0.5 - inset - railW, -0.5, 0.5 - w, 0.5 - inset, 0.5, 0.5);

  // Rungs evenly spaced for seamless vertical stacking
  const rungH = 0.06;
  const spacing = 0.25;
  for (let i = 0; i < 4; i++) {
    const cy = -0.5 + spacing * (i + 0.5);
    addBoxVerts(positions, normals, -0.5 + inset, cy - rungH / 2, 0.5 - w, 0.5 - inset, cy + rungH / 2, 0.5);
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute("normal", new THREE.Float32BufferAttribute(normals, 3));
  geo.computeBoundingBox();
  geo.computeBoundingSphere();
  return geo;
}

function createRopeGeometry() {
  const geo = new THREE.CylinderGeometry(0.08, 0.08, 1, 8);
  geo.computeBoundingBox();
  geo.computeBoundingSphere();
  return geo;
}

function createFenceGeometry() {
  const positions = [];
  const normals = [];
  const pw = 0.12;
  const barH = 0.08;

  // Left post
  addBoxVerts(positions, normals, -0.5, -0.5, -pw/2, -0.5 + pw, 0.5, pw/2);
  // Right post
  addBoxVerts(positions, normals, 0.5 - pw, -0.5, -pw/2, 0.5, 0.5, pw/2);

  // Horizontal bars between posts
  addBoxVerts(positions, normals, -0.5 + pw, -0.2, -barH/2, 0.5 - pw, -0.2 + barH, barH/2);
  addBoxVerts(positions, normals, -0.5 + pw, 0.2, -barH/2, 0.5 - pw, 0.2 + barH, barH/2);

  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute("normal", new THREE.Float32BufferAttribute(normals, 3));
  geo.computeBoundingBox();
  geo.computeBoundingSphere();
  return geo;
}

function createChairGeometry() {
  const positions = [];
  const normals = [];
  const legW = 0.1;

  // Seat
  addBoxVerts(positions, normals, -0.5, -0.05, -0.5, 0.5, 0.03, 0.5);
  // Backrest
  addBoxVerts(positions, normals, -0.5, 0.03, -0.5, 0.5, 0.5, -0.4);
  // Legs
  addBoxVerts(positions, normals, -0.5, -0.5, 0.5 - legW, -0.5 + legW, -0.05, 0.5);
  addBoxVerts(positions, normals, 0.5 - legW, -0.5, 0.5 - legW, 0.5, -0.05, 0.5);
  addBoxVerts(positions, normals, -0.5, -0.5, -0.5, -0.5 + legW, -0.05, -0.5 + legW);
  addBoxVerts(positions, normals, 0.5 - legW, -0.5, -0.5, 0.5, -0.05, -0.5 + legW);

  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute("normal", new THREE.Float32BufferAttribute(normals, 3));
  geo.computeBoundingBox();
  geo.computeBoundingSphere();
  return geo;
}

function createTableGeometry() {
  const positions = [];
  const normals = [];
  const legW = 0.08;
  // Tabletop
  addBoxVerts(positions, normals, -0.5, 0.3, -0.5, 0.5, 0.4, 0.5);
  // Legs
  addBoxVerts(positions, normals, -0.5, -0.5, -0.5, -0.5 + legW, 0.3, -0.5 + legW);
  addBoxVerts(positions, normals, 0.5 - legW, -0.5, -0.5, 0.5, 0.3, -0.5 + legW);
  addBoxVerts(positions, normals, -0.5, -0.5, 0.5 - legW, -0.5 + legW, 0.3, 0.5);
  addBoxVerts(positions, normals, 0.5 - legW, -0.5, 0.5 - legW, 0.5, 0.3, 0.5);
  return buildGeo(positions, normals);
}

function createTable2x2Geometry() {
  const positions = [];
  const normals = [];
  const legW = 0.1;
  // Tabletop (2x2)
  addBoxVerts(positions, normals, -0.5, 0.3, -0.5, 1.5, 0.4, 1.5);
  // Legs at 4 corners
  addBoxVerts(positions, normals, -0.5, -0.5, -0.5, -0.5 + legW, 0.3, -0.5 + legW);
  addBoxVerts(positions, normals, 1.5 - legW, -0.5, -0.5, 1.5, 0.3, -0.5 + legW);
  addBoxVerts(positions, normals, -0.5, -0.5, 1.5 - legW, -0.5 + legW, 0.3, 1.5);
  addBoxVerts(positions, normals, 1.5 - legW, -0.5, 1.5 - legW, 1.5, 0.3, 1.5);
  return buildGeo(positions, normals);
}

function createBed1x2Geometry() {
  const positions = [];
  const normals = [];
  const f = 0.06; // frame thickness
  // Mattress
  addBoxVerts(positions, normals, -0.5 + f, -0.15, -0.5 + f, 0.5 - f, 0.0, 1.5 - f);
  // Headboard (full height from bottom)
  addBoxVerts(positions, normals, -0.5, -0.5, -0.5, 0.5, 0.35, -0.4);
  // Frame sides
  addBoxVerts(positions, normals, -0.5, -0.5, -0.4, -0.5 + f, 0.0, 1.5); // left
  addBoxVerts(positions, normals, 0.5 - f, -0.5, -0.4, 0.5, 0.0, 1.5);  // right
  addBoxVerts(positions, normals, -0.5, -0.5, 1.5 - f, 0.5, 0.0, 1.5);  // foot
  return buildGeo(positions, normals);
}

function createBed2x2Geometry() {
  const positions = [];
  const normals = [];
  const f = 0.06;
  // Mattress
  addBoxVerts(positions, normals, -0.5 + f, -0.15, -0.5 + f, 1.5 - f, 0.0, 1.5 - f);
  // Headboard (full height from bottom)
  addBoxVerts(positions, normals, -0.5, -0.5, -0.5, 1.5, 0.35, -0.4);
  // Frame sides
  addBoxVerts(positions, normals, -0.5, -0.5, -0.4, -0.5 + f, 0.0, 1.5); // left
  addBoxVerts(positions, normals, 1.5 - f, -0.5, -0.4, 1.5, 0.0, 1.5);   // right
  addBoxVerts(positions, normals, -0.5, -0.5, 1.5 - f, 1.5, 0.0, 1.5);   // foot
  return buildGeo(positions, normals);
}

function createSofaGeometry() {
  const positions = [];
  const normals = [];
  // Base (full width+depth)
  addBoxVerts(positions, normals, -0.5, -0.5, -0.5, 1.5, -0.1, 0.5);
  // Seat cushion (2x1)
  addBoxVerts(positions, normals, -0.5, -0.1, -0.3, 1.5, 0.0, 0.5);
  // Backrest (full height from base top)
  addBoxVerts(positions, normals, -0.5, -0.1, -0.5, 1.5, 0.4, -0.3);
  // Left armrest
  addBoxVerts(positions, normals, -0.5, -0.1, -0.3, -0.35, 0.15, 0.5);
  // Right armrest
  addBoxVerts(positions, normals, 1.35, -0.1, -0.3, 1.5, 0.15, 0.5);
  return buildGeo(positions, normals);
}

function createLampGeometry() {
  const positions = [];
  const normals = [];
  const r = 0.05; // pole radius
  // Pole
  addBoxVerts(positions, normals, -r, -0.5, -r, r, 2.0, r);
  // Base
  addBoxVerts(positions, normals, -0.2, -0.5, -0.2, 0.2, -0.4, 0.2);
  // Lantern base plate
  addBoxVerts(positions, normals, -0.15, 2.0, -0.15, 0.15, 2.05, 0.15);
  // Lantern glass body
  addBoxVerts(positions, normals, -0.12, 2.05, -0.12, 0.12, 2.3, 0.12);
  // Lantern top plate
  addBoxVerts(positions, normals, -0.15, 2.3, -0.15, 0.15, 2.35, 0.15);
  // Lantern roof cap
  addBoxVerts(positions, normals, -0.1, 2.35, -0.1, 0.1, 2.45, 0.1);
  return buildGeo(positions, normals);
}

function createTreeGeometry() {
  const positions = [];
  const normals = [];
  const colors = [];
  // sRGB → linear conversion for accurate vertex colors
  const srgbToLinear = (c) => c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  const brown = [srgbToLinear(142/255), srgbToLinear(110/255), srgbToLinear(83/255)];
  const green = [srgbToLinear(64/255), srgbToLinear(196/255), srgbToLinear(128/255)];

  function addCBox(x1, y1, z1, x2, y2, z2, c) {
    const si = positions.length / 3;
    addBoxVerts(positions, normals, x1, y1, z1, x2, y2, z2);
    const n = positions.length / 3 - si;
    for (let i = 0; i < n; i++) colors.push(c[0], c[1], c[2]);
  }

  // Arch block geometry at (px,py,pz), rotY=0..3, flipY=vertical mirror
  function addArch(px, py, pz, rotY, flipY, c) {
    const seg = 12, r = 1.0, s = 0.5;
    const acx = -s, acy = -s;
    const lp = [], ln = [];
    for (let i = 0; i < seg; i++) {
      const t1 = (i / seg) * Math.PI / 2, t2 = ((i + 1) / seg) * Math.PI / 2;
      const x1 = acx + Math.cos(t1) * r, y1 = acy + Math.sin(t1) * r;
      const x2 = acx + Math.cos(t2) * r, y2 = acy + Math.sin(t2) * r;
      const nx1 = Math.cos(t1), ny1 = Math.sin(t1), nx2 = Math.cos(t2), ny2 = Math.sin(t2);
      lp.push(x1,y1,-s, x2,y2,-s, x2,y2,s);
      ln.push(nx1,ny1,0, nx2,ny2,0, nx2,ny2,0);
      lp.push(x1,y1,-s, x2,y2,s, x1,y1,s);
      ln.push(nx1,ny1,0, nx2,ny2,0, nx1,ny1,0);
    }
    for (let i = 0; i < seg; i++) {
      const t1 = (i / seg) * Math.PI / 2, t2 = ((i + 1) / seg) * Math.PI / 2;
      const x1 = acx + Math.cos(t1) * r, y1 = acy + Math.sin(t1) * r;
      const x2 = acx + Math.cos(t2) * r, y2 = acy + Math.sin(t2) * r;
      lp.push(acx,acy,s, x1,y1,s, x2,y2,s);
      ln.push(0,0,1, 0,0,1, 0,0,1);
    }
    for (let i = 0; i < seg; i++) {
      const t1 = (i / seg) * Math.PI / 2, t2 = ((i + 1) / seg) * Math.PI / 2;
      const x1 = acx + Math.cos(t1) * r, y1 = acy + Math.sin(t1) * r;
      const x2 = acx + Math.cos(t2) * r, y2 = acy + Math.sin(t2) * r;
      lp.push(acx,acy,-s, x2,y2,-s, x1,y1,-s);
      ln.push(0,0,-1, 0,0,-1, 0,0,-1);
    }
    lp.push(acx,acy,-s, s,acy,-s, s,acy,s);
    ln.push(0,-1,0, 0,-1,0, 0,-1,0);
    lp.push(acx,acy,-s, s,acy,s, acx,acy,s);
    ln.push(0,-1,0, 0,-1,0, 0,-1,0);
    lp.push(acx,acy,-s, acx,acy,s, acx,s,s);
    ln.push(-1,0,0, -1,0,0, -1,0,0);
    lp.push(acx,acy,-s, acx,s,s, acx,s,-s);
    ln.push(-1,0,0, -1,0,0, -1,0,0);
    for (let i = 0; i < lp.length; i += 3) {
      let x = lp[i], y = lp[i+1], z = lp[i+2];
      let nx = ln[i], ny = ln[i+1], nz = ln[i+2];
      if (flipY) { y = -y; ny = -ny; }
      let rx, rz, rnx, rnz;
      switch (rotY) {
        case 0: rx=x; rz=z; rnx=nx; rnz=nz; break;
        case 1: rx=-z; rz=x; rnx=-nz; rnz=nx; break;
        case 2: rx=-x; rz=-z; rnx=-nx; rnz=-nz; break;
        case 3: rx=z; rz=-x; rnx=nz; rnz=-nx; break;
      }
      lp[i]=rx+px; lp[i+1]=y+py; lp[i+2]=rz+pz;
      ln[i]=rnx; ln[i+1]=ny; ln[i+2]=rnz;
    }
    if (flipY) {
      for (let i = 0; i < lp.length; i += 9) {
        for (let j = 0; j < 3; j++) {
          let t=lp[i+j]; lp[i+j]=lp[i+3+j]; lp[i+3+j]=t;
          t=ln[i+j]; ln[i+j]=ln[i+3+j]; ln[i+3+j]=t;
        }
      }
    }
    for (let i = 0; i < lp.length; i++) positions.push(lp[i]);
    for (let i = 0; i < ln.length; i++) normals.push(ln[i]);
    for (let i = 0; i < lp.length / 3; i++) colors.push(c[0], c[1], c[2]);
  }

  // Quarter-sphere corner: polar tessellation for clean circular boundary
  function addSphereCorner(px, py, pz, rotY, flipY, c) {
    const N = 12, s = 0.5;
    const lp = [], ln = [];
    // Curved surface — polar coords (r, theta)
    for (let ir = 0; ir < N; ir++) {
      const r0 = ir / N, r1 = (ir + 1) / N;
      const h0 = Math.sqrt(1 - r0 * r0), h1 = Math.sqrt(1 - r1 * r1);
      for (let it = 0; it < N; it++) {
        const t0 = (it / N) * Math.PI / 2, t1 = ((it + 1) / N) * Math.PI / 2;
        const u00=r0*Math.cos(t0), v00=r0*Math.sin(t0);
        const u10=r1*Math.cos(t0), v10=r1*Math.sin(t0);
        const u01=r0*Math.cos(t1), v01=r0*Math.sin(t1);
        const u11=r1*Math.cos(t1), v11=r1*Math.sin(t1);
        if (ir === 0) {
          lp.push(-s,1-s,-s, u11-s,h1-s,v11-s, u10-s,h1-s,v10-s);
          ln.push(0,1,0, u11,h1,v11, u10,h1,v10);
        } else {
          lp.push(u00-s,h0-s,v00-s, u01-s,h0-s,v01-s, u11-s,h1-s,v11-s);
          ln.push(u00,h0,v00, u01,h0,v01, u11,h1,v11);
          lp.push(u00-s,h0-s,v00-s, u11-s,h1-s,v11-s, u10-s,h1-s,v10-s);
          ln.push(u00,h0,v00, u11,h1,v11, u10,h1,v10);
        }
      }
    }
    // Bottom face (quarter circle, polar)
    for (let ir = 0; ir < N; ir++) {
      const r0 = ir / N, r1 = (ir + 1) / N;
      for (let it = 0; it < N; it++) {
        const t0 = (it / N) * Math.PI / 2, t1 = ((it + 1) / N) * Math.PI / 2;
        const u00=r0*Math.cos(t0), v00=r0*Math.sin(t0);
        const u10=r1*Math.cos(t0), v10=r1*Math.sin(t0);
        const u01=r0*Math.cos(t1), v01=r0*Math.sin(t1);
        const u11=r1*Math.cos(t1), v11=r1*Math.sin(t1);
        if (ir === 0) {
          lp.push(-s,-s,-s, u10-s,-s,v10-s, u11-s,-s,v11-s);
          ln.push(0,-1,0, 0,-1,0, 0,-1,0);
        } else {
          lp.push(u00-s,-s,v00-s, u10-s,-s,v10-s, u11-s,-s,v11-s);
          ln.push(0,-1,0, 0,-1,0, 0,-1,0);
          lp.push(u00-s,-s,v00-s, u11-s,-s,v11-s, u01-s,-s,v01-s);
          ln.push(0,-1,0, 0,-1,0, 0,-1,0);
        }
      }
    }
    // Inner X face (x=-0.5)
    for (let iv = 0; iv < N; iv++) {
      const v0=iv/N, v1=(iv+1)/N;
      const h0=Math.sqrt(1-v0*v0), h1=Math.sqrt(1-v1*v1);
      if (h0 < 0.001 && h1 < 0.001) continue;
      lp.push(-s,-s,v0-s, -s,-s,v1-s, -s,h1-s,v1-s);
      ln.push(-1,0,0, -1,0,0, -1,0,0);
      lp.push(-s,-s,v0-s, -s,h1-s,v1-s, -s,h0-s,v0-s);
      ln.push(-1,0,0, -1,0,0, -1,0,0);
    }
    // Inner Z face (z=-0.5)
    for (let iu = 0; iu < N; iu++) {
      const u0=iu/N, u1=(iu+1)/N;
      const h0=Math.sqrt(1-u0*u0), h1=Math.sqrt(1-u1*u1);
      if (h0 < 0.001 && h1 < 0.001) continue;
      lp.push(u0-s,-s,-s, u0-s,h0-s,-s, u1-s,h1-s,-s);
      ln.push(0,0,-1, 0,0,-1, 0,0,-1);
      lp.push(u0-s,-s,-s, u1-s,h1-s,-s, u1-s,-s,-s);
      ln.push(0,0,-1, 0,0,-1, 0,0,-1);
    }
    // Transform (same as addArch)
    for (let i = 0; i < lp.length; i += 3) {
      let x=lp[i], y=lp[i+1], z=lp[i+2];
      let nx=ln[i], ny=ln[i+1], nz=ln[i+2];
      if (flipY) { y=-y; ny=-ny; }
      let rx, rz, rnx, rnz;
      switch (rotY) {
        case 0: rx=x; rz=z; rnx=nx; rnz=nz; break;
        case 1: rx=-z; rz=x; rnx=-nz; rnz=nx; break;
        case 2: rx=-x; rz=-z; rnx=-nx; rnz=-nz; break;
        case 3: rx=z; rz=-x; rnx=nz; rnz=-nx; break;
      }
      lp[i]=rx+px; lp[i+1]=y+py; lp[i+2]=rz+pz;
      ln[i]=rnx; ln[i+1]=ny; ln[i+2]=rnz;
    }
    if (flipY) {
      for (let i = 0; i < lp.length; i += 9) {
        for (let j = 0; j < 3; j++) {
          let t=lp[i+j]; lp[i+j]=lp[i+3+j]; lp[i+3+j]=t;
          t=ln[i+j]; ln[i+j]=ln[i+3+j]; ln[i+3+j]=t;
        }
      }
    }
    for (let i = 0; i < lp.length; i++) positions.push(lp[i]);
    for (let i = 0; i < ln.length; i++) normals.push(ln[i]);
    for (let i = 0; i < lp.length / 3; i++) colors.push(c[0], c[1], c[2]);
  }

  // Vertical quarter-cylinder corner (for middle layer)
  function addPillarCorner(px, py, pz, rotY, c) {
    const seg = 12, s = 0.5;
    const ac = -s;
    const lp = [], ln = [];
    for (let i = 0; i < seg; i++) {
      const t1 = (i/seg)*Math.PI/2, t2 = ((i+1)/seg)*Math.PI/2;
      const x1=ac+Math.cos(t1), z1=ac+Math.sin(t1);
      const x2=ac+Math.cos(t2), z2=ac+Math.sin(t2);
      const nx1=Math.cos(t1), nz1=Math.sin(t1), nx2=Math.cos(t2), nz2=Math.sin(t2);
      lp.push(x1,-s,z1, x2,s,z2, x2,-s,z2);
      ln.push(nx1,0,nz1, nx2,0,nz2, nx2,0,nz2);
      lp.push(x1,-s,z1, x1,s,z1, x2,s,z2);
      ln.push(nx1,0,nz1, nx1,0,nz1, nx2,0,nz2);
    }
    for (let i = 0; i < seg; i++) {
      const t1=(i/seg)*Math.PI/2, t2=((i+1)/seg)*Math.PI/2;
      const x1=ac+Math.cos(t1), z1=ac+Math.sin(t1);
      const x2=ac+Math.cos(t2), z2=ac+Math.sin(t2);
      lp.push(ac,s,ac, x2,s,z2, x1,s,z1);
      ln.push(0,1,0, 0,1,0, 0,1,0);
      lp.push(ac,-s,ac, x1,-s,z1, x2,-s,z2);
      ln.push(0,-1,0, 0,-1,0, 0,-1,0);
    }
    lp.push(ac,-s,ac, ac,-s,s, ac,s,s);
    ln.push(-1,0,0, -1,0,0, -1,0,0);
    lp.push(ac,-s,ac, ac,s,s, ac,s,ac);
    ln.push(-1,0,0, -1,0,0, -1,0,0);
    lp.push(ac,-s,ac, s,s,ac, s,-s,ac);
    ln.push(0,0,-1, 0,0,-1, 0,0,-1);
    lp.push(ac,-s,ac, ac,s,ac, s,s,ac);
    ln.push(0,0,-1, 0,0,-1, 0,0,-1);
    for (let i = 0; i < lp.length; i += 3) {
      let x=lp[i], y=lp[i+1], z=lp[i+2];
      let nx=ln[i], ny=ln[i+1], nz=ln[i+2];
      let rx, rz, rnx, rnz;
      switch (rotY) {
        case 0: rx=x; rz=z; rnx=nx; rnz=nz; break;
        case 1: rx=-z; rz=x; rnx=-nz; rnz=nx; break;
        case 2: rx=-x; rz=-z; rnx=-nx; rnz=-nz; break;
        case 3: rx=z; rz=-x; rnx=nz; rnz=-nx; break;
      }
      lp[i]=rx+px; lp[i+1]=y+py; lp[i+2]=rz+pz;
      ln[i]=rnx; ln[i+1]=ny; ln[i+2]=rnz;
    }
    for (let i = 0; i < lp.length; i++) positions.push(lp[i]);
    for (let i = 0; i < ln.length; i++) normals.push(ln[i]);
    for (let i = 0; i < lp.length / 3; i++) colors.push(c[0], c[1], c[2]);
  }

  // Trunk (cylinder)
  const trunkSeg = 16, trunkR = 0.5, trunkCx = 1.0, trunkCz = 1.0;
  for (let i = 0; i < trunkSeg; i++) {
    const t0 = (i / trunkSeg) * Math.PI * 2, t1 = ((i + 1) / trunkSeg) * Math.PI * 2;
    const x0 = trunkCx + Math.cos(t0) * trunkR, z0 = trunkCz + Math.sin(t0) * trunkR;
    const x1 = trunkCx + Math.cos(t1) * trunkR, z1 = trunkCz + Math.sin(t1) * trunkR;
    const nx0 = Math.cos(t0), nz0 = Math.sin(t0), nx1 = Math.cos(t1), nz1 = Math.sin(t1);
    // Side
    positions.push(x0,-0.5,z0, x1,0.5,z1, x1,-0.5,z1);
    normals.push(nx0,0,nz0, nx1,0,nz1, nx1,0,nz1);
    for (let j=0;j<3;j++) colors.push(brown[0],brown[1],brown[2]);
    positions.push(x0,-0.5,z0, x0,0.5,z0, x1,0.5,z1);
    normals.push(nx0,0,nz0, nx0,0,nz0, nx1,0,nz1);
    for (let j=0;j<3;j++) colors.push(brown[0],brown[1],brown[2]);
    // Top cap
    positions.push(trunkCx,0.5,trunkCz, x0,0.5,z0, x1,0.5,z1);
    normals.push(0,1,0, 0,1,0, 0,1,0);
    for (let j=0;j<3;j++) colors.push(brown[0],brown[1],brown[2]);
    // Bottom cap
    positions.push(trunkCx,-0.5,trunkCz, x1,-0.5,z1, x0,-0.5,z0);
    normals.push(0,-1,0, 0,-1,0, 0,-1,0);
    for (let j=0;j<3;j++) colors.push(brown[0],brown[1],brown[2]);
  }
  // Middle layer (y=2): cross + 4 pillar corners
  addCBox(0.5, 1.5, -0.5, 1.5, 2.5, 2.5, green);     // center column
  addCBox(-0.5, 1.5, 0.5, 0.5, 2.5, 1.5, green);      // left
  addCBox(1.5, 1.5, 0.5, 2.5, 2.5, 1.5, green);       // right
  addPillarCorner(0, 2, 0, 2, green);                   // front-left
  addPillarCorner(2, 2, 0, 3, green);                   // front-right
  addPillarCorner(0, 2, 2, 1, green);                   // back-left
  addPillarCorner(2, 2, 2, 0, green);                   // back-right

  // Top layer (y=3): center + 4 edge arches + 4 sphere corners
  addCBox(0.5, 2.5, 0.5, 1.5, 3.5, 1.5, green);     // center (3)
  addArch(1, 3, 0, 3, false, green);                   // front edge
  addArch(1, 3, 2, 1, false, green);                   // back edge
  addArch(0, 3, 1, 2, false, green);                   // left edge
  addArch(2, 3, 1, 0, false, green);                   // right edge
  addSphereCorner(0, 3, 0, 2, false, green);           // front-left
  addSphereCorner(2, 3, 0, 3, false, green);           // front-right
  addSphereCorner(0, 3, 2, 1, false, green);           // back-left
  addSphereCorner(2, 3, 2, 0, false, green);           // back-right

  // Bottom layer (y=1): same but flipped
  addCBox(0.5, 0.5, 0.5, 1.5, 1.5, 1.5, green);
  addArch(1, 1, 0, 3, true, green);
  addArch(1, 1, 2, 1, true, green);
  addArch(0, 1, 1, 2, true, green);
  addArch(2, 1, 1, 0, true, green);
  addSphereCorner(0, 1, 0, 2, true, green);
  addSphereCorner(2, 1, 0, 3, true, green);
  addSphereCorner(0, 1, 2, 1, true, green);
  addSphereCorner(2, 1, 2, 0, true, green);

  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute("normal", new THREE.Float32BufferAttribute(normals, 3));
  geo.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
  geo.computeBoundingBox();
  geo.computeBoundingSphere();
  return geo;
}

function buildGeo(positions, normals) {
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute("normal", new THREE.Float32BufferAttribute(normals, 3));
  geo.computeBoundingBox();
  geo.computeBoundingSphere();
  return geo;
}

function hslToHex(h, s, l) {
  s /= 100;
  l /= 100;
  const a = s * Math.min(l, 1 - l);
  const f = (n) => {
    const k = (n + h / 30) % 12;
    const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    return Math.round(255 * color).toString(16).padStart(2, "0");
  };
  return `#${f(0)}${f(8)}${f(4)}`;
}

function snapNormal(normal) {
  const ax = Math.abs(normal.x);
  const ay = Math.abs(normal.y);
  const az = Math.abs(normal.z);
  if (ax >= ay && ax >= az) {
    normal.set(Math.sign(normal.x), 0, 0);
  } else if (ay >= ax && ay >= az) {
    normal.set(0, Math.sign(normal.y), 0);
  } else {
    normal.set(0, 0, Math.sign(normal.z));
  }
}

function normalizeCell(cell) {
  return {
    x: Math.round(cell.x),
    y: Math.max(0, Math.round(cell.y)),
    z: Math.round(cell.z),
  };
}

function getKey(cell) {
  return `${Math.round(cell.x)},${Math.round(cell.y)},${Math.round(cell.z)}`;
}

function isFiniteCell(cell) {
  return Number.isFinite(cell?.x) && Number.isFinite(cell?.y) && Number.isFinite(cell?.z);
}

function isHexColor(value) {
  return typeof value === "string" && /^#[0-9a-f]{6}$/i.test(value);
}
