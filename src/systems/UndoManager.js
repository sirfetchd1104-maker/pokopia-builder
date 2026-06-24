export class UndoManager {
  constructor(maxHistory = 200) {
    this.undoStack = [];
    this.redoStack = [];
    this.maxHistory = maxHistory;
  }

  push(action) {
    this.undoStack.push(action);
    this.redoStack = [];
    if (this.undoStack.length > this.maxHistory) {
      this.undoStack.shift();
    }
  }

  undo() {
    const action = this.undoStack.pop();
    if (!action) return null;
    this.redoStack.push(action);
    return { added: action.removed, removed: action.added };
  }

  redo() {
    const action = this.redoStack.pop();
    if (!action) return null;
    this.undoStack.push(action);
    return { added: action.added, removed: action.removed };
  }

  clear() {
    this.undoStack = [];
    this.redoStack = [];
  }

  get canUndo() {
    return this.undoStack.length > 0;
  }

  get canRedo() {
    return this.redoStack.length > 0;
  }

  get undoCount() {
    return this.undoStack.length;
  }

  get redoCount() {
    return this.redoStack.length;
  }
}
