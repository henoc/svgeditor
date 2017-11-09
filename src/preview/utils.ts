export class Point {
  constructor(public x: number, public y: number) {}
  static of(x: number, y: number): Point {
    return new Point(x, y);
  }
  static fromArray(array: number[]): Point {
    return new Point(array[0], array[1]);
  }
  toArray(): number[] {
    return [this.x, this.y];
  }
  toStr(sep: string): string {
    return `${this.x}${sep}${this.y}`;
  }
  abs(): number {
    return Math.sqrt(this.x * this.x + this.y * this.y);
  }
  abs2(): Point {
    return Point.of(Math.abs(this.x), Math.abs(this.y));
  }
  add(that: Point): Point {
    return Point.of(
      this.x + that.x,
      this.y + that.y
    );
  }
  addxy(x: number, y: number): Point {
    return Point.of(
      this.x + x,
      this.y + y
    );
  }
  sub(that: Point): Point {
    return Point.of(
      this.x - that.x,
      this.y - that.y
    );
  }
  subxy(x: number, y: number): Point {
    return Point.of(
      this.x - x,
      this.y - y
    );
  }
  div(that: Point): Point {
    return Point.of(this.x / that.x, this.y / that.y);
  }
  innerProd(that: Point): number {
    return this.x * that.x + this.y * that.y;
  }
  clossProd(that: Point): number {
    return this.x * that.y - this.y * that.x;
  }
}

export function uuid(): string {
  const S4 = () => {
    // tslint:disable-next-line
    return (((1 + Math.random()) * 0x10000) | 0).toString(16).substring(1);
  };
  return (S4() + S4() + "-" + S4() + "-" + S4() + "-" + S4() + "-" + S4() + S4() + S4());
}

export type Direction = "left" | "up" | "right" | "down";

export function dirSwitch(dir: Direction, left: () => void, right: () => void, up: () => void, down: () => void): void {
  switch (dir) {
    case "left":
      return left();
    case "right":
      return right();
    case "up":
      return up();
    case "down":
      return down();
  }
}

export function reverse(dir: Direction) {
  switch (dir) {
    case "left":
      return "right";
    case "right":
      return "left";
    case "up":
      return "down";
    case "down":
      return "up";
  }
}

export function equals(strs1: string[], strs2: string[]): boolean {
  if (strs1.length !== strs2.length) return false;
  let sorted1 = strs1.sort();
  let sorted2 = strs2.sort();
  for (let i = 0; i < strs1.length; i++) {
    if (sorted1[i] !== sorted2[i]) return false;
  }
  return true;
}

export function withDefault<T>(value: T | undefined, defaultValue: T): T {
  if (value === undefined) return defaultValue;
  else return value;
}
