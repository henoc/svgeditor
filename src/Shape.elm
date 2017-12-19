module Shape exposing (..)

import Types exposing (..)
import Vec2 exposing (..)
import Tuple exposing (first, second)
import Utils

getBBox : StyledSVGElement -> Box
getBBox elem = case elem.shape of
  Rectangle {leftTop, size} -> {leftTop = leftTop, rightBottom = leftTop +# size}
  Ellipse {center, size} -> {leftTop = center -# size /# (2, 2), rightBottom = center +# size /# (2, 2)}
  Polygon {points, enclosed} ->
    let
      left = List.map first points |> List.minimum |> Maybe.withDefault 0
      top = List.map second points |> List.minimum |> Maybe.withDefault 0
      right = List.map first points |> List.maximum |> Maybe.withDefault 0
      bottom = List.map second points |> List.maximum |> Maybe.withDefault 0
    in
    {leftTop = (left, top), rightBottom = (right, bottom)}
  Path {operators} ->
    let
      points = getPoints elem
      left = List.map first points |> List.minimum |> Maybe.withDefault 0
      top = List.map second points |> List.minimum |> Maybe.withDefault 0
      right = List.map first points |> List.maximum |> Maybe.withDefault 0
      bottom = List.map second points |> List.maximum |> Maybe.withDefault 0
    in
    {leftTop = (left, top), rightBottom = (right, bottom)}    
  others -> {leftTop = (0, 0), rightBottom = (0, 0)}

-- 平行移動
translate : Vec2 -> StyledSVGElement -> StyledSVGElement
translate delta elem = {elem| shape =
  (case elem.shape of
    Rectangle {leftTop, size} -> Rectangle {leftTop = leftTop +# delta, size = size}
    Ellipse {center, size} -> Ellipse {center = center +# delta, size = size}
    Polygon {points, enclosed} -> Polygon {points = List.map ((+#) delta) points, enclosed = enclosed}
    Path {operators} ->
      Path {
        operators = List.map (\op -> {op| points = List.map ((+#) delta) op.points}) operators
      }
    others -> others
  )}

-- 中心
getCenter : StyledSVGElement -> Vec2
getCenter elem = case elem.shape of
  Rectangle {leftTop, size} -> leftTop +# size /# (2, 2)
  Ellipse {center, size} -> center
  Polygon {points, enclosed} ->
    let bbox = getBBox elem in (bbox.leftTop +# bbox.rightBottom) /# (2, 2)
  Path {operators} ->
    let bbox = getBBox elem in (bbox.leftTop +# bbox.rightBottom) /# (2, 2)    
  others -> (0, 0)

setCenter : Vec2 -> StyledSVGElement -> StyledSVGElement
setCenter cent elem = 
  let
    oldCenter = getCenter elem
    delta = cent -# oldCenter
  in
  translate delta elem

-- 中心から offset 離れた点
getOffsettedCenter : Vec2 -> StyledSVGElement -> Vec2
getOffsettedCenter offset elem = offset +# getCenter elem

-- 中心から offset 離れた点を絶対座標 offsettedCent に設定する
setOffsettedCenter : Vec2 -> Vec2 -> StyledSVGElement -> StyledSVGElement
setOffsettedCenter offsettedCent offset elem =
  let
    oldOffsettedCenter = getOffsettedCenter offset elem
    delta = offsettedCent -# oldOffsettedCenter
  in
  translate delta elem

-- 図形中心を中心として縮尺を変更
scale : Vec2 -> StyledSVGElement -> StyledSVGElement
scale ratio elem = 
  let
    center = getCenter elem
    scaled = {elem | shape = (
      case elem.shape of
        Rectangle {leftTop , size} -> Rectangle {leftTop = leftTop, size = size *# ratio}
        Ellipse {center, size} -> Ellipse {center = center, size = size *# ratio}
        Polygon {points, enclosed} -> Polygon {points = List.map ((*#) ratio) points, enclosed = enclosed}
        Path {operators} -> Path {
          operators = List.map (\op -> {op|points = List.map ((*#) ratio) op.points}) operators
        }
        others -> others
    )}
  in
  setCenter center scaled

-- 図形中心から offset 離れた点を不動点として縮尺を変更
scale2 : Vec2 -> Vec2 -> StyledSVGElement -> StyledSVGElement
scale2 offset ratio elem =
  let
    fixedPoint = getOffsettedCenter offset elem
    centerScaled = scale ratio elem
  in
  setOffsettedCenter fixedPoint (offset *# ratio) elem

-- n番目のノードの座標をfnにする
replaceNode: Int -> (Vec2 -> Vec2) -> StyledSVGElement -> StyledSVGElement
replaceNode n fn elem = case elem.shape of
  Polygon {points, enclosed} ->
    {elem|shape = Polygon {points = Utils.replaceNth n fn points, enclosed = enclosed}}
  Path {operators} ->
    {elem|shape = Path {operators = Utils.replacePathNth n fn operators}}
  others -> elem

-- ノードのリストを返す
getPoints: StyledSVGElement -> List Vec2
getPoints elem = case elem.shape of
  Polygon {points, enclosed} -> points
  Path {operators} -> List.map .points operators |> Utils.flattenList
  others -> []