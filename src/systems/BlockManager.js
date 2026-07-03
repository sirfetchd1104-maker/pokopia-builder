import * as THREE from "three";

const BLOCK_SIZE = 1;
const INITIAL_CAPACITY = 16;
const GHOST_CAPACITY = 64;
const DEFAULT_MATERIALS = [
  { id: "default", label: "기본 블록", color: "#bc90e9", memo: "" },
];
const LEGACY_TYPE_TO_MATERIAL = {
  default: "default",
  stone: "note-1",
  wood: "note-2",
  brick: "note-2",
  glass: "note-3",
};

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
    };

    this.geometries = {
      cube: new THREE.BoxGeometry(BLOCK_SIZE, BLOCK_SIZE, BLOCK_SIZE),
      wedge: createWedgeGeometry(),
      corner: createCornerGeometry(),
    };
    this.material = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.78,
      metalness: 0.02,
    });

    this.meshCapacity = { cube: INITIAL_CAPACITY, wedge: INITIAL_CAPACITY, corner: INITIAL_CAPACITY };
    this.meshes = {
      cube: this.createMesh("cube", INITIAL_CAPACITY),
      wedge: this.createMesh("wedge", INITIAL_CAPACITY),
      corner: this.createMesh("corner", INITIAL_CAPACITY),
    };
    this.mesh = this.meshes.cube;
    scene.add(this.meshes.cube, this.meshes.wedge, this.meshes.corner);

    this.ghostMaterial = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.45,
      roughness: 0.5,
    });
    this.ghostCapacity = GHOST_CAPACITY;
    this.ghosts = {
      cube: this.createGhostMesh("cube"),
      wedge: this.createGhostMesh("wedge"),
      corner: this.createGhostMesh("corner"),
    };
    scene.add(this.ghosts.cube, this.ghosts.wedge, this.ghosts.corner);

    this.matrix = new THREE.Matrix4();
    this.normalMatrix = new THREE.Matrix3();
    this.color = new THREE.Color();
    this.tempPosition = new THREE.Vector3();
    this.tempQuaternion = new THREE.Quaternion();
    this.tempScale = new THREE.Vector3(0.99, 0.99, 0.99);
    this.yAxis = new THREE.Vector3(0, 1, 0);
  }

  get count() {
    return this.blocks.size;
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
        this.blocks.set(key, entry);
        added.push({ ...entry });
      }
    }
    if (added.length > 0) this.rebuildMeshes();
    return added;
  }

  removeBlock(cell) {
    const key = getKey(normalizeCell(cell));
    const existing = this.blocks.get(key);
    if (!existing) return null;
    const copy = { ...existing };
    this.blocks.delete(key);
    this.rebuildMeshes();
    return copy;
  }

  removeBlocks(cells) {
    const removed = [];
    for (const cell of cells) {
      const key = getKey(normalizeCell(cell));
      const existing = this.blocks.get(key);
      if (existing) {
        removed.push({ ...existing });
        this.blocks.delete(key);
      }
    }
    if (removed.length > 0) this.rebuildMeshes();
    return removed;
  }

  getAllBlocks() {
    return [...this.blocks.values()].map((b) => ({ ...b }));
  }

  clear() {
    this.blocks.clear();
    this.rebuildMeshes();
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
      stats[block.materialId] = (stats[block.materialId] || 0) + 1;
    }
    return stats;
  }

  getBlock(cell) {
    return this.blocks.get(getKey(normalizeCell(cell))) ?? null;
  }

  moveAll(dx, dy, dz) {
    const entries = [...this.blocks.values()];
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
    this.rebuildMeshes();
    return moved;
  }

  serialize() {
    return {
      version: 2,
      materials: this.getMaterialOptions(),
      blocks: [...this.blocks.values()].sort((a, b) => getKey(a).localeCompare(getKey(b))),
    };
  }

  rebuildMeshes() {
    this.instanceBlocks = { cube: [], wedge: [], corner: [] };
    for (const block of this.blocks.values()) {
      if (this.isVisibleInLayer(block)) {
        this.instanceBlocks[block.shape].push(block);
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
        mesh.setMatrixAt(i, this.matrix);
        this.color.set(this.getMaterial(block.materialId).color);
        mesh.setColorAt(i, this.color);
      }

      mesh.count = needed;
      mesh.instanceMatrix.needsUpdate = true;
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
      mesh.boundingSphere = null;
      mesh.boundingBox = null;
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
    this.color.set(this.getMaterial(materialId).color);

    for (let i = 0; i < cells.length; i++) {
      this.tempPosition.set(cells[i].x, cells[i].y, cells[i].z);
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
    return Object.values(this.meshes);
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
    if (shape === "wedge" || shape === "corner") return shape;
    return "cube";
  }

  getValidRotation(rotation) {
    const r = Number.parseInt(rotation, 10);
    if (r === 1 || r === 2 || r === 3) return r;
    return 0;
  }

  createMesh(shape, capacity) {
    const mesh = new THREE.InstancedMesh(this.geometries[shape], this.material, capacity);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.userData.kind = "blocks";
    mesh.userData.shape = shape;
    return mesh;
  }

  createGhostMesh(shape) {
    const mesh = new THREE.InstancedMesh(this.geometries[shape], this.ghostMaterial, this.ghostCapacity);
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
