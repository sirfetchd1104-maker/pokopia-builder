import * as THREE from "three";

export class SceneManager {
  constructor(canvas) {
    this.canvas = canvas;
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x151719);
    this.scene.fog = new THREE.Fog(0x151719, 42, 130);

    this.camera = new THREE.PerspectiveCamera(55, 1, 0.1, 500);
    this.camera.position.set(-8, 7.6, -13.8);
    this.camera.lookAt(0, 0, -1);

    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    this.raycaster = new THREE.Raycaster();
    this.pointer = new THREE.Vector2(0, 0);

    this.addLights();
    this.resize();
    window.addEventListener("resize", () => this.resize());
  }

  addLights() {
    const ambient = new THREE.HemisphereLight(0xddeee8, 0x404845, 1.8);
    this.scene.add(ambient);

    const key = new THREE.DirectionalLight(0xffffff, 2.2);
    key.position.set(16, 24, 10);
    key.castShadow = true;
    key.shadow.mapSize.set(2048, 2048);
    key.shadow.camera.left = -40;
    key.shadow.camera.right = 40;
    key.shadow.camera.top = 40;
    key.shadow.camera.bottom = -40;
    this.scene.add(key);

    const fill = new THREE.DirectionalLight(0xb0c4d8, 0.6);
    fill.position.set(-10, 12, -8);
    this.scene.add(fill);
  }

  resize() {
    const width = this.canvas.clientWidth || window.innerWidth;
    const height = this.canvas.clientHeight || window.innerHeight;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height, false);
  }

  raycastFromCenter(objects) {
    this.raycaster.setFromCamera(this.pointer, this.camera);
    const hits = this.raycaster.intersectObjects(objects.filter(Boolean), false);
    return hits[0] ?? null;
  }

  raycastFromScreen(screenX, screenY, objects) {
    const rect = this.renderer.domElement.getBoundingClientRect();
    const ndc = new THREE.Vector2(
      ((screenX - rect.left) / rect.width) * 2 - 1,
      -((screenY - rect.top) / rect.height) * 2 + 1
    );
    this.raycaster.setFromCamera(ndc, this.camera);
    const hits = this.raycaster.intersectObjects(objects.filter(Boolean), false);
    return hits[0] ?? null;
  }

  render() {
    this.renderer.render(this.scene, this.camera);
  }

  captureScreenshot(callback) {
    this.renderer.render(this.scene, this.camera);
    this.renderer.domElement.toBlob((blob) => {
      if (blob) callback(blob);
    });
  }
}
