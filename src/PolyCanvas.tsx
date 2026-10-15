import { useRef, useState } from "react";
import type { PolyLine, Room } from "./types";
import { Canvas, type ThreeEvent } from "@react-three/fiber";
import { useFormatPoints, getDistance, snapToAngle } from "./utils";
import * as THREE from 'three';
import { Line, Points, Point, Ring, Html } from "@react-three/drei";

const PREVIEW_COLOR = 0x71717a;
const LINE_COLOR = 0xd4d4d8;
const POINT_COLOR = 0xfafafa;
const POINT_SIZE = 4;
const SNAP_DISTANCE = 0.75;

interface PolyCanvasProps {
  points: PolyLine;
  finalPoints: PolyLine[];
  rooms: Room[];
  onPointAdded: (x: number, y: number) => void;
  onRoomAdded: (x: number, y: number) => void;
  onRoomSelected: (room: Room) => void;
}

/** * PolyLineMesh component renders a line connecting a series of points in 3D space.
 * @param points - A flat array of 2D coordinates representing the points to connect.
 */
export function PolyLineMesh({ points }: { points: PolyLine }) {
  const pairedPoints = useFormatPoints(points);

  return (pairedPoints.length < 2 ? null :
    <Line
      points={pairedPoints}
      color={LINE_COLOR}
    />
  );
}

/** * VerticesMesh component renders points at the specified coordinates in 3D space.
 * @param points - A flat array of 2D coordinates representing the points to render.
 */
export function VerticesMesh({ points }: { points: PolyLine }) {
  const pairedPoints = useFormatPoints(points);

  return (pairedPoints.length === 0 ? null :
    <Points>
      <pointsMaterial
        color={POINT_COLOR}
        size={POINT_SIZE}
        sizeAttenuation={false}
        depthTest={false}
      />

      {pairedPoints.map((coord, index) => (
        <Point
          key={index}
          position={coord}
        />
      ))}
    </Points>
  );
}

/** * RoomMesh component renders a filled polygon representing a room, along with its outline.
 * @param room - An object containing the room's points and color.
 * @param onRoomSelected - A callback function to handle room selection.
 */
export function RoomMesh({ room, onRoomSelected }: { room: Room; onRoomSelected: (room: Room) => void; }) {
  // State to control visibility
  const [showTooltip, setShowTooltip] = useState(false);
  const hoverTimer = useRef<number | null>(null);
  const latestPos = useRef<{ x: number; y: number } | null>(null);
  const MousePos = useRef<{ x: number; y: number } | null>(null);
  // Create a new THREE.Shape to represent the room's polygon
  const shape = new THREE.Shape();
  shape.moveTo(room.points[0], room.points[1]);

  for (let i = 2; i < room.points.length; i += 2) {
    shape.lineTo(room.points[i], room.points[i + 1]);
  }
  shape.closePath();

// The event handlers for tooltip
  const handlePointerOver = () => {
    hoverTimer.current = window.setTimeout(() => {
      setShowTooltip(true);
    }, 500);
  };

  const handlePointerOut = () => {
    if (hoverTimer.current !== null) clearTimeout(hoverTimer.current);
    latestPos.current = null;
    setShowTooltip(false);
  };

  const handleMove = (event: ThreeEvent<MouseEvent>) => {
    MousePos.current = { x: event.point.x, y: event.point.y };
  };

  if(!latestPos.current && showTooltip) latestPos.current = MousePos.current;

  return (
    <group>
      <mesh 
        onPointerDown={(e) => { e.stopPropagation(); onRoomSelected(room); }}
        onPointerMove={handleMove}
        onPointerOver={handlePointerOver} 
        onPointerOut={handlePointerOut}
      >
        <shapeGeometry args={[shape]} />
        <meshBasicMaterial color={room.color} transparent opacity={0.3} />
        {showTooltip && room.name && (
        <Html
          zIndexRange={[100, 0]} 
          // Prevents the HTML overlay from blocking
          style={{ pointerEvents: "none" }}
          position={latestPos.current ? [latestPos.current.x, latestPos.current.y + 0.5, 0] : [0, 0, 0]}
        >
          <div className="room-tooltip">
            {room.name}
          </div>
        </Html>
      )}
      </mesh>
      <PolyLineMesh points={room.points} />
    </group>
  );
}

/** * PolyCanvas component provides a 3D canvas for rendering points, lines, and rooms.
 * It handles user interactions for adding points and rooms, as well as snapping to the starting point.
 */
export default function PolyCanvas({ points, finalPoints, rooms, onPointAdded, onRoomAdded, onRoomSelected }: PolyCanvasProps) {
  const [mousePos, setMousePos] = useState<{ x: number; y: number } | null>(null);

  const handlePlaneClick = (event: ThreeEvent<MouseEvent>) => {
    event.stopPropagation();
    const { x, y } = event.point;

    if (startPoint && isSnappable) onRoomAdded(startPoint[0], startPoint[1]);
    else if (event.shiftKey && lastPoint) {
      const snapped = snapToAngle(
        { x: lastPoint[0], y: lastPoint[1] },
        { x, y }
      );
      onPointAdded(snapped.x, snapped.y);
    } else {
      onPointAdded(x, y);
    }
  };

  const handlePlaneMove = (event: ThreeEvent<MouseEvent>) => {
    const { x, y } = event.point;

    // Check if Shift is held AND we have an active line started
    if (event.shiftKey && lastPoint) {
      const snapped = snapToAngle(
        { x: lastPoint[0], y: lastPoint[1] },
        { x, y }
      );
      setMousePos({ x: snapped.x, y: snapped.y });
    } else {
      setMousePos({ x, y });
    }
  };

  // Only determine startPoint when there are at least 3 points (6 values) to form a polygon
  const startPoint = points.length >= 6 ? [points[0], points[1]] as [number, number] : null;
  const lastPoint = points.length >= 2 ? [points[points.length - 2], points[points.length - 1]] as [number, number] : null;
  // Calculate the distance from the current mouse position to the starting point, if both are defined
  const distToStart = mousePos && startPoint
    ? getDistance(startPoint, [mousePos.x, mousePos.y])
    : null;

  // Determine if the current mouse position is within snapping distance of the starting point
  const isSnappable = distToStart !== null && distToStart < SNAP_DISTANCE;
  const snapRadius = distToStart !== null ?
    distToStart >= SNAP_DISTANCE * 3 ? 0 : distToStart > SNAP_DISTANCE * 2 ?
      3 * SNAP_DISTANCE - distToStart : SNAP_DISTANCE : 0;
  // Calculate the inner radius for the snapping ring
  const snapInnerRadius = distToStart ? distToStart > SNAP_DISTANCE * 2 ? snapRadius * 7 / 8 :
    distToStart <= SNAP_DISTANCE ? 0 : snapRadius * Math.min(((distToStart - SNAP_DISTANCE) / (SNAP_DISTANCE)), 7 / 8) : 0;

  return (
    <div style={{ width: "100%", height: "100vh" }}>
      <Canvas orthographic camera={{ position: [0, 0, 10], zoom: 50 }}>
        {startPoint && snapRadius > 0 && (
          <Ring
            position={[startPoint[0], startPoint[1], 0.01]}
            args={[snapInnerRadius, snapRadius, 32]}
          >
            <meshBasicMaterial color={POINT_COLOR} transparent opacity={0.5} />
          </Ring>
        )}
        <VerticesMesh points={points} />
        <PolyLineMesh points={points} />
        {finalPoints.map((pts, idx) => (
          <group key={idx}>
            <VerticesMesh points={pts} />
            <PolyLineMesh points={pts} />
          </group>
        ))}
        {rooms.map(room => (
          <RoomMesh key={room.id} room={room} onRoomSelected={onRoomSelected} />
        ))}
        {lastPoint && mousePos && (
          <Line
            points={[[lastPoint[0], lastPoint[1], 0], isSnappable && startPoint ? [startPoint[0], startPoint[1], 0] : [mousePos.x, mousePos.y, 0]]}
            color={PREVIEW_COLOR}
            dashed={true}
            dashSize={0.1}
            gapSize={0.1}
          />
        )}
        <mesh position={[0, 0, -1]} onPointerDown={handlePlaneClick} onPointerMove={handlePlaneMove} onPointerOut={() => setMousePos(null)}>
          <planeGeometry args={[100, 100]} /> {/* Large invisible plane to capture clicks */}
          <meshBasicMaterial visible={false} /> {/* Invisible material */}
        </mesh>
      </Canvas>
    </div>
  );
}