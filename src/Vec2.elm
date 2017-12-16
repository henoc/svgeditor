module Vec2 exposing (..)

import Mouse

type alias Vec2 = (Float, Float)

(+#) : Vec2 -> Vec2 -> Vec2
(+#) (x1, y1) (x2, y2) =
  (x1 + x2, y1 + y2)

(-#) : Vec2 -> Vec2 -> Vec2
(-#) (x1, y1) (x2, y2) =
  (x1 - x2, y1 - y2)

(*#) : Vec2 -> Vec2 -> Vec2
(*#) (x1, y1) (x2, y2) =
  (x1 * x2, y1 * y2)

(/#) : Vec2 -> Vec2 -> Vec2
(/#) (x1, y1) (x2, y2) =
  (x1 / x2, y1 / y2)

infixl 8 +#
infixl 8 -#

toVec2 : Mouse.Position -> Vec2
toVec2 position = (toFloat position.x, toFloat position.y)
