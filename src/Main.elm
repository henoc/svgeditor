module Main exposing (..)

import Html exposing (Html, button, div, text, node, p)
import Svg exposing (svg, ellipse, rect)
import Svg.Attributes exposing (..)
import Html.Events exposing (onClick, onInput, onMouseDown)
import Html.Attributes exposing (value, checked)
import Vec2 exposing (..)
import Set exposing (Set)
import Types exposing (..)
import Debug exposing (..)
import Mouse
import Utils
import ShapeMode
import HandMode
import NodeMode
import ViewBuilder
import Parsers
import Actions
import Dict exposing (Dict)

main : Program Never Model Msg
main =
  Html.program { init = init, view = view, update = update, subscriptions = subscriptions }


-- MODEL


init : ( Model, Cmd Msg )
init =
    {
      mode = HandMode,
      dragBegin = Nothing,
      svg = {style = Dict.empty, id = -1, attr = Dict.empty, shape = SVG {elems = [], size = (400, 400)}},
      styleInfo = Dict.fromList [("fill", "#883333"), ("stroke", "#223366")],
      idGen = 0,
      selected = Set.empty,
      fixedPoint = Nothing,
      nodeId = Nothing,
      selectedRef = [],
      clientLeft = 0,
      clientTop = 0
    } ! [Utils.getSvgData ()]


-- UPDATE

update : Msg -> Model -> (Model, Cmd Msg)
update msg model =
  case msg of
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

      Style styleInfo -> case model.mode of
        HandMode ->
          let newModel = HandMode.changeStyle styleInfo model in
          if model /= newModel then newModel ! [Utils.reflectSvgData newModel]
          else model ! []
        _ -> model ! []
    
    OnAction action -> case action of
      Duplicate ->
        (Actions.duplicate model) ! []
      Delete ->
        (Actions.delete model) ! []
      BringForward ->
        (Actions.bringForward model) ! []
      SendBackward ->
        (Actions.sendBackward model) ! []

    OnMouse onMouseMsg -> case model.mode of
      HandMode ->
        let newModel = HandMode.update onMouseMsg model in
        if model /= newModel then newModel ! [Utils.reflectSvgData newModel]
        else model ! []
      NodeMode ->
        let newModel = NodeMode.update onMouseMsg model in
        if model /= newModel then newModel ! [Utils.reflectSvgData newModel]
        else model ! []
      PolygonMode ->
        let newModel = ShapeMode.updatePolygon onMouseMsg model in
        if model /= newModel then newModel ! [Utils.reflectSvgData newModel]
        else model ! []
      _ ->
        let newModel = ShapeMode.update onMouseMsg model in
        if model /= newModel then newModel ! [Utils.reflectSvgData newModel]
        else model ! []
    
    OnSelect ident isAdd pos -> case model.mode of
      HandMode -> (HandMode.select ident isAdd pos model) ! [Utils.getStyle ("svgeditor" ++ (toString ident))]
      NodeMode -> (NodeMode.select ident pos model) ! [Utils.getStyle ("svgeditor" ++ (toString ident))]
      _ -> model ! []
    
    NoSelect -> case model.mode of
      HandMode -> (HandMode.noSelect model) ! []
      NodeMode -> (NodeMode.noSelect model) ! []
      _ -> model ! []
    
    OnVertex fixed mpos -> case model.mode of
      HandMode -> (HandMode.scale fixed mpos model) ! []
      _ -> model ! []
    
    OnNode mpos nodeId -> case model.mode of
      NodeMode -> (NodeMode.nodeSelect nodeId mpos model) ! []
      _ -> model ! []
    
    SvgData svgData ->
      case Parsers.parseSvg svgData of
        Just (nextId, data) -> {model| svg = data, idGen = nextId} ! []
        Nothing -> model ! []
    
    SvgRootRect rect ->
      {model| clientLeft = rect.left, clientTop = rect.top} ! []
    
    ComputedStyle maybeStyle ->
      let
        selectedStyle = case model.selectedRef of -- 選択中のオブジェクトのスタイル
          hd :: tl -> hd.style
          [] -> Dict.empty
        newStyleInfo = case maybeStyle of
          Just styleObject ->
            let
              hexFill = Parsers.normalizeColor styleObject.fill
              hexStroke = Parsers.normalizeColor styleObject.stroke
            in
            Utils.maybeInsert "fill" hexFill << Utils.maybeInsert "stroke" hexStroke <| selectedStyle
          Nothing -> model.styleInfo
      in
      {model| styleInfo = newStyleInfo} ! []


-- VIEW


view : Model -> Html Msg
view model =
  let styleInfo = model.styleInfo in
  div []
    [ div [] [
        p [] [
          button [ Utils.onPush <| OnProperty <| SwichMode HandMode ] [text "hand mode"],
          button [ Utils.onPush <| OnProperty <| SwichMode NodeMode ] [text "node mode"],        
          button [ Utils.onPush <| OnProperty <| SwichMode RectMode ] [text "rectangle mode"],
          button [ Utils.onPush <| OnProperty <| SwichMode EllipseMode ] [text "ellispe mode"],
          button [ Utils.onPush <| OnProperty <| SwichMode PolygonMode ] [text "polygon mode"]
        ],
        p [] [
          button [ Utils.onPush <| OnAction <| Duplicate ] [text "duplicate"],
          button [ Utils.onPush <| OnAction <| Delete ] [text "delete"],
          button [ Utils.onPush <| OnAction <| BringForward ][text "bring forward"],
          button [ Utils.onPush <| OnAction <| SendBackward ][text "send backward"]
        ]
      ],
      div [id "root"] [
        svg [
          width (toString <| Tuple.first <| Utils.getSvgSize model),
          height (toString <| Tuple.second <| Utils.getSvgSize model),
          onMouseDown NoSelect
        ]
        ((List.map ViewBuilder.build (Utils.getElems model) ) ++ (case model.mode of
          NodeMode -> ViewBuilder.buildNodes model
          HandMode -> ViewBuilder.buildVertexes model
          _ -> []
        ))
      ],
      let
        fo = case Dict.get "fill-opacity" model.styleInfo of
          Nothing -> 1
          Just x -> Result.withDefault 1 <| String.toFloat x
        so = case Dict.get "stroke-opacity" model.styleInfo of
          Nothing -> 1
          Just x -> Result.withDefault 1 <| String.toFloat x
      in
      p [] [
        text "fill:",
        Html.input [ type_ "color", value <| Maybe.withDefault "#000000" (Dict.get "fill" model.styleInfo) , onInput <| \c -> OnProperty <| Style (Dict.insert "fill" c styleInfo) ] [],
        button [ checked True, onClick <| OnProperty <| Style (Dict.insert "fill" "none" styleInfo) ] [text "none"],
        text "opacity:",
        button [ onClick <| OnProperty <| Style (Dict.insert "fill-opacity" (toString <| Utils.limit 0 1 (fo + 0.2)) styleInfo)] [text "+"],
        button [ onClick <| OnProperty <| Style (Dict.insert "fill-opacity" (toString <| Utils.limit 0 1 (fo - 0.2)) styleInfo)] [text "-"],
        text " stroke:",
        Html.input [ type_ "color", value <| Maybe.withDefault "#000000" (Dict.get "stroke" model.styleInfo) ,onInput <| \c -> OnProperty <| Style (Dict.insert "stroke" c styleInfo) ] [],
        button [ checked True, onClick <| OnProperty <| Style (Dict.insert "stroke" "none" styleInfo) ] [text "none"],
        text "opacity:",
        button [ onClick <| OnProperty <| Style (Dict.insert "stroke-opacity" (toString <| Utils.limit 0 1 (so + 0.2)) styleInfo)] [text "+"],
        button [ onClick <| OnProperty <| Style (Dict.insert "stroke-opacity" (toString <| Utils.limit 0 1 (so - 0.2)) styleInfo)] [text "-"]
      ]
    ]



-- SUBSCRIPTION

subscriptions : Model -> Sub Msg
subscriptions model =
    Sub.batch
        [
          Mouse.downs <| OnMouse << MouseDown, Mouse.ups <| OnMouse << MouseUp, Mouse.moves <| OnMouse << MouseMove, Utils.getSvgDataFromJs SvgData,
          Utils.getBoundingClientRectFromJs SvgRootRect,
          Utils.getStyleFromJs ComputedStyle
        ]