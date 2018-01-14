module ViewBuilder exposing (..)

import Types exposing (..)
import Html exposing (..)
import Html.Attributes exposing (attribute, value)
import Html.Events exposing (..)
import Svg exposing (svg, ellipse, rect, circle, polygon, polyline, path)
import Svg.Attributes exposing (..)
import Material.Toggles as Toggles
import Material.Slider as Slider
import Material.Options as Options
import Material.Typography as Typo
import Material.Grid exposing (grid, noSpacing, cell, size, Device(..))
import Color.Convert exposing (..)
import Vec2 exposing (..)
import Utils
import Set exposing (Set)
import ShapeList exposing (..)
import Tuple exposing (first, second)
import Dict exposing (Dict)
import Shape
import Color

-- モデル所有のSVGモデルのDOMを構築する
build : Model -> StyledSVGElement -> Html Msg
build model svg =
  let
    rdomId = "svgeditor" ++ (toString svg.id)
    -- 元からあったunknownな属性はそのまま入れる
    -- idだけは一時的に上書きする
    -- styleは適当に上書きして当たり判定のある透明な物体にする
    attrList = Dict.insert "id" rdomId svg.attr |> Dict.toList |> List.map (\(x, y) -> attribute x y)
    styleStr =
      Dict.insert "opacity" "0" svg.style |>
      Dict.toList |> List.map (\(x, y) -> x ++ ":" ++ y) |> String.join ";"
    -- HandMode, NodeModeのときだけ図形にクリック判定を与える
    itemClick = case model.mode of
      HandMode ->
        [Utils.onItemMouseDown <| \(shift, pos) -> OnSelect svg.id shift pos]
      NodeMode ->
        [Utils.onItemMouseDown <| \(shift, pos) -> OnSelect svg.id shift pos]
      _ -> []
  in
  case svg.shape of
  Rectangle {leftTop, size} ->
    let left = leftTop -# size /# (2, 2) in
    rect (attrList ++ itemClick ++ [
      x (toString  <| Tuple.first leftTop ),
      y (toString <| Tuple.second leftTop),
      width (toString <| Tuple.first size),
      height (toString <| Tuple.second size),
      style styleStr
    ]) []
  Ellipse {center, size} ->
    let centx = Tuple.first center in
    let centy = Tuple.second center in
    let sizex = Tuple.first size in
    let sizey = Tuple.second size in
    ellipse (attrList ++ itemClick ++ [
      cx (toString centx),
      cy (toString centy),
      rx (toString (sizex / 2)),
      ry (toString (sizey / 2)),
      style styleStr
    ]) []
  Polygon pgn ->
    (if pgn.enclosed then polygon else polyline) (attrList ++ itemClick ++ [
      points (String.join "," (List.map (\(x,y) -> (toString x ++ " " ++ toString y)) pgn.points)),
      style styleStr
    ]) []
  Path {operators} ->
    let
      opstr: PathOperator -> String
      opstr op = op.kind ++ " " ++ (String.join "," (List.map (\(x,y) -> (toString x ++ " " ++ toString y)) op.points))
      pathopstr = List.map opstr (List.reverse operators) |> String.join " "
    in
    Svg.path (attrList ++ itemClick ++ [
      d pathopstr,
      style styleStr   
    ]) []
  SVG {elems, size} ->
    Svg.svg (attrList ++ [
      width (toString <| Tuple.first size),
      height (toString <| Tuple.second size)
    ]) (List.map (build model) elems)
  Unknown {name, elems} ->
    node name attrList (List.map (build model) elems) -- unknownは編集できないのでstyleStrはいらないはずである

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

colorPicker: String -> Model -> List (Html Msg)
colorPicker sty model =
  let
    colorPickerState = Maybe.withDefault {colorMode = NoneColor, singleColor = Color.black} <| Dict.get sty model.colorPicker
    noneInserted = Dict.insert sty {colorPickerState | colorMode = NoneColor} model.colorPicker
    singleInserted = Dict.insert sty {colorPickerState | colorMode = SingleColor} model.colorPicker
    hsl = Color.toHsl colorPickerState.singleColor
    cgHue hue = Dict.insert sty {colorPickerState | singleColor = Color.hsla hue hsl.saturation hsl.lightness hsl.alpha} model.colorPicker
    cgSat sat = Dict.insert sty {colorPickerState | singleColor = Color.hsla hsl.hue sat hsl.lightness hsl.alpha} model.colorPicker
    cgLig lig = Dict.insert sty {colorPickerState | singleColor = Color.hsla hsl.hue hsl.saturation lig hsl.alpha} model.colorPicker
    cgAlp alp = Dict.insert sty {colorPickerState | singleColor = Color.hsla hsl.hue hsl.saturation hsl.lightness alp} model.colorPicker
  in
  [
    grid [] [
      cell [size All 1] [
        Options.styled p [Typo.subhead] [text <| sty ++ ":"]
      ],
      cell [size All 1] [
        Toggles.checkbox Mdl [0] model.mdl [
          Options.onToggle <| ColorPickerMsg noneInserted,
          Toggles.value (colorPickerState.colorMode == NoneColor)
        ] [text "none"],
        Toggles.checkbox Mdl [1] model.mdl [
          Options.onToggle <| ColorPickerMsg singleInserted,
          Toggles.value (colorPickerState.colorMode == SingleColor)
        ] [text "single"]
      ],
      cell [size All 5] [
        grid [noSpacing] [
            cell [size All 1] [ Options.styled p [Typo.body1] [text "H: "] ],
            cell [size All 3] [ Slider.view [Slider.value (hsl.hue * 180 / pi), Slider.min 0, Slider.max 359, Slider.step 1, Slider.onChange (\f -> ColorPickerMsg <| cgHue (degrees f))] ]
        ],
        grid [noSpacing] [
            cell [size All 1] [ Options.styled p [Typo.body1] [text "S: "] ],
            cell [size All 3] [ Slider.view [Slider.value (hsl.saturation * 100), Slider.min 0, Slider.max 100, Slider.step 1, Slider.onChange (\f -> ColorPickerMsg <| cgSat (f / 100))] ]
        ],
        grid [noSpacing] [
            cell [size All 1] [ Options.styled p [Typo.body1] [text "L: "] ],
            cell [size All 3] [ Slider.view [Slider.value (hsl.lightness * 100), Slider.min 0, Slider.max 100, Slider.step 1, Slider.onChange (\f -> ColorPickerMsg <| cgLig (f / 100))] ]
        ],
        grid [noSpacing] [
            cell [size All 1] [ Options.styled p [Typo.body1] [text "A: "] ],
            cell [size All 3] [ Slider.view [Slider.value hsl.alpha, Slider.min 0, Slider.max 1, Slider.step 0.01, Slider.onChange (\f -> ColorPickerMsg <| cgAlp f)] ]
        ]
      ]
    ]
  ]
