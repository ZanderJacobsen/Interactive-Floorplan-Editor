/**
 * A PolyLine is a number array of interleaved 2D coordinates: [x1, y1, x2, y2, ...].
 * Consecutive coordinate pairs are connected by straight line segments when rendered.
 */
export type PolyLine = number[];
export interface Room {
  id: string;
  points: PolyLine;
  color: string;
  name?: string;
  roomType?: string;
}
