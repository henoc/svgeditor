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
  sub(that: Point): Point {
    return Point.of(
      this.x - that.x,
      this.y - that.y
    );
  }
}