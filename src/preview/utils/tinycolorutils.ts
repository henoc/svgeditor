let tinycolor: tinycolor = require("tinycolor2");

export interface AnyColor {
  toHexString: () => string;
  getAlpha: () => number | undefined;
  toRgbString: () => undefined;
}

export const noneColor: AnyColor = {
  toHexString: () => "none",
  getAlpha: () => undefined,
  toRgbString: () => undefined
};
