import { useEffect, useRef, useState } from "react";
import type { Room } from './types';

interface InspectorProps {
    room: Room;
    onUpdate: (id: string, updates: Partial<Room>) => void;
}

const ROOM_TYPES = [
    "Living Room",
    "Bedroom",
    "Kitchen",
    "Bathroom",
    "Dining Room",
    "Office",
    "Garage",
    "Hallway",
    "Other"
];

// Standard debounce duration for input updates
const DEBOUNCE_MS = 300;

/**
 * RoomInspector component provides an interface for editing the properties of a selected room.
 * It includes debounced input handling for the room name.
 */
export default function RoomInspector({ room, onUpdate }: InspectorProps) {
    // Local state for the room name input, allowing for debounced updates
    const [draftName, setDraftName] = useState(room.name || "");
    const debounceTimerRef = useRef<number | null>(null);
    const pendingNameRef = useRef<{ roomId: string; value: string } | null>(null);
    const onUpdateRef = useRef(onUpdate);

    // Sync local draft name with room name when the room changes
    useEffect(() => {
        onUpdateRef.current = onUpdate;
    }, [onUpdate]);

    // Clear any pending debounce timers
    const clearNameTimer = () => {
        if (debounceTimerRef.current !== null) {
            window.clearTimeout(debounceTimerRef.current);
            debounceTimerRef.current = null;
        }
    };

    const flushNameUpdate = () => {
        clearNameTimer();

        const pending = pendingNameRef.current;
        if (!pending) return;

        pendingNameRef.current = null;
        onUpdateRef.current(pending.roomId, { name: pending.value });
    };

    useEffect(() => {
        // If the user switches rooms while a debounce is pending,
        // commit the previous room's draft before showing the next room.
        flushNameUpdate();
        setDraftName(room.name || "");
    }, [room.id, room.name]);

    // Cleanup on unmount to ensure any pending updates are committed
    useEffect(() => {
        return () => {
            flushNameUpdate();
        };
    }, []);

    const scheduleNameUpdate = (nextName: string) => {
        setDraftName(nextName);

        pendingNameRef.current = {
            roomId: room.id,
            value: nextName
        };

        clearNameTimer();

        debounceTimerRef.current = window.setTimeout(() => {
            flushNameUpdate();
        }, DEBOUNCE_MS);
    };

    return (
        <div className="inspector-drawer">
            <h3>Room Inspector</h3>

            <label>Room Name</label>
            <input
                value={draftName}
                onChange={(e) => scheduleNameUpdate(e.target.value)}
                onBlur={flushNameUpdate}
            />

            <label>Room Type</label>
            <select
                value={room.roomType || "Other"}
                onChange={(e) => onUpdate(room.id, { roomType: e.target.value })}
            >
                {ROOM_TYPES.map(name => (
                    <option key={name} value={name}>{name}</option>
                ))}
            </select>
        </div>
    );
}