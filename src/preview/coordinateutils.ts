import { Point } from "./utils";

/**
 * ```
 *    b
 *   /
 *  /
 * o ---> a
 * ```
 * Get the angle between three points with sign
 * @param a base point
 * @param o center
 * @param b relative point
 */
export function angle(a: Point, o: Point, b: Point): number {
  let oa = a.sub(o);
  let ob = b.sub(o);
  return Math.atan2(oa.clossProd(ob), oa.innerProd(ob));
}

/**
 * Get the scale from rectangle or line pallarel with axis, (o, from) to (o, to)
 */
export function scale(o: Point, from: Point, to: Point): Point {
  return Point.of(
    (to.x - o.x) / (from.x - o.x),
    (to.y - o.y) / (from.y - o.y)
  );
}

