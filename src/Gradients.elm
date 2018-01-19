module Gradients exposing (..)

import Types exposing (..)
import Utils2
import Tuple exposing (..)
import Dict exposing (Dict)

toCssGradientName: GradientType -> String
toCssGradientName gradientType = case gradientType of
  Linear -> "linear-gradient"
  Radial -> "radial-gradient"

toCssGradient: String -> GradientInfo -> String
toCssGradient sharpedUrl ginfo =
  let
    urlNoSharp = String.right 1 sharpedUrl
    expandStops stops = case stops of
      hd :: tl ->
        let
          percent = (toString <| first hd) ++ "%"
          colorString = Utils2.colorToCssHsla2 (second hd)
        in
        (colorString ++ " " ++ percent) :: expandStops tl
      [] -> []
    leftOrNone gType = case gType of
      Linear -> "to right, "
      Radial -> ""
  in
  toCssGradientName ginfo.gradientType ++ "(" ++ (leftOrNone ginfo.gradientType) ++ (String.join "," (expandStops ginfo.stops)) ++ ")"

-- 与えられたgradElemがグラデーション要素ならば、idの一致したGradientInfoで更新する
updateGradient: Dict String GradientInfo -> StyledSVGElement -> StyledSVGElement
updateGradient definedGradients gradElem =
  let
    getOrderedGradInfo ginfo = ginfo.stops |> List.sortBy first
    loop stops orderedInfo = case (stops, orderedInfo) of
      (stopHd :: stopTl, orderedInfoHd :: orderedInfoTl) -> case stopHd.shape of
        Stop _ -> {stopHd | shape = Stop {offset = Just <| first orderedInfoHd, color = Just <| second orderedInfoHd}} :: loop stopTl orderedInfoTl
        _ -> stopHd :: loop stopTl orderedInfo
      _ -> stops
  in
  case gradElem.shape of
    LinearGradient {identifier, stops} -> case Dict.get identifier definedGradients of
      Just ginfo ->
        {gradElem | shape = LinearGradient {identifier = identifier, stops = loop stops (getOrderedGradInfo ginfo)}}
      Nothing ->
        gradElem
    RadialGradient {identifier, stops} -> case Dict.get identifier definedGradients of
      Just ginfo ->
        {gradElem | shape = RadialGradient {identifier = identifier, stops = loop stops (getOrderedGradInfo ginfo)}}
      Nothing ->
        gradElem
    other -> gradElem