module Utils2 exposing (..)

import Color exposing (Color)
import Dict exposing (Dict)


-- elm-coreのバグへの対処


toHsl2 : Color -> { hue : Float, saturation : Float, lightness : Float, alpha : Float }
toHsl2 c =
    let
        rgba =
            Color.toRgb c

        hsla =
            Color.toHsl c
    in
    if rgba.red == 255 && rgba.green == 255 && rgba.blue == 255 then
        { hue = 0, saturation = 0, lightness = 1, alpha = rgba.alpha }
    else if rgba.red == rgba.green && rgba.green == rgba.blue then
        { hue = 0, saturation = hsla.saturation, lightness = hsla.lightness, alpha = rgba.alpha }
    else
        Color.toHsl c



-- elm-coreのバグへの対処


colorToCssHsla2 : Color -> String
colorToCssHsla2 c =
    let
        hsla =
            toHsl2 c
    in
    "hsla(" ++ (toString <| floor (hsla.hue / (2 * pi) * 360)) ++ ", " ++ (toString <| floor (hsla.saturation * 100)) ++ "%, " ++ (toString <| floor (hsla.lightness * 100)) ++ "%, " ++ toString hsla.alpha ++ ")"


maybeInsert : String -> Maybe String -> Dict String String -> Dict String String
maybeInsert key maybeValue dict =
    case maybeValue of
        Just x ->
            Dict.insert key x dict

        Nothing ->
            dict
