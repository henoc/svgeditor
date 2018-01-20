module Main exposing (..)

import Material
import Material.Scheme
import Material.Button as Button
import Material.Toggles as Toggles
import Material.Options as Options
import Material.Slider as Slider
import Material.Typography as Typo
import Material.Elevation as Elevation
import Material.Grid exposing (grid, noSpacing, cell, size, Device(..))
import Ui.ColorPanel
import Ext.Color
import Html exposing (Html, button, div, text, node, p, img)
import Svg exposing (svg, ellipse, rect)
import Svg.Attributes exposing (width, height, style)
import Html.Events exposing (onClick, onInput, onMouseDown)
import Html.Attributes exposing (value, checked, src, attribute, class, id)
import Color exposing (Color)
import Color.Convert exposing (..)
import Tuple exposing (first, second)
import Vec2 exposing (..)
import Set exposing (Set)
import Types exposing (..)
import Debug exposing (..)
import Utils
import Utils2
import ShapeMode
import HandMode
import NodeMode
import ViewBuilder
import Parsers
import Actions
import Traverse
import Dict exposing (Dict)
import Gradients
import List.Extra exposing (find)

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
      openedPicker = "none",
      colorPicker = Dict.fromList [
        ("fill", {colorMode = SingleColor, singleColor = Color.hsl (degrees 0) 0.5 0.5}),
        ("stroke", {colorMode = NoneColor, singleColor = Color.hsl (degrees 180) 0.5 0.5})
      ],
      colorPanel = Ui.ColorPanel.init (),
      gradients = Dict.empty,
      gradIdGen = 0,
      gradientPanel = Ui.ColorPanel.init (),
      gradientPanelLink = Nothing
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
      
      SwichMode GradientMode ->
        {model | mode = GradientMode} ! [] 

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
        let
          newModel = Actions.duplicate model
        in
        newModel ! [Utils.reflectSvgData newModel]
      Delete ->
        let
          newModel = Actions.delete model
        in
        newModel ! [Utils.reflectSvgData newModel]
      BringForward ->
        let
          newModel = Actions.bringForward model
        in
        newModel ! [Utils.reflectSvgData newModel]
      SendBackward ->
        let
          newModel = Actions.sendBackward model
        in
        newModel ! [Utils.reflectSvgData newModel]

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
      GradientMode ->
        model ! []
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
        gradientIds = gradients |> List.map .id
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
        Just (nextId, data) ->
          let
            newModel = {model| svg = data, idGen = nextId}
            gradients = Utils.getGradients newModel
            gradientIds = gradients |> List.map .id
          in
          newModel ! [Utils.encodeURIComponent svgData, Utils.getGradientStyles gradientIds]
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

              pickerFill = Maybe.withDefault {colorMode = NoneColor, singleColor = Color.black} <| Dict.get "fill" model.colorPicker
              pickerStroke = Maybe.withDefault {colorMode = NoneColor, singleColor = Color.black} <| Dict.get "stroke" model.colorPicker
              
              newPickerFill = case colorTypeFill of
                NoneColorType -> {pickerFill | colorMode = NoneColor}
                SingleColorType c -> {pickerFill | colorMode = SingleColor, singleColor = c}
                AnyColorType ident -> {pickerFill | colorMode = AnyColor ident}
              newPickerStroke = case colorTypeStroke of
                NoneColorType -> {pickerStroke | colorMode = NoneColor}
                SingleColorType c -> {pickerStroke | colorMode = SingleColor, singleColor = c}
                AnyColorType ident -> {pickerStroke | colorMode = AnyColor ident}
            in
            (
              Dict.insert "fill" newPickerFill << Dict.insert "stroke" newPickerStroke <| colorPickerStates,
              Dict.insert "fill" hslaStrFill << Dict.insert "stroke" hslaStrStroke <| styleInfo
            )
          Nothing -> (colorPickerStates, styleInfo)
      in
      {model | colorPicker = newColorPickerStates, styleInfo = newStyleInfo} ! []
    
    OpenedPickerMsg styleName ->
      {model | openedPicker = styleName} ! []

    GradientStyles stopStyles ->
      let
        dict = stopStyles
          |> List.map (\ginfo ->
              let
                ident = ginfo.ident
                tagName = ginfo.tagName
                styleObjects = ginfo.styles
                stopColorList =
                  styleObjects
                  |> List.map (\obj ->
                      (
                        Parsers.percentAsInt obj.offset,
                        Parsers.rgbToColor obj.stopColor (Result.withDefault 1 <| String.toFloat obj.stopOpacity)
                      )
                    )
              in
              (
                ident,
                {
                  gradientType = if tagName == "linearGradient" then Linear else Radial,
                  stops = stopColorList
                }
              )
            )
          |> Dict.fromList
        definedGradients = Dict.union dict model.gradients

        -- 新しい definedGradients で全ての XXGradient を更新
        newModelSvg = Traverse.traverse (Gradients.updateGradient definedGradients) model.svg
      in
      {model | gradients = definedGradients, svg = newModelSvg} ! []
    
    MakeNewGradient gtype ->
      let
        gradIdGen =
          let
            loop i = case Dict.keys model.gradients |> find (\k -> k == "Gradient" ++ toString i) of
              Just _ -> loop (i + 1)
              Nothing -> i
          in
          loop model.gradIdGen
        ident = "Gradient" ++ toString gradIdGen
        stops =  [(10, Color.blue), (100, Color.yellow)]

        -- model.gradients更新
        definedGradients =
          Dict.insert ident {gradientType = gtype, stops = stops} model.gradients
        
        -- model.svg更新
        (stopElems, nextId) = Gradients.makeStops model.idGen stops
        newGradientElem = {
          style = Dict.empty,
          attr = Dict.fromList [("id", ident)],
          id = nextId,
          shape = case gtype of
            Linear -> LinearGradient {identifier = ident, stops = stopElems}
            Radial -> RadialGradient {identifier = ident, stops = stopElems}
        }
        model2 = Gradients.addElemInDefs newGradientElem model
        model3 = {model2 | gradients = definedGradients, gradIdGen = gradIdGen + 1, idGen = nextId + 1}
      in
      model3 ! [Utils.reflectSvgData model3]

    ChangeStop ident index ofs clr ->
      let
        oldStops: List (Int, Color)
        oldStops = model.gradients |> Dict.get ident |> Maybe.map .stops |> Maybe.withDefault []
        newStops = oldStops |> List.indexedMap (\i  pair -> if i == index then (ofs, clr) else pair)
        definedGradients = case Dict.get ident model.gradients of
          Just ginfo -> model.gradients |> Dict.insert ident {ginfo | stops = newStops}
          Nothing -> model.gradients
        newModelSvg = Traverse.traverse (Gradients.updateGradient definedGradients) model.svg
        newModel = {model | gradients = definedGradients, svg = newModelSvg}
      in
      newModel ! [Utils.reflectSvgData newModel]
    
    AddNewStop ident ->
      let
        stops = [(100, Color.red)]
        oldStops: List (Int, Color)
        oldStops = model.gradients |> Dict.get ident |> Maybe.map .stops |> Maybe.withDefault []
        definedGradients = case Dict.get ident model.gradients of
          Just ginfo -> model.gradients |> Dict.insert ident {ginfo | stops = oldStops ++ stops}
          Nothing -> model.gradients
        
        (stopElems, nextId) = Gradients.makeStops model.idGen stops
        model2 = Gradients.addNewStopElems ident stopElems model
        model3 = {model2 | gradients = definedGradients, idGen = nextId}
      in
      model3 ! [Utils.reflectSvgData model3]
    
    RemoveStop ident index ->
      let
        oldStops: List (Int, Color)
        oldStops = model.gradients |> Dict.get ident |> Maybe.map .stops |> Maybe.withDefault []
        newStops = List.Extra.removeAt index oldStops
        definedGradients = case Dict.get ident model.gradients of
          Just ginfo -> model.gradients |> Dict.insert ident {ginfo | stops = newStops}
          Nothing -> model.gradients
        newModelSvg = Traverse.traverse (Gradients.removeAt ident index) model.svg
        newModel = {model | gradients = definedGradients, svg = newModelSvg}
      in
      newModel ! [Utils.reflectSvgData newModel]

    FocusToStop ident index ->
      let
        newGradientPanelLink = case model.gradientPanelLink of
          Nothing -> Just (ident, index)
          Just (idt, idx) -> if idt == ident && idx == index then Nothing else Just (ident, index)
      in
      {model | gradientPanelLink = newGradientPanelLink} ! []

    ColorPickerMsg colorPickerStates ->
      let
        -- カラーピッカーの状態をもとに styleInfo を更新
        loop : List (String, ColorPickerState) -> StyleInfo -> StyleInfo
        loop cols styleInfo = case cols of
          hd :: tl ->
            let
              part = first hd
              colorState = second hd
              newStyleInfo = case colorState.colorMode of
                  NoneColor -> Dict.insert part "none" styleInfo
                  SingleColor -> Dict.insert part (Utils2.colorToCssHsla2 colorState.singleColor) styleInfo
                  AnyColor url -> Dict.insert part ("url(" ++ url ++ ")") styleInfo
            in
            loop tl newStyleInfo
          [] -> styleInfo
        colorPickerStatesList = Dict.toList colorPickerStates
        newStyleInfo = loop colorPickerStatesList model.styleInfo
        newModel = {model | colorPicker = colorPickerStates}
      in
      update (OnProperty (Style newStyleInfo)) newModel
    
    ColorPanelMsg msg_ ->
      let
        (updated, cmd) = Ui.ColorPanel.update msg_ model.colorPanel
      in
      {model | colorPanel = updated} ! [Cmd.map ColorPanelMsg cmd]
    
    ColorPanelChanged uiColor ->
      let
        normalColor = Ext.Color.hsvToRgb uiColor
        colorPickerState = Maybe.withDefault {colorMode = NoneColor, singleColor = Color.black} <| Dict.get model.openedPicker model.colorPicker
        renewedPickers =  Dict.insert model.openedPicker {colorPickerState | singleColor = normalColor} model.colorPicker
      in
      update (ColorPickerMsg renewedPickers) model
    
    GradientPanelMsg msg_ ->
      let
        (updated, cmd) = Ui.ColorPanel.update msg_ model.gradientPanel
      in
      {model | gradientPanel = updated} ! [Cmd.map GradientPanelMsg cmd]
    
    GradientPanelChanged uiColor ->
      let
        clr = Ext.Color.hsvToRgb uiColor
        (ident, index) = model.gradientPanelLink |> Maybe.withDefault ("", -1)
        oldStops: List (Int, Color)
        oldStops = model.gradients |> Dict.get ident |> Maybe.map .stops |> Maybe.withDefault []
        newStops = oldStops |> List.indexedMap (\i  pair -> if i == index then (first pair, clr) else pair)
        definedGradients = case Dict.get ident model.gradients of
          Just ginfo -> model.gradients |> Dict.insert ident {ginfo | stops = newStops}
          Nothing -> model.gradients
        newModelSvg = Traverse.traverse (Gradients.updateGradient definedGradients) model.svg
        newModel = {model | gradients = definedGradients, svg = newModelSvg}
      in
      newModel ! [Utils.reflectSvgData newModel]

-- VIEW


view : Model -> Html Msg
view model =
  let styleInfo = model.styleInfo in
  let
    -- ボタンの追加CSS
    buttonCss =
      Options.css "color" "currentColor"
    
    -- メニュー以外の部分
    rootDiv hide =
      Options.div [
        if hide then Options.css "display" "none" else Options.css "display" "block",
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
      ]
    
    colorPickers = [
        div [] <| ViewBuilder.colorPicker "fill" model,
        div [] <| ViewBuilder.colorPicker "stroke" model,
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

    gradientsEditor =
      (model.gradients
      |> Dict.toList
      |> List.map (\(ident, ginfo) -> ViewBuilder.gradientItem ident ginfo model))
      ++ [
        div [style "display: flex"] [
          Button.render Mdl [200] model.mdl [buttonCss, MakeNewGradient Linear |> Options.onClick, Button.raised] [text "add linear gradient"],
          Button.render Mdl [200] model.mdl [buttonCss, MakeNewGradient Radial |> Options.onClick, Button.raised] [text "add radial gradient"]
        ]
      ]
  in
  div []
    ([
      div [] [
        let
          isSelected mode =
            if mode == model.mode then [Button.colored, Button.raised] else []
        in
        div [] [
          Button.render Mdl [0] model.mdl ([buttonCss, Options.onClick <| OnProperty <| SwichMode HandMode] ++ isSelected HandMode) [text "select"],
          Button.render Mdl [1] model.mdl ([buttonCss, Options.onClick <| OnProperty <| SwichMode NodeMode] ++ isSelected NodeMode) [text "node"],
          Button.render Mdl [2] model.mdl ([buttonCss, Options.onClick <| OnProperty <| SwichMode RectMode] ++ isSelected RectMode) [text "rectangle"],
          Button.render Mdl [3] model.mdl ([buttonCss, Options.onClick <| OnProperty <| SwichMode EllipseMode] ++ isSelected EllipseMode) [text "ellipse"],
          Button.render Mdl [4] model.mdl ([buttonCss, Options.onClick <| OnProperty <| SwichMode PolygonMode] ++ isSelected PolygonMode) [text "polygon"],
          Button.render Mdl [5] model.mdl ([buttonCss, Options.onClick <| OnProperty <| SwichMode PathMode] ++ isSelected PathMode) [text "path"],
          Button.render Mdl [6] model.mdl ([buttonCss, Options.onClick <| OnProperty <| SwichMode GradientMode] ++ isSelected GradientMode) [text "gradient"]          
        ],
        div [] [
          Button.render Mdl [100] model.mdl [buttonCss, Options.onClick <| OnAction <| Duplicate] [text "duplicate"],
          Button.render Mdl [101] model.mdl [buttonCss, Options.onClick <| OnAction <| Delete] [text "delete"],
          Button.render Mdl [102] model.mdl [buttonCss, Options.onClick <| OnAction <| BringForward] [text "bring forward"],
          Button.render Mdl [103] model.mdl [buttonCss, Options.onClick <| OnAction <| SendBackward] [text "send backward"]
        ]
      ]
    ] ++ case model.mode of
      GradientMode -> [rootDiv True] ++ gradientsEditor
      _ -> [rootDiv False] ++ colorPickers
    )
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
          Ui.ColorPanel.onChange ColorPanelChanged model.colorPanel,
          Sub.map GradientPanelMsg (Ui.ColorPanel.subscriptions model.gradientPanel),
          Ui.ColorPanel.onChange GradientPanelChanged model.gradientPanel
        ]