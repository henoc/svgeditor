module Main exposing (..)

import Html exposing (Html, button, div, text, node, p)
import Svg exposing (svg, ellipse, rect)
import Svg.Attributes exposing (..)
import Html.Events exposing (onClick, onInput, onMouseDown)
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
      selectedRef = []
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
        {model | mode = RectMode} ! []

      SwichMode EllipseMode ->
        {model | mode = EllipseMode} ! []
      
      SwichMode PolygonMode ->
        {model | mode = PolygonMode} ! []

      Style styleInfo ->
        {model | styleInfo = styleInfo} ! []
    
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
      HandMode -> (HandMode.select ident isAdd pos model) ! []
      NodeMode -> (NodeMode.select ident pos model) ! []
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
        Just data -> {model| svg = data} ! []
        Nothing -> model ! []


-- VIEW


view : Model -> Html Msg
view model =
  let styleInfo = model.styleInfo in
  div []
    [ div [] [
        p [] [
          button [ onClick <| OnProperty <| SwichMode HandMode ] [text "hand mode"],
          button [ onClick <| OnProperty <| SwichMode NodeMode ] [text "node mode"],        
          button [ onClick <| OnProperty <| SwichMode RectMode ] [text "rectangle mode"],
          button [ onClick <| OnProperty <| SwichMode EllipseMode ] [text "ellispe mode"],
          button [ onClick <| OnProperty <| SwichMode PolygonMode ] [text "polygon mode"]
        ],
        p [] [
          button [ onClick <| OnAction <| Duplicate ] [text "duplicate"],
          button [ onClick <| OnAction <| Delete ] [text "delete"],
          button [ onClick <| OnAction <| BringForward ][text "bring forward"],
          button [ onClick <| OnAction <| SendBackward ][text "send backward"]
        ]
      ],
      svg [
        width (toString <| 400),
        height (toString <| 400),
        onMouseDown NoSelect
      ]
      ((List.map ViewBuilder.build (Utils.getElems model) ) ++ (case model.mode of
        NodeMode -> ViewBuilder.buildNodes model
        HandMode -> ViewBuilder.buildVertexes model
        _ -> []
      )),
      Html.input [ type_ "color", onInput <| \c -> OnProperty <| Style (Dict.insert "fill" c styleInfo) ] [],
      Html.input [ type_ "color", onInput <| \c -> OnProperty <| Style (Dict.insert "stroke" c styleInfo) ] []    
    ]



-- SUBSCRIPTION

subscriptions : Model -> Sub Msg
subscriptions model =
    Sub.batch
        [ Mouse.downs <| OnMouse << MouseDown, Mouse.ups <| OnMouse << MouseUp, Mouse.moves <| OnMouse << MouseMove, Utils.getSvgDataFromJs SvgData ]