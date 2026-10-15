import { useState, useEffect, useRef } from "react";
import type { PolyLine, Room } from "./types";
import PolyCanvas from "./PolyCanvas";
import PolyToolbar from "./PolyToolbar";
import {
  getDistance,
  isPointInPolygon,
  isLineIntersecting,
  generateRoomColor,
} from "./utils";
import RoomInspector from "./RoomInspector";

/**
 * The main component for the PolyEditor, handling the state and interactions for points, rooms, and undo/redo functionality.
 */
export default function PolyEditor() {
  // State for points, finalPoints, rooms, undo/redo stacks, and error messages
  const [points, setPoints] = useState<PolyLine>([]);
  const [finalPoints, setFinalPoints] = useState<PolyLine[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [prevStates, setPrevStates] = useState<
    { points: PolyLine; finalPoints: PolyLine[]; rooms: Room[] }[]
  >([]);
  const [redoStates, setRedoStates] = useState<
    { points: PolyLine; finalPoints: PolyLine[]; rooms: Room[] }[]
  >([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  // Tracks how far back the last valid state is in the undo stack
  const lastValidIndexRef = useRef<number | null>(null);

  const selectedRoom = selectedRoomId
    ? (rooms.find((room) => room.id === selectedRoomId) ?? null)
    : null;

  const handleUndo = () => {
    // Check if there are previous states to revert to
    if (prevStates.length > 0) {
      // Special handling for invalid states caused by room placement issues
      if (lastValidIndexRef.current !== null) {
        const lastValidIndex = lastValidIndexRef.current;
        const lastState = prevStates[prevStates.length - lastValidIndex];
        setPrevStates((prev) => prev.slice(0, -lastValidIndex));
        // Clear the redo stack to avoid invalid states being redone
        setRedoStates([]);
        lastValidIndexRef.current = null;
        setErrorMessage(null);
        setPoints(lastState.points);
        setFinalPoints(lastState.finalPoints);
        setRooms(lastState.rooms);
        return;
      }
      // Get the last state from the undo stack
      const lastState = prevStates[prevStates.length - 1];
      // Update the undo and redo stacks accordingly
      setPrevStates((prev) => prev.slice(0, -1));
      setRedoStates((prev) => [...prev, { points, finalPoints, rooms }]);
      // Restore the points, finalPoints, and rooms from the last state
      setPoints(lastState.points);
      setFinalPoints(lastState.finalPoints);
      setRooms(lastState.rooms);
    }
  };

  const handleRedo = () => {
    // Check if there are states in the redo stack to revert to
    if (redoStates.length > 0) {
      // Get the last state from the redo stack
      const nextState = redoStates[redoStates.length - 1];
      // Update the redo and undo stacks accordingly
      setRedoStates((prev) => prev.slice(0, -1));
      setPrevStates((prev) => [...prev, { points, finalPoints, rooms }]);
      // Restore the points, finalPoints, and rooms from the next state
      setPoints(nextState.points);
      setFinalPoints(nextState.finalPoints);
      setRooms(nextState.rooms);
    }
  };

  const handleSave = () => {
    // Prepare the data to be saved, including the current points, finalPoints, rooms, and undo/redo states
    const payload = {
      version: 1,
      data: { points, finalPoints, rooms, prevStates, redoStates },
    };

    // Boilerplate code to create a downloadable JSON file
    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "floorplan.json";
    a.click();
    URL.revokeObjectURL(url); // Cleanup
  };

  const handleLoad = () => {
    // Boilerplate code to create a file input for loading a JSON file
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "application/json";

    input.onchange = (e: Event) => {
      // Get the selected file from the input and read its contents
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const result = event.target?.result as string;
          const parsed = JSON.parse(result);

          if (parsed.version === 1) {
            setSelectedRoomId(null);
            setPoints(parsed.data.points || []);
            setFinalPoints(parsed.data.finalPoints || []);
            setRooms(parsed.data.rooms || []);
            setPrevStates(parsed.data.prevStates || []);
            setRedoStates(parsed.data.redoStates || []);
          } else {
            alert("Unsupported file version!");
          }
        } catch (error) {
          alert("Failed to parse save file.");
        }
      };
      reader.readAsText(file);
    };

    input.click();
  };

  const handleClear = () => {
    setPrevStates((prev) => [...prev, { points, finalPoints, rooms }]);
    setRedoStates([]);
    setPoints([]);
    setFinalPoints([]);
    setRooms([]);
    setSelectedRoomId(null);
    setErrorMessage(null);
    lastValidIndexRef.current = null;
  };

  // Effect to handle keyboard shortcuts for undo, redo, save, and load
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Enter" && points.length >= 4) {
        // Save the current state before clearing points
        setPrevStates((prev) => [...prev, { points, finalPoints, rooms }]);
        // Finalize points then clear the points array
        setFinalPoints((prev) => [...prev, points]);
        setPoints([]);
        // Clear any error messages and reset the last valid index when finalizing a line
        setErrorMessage(null);
        lastValidIndexRef.current = null;
      } else if (event.key === "Escape") {
        setSelectedRoomId(null);
        // Save the current state before clearing points
        setPrevStates((prev) => [...prev, { points, finalPoints, rooms }]);
        setPoints([]);
        // Clear any error messages and reset the last valid index when canceling the current line
        setErrorMessage(null);
        lastValidIndexRef.current = null;
      } else if (
        event.key.toLowerCase() === "z" &&
        (event.ctrlKey || event.metaKey)
      ) {
        event.preventDefault();
        // Handle undo/redo based on whether the Shift key is pressed along with Ctrl/Cmd and Z
        if (event.shiftKey) {
          handleRedo();
        } else {
          handleUndo();
        }
      }
    };

    // Add the event listener for keydown events and clean it up on unmount
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [points, finalPoints, rooms, prevStates, redoStates]);

  // Handlers for adding points and rooms, which also manage the undo/redo stacks
  const handlePointAdded = (x: number, y: number) => {
    if (selectedRoom) {
      setSelectedRoomId(null);
      return;
    }
    // Prevent adding a point too close to last point
    if (
      points.length >= 2 &&
      getDistance(
        [x, y],
        [points[points.length - 2], points[points.length - 1]],
      ) < 0.2
    )
      return;
    setPrevStates((prev) => [...prev, { points, finalPoints, rooms }]);
    setRedoStates([]);
    setPoints((prev) => [...prev, x, y]);
    // Clear any error messages and reset the last valid index when adding a new point
    setErrorMessage(null);
    lastValidIndexRef.current = null;
  };

  const handleRoomAdded = (x: number, y: number) => {
    if (lastValidIndexRef.current !== null) return;

    const dynamicColor = generateRoomColor(rooms.length);
    const newRoom: Room = {
      id: `room-${rooms.length + 1}`,
      points: [...points, x, y],
      color: dynamicColor,
      name: `Room ${rooms.length + 1}`,
      roomType: "Other",
    };

    // Check for intersections and containment with existing rooms, and set error messages and last valid index accordingly
    for (let i = 0; i < points.length; i += 2) {
      const p = { x: points[i], y: points[i + 1] };
      const p2 =
        i + 3 < points.length ? { x: points[i + 2], y: points[i + 3] } : null;
      for (const room of rooms) {
        if (p2 && isLineIntersecting(p, p2, room)) {
          lastValidIndexRef.current = (points.length - i) / 2 - 1;
          setErrorMessage(
            `Room creation Failed: Line intersects with room ${room.name ? room.name : room.id}.`,
          );
          return;
        }
        // if (p2 && isLineIntersecting(p, p2, newRoom)) {
        //     lastValidIndexRef.current = (points.length - i) / 2 - 1;
        //     setErrorMessage(`Room creation Failed: Line intersects with the new room.`);
        //     return;
        // }
      }
    }

    // Check if any existing rooms are contained within the new room, and set error messages and last valid index accordingly
    for (const room of rooms) {
      const oldPoint = { x: room.points[0], y: room.points[1] };
      if (isPointInPolygon(oldPoint, newRoom)) {
        lastValidIndexRef.current = 1;
        setErrorMessage(
          `Room creation Failed: ${room.name ? room.name : room.id} is inside the new room.`,
        );
        return;
      }
    }

    setPrevStates((prev) => [...prev, { points, finalPoints, rooms }]);
    setRedoStates([]);
    setRooms((prev) => [...prev, newRoom]);
    setPoints([]);
  };

  const handleRoomSelected = (room: Room) => {
    setSelectedRoomId(room.id);
  };

  // Handler for updating a room's properties, which also manages the undo/redo stacks
  const handleUpdateRoom = (id: string, updates: Partial<Room>) => {
    // Check for actual changes before updating to avoid unnecessary state updates and undo entries
    const currentRoom = rooms.find((room) => room.id === id);
    if (!currentRoom) return;

    const hasChanges = Object.entries(updates).some(([key, value]) => {
      return currentRoom[key as keyof Room] !== value;
    });

    if (!hasChanges) return;

    // Save the current state before applying updates to the room
    setPrevStates((prev) => [...prev, { points, finalPoints, rooms }]);
    setRedoStates([]);

    setRooms((prev) =>
      prev.map((room) => (room.id === id ? { ...room, ...updates } : room)),
    );
  };

  // Effect to load the persisted state from the server when the component mounts
  useEffect(() => {
    const loadPersistedState = async () => {
      try {
        // The public GitHub Pages demo stores each visitor's data in their browser.
        // Local development continues to use the Express persistence server.
        const data = import.meta.env.PROD
          ? JSON.parse(localStorage.getItem("floorplan-editor-state") ?? "null")
          : await (async () => {
              const response = await fetch("/api/load");
              if (!response.ok) throw new Error("Failed to load saved floorplan");
              return response.json();
            })();

        // If the server returns data (meaning a save exists), restore it!
        if (data) {
          // Assuming 'data' is already parsed JSON
          if (data.points) setPoints(data.points);
          if (data.finalPoints) setFinalPoints(data.finalPoints);
          if (data.rooms) setRooms(data.rooms);
          if (data.prevStates) setPrevStates(data.prevStates);
          if (data.redoStates) setRedoStates(data.redoStates);
          console.log("State restored from server!");
        }
      } catch (error) {
        console.error("Failed to load persisted state:", error);
      } finally {
        setIsInitialized(true);
      }
    };

    loadPersistedState();
  }, []);

  // Effect to save the current state to the server whenever relevant state changes occur
  useEffect(() => {
    // Don't save to the server until the initial state has been loaded
    if (!isInitialized) return;

    const saveToServer = async () => {
      const data = { points, finalPoints, rooms, prevStates, redoStates };

      try {
        if (import.meta.env.PROD) {
          localStorage.setItem("floorplan-editor-state", JSON.stringify(data));
          return;
        }

        const response = await fetch("/api/save", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(data),
        });

        if (response.ok) {
          console.log("Floor plan successfully saved to server!");
        }
      } catch (error) {
        console.error("Failed to save to server:", error);
      }
    };

    saveToServer();
  }, [points, finalPoints, rooms, prevStates, redoStates, isInitialized]);

  return (
    <>
      <PolyToolbar
        onUndo={handleUndo}
        canUndo={prevStates.length > 0}
        onRedo={handleRedo}
        canRedo={redoStates.length > 0}
        onSave={handleSave}
        onLoad={handleLoad}
        errorMessage={errorMessage}
        handleClear={handleClear}
      />
      {selectedRoom && (
        <RoomInspector room={selectedRoom} onUpdate={handleUpdateRoom} />
      )}
      <PolyCanvas
        points={points}
        finalPoints={finalPoints}
        rooms={rooms}
        onPointAdded={handlePointAdded}
        onRoomAdded={handleRoomAdded}
        onRoomSelected={handleRoomSelected}
      />
    </>
  );
}
