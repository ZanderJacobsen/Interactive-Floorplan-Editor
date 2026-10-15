# Higharc Studio Lite

Higharc Studio Lite is a small floor-plan editor built with React, TypeScript, Three.js, React Three Fiber, and a lightweight Express persistence server.

The app started as a simple 2D polyline drawing prototype and now supports closed-room detection, overlap validation, room metadata editing, undo/redo, file import/export, and local server-backed persistence.

## Features

### Drawing

- Click the canvas to place points.
- Press **Enter** to finish an open polyline.
- Press **Escape** to cancel the active polyline or deselect the current room.
- Hold **Shift** while drawing to snap the next segment to fixed angle increments.
- Move near the first point of a valid in-progress polygon to show the endpoint snap target.
- Click while snapped to close the polygon and create a room.

### Rooms

- Closed polylines are converted into filled rooms with distinct translucent colors.
- Open polylines remain visible as line work and do not receive a fill.
- New rooms are rejected if they overlap or contain existing rooms.
- Room creation failures are shown in the toolbar.
- Hovering over a named room shows a small tooltip.

### Room Inspector

- Click a room to open the Room Inspector.
- Edit the room name and room type from the inspector panel.
- Room metadata is saved with the document and restored on load.
- Metadata edits participate in undo/redo.

### Undo, Redo, Save, and Load

- Undo and redo are available through toolbar buttons.
- Keyboard shortcuts are supported:
  - **Ctrl/Cmd + Z**: Undo
  - **Ctrl/Cmd + Shift + Z**: Redo
- Save exports the full document state to a JSON file.
- Load imports a previously exported JSON file.
- Undo and redo history are included in saved files and server persistence.

### Local Persistence

- The Express server stores the latest document state in `server/db.json`.
- On app startup, the editor attempts to restore the last persisted state.
- Changes to points, rooms, metadata, and history are saved back to the server after initialization.

## Project Structure

```txt
higharc-studio-lite/
├── public/                  Static assets
├── server/
│   ├── db.json              Local JSON persistence file, generated/updated by the server
│   └── index.js             Express API for loading and saving document state
├── src/
│   ├── App.tsx              App shell
│   ├── PolyEditor.tsx       Main editor state, undo/redo, save/load, persistence, room validation
│   ├── PolyCanvas.tsx       Three.js canvas rendering and drawing interactions
│   ├── PolyToolbar.tsx      Toolbar controls and error display
│   ├── RoomInspector.tsx    Selected-room metadata editor
│   ├── types.ts             Shared PolyLine and Room types
│   └── utils.ts             Geometry, snapping, color, and rendering helpers
├── INSTRUCTIONS.md          Assignment prompt and acceptance criteria
├── README.md                Project documentation
└── package.json             Frontend and dependency configuration
```

## Local Development

Install dependencies:

```bash
npm install
```

Start the persistence server in one terminal:

```bash
npm run server
```

Start the Vite dev server in another terminal:

```bash
npm run dev
```

Open the URL printed by Vite, usually:

```txt
http://localhost:5173
```

The client calls `/api/load` and `/api/save`. During local development, those API requests are routed to the Express server running on port `3000`.

## Build and Preview

Create a production build:

```bash
npm run build
```

Preview the built frontend:

```bash
npm run preview
```

For a deployed version, serve the built frontend and the Express API together or configure the frontend host to route `/api/*` requests to the Express server.

## API

### `GET /api/load`

Loads the latest persisted document state.

Responses:

- `200` with the saved document state when `server/db.json` exists.
- `200` with `null` when no saved state exists yet.
- `500` if the file cannot be read or parsed.

Example response:

```json
{
  "points": [],
  "finalPoints": [],
  "rooms": [
    {
      "id": "room-1",
      "points": [0, 0, 4, 0, 4, 3, 0, 3, 0, 0],
      "color": "hsl(0, 70%, 60%)",
      "name": "Kitchen",
      "roomType": "Kitchen"
    }
  ],
  "prevStates": [...],
  "redoStates": []
}
```

### `POST /api/save`

Persists the current document state to `server/db.json`.

Request body:

```json
{
  "points": [],
  "finalPoints": [],
  "rooms": [],
  "prevStates": [],
  "redoStates": []
}
```

Responses:

- `200` with `{ "message": "State saved successfully" }` on success.
- `500` if the state cannot be written.

## Data Model

A `PolyLine` is a flat array of interleaved 2D coordinates:

```ts
type PolyLine = number[]; // [x1, y1, x2, y2, ...]
```

A `Room` stores the closed polygon points plus visual and editable metadata:

```ts
interface Room {
  id: string;
  points: PolyLine;
  color: string;
  name?: string;
  roomType?: string;
}
```

The persisted editor state includes active drawing points, completed open polylines, closed rooms, and undo/redo stacks.

## Notes and Tradeoffs

- The backend is intentionally thin. It provides local persistence only and is not intended as a production database layer.
- Geometry validation uses segment intersection and point-in-polygon checks to reject overlapping rooms to handle Convex and Concave Polygons.
- Undo/redo stores full editor snapshots. This keeps the implementation simple and makes it easy to persist history, at the cost of larger state objects as documents grow.
- The file export format includes a version field so future save formats can be migrated without breaking older files.
