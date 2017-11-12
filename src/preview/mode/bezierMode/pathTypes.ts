export type Path = (M | L | H | V | C | S | Q | T | A | Z)[];

export type M = ["M", number, number];
export type L = ["L", number, number];
export type H = ["H", number];
export type V = ["V", number];
export type C = ["C", number, number, number, number, number, number];
export type S = ["S", number, number, number, number];
export type Q = ["Q", number, number, number, number];
export type T = ["T", number, number];
export type A = ["A", number, number, number, number, number, number, number];
export type Z = ["Z"];
