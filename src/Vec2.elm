module Vec2 exposing (..)


type alias Vec2 =
    ( Float, Float )


(+#) : Vec2 -> Vec2 -> Vec2
(+#) ( x1, y1 ) ( x2, y2 ) =
    ( x1 + x2, y1 + y2 )


(-#) : Vec2 -> Vec2 -> Vec2
(-#) ( x1, y1 ) ( x2, y2 ) =
    ( x1 - x2, y1 - y2 )


(*#) : Vec2 -> Vec2 -> Vec2
(*#) ( x1, y1 ) ( x2, y2 ) =
    ( x1 * x2, y1 * y2 )


(/#) : Vec2 -> Vec2 -> Vec2
(/#) ( x1, y1 ) ( x2, y2 ) =
    ( x1 / x2, y1 / y2 )


infixl 8 +#


infixl 8 -#
