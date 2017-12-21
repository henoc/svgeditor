module ViewBuilder exposing (..)

import Types exposing (..)
import Html exposing (..)
import Html.Attributes exposing (attribute)
import Svg exposing (svg, ellipse, rect, circle, polygon, polyline, path)
import Svg.Attributes exposing (..)
import Vec2 exposing (..)
import Utils
import Set exposing (Set)
import ShapeList exposing (..)
import Tuple exposing (first, second)
import Dict exposing (Dict)
import Shape

-- モデル所有のSVGモデルのDOMを構築する
build : StyledSVGElement -> Html Msg
build svg =
  let
    rdomId = "svgeditor" ++ (toString svg.id)
    -- 元からあったunknownな属性はそのまま入れる
    -- idだけは一時的に上書きする
    attrList = Dict.insert "id" rdomId svg.attr |> Dict.toList |> List.map (\(x, y) -> attribute x y)
    styleStr = Dict.toList svg.style |> List.map (\(x, y) -> x ++ ":" ++ y) |> String.join ";"
  in
  case svg.shape of
  Rectangle {leftTop, size} ->
    let left = leftTop -# size /# (2, 2) in
    rect (attrList ++ [
      x (toString  <| Tuple.first leftTop ),
      y (toString <| Tuple.second leftTop),
      width (toString <| Tuple.first size),
      height (toString <| Tuple.second size),
      style styleStr,
      Utils.onItemMouseDown <| \(shift, pos) -> OnSelect svg.id shift pos
    ]) []
  Ellipse {center, size} ->
    let centx = Tuple.first center in
    let centy = Tuple.second center in
    let sizex = Tuple.first size in
    let sizey = Tuple.second size in
    ellipse (attrList ++ [
      cx (toString centx),
      cy (toString centy),
      rx (toString (sizex / 2)),
      ry (toString (sizey / 2)),
      style styleStr,
      Utils.onItemMouseDown <| \(shift, pos) -> OnSelect svg.id shift pos
    ]) []
  Polygon pgn ->
    (if pgn.enclosed then polygon else polyline) (attrList ++ [
      points (String.join "," (List.map (\(x,y) -> (toString x ++ " " ++ toString y)) pgn.points)),
      style styleStr,
      Utils.onItemMouseDown <| \(shift, pos) -> OnSelect svg.id shift pos
    ]) []
  Path {operators} ->
    let
      opstr: PathOperator -> String
      opstr op = op.kind ++ " " ++ (String.join "," (List.map (\(x,y) -> (toString x ++ " " ++ toString y)) op.points))
      pathopstr = List.map opstr (List.reverse operators) |> String.join " "
    in
    Svg.path (attrList ++ [
      d pathopstr,
      style styleStr,
      Utils.onItemMouseDown <| \(shift, pos) -> OnSelect svg.id shift pos      
    ]) []
  SVG {elems, size} ->
    Svg.svg (attrList ++ [
      width (toString <| Tuple.first size),
      height (toString <| Tuple.second size)
    ]) (List.map build elems)
  Unknown {name, elems} ->
    node name attrList (List.map build elems) -- unknownは編集できないのでstyleStrはいらないはずである

-- handModeでの選択頂点などを与える
buildVertexes : Model -> List (Html Msg)
buildVertexes model = 
  let
    svglst : List StyledSVGElement
    svglst = List.map (\k -> Utils.getById k model) (Set.toList model.selected) |> Utils.flatten

    box : Box
    box = getMergedBBox svglst

    left = first box.leftTop
    top = second box.leftTop
    right = first box.rightBottom
    bottom = second box.rightBottom

    positions = [
      (left, top),
      ((left + right) / 2, top),
      (right, top),
      (left, (top + bottom) / 2),
      (right, (top + bottom) / 2),
      (left, bottom),
      ((left + right) / 2, bottom),
      (right, bottom)
    ]
  in
  if List.length svglst == 0 then [] else
  List.map2
    (\pos -> \anti -> circle [
        cx <| toString (first pos),
        cy <| toString (second pos),
        r "5",
        fill "#AA5533",
        stroke "#553311",
        Utils.onItemMouseDown <| \(shift, pos) -> OnVertex anti pos
      ] [])
    positions (List.reverse positions)

-- ノードモードでのノードを表示する
buildNodes: Model -> List (Html Msg)
buildNodes model =
  let
    svglst : List StyledSVGElement
    svglst = List.map (\k -> Utils.getById k model) (Set.toList model.selected) |> Utils.flatten
    positions = case List.head svglst of
      Just selected -> Shape.getPoints selected
      Nothing -> []
    nodeIds = List.range 0 (List.length positions - 1)
  in
  List.map2
    (\pos -> \nodeId -> circle [
        cx <| toString (first pos),
        cy <| toString (second pos),
        r "5",
        fill "#AA5533",
        stroke "#553311",
        Utils.onItemMouseDown <| \(shift, pos) -> OnNode pos nodeId
      ] [])
    positions nodeIds