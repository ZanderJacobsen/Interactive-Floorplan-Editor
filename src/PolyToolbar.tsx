import "./App.css";

interface PolyToolbarProps {
  onUndo: () => void;
  canUndo: boolean;
  onRedo: () => void;
  canRedo: boolean;
  onSave: () => void;
  onLoad: () => void;
  errorMessage: string | null;
  handleClear: () => void;
}

/**
 * PolyToolbar component provides a user interface for undo, redo, save, and load actions.
 * It also displays the application title and usage hints.
 */
export default function PolyToolbar({ onUndo, canUndo, onRedo, canRedo, onSave, onLoad, errorMessage, handleClear }: PolyToolbarProps) {
  return (
    <div className="toolbar">
      <div className="toolbar-left">
        <span className="app-title">Interactive Floorplan Editor</span>
        <span className="toolbar-hint">
          Click to place points &middot; Enter to finish &middot; Escape to cancel
        </span>
      </div>

      {errorMessage && (
        <div
          key={errorMessage}
          className="toolbar-error"
        >
          {errorMessage}
        </div>
      )}

      <div className="toolbar-right">
        <button onClick={handleClear} title="Clear all">Clear</button>
        <button onClick={onUndo} disabled={!canUndo} title="(Ctrl+Z or Cmd+Z)">Undo</button>
        <button onClick={onRedo} disabled={!canRedo} title="(Ctrl+Shift+Z or Cmd+Shift+Z)">Redo</button>
        <button onClick={onSave} title="Save to file">Save</button>
        <button onClick={onLoad} title="Load from file">Load</button>
      </div>
    </div>
  );
}
