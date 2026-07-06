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

    // Gesture detection
    this.touchStartTime = 0;
    this.touchStartPos = { x: 0, y: 0 };
    this.isSingleDragging = false;
    this.longPressTimer = null;

    // Callbacks (set from main.js)
    this.onTap = null;
    this.onLongPress = null;
    this.onCameraMove = null;

    // Thresholds
    this.TAP_MAX_TIME = 200;
    this.DRAG_THRESHOLD = 10;
    this.LONG_PRESS_TIME = 400;

    canvas.addEventListener("touchstart", (e) => this.onTouchStart(e), { passive: false });
    canvas.addEventListener("touchmove", (e) => this.onTouchMove(e), { passive: false });
    canvas.addEventListener("touchend", (e) => this.onTouchEnd(e));

    this.applyPosition();
  }

  onTouchStart(event) {
    event.preventDefault();
    this.touches = [...event.touches];

    if (this.touches.length === 1) {
      const touch = this.touches[0];
      this.prevSingleTouch = { x: touch.clientX, y: touch.clientY };
      this.touchStartTime = performance.now();
      this.touchStartPos = { x: touch.clientX, y: touch.clientY };
      this.isSingleDragging = false;

      clearTimeout(this.longPressTimer);
      this.longPressTimer = setTimeout(() => {
        if (!this.isSingleDragging && this.touches.length === 1) {
          if (this.onLongPress) this.onLongPress();
          this.longPressTimer = null;
        }
      }, this.LONG_PRESS_TIME);
    } else if (this.touches.length === 2) {
      clearTimeout(this.longPressTimer);
      this.longPressTimer = null;
      this.prevTouchDist = this.getTouchDistance(this.touches);
      this.prevTouchMid = this.getTouchMidpoint(this.touches);
    }
  }

  onTouchMove(event) {
    event.preventDefault();
    const touches = [...event.touches];

    if (touches.length === 1) {
      const dx = touches[0].clientX - this.touchStartPos.x;
      const dy = touches[0].clientY - this.touchStartPos.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (!this.isSingleDragging && dist > this.DRAG_THRESHOLD) {
        this.isSingleDragging = true;
        clearTimeout(this.longPressTimer);
        this.longPressTimer = null;
      }

      if (this.isSingleDragging) {
        const moveDx = touches[0].clientX - this.prevSingleTouch.x;
        const moveDy = touches[0].clientY - this.prevSingleTouch.y;
        this.theta -= moveDx * 0.005;
        this.phi = Math.max(this.minPhi, Math.min(this.maxPhi, this.phi - moveDy * 0.005));
        this.prevSingleTouch = { x: touches[0].clientX, y: touches[0].clientY };
        this.applyPosition();
        if (this.onCameraMove) this.onCameraMove();
      }
    } else if (touches.length === 2) {
      const dist = this.getTouchDistance(touches);

      const pinchDelta = dist / this.prevTouchDist;
      this.distance = Math.max(this.minDistance, Math.min(this.maxDistance, this.distance / pinchDelta));

      this.prevTouchDist = dist;
      this.applyPosition();
      if (this.onCameraMove) this.onCameraMove();
    }
  }

  onTouchEnd(event) {
    clearTimeout(this.longPressTimer);
    this.longPressTimer = null;

    if (event.touches.length === 0 && this.touches.length === 1) {
      const elapsed = performance.now() - this.touchStartTime;
      if (!this.isSingleDragging && elapsed < this.TAP_MAX_TIME) {
        if (this.onTap) this.onTap();
      }
    }

    this.touches = [...event.touches];
    this.isSingleDragging = false;
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
