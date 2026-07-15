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
    };
    this.material = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.78,
      metalness: 0.02,
    });

    const shapeNames = Object.keys(this.geometries);
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

    this.thinShapes = new Set(["ladder", "rope", "fence", "window", "slopedWindow"]);
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

  replaceBlocks(updates) {
    const replaced = [];
    for (const update of updates) {
      const key = getKey(normalizeCell(update));
      const existing = this.blocks.get(key);
      if (!existing) continue;
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
    this.instanceBlocks = { cube: [], wedge: [], corner: [], cylinder: [], hCylinder: [], halfCylinder: [], halfCube: [], window: [], slopedWindow: [], arch: [], stair: [], ladder: [], rope: [], fence: [] };
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
    const mesh = new THREE.InstancedMesh(this.geometries[shape], this.material, capacity);
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

function createCylinderGeometry() {
  const geo = new THREE.CylinderGeometry(0.5, 0.5, 1, 16);
  geo.computeBoundingBox();
  geo.computeBoundingSphere();
  return geo;
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
