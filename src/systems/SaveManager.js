export class SaveManager {
  constructor(blockManager) {
    this.blockManager = blockManager;
  }

  download() {
    const data = this.blockManager.serialize();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `pokopia-build-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
  }

  async loadFile(file) {
    if (!file) return;
    const text = await file.text();
    const data = JSON.parse(text);
    this.blockManager.load(data);
  }
}
