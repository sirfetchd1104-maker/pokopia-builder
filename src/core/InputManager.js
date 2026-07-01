export class InputManager {
  constructor(canvas) {
    this.canvas = canvas;
    this.keys = new Set();
    this.onPrimaryAction = () => {};
    this.onSecondaryAction = () => {};

    window.addEventListener("keydown", (event) => {
      if (event.code === "Tab") event.preventDefault();
      if ((event.ctrlKey || event.metaKey) && (event.code === "KeyC" || event.code === "KeyV")) return;
      if (isTyping()) return;
      this.keys.add(event.code);
    });
    window.addEventListener("keyup", (event) => this.keys.delete(event.code));
    window.addEventListener("blur", () => this.keys.clear());

    canvas.addEventListener("contextmenu", (event) => event.preventDefault());
    canvas.addEventListener("mousedown", (event) => {
      if (document.pointerLockElement !== canvas) {
        canvas.requestPointerLock();
        return;
      }

      if (event.button === 0) this.onPrimaryAction();
      if (event.button === 2) this.onSecondaryAction();
    });
  }

  isDown(code) {
    return this.keys.has(code);
  }
}

function isTyping() {
  const tag = document.activeElement?.tagName;
  return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT";
}
