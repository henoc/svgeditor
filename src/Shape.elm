module Shape exposing (..)

import Types exposing (..)
import Vec2 exposing (..)
import Tuple exposing (first, second)

getBBox : StyledSVGElement -> Box
getBBox elem = case elem.shape of
  Rectangle {leftTop, size} -> {leftTop = leftTop, rightBottom = leftTop +# size}
  Ellipse {center, size} -> {leftTop = center -# size /# (2, 2), rightBottom = center +# size /# (2, 2)}

-- 平行移動
translate : Vec2 -> StyledSVGElement -> StyledSVGElement
translate delta elem = {elem| shape =
  (case elem.shape of
    Rectangle {leftTop, size} -> Rectangle {leftTop = leftTop +# delta, size = size}
    Ellipse {center, size} -> Ellipse {center = center +# delta, size = size}
  )}

-- 中心
getCenter : StyledSVGElement -> Vec2
getCenter elem = case elem.shape of
  Rectangle {leftTop, size} -> leftTop +# size /# (2, 2)
  Ellipse {center, size} -> center

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

