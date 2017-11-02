// import {Affine, Vec3} from "../affine";
// import {Point} from "../utils";

// describe("affine", () => {
//   it("mulVec", () => {
//     let affine = new Affine(
//       [2, 0, 0],
//       [0, 1, 0]
//     );
//     let v: Vec3 = [1, 1, 1];
//     expect(affine.mulVec(v)).toEqual([2, 1, 1]);
    
//     let affine2 = new Affine(
//       [2, 0, -2],
//       [0, 1, 0]
//     );
//     let w: Vec3 = [1, 1, 1];
//     expect(affine2.mulVec(w)).toEqual([0, 1, 1]);
//   });

//   it("scale", () => {
//     let scale = Affine.scale(Point.of(2, 1), Point.of(0, 0));
//     expect(scale.mulVec([1, 1, 1])).toEqual([2, 1, 1]);
//     let scale2 = Affine.scale(Point.of(2, 1), Point.of(2, 0));
//     expect(scale2.mulVec([1, 1, 1])).toEqual([0, 1, 1]);
//   });
// });