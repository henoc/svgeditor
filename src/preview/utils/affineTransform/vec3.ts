export type Vec3 = [number, number, number];

export function innerProd(v1: Vec3, v2: Vec3): number {
  return v1[0] * v2[0] + v1[1] * v2[1] + v1[2] * v2[2];
}
