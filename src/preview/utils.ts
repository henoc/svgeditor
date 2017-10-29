class Point {
  constructor(public x: number, public y: number) {}
  static of(x: number, y :number): Point {
    return new Point(x, y);
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
}

function uuid(): string {
  const S4 = () => {
    return (((1 + Math.random()) * 0x10000) | 0).toString(16).substring(1);
  }
  return (S4() + S4() + "-" + S4() + "-" + S4() + "-" + S4() + "-" + S4() + S4() + S4());
}

type Direction = "left" | "up" | "right" | "down";

function dirSwitch(dir: Direction, left: () => void, right: () => void, up: () => void, down: () => void): void {
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