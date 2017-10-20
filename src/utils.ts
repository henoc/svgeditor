// /**
//  * Traverse all elements of `elem`.
//  * @param fn function for each elements.
//  */
// export function traverse(node: any, fn: (key: string, value: any) => void): void {
//   forEach<any>(node, (key, value) => {
//     fn(key, value);
//     if (typeof value === "object") {
//       traverse(value, fn);
//     }
//   })
// }

// /**
//  * 連想配列用 `forEach`
//  */
// export function forEach<T>(aary: { [index: string]: T }, fn: (key: string, value: T) => void): void {
//   if (aary === undefined) return;
//   Object.keys(aary).forEach((key) => {
//     fn(key, aary[key]);
//   });
// }


export class Point {
  private _x: number
  private _y: number
  constructor(x: number, y: number) {
    this._x = x;
    this._y = y;
  }

  get x(): number {
    return this._x;
  }
  get y(): number {
    return this._y;
  }
}
