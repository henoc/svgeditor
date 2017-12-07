module Main exposing (..)

import Html exposing (Html, button, div, text, node)
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
import ViewBuilder
import Parsers

main : Program Never Model Msg
main =
  Html.program { init = init, view = view, update = update, subscriptions = subscriptions }


-- MODEL


init : ( Model, Cmd Msg )
init =
    {
      mode = HandMode,
      dragBegin = Nothing,
      svg = {style = {fill = Nothing, stroke = Nothing}, id = -1, shape = SVG {elems = []}},
      colorInfo = {fill = Just "#883333", stroke = Just "#223366" },
      idGen = 0,
      selected = Set.empty,
      fixedPoint = Nothing,
      selectedRef = []
    } ! [Utils.getSvgData ()]


-- UPDATE

update : Msg -> Model -> (Model, Cmd Msg)
update msg model =
  case msg of
    OnProperty changePropertyMsg -> case changePropertyMsg of
      SwichMode HandMode ->
        ({model | mode = HandMode}, Cmd.none)

      SwichMode RectMode ->
        ({model | mode = RectMode}, Cmd.none)

      SwichMode EllipseMode ->
        ({model | mode = EllipseMode}, Cmd.none)

      Color colorInfo ->
        ({model | colorInfo = colorInfo}, Cmd.none)

    OnMouse onMouseMsg -> case model.mode of
      HandMode -> HandMode.update onMouseMsg model
      _ -> ShapeMode.update onMouseMsg model
    
    OnSelect ident isAdd pos -> case model.mode of
      HandMode -> HandMode.select ident isAdd pos model
      _ -> (model, Cmd.none)
    
    NoSelect -> case model.mode of
      HandMode -> HandMode.noSelect model
      _ -> (model, Cmd.none)
    
    OnVertex fixed mpos -> case model.mode of
      HandMode -> HandMode.scale fixed mpos model
      _ -> (model, Cmd.none)
    
    SvgData svgData ->
      case Parsers.parseSvg svgData of
        Just data -> {model| svg = data} ! []
        Nothing -> (model, Cmd.none)


-- VIEW


view : Model -> Html Msg
view model =
  let colorInfo = model.colorInfo in
  div []
    [ div [] [
        button [ onClick <| OnProperty <| SwichMode HandMode ] [text "hand mode"],
        button [ onClick <| OnProperty <| SwichMode RectMode ] [text "rectangle mode"],
        button [ onClick <| OnProperty <| SwichMode EllipseMode ] [text "ellispe mode"]
      ],
      svg [
        width (toString <| 400),
        height (toString <| 400),
        onMouseDown NoSelect
      ]
      ((List.map ViewBuilder.build (Utils.getElems model) ) ++ (ViewBuilder.buildVertexes model)),
      Html.input [ type_ "color", onInput <| \c -> OnProperty <| Color {colorInfo | fill = Just c} ] [],
      Html.input [ type_ "color", onInput <| \c -> OnProperty <| Color {colorInfo | stroke = Just c} ] []    
    ]



-- SUBSCRIPTION

subscriptions : Model -> Sub Msg
subscriptions model =
    Sub.batch
        [ Mouse.downs <| OnMouse << MouseDown, Mouse.ups <| OnMouse << MouseUp, Mouse.moves <| OnMouse << MouseMove, Utils.getSvgDataFromJs SvgData ]