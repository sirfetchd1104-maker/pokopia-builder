import * as THREE from "three";

export class CameraController {
  constructor(camera, canvas) {
    this.camera = camera;
    this.canvas = canvas;
    this.pitch = -0.47;
    this.yaw = -2.58;
    this.speed = 10;
    this.sensitivity = 0.0024;
    this.minFov = 35;
    this.maxFov = 75;
    this.velocity = new THREE.Vector3();
    this.forward = new THREE.Vector3();
    this.right = new THREE.Vector3();
    this.up = new THREE.Vector3(0, 1, 0);
    this.euler = new THREE.Euler(0, 0, 0, "YXZ");
    this.lockButton = document.querySelector("#lockButton");

    this.lockButton.addEventListener("click", () => this.canvas.requestPointerLock());
    document.addEventListener("pointerlockchange", () => {
      const locked = document.pointerLockElement === this.canvas;
      this.lockButton.classList.toggle("hidden", locked);
      if (locked) document.activeElement?.blur();
    });
    document.addEventListener("mousemove", (event) => this.rotate(event));
    canvas.addEventListener("wheel", (event) => this.zoom(event), { passive: false });
    this.applyRotation();
  }

  rotate(event) {
    if (document.pointerLockElement !== this.canvas) return;
    this.yaw -= event.movementX * this.sensitivity;
    this.pitch -= event.movementY * this.sensitivity;
    this.pitch = Math.max(-Math.PI / 2 + 0.02, Math.min(Math.PI / 2 - 0.02, this.pitch));
    this.applyRotation();
  }

  applyRotation() {
    this.euler.set(this.pitch, this.yaw, 0);
    this.camera.quaternion.setFromEuler(this.euler);
  }

  zoom(event) {
    event.preventDefault();
    this.camera.fov = Math.max(this.minFov, Math.min(this.maxFov, this.camera.fov + event.deltaY * 0.035));
    this.camera.updateProjectionMatrix();
  }

  update(input, delta) {
    this.forward.set(0, 0, -1).applyQuaternion(this.camera.quaternion);
    this.forward.y = 0;
    this.forward.normalize();
    this.right.crossVectors(this.forward, this.up).normalize();

    this.velocity.set(0, 0, 0);
    if (input.isDown("KeyW")) this.velocity.add(this.forward);
    if (input.isDown("KeyS")) this.velocity.sub(this.forward);
    if (input.isDown("KeyD")) this.velocity.add(this.right);
    if (input.isDown("KeyA")) this.velocity.sub(this.right);
    if (input.isDown("Space")) this.velocity.y += 1;
    if (input.isDown("ShiftLeft") || input.isDown("ShiftRight")) this.velocity.y -= 1;

    if (this.velocity.lengthSq() > 0) {
      this.velocity.normalize().multiplyScalar(this.speed * delta);
      this.camera.position.add(this.velocity);
    }
  }
}
