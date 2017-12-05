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

main : Program Never Model Msg
main =
  Html.program { init = init, view = view, update = update, subscriptions = subscriptions }


-- MODEL


init : ( Model, Cmd Msg )
init =
    (
      {
        mode = HandMode,
        dragBegin = Nothing,
        svg = { size = (400, 400) , elems = [] },
        colorInfo = {fill = "#883333", stroke = "#223366" },
        idGen = 0,
        selected = Set.empty,
        fixedPoint = Nothing,
        selectedRef = []
      },
      Cmd.none
    )


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
        width (toString <| Tuple.first model.svg.size),
        height (toString <| Tuple.second model.svg.size),
        onMouseDown NoSelect
      ]
      ((List.map ViewBuilder.build model.svg.elems ) ++ (ViewBuilder.buildVertexes model)),
      Html.input [ type_ "color", onInput <| \c -> OnProperty <| Color {colorInfo | fill = c} ] [],
      Html.input [ type_ "color", onInput <| \c -> OnProperty <| Color {colorInfo | stroke = c} ] []    
    ]



-- SUBSCRIPTION

subscriptions : Model -> Sub Msg
subscriptions model =
    Sub.batch
        [ Mouse.downs <| OnMouse << MouseDown, Mouse.ups <| OnMouse << MouseUp, Mouse.moves <| OnMouse << MouseMove ]