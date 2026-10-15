import { useMemo } from "react";
import type { PolyLine, Room } from "./types";


/**
 * Calculates the Euclidean distance between two 2D points.
 * @param p1 - The first point as a tuple [x, y].
 * @param p2 - The second point as a tuple [x, y].
 * @returns The Euclidean distance between the two points.
 */

export const getDistance = (p1: [number, number], p2: [number, number]) => {
  return Math.hypot(p1[0] - p2[0], p1[1] - p2[1]);
}

/**
 * Formats a flat array of 2D coordinates into an array of 3D coordinates for rendering.
 * @param flatPoints - A flat array of 2D coordinates representing points.
 * @returns An array of 3D coordinates with z set to 0.
 */
export const useFormatPoints = (flatPoints: PolyLine) => {
  return useMemo(() => {
    const paired: [number, number, number][] = [];
    for (let i = 0; i < flatPoints.length; i += 2) {
      // Push each pair of coordinates as a 3D point with z=0
      paired.push([flatPoints[i], flatPoints[i + 1], 0]);
    }
    return paired;
  }, [flatPoints]);
}

/**
 * Generates a visually distinct color based on the index using the golden ratio to stagger hues.
 * @param index - The index to generate a color for.
 * @returns A string representing the color in HSL format.
 */
export const generateRoomColor = (index: number): string => {
    // The golden ratio conjugate to generate visually distinct colors
    const goldenRatio = 0.618033988749895;
    const hue = (index * goldenRatio) % 1;

    // Convert to a CSS HSL string.
    return `hsl(${Math.round(hue * 360)}, 70%, 60%)`;
}

/**
 * Determines if three points A, B, and C are listed in a counterclockwise order.
 * @param A - The first point with x and y coordinates.
 * @param B - The second point with x and y coordinates.
 * @param C - The third point with x and y coordinates.
 * @returns True if the points are in counterclockwise order, false otherwise.
 */

export const ccw = (A: { x: number, y: number }, B: { x: number, y: number }, C: { x: number, y: number }) => {
    return (C.y - A.y) * (B.x - A.x) > (B.y - A.y) * (C.x - A.x);
};

/**
 * Determines if two line segments AB and CD intersect.
 * @param A - The startpoint of the first segment with x and y coordinates.
 * @param B - The endpoint of the first segment with x and y coordinates.
 * @param C - The startpoint of the second segment with x and y coordinates.
 * @param D - The endpoint of the second segment with x and y coordinates.
 * @returns True if the segments intersect, false otherwise.
 */

const doSegmentsIntersect = (
    A: { x: number, y: number },
    B: { x: number, y: number },
    C: { x: number, y: number },
    D: { x: number, y: number }
) => {
    return ccw(A, C, D) !== ccw(B, C, D) && ccw(A, B, C) !== ccw(A, B, D);
};

/** Determines if a line segment CD intersects with any edge of a given room.
 * @param C - The startpoint of the segment with x and y coordinates.
 * @param D - The endpoint of the segment with x and y coordinates.
 * @param room - The room object containing its vertices as a flat array of coordinates.
 * @returns True if the segment intersects with any edge of the room, false otherwise.
 */
export const isLineIntersecting = (C: { x: number, y: number }, D: { x: number, y: number }, room: Room) => {
    for (let i = 0; i < room.points.length - 2; i += 2) {
        const A = { x: room.points[i], y: room.points[i + 1] };
        const B = { x: room.points[i + 2], y: room.points[i + 3] };
        if (doSegmentsIntersect(A, B, C, D)) {
            return true;
        }
    }
    return false;
};

/** Determines if a point is inside a given polygon (room) using the ray-casting algorithm.
 * @param point - The point with x and y coordinates.
 * @param room - The room object containing its vertices as a flat array of coordinates.
 * @returns True if the point is inside the polygon, false otherwise.
 */
export const isPointInPolygon = (point: { x: number, y: number }, room: Room) => {
    let isInside = false;
    for (let i = 0, j = room.points.length - 2; i < room.points.length; j = i, i += 2) {
        const xi = room.points[i], yi = room.points[i + 1];
        const xj = room.points[j], yj = room.points[j + 1];

        const intersect = ((yi > point.y) !== (yj > point.y)) &&
            (point.x < (xj - xi) * (point.y - yi) / (yj - yi) + xi);

        if (intersect) isInside = !isInside;
    }
    return isInside;
};

/** Snaps a point to the nearest angle increment from a starting point.
 * @param start - The starting point with x and y coordinates.
 * @param mouse - The current mouse position with x and y coordinates.
 * @param snapAngleRadians - The angle increment in radians to snap to (default is Pi/8).
 * @returns The snapped point with x and y coordinates.
 */

export function snapToAngle(
    start: { x: number, y: number }, 
    mouse: { x: number, y: number },
    snapAngleRadians: number = Math.PI / 8
): { x: number, y: number } {
    // Calculate the delta between the mouse and the start point
    const dx = mouse.x - start.x;
    const dy = mouse.y - start.y;

    // Find the raw distance and angle
    const distance = Math.sqrt(dx * dx + dy * dy);
    const angle = Math.atan2(dy, dx);

    // Round the angle to the nearest multiple of Pi/8
    const snappedAngle = Math.round(angle / snapAngleRadians) * snapAngleRadians;

    // Project the new coordinates using the snapped angle and original distance
    return {
        x: start.x + distance * Math.cos(snappedAngle),
        y: start.y + distance * Math.sin(snappedAngle)
    };
}