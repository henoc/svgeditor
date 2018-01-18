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
import Material.Elevation as Elevation
import Ui.ColorPanel
import Ext.Color exposing (hsvToRgb)
import Color.Convert exposing (..)
import Vec2 exposing (..)
import Utils
import Set exposing (Set)
import ShapeList exposing (..)
import Tuple exposing (first, second)
import Dict exposing (Dict)
import Shape
import Color exposing (Color)
import ColorPicker

-- モデル所有のSVGモデルのDOMを構築する
build : LayerType -> Model -> StyledSVGElement -> Html Msg
build layerType model svg =
  let
    layerName = case layerType of
      ColorLayer -> "color"
      PhysicsLayer -> "physics"
    rdomId = toString svg.id
    -- 元からあったunknownな属性はそのまま入れる
    -- svgeditor-id属性を新たに加える
    attrList =
      Dict.insert "svgeditor-id" rdomId svg.attr
      |> Dict.insert "svgeditor-layer" layerName
      |> Dict.toList |> List.map (\(x, y) -> attribute x y)
    styleStr =
      Dict.insert "opacity" "0" svg.style |>
      (
        case layerType of
          ColorLayer -> \x -> x                         -- 色レイヤでは透明だが色を保持する
          PhysicsLayer -> Dict.insert "fill" "#000000"  -- 物理レイヤでは黒色かつ透明にする
      ) |>
      Dict.toList |> List.map (\(x, y) -> x ++ ":" ++ y) |> String.join ";"
    -- 物理レイヤでは HandMode, NodeModeのときだけ図形にクリック判定を与える
    itemClick = case layerType of
      ColorLayer -> []
      PhysicsLayer ->
        case model.mode of
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
  Stop stp ->
    Svg.stop (attrList ++
      (stp.offset |> Maybe.map toString |> Maybe.map offset |> Utils.maybeToList) ++
      (stp.color |> Maybe.map Utils.colorToCssHsla2 |> Maybe.map stopColor |> Utils.maybeToList) ++
    [
      style styleStr
    ]) []
  SVG {elems, size} ->
    Svg.svg (attrList ++ [
      width (toString <| Tuple.first size),
      height (toString <| Tuple.second size)
    ]) (List.map (build layerType model) elems)
  Defs {elems} ->
    Svg.defs attrList (List.map (build layerType model) elems)
  LinearGradient {stops} ->
    Svg.linearGradient attrList (List.map (build layerType model) stops)
  RadialGradient {stops} ->
    Svg.radialGradient attrList (List.map (build layerType model) stops)
  Unknown {name, elems} ->
    node name attrList (List.map (build layerType model) elems) -- unknownは編集できないのでstyleStrはいらないはずである

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

colorPicker: PaintType -> Model -> List (Html Msg)
colorPicker paintType model = 
  let
    flex = "display: flex"
    paintTypeStr = ColorPicker.paintTypeToStr paintType
    colorEx = model.colorPicker |> Dict.get paintTypeStr |> Maybe.withDefault NoneColor
    gradientIdents = Dict.keys model.gradients
    getGradInfo ident = Dict.get ident model.gradients |> Maybe.withDefault {gradientType = Linear, stops = Dict.empty}
    colorPickerCursor = model.colorPickerCursor
    mkOpenCursor paintType contentName offset = ColorPickerOpen paintType contentName offset
    panelColor = hsvToRgb model.colorPanel.value
  in
  [
    div [style flex] ([
      Options.styled p [Typo.subhead, Options.css "width" "60px"] [text <| (ColorPicker.paintTypeToStr paintType) ++ ":"],
      Options.div [
        case model.colorPickerCursor of
          ColorPickerClosed -> Elevation.e4
          ColorPickerOpen pt _ _ -> case pt == paintType of
            True -> Elevation.e0
            False -> Elevation.e4,
        Elevation.transition 300,
        Options.css "width" "48px",
        Options.css "height" "48px",
        Options.css "border-radius" "0.25em",        
        Options.css "background" <| case colorEx of
          NoneColor -> "hsla(0, 0%, 100%, 0.1)"
          _ -> ColorPicker.colorExToStr colorEx,     -- 箱
        Options.center,
        Options.onClick <|
          ColorPickerOpenCloseMsg <| ColorPicker.toggleCursor colorEx model.gradients paintType model.colorPickerCursor
      ] (
        case colorEx of
          NoneColor -> [text "none"]
          _ -> []
      )
    ] ++ case colorPickerCursor of
        ColorPickerClosed -> []
        ColorPickerOpen pt contentName offset -> case pt == paintType of
        False -> []
        True ->
          let
            orderedGradColors: String -> List (Float, Color)
            orderedGradColors contentName = case Dict.get (String.dropLeft 1 contentName) model.gradients of
              Nothing -> []
              Just ginfo -> ginfo.stops |> Dict.toList |> List.sortBy first
            smallBox: msg -> Float -> Color -> Html msg
            smallBox m ofs clr = Options.div ([
              Options.onClick m,
              Elevation.e4,
              Options.css "width" "32px",
              Options.css "height" "32px",
              Options.css "background" (Utils.colorToCssHsla2 clr),
              Options.css "border-radius" "0.25em"
            ] ++ if ofs == offset then [
              Options.css "border-style" "solid",
              Options.css "border-width" "1px",
              Options.css "border-color" "currentColor"
            ] else []) []
            radioButtonsDiv = div [style "display: flex; flex-direction: column; margin: 0px 10px"] ([
                Toggles.radio Mdl [0] model.mdl [
                  Options.onToggle <| ColorPickerCursorMsg (mkOpenCursor paintType "none" -1) paintType NoneColor,
                  Toggles.value (contentName == "none")
                ] [text "none"],
                Toggles.radio Mdl [1] model.mdl [
                  Options.onToggle <| ColorPickerCursorMsg (mkOpenCursor paintType "single" -1) paintType (SingleColor panelColor),
                  Toggles.value (contentName == "single")
                ] [text "single"]
              ] ++ List.indexedMap
                (
                  \index -> \ident ->
                    Toggles.radio Mdl [2 + index] model.mdl [
                      Options.onToggle <| ColorPickerCursorMsg (mkOpenCursor paintType ("#" ++ ident) -1) paintType (GradientColor (getGradInfo ident)),
                      Toggles.value (contentName == "#" ++ ident)
                    ] [text ("#" ++ ident)]
                )
                gradientIdents
              )
            gradiateBoxesDiv =
              let
                makeMsg ofs = ColorPickerCursorMsg (mkOpenCursor paintType contentName ofs) paintType colorEx
              in
              div [style flex] (orderedGradColors contentName |> List.map (\(f, c) -> smallBox (makeMsg f) f c))
            panelList = case contentName of
              "none" -> []
              _ -> [
                Html.map ColorPanelMsg <| Ui.ColorPanel.view model.colorPanel
              ]
            gradPanelDiv = div [] ([gradiateBoxesDiv] ++ panelList)
          in
          [
            -- ラジオボタン
            radioButtonsDiv,
            -- グラデーションの箱とカラーパネル
            gradPanelDiv
          ]
    )
  ]

