import * as THREE from "three";

export class TouchOrbitCamera {
  constructor(camera, canvas) {
    this.camera = camera;
    this.canvas = canvas;

    this.target = new THREE.Vector3(0, 2, 0);
    this.distance = 18;
    this.minDistance = 4;
    this.maxDistance = 60;
    this.phi = 1.1;
    this.theta = -0.7;
    this.minPhi = 0.1;
    this.maxPhi = Math.PI / 2 - 0.02;

    this.touches = [];
    this.prevTouchDist = 0;
    this.prevTouchMid = { x: 0, y: 0 };
    this.prevSingleTouch = { x: 0, y: 0 };

    canvas.addEventListener("touchstart", (e) => this.onTouchStart(e), { passive: false });
    canvas.addEventListener("touchmove", (e) => this.onTouchMove(e), { passive: false });
    canvas.addEventListener("touchend", (e) => this.onTouchEnd(e));

    this.applyPosition();
  }

  onTouchStart(event) {
    event.preventDefault();
    this.touches = [...event.touches];
    if (this.touches.length === 1) {
      this.prevSingleTouch = { x: this.touches[0].clientX, y: this.touches[0].clientY };
    } else if (this.touches.length === 2) {
      this.prevTouchDist = this.getTouchDistance(this.touches);
      this.prevTouchMid = this.getTouchMidpoint(this.touches);
    }
  }

  onTouchMove(event) {
    event.preventDefault();
    const touches = [...event.touches];

    if (touches.length === 1) {
      const dx = touches[0].clientX - this.prevSingleTouch.x;
      const dy = touches[0].clientY - this.prevSingleTouch.y;
      this.theta -= dx * 0.005;
      this.phi = Math.max(this.minPhi, Math.min(this.maxPhi, this.phi - dy * 0.005));
      this.prevSingleTouch = { x: touches[0].clientX, y: touches[0].clientY };
    } else if (touches.length === 2) {
      const dist = this.getTouchDistance(touches);
      const mid = this.getTouchMidpoint(touches);

      const pinchDelta = dist / this.prevTouchDist;
      this.distance = Math.max(this.minDistance, Math.min(this.maxDistance, this.distance / pinchDelta));

      const panX = (mid.x - this.prevTouchMid.x) * 0.02;
      const panY = (mid.y - this.prevTouchMid.y) * 0.02;
      const right = new THREE.Vector3();
      right.crossVectors(this.camera.getWorldDirection(new THREE.Vector3()), new THREE.Vector3(0, 1, 0)).normalize();
      this.target.addScaledVector(right, -panX);
      this.target.y += panY;

      this.prevTouchDist = dist;
      this.prevTouchMid = mid;
    }

    this.applyPosition();
  }

  onTouchEnd(_event) {
    this.touches = [];
  }

  getTouchDistance(touches) {
    const dx = touches[0].clientX - touches[1].clientX;
    const dy = touches[0].clientY - touches[1].clientY;
    return Math.sqrt(dx * dx + dy * dy);
  }

  getTouchMidpoint(touches) {
    return {
      x: (touches[0].clientX + touches[1].clientX) / 2,
      y: (touches[0].clientY + touches[1].clientY) / 2,
    };
  }

  applyPosition() {
    const x = this.target.x + this.distance * Math.sin(this.phi) * Math.sin(this.theta);
    const y = this.target.y + this.distance * Math.cos(this.phi);
    const z = this.target.z + this.distance * Math.sin(this.phi) * Math.cos(this.theta);
    this.camera.position.set(x, y, z);
    this.camera.lookAt(this.target);
  }

  update() {
    // no-op, position is updated in touch handlers
  }
}
