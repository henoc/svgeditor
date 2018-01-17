module ColorPicker exposing (..)


import Types exposing (..)
import Utils
import Dict exposing (Dict)
import Color exposing (Color)
import Dict.Extra exposing (find)
import Tuple exposing (..)


paintTypeToStr: PaintType -> String
paintTypeToStr ptype = case ptype of
  Fill -> "fill"
  Stroke -> "stroke"

colorExToStr: ColorEx -> String
colorExToStr colorEx = case colorEx of
  GradientColor gradientInfo -> Utils.toCssGradient gradientInfo
  SingleColor color -> Utils.colorToCssHsla2 color
  NoneColor -> "none"

colorToColorEx: String -> (Dict String GradientInfo) -> Float -> Color -> ColorEx
colorToColorEx contentName gradients offset color = case contentName of
  "none" -> NoneColor
  "single" -> SingleColor color
  _ ->
    let
      noSharpUrl = String.dropLeft 1 contentName
      maybeGradientInfo = Dict.get noSharpUrl gradients
    in
    case maybeGradientInfo of
      Nothing -> NoneColor
      Just ginfo -> GradientColor {ginfo| stops = Dict.insert offset color ginfo.stops}

toggleCursor: PaintType -> String -> ColorPickerCursor -> ColorPickerCursor
toggleCursor paintType contentName cursor = case cursor of
  ColorPickerOpen paintType contentName offset -> ColorPickerClosed
  ColorPickerClosed -> ColorPickerOpen paintType contentName 0

colorExToContentName: (Dict String GradientInfo) -> ColorEx -> String
colorExToContentName gradients colorex = case colorex of
  NoneColor -> "none"
  SingleColor _ -> "single"
  GradientColor ginfo -> case ginfoToIdent gradients ginfo of
    Nothing -> "none"
    Just ident -> "#" ++ ident

ginfoToIdent: (Dict String GradientInfo) -> GradientInfo -> Maybe String
ginfoToIdent gradients ginfo = gradients |> find (\_ v -> v == ginfo) |> Maybe.map first

renew: Float -> Color -> ColorEx -> ColorEx
renew offset color colorex = case colorex of
  NoneColor -> NoneColor
  SingleColor c -> SingleColor color
  GradientColor ginfo -> GradientColor {ginfo | stops = Dict.insert offset color ginfo.stops}