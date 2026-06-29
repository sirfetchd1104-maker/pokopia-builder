import * as THREE from "three";
import { t } from "../i18n.js";

export class GridManager {
  constructor(scene) {
    this.scene = scene;
    this.size = 96;
    this.labelSprites = [];

    const grid = new THREE.GridHelper(this.size, this.size, 0x2d3533, 0x2d3533);
    grid.position.set(0.5, -0.501, 0.5);
    scene.add(grid);

    const geometry = new THREE.PlaneGeometry(this.size, this.size);
    const material = new THREE.MeshStandardMaterial({
      color: 0x202624,
      roughness: 0.95,
      metalness: 0,
    });
    this.ground = new THREE.Mesh(geometry, material);
    this.ground.rotation.x = -Math.PI / 2;
    this.ground.position.y = -0.51;
    this.ground.receiveShadow = true;
    this.ground.userData.kind = "ground";
    scene.add(this.ground);

    this.addDirectionGuides(scene);
    this.updateLabels();
  }

  addDirectionGuides(scene) {
    const half = this.size / 2;
    const y = -0.495;

    const xMat = new THREE.LineBasicMaterial({ color: 0x65b86f });
    const zMat = new THREE.LineBasicMaterial({ color: 0x4b8ba4 });

    const xLineA = new THREE.Line(
      new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(-half, y, -0.5), new THREE.Vector3(half, y, -0.5)]),
      xMat,
    );
    const xLineB = new THREE.Line(
      new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(-half, y, 0.5), new THREE.Vector3(half, y, 0.5)]),
      xMat,
    );
    const zLineA = new THREE.Line(
      new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(-0.5, y, -half), new THREE.Vector3(-0.5, y, half)]),
      zMat,
    );
    const zLineB = new THREE.Line(
      new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0.5, y, -half), new THREE.Vector3(0.5, y, half)]),
      zMat,
    );
    scene.add(xLineA, xLineB, zLineA, zLineB);
  }

  updateLabels() {
    for (const sprite of this.labelSprites) {
      this.scene.remove(sprite);
      sprite.material.map.dispose();
      sprite.material.dispose();
    }
    this.labelSprites = [];

    const half = this.size / 2;
    const items = [
      [t("dir_left"), -half + 4, 0, 0x65b86f],
      [t("dir_right"), half - 4, 0, 0x65b86f],
      [t("dir_front"), 0, -half + 4, 0x4b8ba4],
      [t("dir_back"), 0, half - 4, 0x4b8ba4],
    ];

    for (const [text, x, z, color] of items) {
      const sprite = this.createLabel(text, x, z, color);
      this.scene.add(sprite);
      this.labelSprites.push(sprite);
    }
  }

  createLabel(text, x, z, color) {
    const canvas = document.createElement("canvas");
    canvas.width = 128;
    canvas.height = 128;
    const context = canvas.getContext("2d");
    context.clearRect(0, 0, canvas.width, canvas.height);
    context.fillStyle = "rgba(21, 23, 25, 0.72)";
    context.fillRect(14, 14, 100, 100);
    context.strokeStyle = `#${color.toString(16).padStart(6, "0")}`;
    context.lineWidth = 6;
    context.strokeRect(14, 14, 100, 100);
    context.fillStyle = "#eef3f0";
    context.font = "700 54px sans-serif";
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.fillText(text, 64, 67);

    const texture = new THREE.CanvasTexture(canvas);
    const material = new THREE.SpriteMaterial({ map: texture, transparent: true, depthWrite: false });
    const sprite = new THREE.Sprite(material);
    sprite.position.set(x, 2.5, z);
    sprite.scale.set(4.2, 4.2, 1);
    return sprite;
  }
}
