module Main exposing (..)

import Material
import Material.Scheme
import Material.Button as Button
import Material.Options as Options
import Material.Slider as Slider
import Material.Typography as Typo
import Material.Elevation as Elevation
import Ui.ColorPanel
import Ext.Color exposing (hsvToRgb)
import Html exposing (Html, button, div, text, node, p, img)
import Svg exposing (svg, ellipse, rect)
import Svg.Attributes exposing (..)
import Html.Attributes exposing (value, checked, src, attribute)
import Tuple exposing (first, second)
import Set exposing (Set)
import Types exposing (..)
import Debug exposing (..)
import Utils
import ShapeMode
import HandMode
import NodeMode
import ViewBuilder
import Parsers
import Actions
import Traverse
import ColorPicker
import Dict exposing (Dict)

main : Program Never Model Msg
main =
  Html.program { init = init, view = view, update = update, subscriptions = subscriptions }


-- MODEL

init : ( Model, Cmd Msg )
init =
    {
      mdl = Material.model,
      mode = HandMode,
      dragBegin = Nothing,
      isMouseDown = False,
      svg = {style = Dict.empty, id = -1, attr = Dict.empty, shape = SVG {elems = [], size = (400, 400)}},
      styleInfo = Dict.fromList [("fill", "hsla(0, 50%, 50%, 1)"), ("stroke", "none")],
      idGen = 0,
      selected = Set.empty,
      fixedPoint = Nothing,
      nodeId = Nothing,
      selectedRef = [],
      clientLeft = 0,
      clientTop = 0,
      encoded = "",
      colorPicker = Dict.fromList [
        ("fill", NoneColor),
        ("stroke", NoneColor)
      ],
      colorPickerCursor = ColorPickerClosed,
      colorPanel = Ui.ColorPanel.init (),
      gradients = Dict.empty,
      gradientIdGen = 0
    } ! [Utils.getSvgData ()]


-- UPDATE

update : Msg -> Model -> (Model, Cmd Msg)
update msg model =
  case msg of
    Mdl msg_ ->
      Material.update Mdl msg_ model
 
    OnProperty changePropertyMsg -> case changePropertyMsg of
      SwichMode HandMode ->
        {model | mode = HandMode} ! []
      
      SwichMode NodeMode ->
        {model | mode = NodeMode} ! []

      SwichMode RectMode ->
        {model | mode = RectMode} ! [Utils.getBoundingClientRect "root"]

      SwichMode EllipseMode ->
        {model | mode = EllipseMode} ! [Utils.getBoundingClientRect "root"]
      
      SwichMode PolygonMode ->
        {model | mode = PolygonMode} ! [Utils.getBoundingClientRect "root"]
      
      SwichMode PathMode ->
        {model | mode = PathMode} ! [Utils.getBoundingClientRect "root"]        

      Style styleInfo -> case model.mode of
        HandMode ->
          let newModel = HandMode.changeStyle styleInfo model in
          if model /= newModel then newModel ! [Utils.reflectSvgData newModel]
          else model ! []
        NodeMode ->
          let newModel = HandMode.changeStyle styleInfo model in
          if model /= newModel then newModel ! [Utils.reflectSvgData newModel]
          else model ! []
        _ -> {model| styleInfo = styleInfo} ! []
    
    OnAction action -> case action of
      Duplicate ->
        (Actions.duplicate model) ! []
      Delete ->
        (Actions.delete model) ! []
      BringForward ->
        (Actions.bringForward model) ! []
      SendBackward ->
        (Actions.sendBackward model) ! []

    OnMouse onMouseMsg ->
      case model.mode of
      HandMode ->
        let newModel = HandMode.update onMouseMsg model in
        if model /= newModel then newModel ! [Utils.reflectSvgData newModel]
        else model ! []
      NodeMode ->
        let newModel = NodeMode.update onMouseMsg model in
        if model /= newModel then newModel ! [Utils.reflectSvgData newModel]
        else model ! []
      _ ->
        case onMouseMsg of
          -- マウス押しはここではなく、svgの枠で判定する
          MouseDownLeft pos -> model ! []
          MouseDownRight pos -> model ! []
          _ -> case model.mode of
            PolygonMode ->
              let newModel = ShapeMode.updatePolygon onMouseMsg model in
              if model /= newModel then newModel ! [Utils.reflectSvgData newModel]
              else model ! []
            PathMode ->
              let newModel = ShapeMode.updatePath onMouseMsg model in
              if model /= newModel then newModel ! [Utils.reflectSvgData newModel]
              else model ! []
            _ ->
              let newModel = ShapeMode.update onMouseMsg model in
              if model /= newModel then newModel ! [Utils.reflectSvgData newModel]
              else model ! []
    
    OnSelect ident isAdd pos ->
      let
        gradients = Utils.getGradients model
        gradientIds = List.map .attr gradients |> List.map (Dict.get "id") |> Utils.flatten
      in
      case model.mode of
      HandMode -> (HandMode.select ident isAdd pos model) ! [Utils.getStyle (ident, "color"), Utils.getGradientStyles gradientIds]
      NodeMode -> (NodeMode.select ident pos model) ! [Utils.getStyle (ident, "color"), Utils.getGradientStyles gradientIds]
      _ -> model ! [Utils.getGradientStyles gradientIds]
    
    -- svg枠内のクリックについて
    FieldSelect (button, pos) ->
      case model.mode of
        HandMode -> (HandMode.noSelect model) ! []
        NodeMode -> (NodeMode.noSelect model) ! []
        _ ->
          let
            onMouseMsg = case button of
              0 -> MouseDownLeft pos
              _ -> MouseDownRight pos
          in case model.mode of
            PolygonMode ->
              let newModel = ShapeMode.updatePolygon onMouseMsg model in
              if model /= newModel then newModel ! [Utils.reflectSvgData newModel]
              else model ! []
            PathMode ->
              let newModel = ShapeMode.updatePath onMouseMsg model in
              if model /= newModel then newModel ! [Utils.reflectSvgData newModel]
              else model ! []
            _ ->
              let newModel = ShapeMode.update onMouseMsg model in
              if model /= newModel then newModel ! [Utils.reflectSvgData newModel]
              else model ! []
    
    OnVertex fixed mpos -> case model.mode of
      HandMode -> (HandMode.scale fixed mpos model) ! []
      _ -> model ! []
    
    OnNode mpos nodeId -> case model.mode of
      NodeMode -> (NodeMode.nodeSelect nodeId mpos model) ! []
      _ -> model ! []
    
    SvgData svgData ->
      case Parsers.parseSvg svgData of
        Just (nextId, data) -> {model| svg = data, idGen = nextId} ! [Utils.encodeURIComponent svgData]
        Nothing -> model ! []
    
    EncodedSvgData encoded ->
      {model| encoded = "data:image/svg+xml," ++ encoded} ! []
    
    SvgRootRect rect ->
      {model| clientLeft = rect.left, clientTop = rect.top} ! []
    
    -- 選択されたオブジェクトのスタイルを計算してcolorPickerStates, styleInfoを更新
    ComputedStyle maybeStyle ->
      let
        colorPickerStates = model.colorPicker
        styleInfo = model.styleInfo
        (newColorPickerStates, newStyleInfo) = case maybeStyle of
          Just styleObject ->
            let
              colorTypeFill = Parsers.rgbToColorType styleObject.fill (Result.withDefault 1 <| String.toFloat styleObject.fillOpacity)
              colorTypeStroke = Parsers.rgbToColorType styleObject.stroke (Result.withDefault 1 <| String.toFloat styleObject.strokeOpacity)
              hslaStrFill = Utils.colorTypeToStr colorTypeFill
              hslaStrStroke = Utils.colorTypeToStr colorTypeStroke

              pickerFill = Maybe.withDefault NoneColor <| Dict.get "fill" model.colorPicker
              pickerStroke = Maybe.withDefault NoneColor <| Dict.get "stroke" model.colorPicker
              
              newPickerFill = case colorTypeFill of
                NoneColorType -> NoneColor
                SingleColorType c -> SingleColor c
                AnyColorType ident -> GradientColor (
                  model.gradients |> Dict.get ident |> Maybe.withDefault {gradientType = Linear, stops = Dict.empty}
                )
              newPickerStroke = case colorTypeStroke of
                NoneColorType -> NoneColor
                SingleColorType c -> SingleColor c
                AnyColorType ident -> GradientColor (
                  model.gradients |> Dict.get ident |> Maybe.withDefault {gradientType = Linear, stops = Dict.empty}
                )
            in
            (
              Dict.insert "fill" newPickerFill << Dict.insert "stroke" newPickerStroke <| colorPickerStates,
              Dict.insert "fill" hslaStrFill << Dict.insert "stroke" hslaStrStroke <| styleInfo
            )
          Nothing -> (colorPickerStates, styleInfo)
      in
      {model | colorPicker = newColorPickerStates, styleInfo = newStyleInfo} ! []

    -- computedしてきたグラデーション情報を追加
    GradientStyles stopStyles ->
      let
        dict = stopStyles
          |> List.map (\ginfo ->
              let
                ident = ginfo.ident
                tagName = ginfo.tagName
                styleObjects = ginfo.styles
                stopColorDicts =
                  styleObjects
                  |> List.map (\obj ->
                      (
                        Parsers.percentToFloat obj.offset,
                        Parsers.rgbToColor obj.stopColor (Result.withDefault 1 <| String.toFloat obj.stopOpacity)
                      )
                    )
                  |> Dict.fromList
              in
              (
                ident,
                {
                  gradientType = if tagName == "linearGradient" then Linear else Radial,
                  stops = stopColorDicts
                }
              )
            )
          |> Dict.fromList
        definedGradients = Dict.union dict model.gradients

        -- 新しい definedGradients で全ての XXGradient を更新
        newModelSvg = Traverse.traverse (Utils.updateGradient definedGradients) model.svg 
      in
      {model | gradients = definedGradients, svg = newModelSvg} ! []

    -- 普通にグラデーション情報を更新
    GradientUpdate ident ginfo -> case Dict.get ident model.gradients of
      Just _ ->
        let
          newGradients = Dict.insert ident ginfo model.gradients
          newModelSvg = Traverse.traverse (Utils.updateGradient newGradients) model.svg
          newModel =  {model | gradients = newGradients, svg = newModelSvg}
        in
        newModel ! [Utils.reflectSvgData newModel]
      Nothing ->    -- 新規作成
        let
          (newStops, nextId) = Utils.makeStops model.idGen ginfo.stops
          newGradients = Dict.insert ident ginfo model.gradients
          newGradientElem = {
            style = Dict.empty,
            attr = Dict.fromList [("id", ident)],
            id = nextId,
            shape = case ginfo.gradientType of
              Linear -> LinearGradient {identifier = ident, stops = newStops}
              Radial -> RadialGradient {identifier = ident, stops = newStops}
          }
          newModel = Utils.setElemInDefs newGradientElem model
        in
        {newModel | gradients = newGradients, idGen = nextId + 1, gradientIdGen = model.gradientIdGen + 1} ! [Utils.reflectSvgData newModel]

    ColorPickerMsg colorPicker ->
      let
        loop: List (String, ColorEx) -> StyleInfo -> StyleInfo
        loop colorPicker styleInfo = case colorPicker of
          (paintType, colorex) :: tl ->
            let
              colorName = ColorPicker.colorExToStr2 model.gradients colorex
            in
            loop tl (Dict.insert paintType colorName styleInfo)
          [] -> styleInfo
        newStyleInfo = loop (Dict.toList colorPicker) model.styleInfo     -- styleInfo更新
        newModel = {model | colorPicker = colorPicker}      -- colorPicker更新
      in
      update (OnProperty (Style newStyleInfo)) newModel     -- handModeなどでstyleInfoを反映
    
    ColorPickerOpenCloseMsg colorPickerCursor ->
      {model | colorPickerCursor = colorPickerCursor} ! []

    -- colorPickerを更新する
    ColorPickerCursorMsg colorPickerCursor ptype colorex ->
      update (ColorPickerMsg (Dict.insert (ColorPicker.paintTypeToStr ptype) colorex model.colorPicker)) {model | colorPickerCursor = colorPickerCursor}

    ColorPanelMsg msg_ ->
      let
        (updated, cmd) = Ui.ColorPanel.update msg_ model.colorPanel
      in
      {model | colorPanel = updated} ! [Cmd.map ColorPanelMsg cmd, Utils.reflectSvgData model]
    
    -- colorPanelの更新をうけてcolorPickerを更新、さらにグラデーションに変更があればmodel.gradients, model.svgを更新
    ColorPanelChanged uiColor ->
      let
        normalColor = hsvToRgb uiColor
      in
      case model.colorPickerCursor of
        ColorPickerClosed -> model ! []
        ColorPickerOpen paintType contentName ofs ->
          let
            newColorPicker = Dict.insert (ColorPicker.paintTypeToStr paintType) (ColorPicker.colorToColorEx contentName model.gradients ofs normalColor) model.colorPicker
            ident = String.dropLeft 1 contentName
            maybeGinfo = Dict.get ident model.gradients
          in
          case maybeGinfo of
            Just ginfo ->
              let
                newGinfo = {ginfo | stops = ginfo.stops |> Dict.insert ofs normalColor}
                newGradients = model.gradients |> Dict.insert ident newGinfo
                newModelSvg = Traverse.traverse (Utils.updateGradient newGradients) model.svg
              in
              update (ColorPickerMsg newColorPicker) {model | svg = newModelSvg, gradients = newGradients}
            Nothing ->
              update (ColorPickerMsg newColorPicker) model

-- VIEW


view : Model -> Html Msg
view model =
  let styleInfo = model.styleInfo in
  div []
    [
      let
        -- ボタンの追加CSS
        buttonCss =
          Options.css "color" "currentColor"
      in
      div [] [
        let
          isSelected mode =
            if mode == model.mode then [Button.colored, Button.raised] else []
        in
        div [] [
          Button.render Mdl [0] model.mdl ([buttonCss, Options.onClick <| OnProperty <| SwichMode HandMode] ++ isSelected HandMode) [text "hand"],
          Button.render Mdl [1] model.mdl ([buttonCss, Options.onClick <| OnProperty <| SwichMode NodeMode] ++ isSelected NodeMode) [text "node"],
          Button.render Mdl [2] model.mdl ([buttonCss, Options.onClick <| OnProperty <| SwichMode RectMode] ++ isSelected RectMode) [text "rectangle"],
          Button.render Mdl [3] model.mdl ([buttonCss, Options.onClick <| OnProperty <| SwichMode EllipseMode] ++ isSelected EllipseMode) [text "ellipse"],
          Button.render Mdl [4] model.mdl ([buttonCss, Options.onClick <| OnProperty <| SwichMode PolygonMode] ++ isSelected PolygonMode) [text "polygon"],
          Button.render Mdl [5] model.mdl ([buttonCss, Options.onClick <| OnProperty <| SwichMode PathMode] ++ isSelected PathMode) [text "path"]
        ],
        div [] [
          Button.render Mdl [6] model.mdl [buttonCss, Options.onClick <| OnAction <| Duplicate] [text "duplicate"],
          Button.render Mdl [7] model.mdl [buttonCss, Options.onClick <| OnAction <| Delete] [text "delete"],
          Button.render Mdl [8] model.mdl [buttonCss, Options.onClick <| OnAction <| BringForward] [text "bring forward"],
          Button.render Mdl [9] model.mdl [buttonCss, Options.onClick <| OnAction <| SendBackward] [text "send backward"]
        ]
      ],
      Options.div [
        Elevation.e8,
        Options.attribute <| Html.Attributes.id "root",
        Options.css "width" <| (toString <| Tuple.first <| Utils.getSvgSize model) ++ "px",
        Options.css "height" <| (toString <| Tuple.second <| Utils.getSvgSize model) ++ "px"
      ] [
        -- 画像としてのsvg
        img [
          id "svgimage",
          src <| model.encoded
        ] [],
        -- 色取得用svg
        svg [
          width (toString <| Tuple.first <| Utils.getSvgSize model),
          height (toString <| Tuple.second <| Utils.getSvgSize model)
        ]
        (List.map (ViewBuilder.build ColorLayer model) (Utils.getElems model)),
        -- 当たり判定用svg
        svg [
          width (toString <| Tuple.first <| Utils.getSvgSize model),
          height (toString <| Tuple.second <| Utils.getSvgSize model),
          Utils.onFieldMouseDown FieldSelect
        ]
        ((List.map (ViewBuilder.build PhysicsLayer model) (Utils.getElems model)) ++ (case model.mode of
          NodeMode -> ViewBuilder.buildNodes model
          HandMode -> ViewBuilder.buildVertexes model
          _ -> []
        ))
      ],
      div [] <| ViewBuilder.colorPicker Fill model,
      div [] <| ViewBuilder.colorPicker Stroke model,
      let
        sw = case Dict.get "stroke-width" model.styleInfo of
          Nothing -> 1
          Just x -> Result.withDefault 1 <| String.toInt x
      in
      div [ style "display: flex" ] [
        Options.styled p [Typo.subhead] [text <| "stroke-width:"],
        Slider.view [Slider.value (toFloat sw), Slider.min 0, Slider.max 100, Slider.step 1, Slider.onChange (\n -> OnProperty <| Style <| Dict.insert "stroke-width" (toString n) styleInfo)]
      ]
    ]
  |> Material.Scheme.top



-- SUBSCRIPTION

subscriptions : Model -> Sub Msg
subscriptions model =
    Sub.batch
        [
          Utils.getSvgDataFromJs SvgData,
          Utils.encodeURIComponentFromJs EncodedSvgData,
          Utils.getMouseDownLeftFromJs <| OnMouse << MouseDownLeft,
          Utils.getMouseDownRightFromJs <| OnMouse << MouseDownRight,
          Utils.getMouseUpFromJs <| OnMouse << MouseUp,
          Utils.getMouseMoveFromJs <| OnMouse << MouseMove,
          Utils.getBoundingClientRectFromJs SvgRootRect,
          Utils.getStyleFromJs ComputedStyle,
          Utils.getGradientStylesFromJs GradientStyles,
          Sub.map ColorPanelMsg (Ui.ColorPanel.subscriptions model.colorPanel),
          Ui.ColorPanel.onChange ColorPanelChanged model.colorPanel
        ]