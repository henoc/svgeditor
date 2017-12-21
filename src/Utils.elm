port module Utils exposing (..)
import Types exposing (..)
import Html exposing (Attribute)
import Html.Events exposing (onWithOptions, on, keyCode)
import Json.Decode as Json
import Vec2 exposing (..)
import Tuple exposing (first, second)
import Generator
import Dict exposing (Dict)

last : List a -> Maybe a
last lst =
  let len = List.length lst in
  case List.drop (len - 1) lst of
  hd :: [] -> Just hd
  _ -> Nothing

init : List a -> List a
init lst =
  let len = List.length lst in
  List.take (len - 1) lst

initLast: List a -> Maybe (List a, a)
initLast lst = case last lst of
  Nothing -> Nothing
  Just x -> Just (init lst, x)

-- 最後の２つを分けて得る
initLast2: List a -> Maybe (List a, a, a)
initLast2 lst = case initLast lst of
  Nothing -> Nothing
  Just (hd, last) -> case initLast hd of
    Nothing -> Nothing
    Just (hd2, last2) -> Just (hd2, last2, last)

flatten : List (Maybe a) -> List a
flatten lst = case lst of
  (Just x) :: tl -> x :: flatten tl
  Nothing :: tl -> flatten tl
  [] -> []

flattenList: List (List a) -> List a
flattenList lst = case lst of
  hd :: tl -> hd ++ flattenList tl
  [] -> []

getElems: Model -> List StyledSVGElement
getElems model = case model.svg.shape of
  SVG {elems} -> elems
  _ -> []

getSvgSize: Model -> Vec2
getSvgSize model = case model.svg.shape of
  SVG {elems, size} -> size
  _ -> (400, 400)

getById : Int -> Model -> Maybe StyledSVGElement
getById ident model =
  let
    loop : List StyledSVGElement -> Maybe StyledSVGElement
    loop lst = case lst of
      hd :: tl ->
        if (hd.id == ident) then Just hd
        else loop tl
      [] -> Nothing
  in
  loop <| getElems model

getLastId: Model -> Maybe Int
getLastId model =
  let
    ids = List.map .id <| getElems model
  in
  List.maximum ids

shiftKey: Json.Decoder Bool
shiftKey = Json.field "shiftKey" Json.bool

clientX: Json.Decoder Int
clientX = Json.field "clientX" Json.int

clientY: Json.Decoder Int
clientY = Json.field "clientY" Json.int

button: Json.Decoder Int
button = Json.field "button" Json.int

onPush : msg -> Attribute msg
onPush message =
  onWithOptions "mousedown" { stopPropagation = True , preventDefault = False } (Json.succeed message)

onItemMouseDown : ((Bool, Vec2) -> msg) -> Attribute msg
onItemMouseDown tagger =
  let
    clientPos: Json.Decoder Vec2
    clientPos = Json.map2 (\x -> \y -> (toFloat x, toFloat y)) clientX clientY

    mouseEvent: Json.Decoder (Bool, Vec2)
    mouseEvent = Json.map2 (\x -> \y -> (x, y)) shiftKey clientPos
  in
  onWithOptions "mousedown" { stopPropagation = True , preventDefault = False } (Json.map tagger mouseEvent)

onMouseDown2: (Int -> msg) -> Attribute msg
onMouseDown2 tagger =
  on "mousedown" (Json.map tagger button)

-- フィルターで除いた要素の代わりに別リストの要素を順番に入れていく
replace : (a -> Bool) -> List a -> List a -> List a
replace filter replacer lst = case lst of
  hd :: tl ->
    if filter hd then case replacer of
      rhd :: rtl -> rhd :: (replace filter rtl tl)
      [] -> replace filter [] tl
    else
      hd :: (replace filter replacer tl)
  [] -> []

ratio : Vec2 -> Vec2 -> Vec2
ratio next previous =
  let
      r = next /# previous
      r2 = (
        if isNaN (first r) then 1.0 else (first r),
        if isNaN (second r) then 1.0 else (second r)
      )
      r3 = (
        if isInfinite (first r2) then 1.0 else (first r2),
        if isInfinite (second r2) then 1.0 else (second r2)
      )
  in
  r3

changeContains : (List StyledSVGElement) -> StyledSVGElement -> StyledSVGElement
changeContains elems svgroot = case svgroot.shape of
  SVG props -> {svgroot| shape = SVG {props | elems = elems } }
  others -> svgroot

reflectSvgData: Model -> Cmd msg
reflectSvgData model =
  let
    svgData = Generator.generateXml model.svg
  in
  sendSvgData svgData

updateHead: (a -> a) -> List a -> List a
updateHead fn lst = case lst of
  hd :: tl -> (fn hd) :: tl
  [] -> []

-- リストのn番目をfnの結果に置き換える
replaceNth: Int -> (a -> a) -> List a -> List a 
replaceNth n fn lst =
  if n == 0 then case lst of
    hd :: tl -> (fn hd) :: tl
    [] -> []
  else case lst of
    hd :: tl -> hd :: replaceNth (n-1) fn tl
    [] -> lst

-- pathOperatorsのn番目の座標をfnに置き換える
replacePathNth: Int -> (Vec2 -> Vec2) -> List PathOperator -> List PathOperator
replacePathNth n fn ops =
  case ops of
    [] -> []
    hd :: tl ->
      if List.length hd.points > n then
       {kind = hd.kind, points = replaceNth n fn hd.points} :: tl
      else
        hd :: replacePathNth (n - List.length hd.points) fn tl

maybeInsert: String -> Maybe String -> Dict String String -> Dict String String
maybeInsert key maybeValue dict = case maybeValue of
  Just x -> Dict.insert key x dict
  Nothing -> dict

limit: Float -> Float -> Float -> Float
limit lower upper value =
  if lower > value then lower else if upper < value then upper else value

port getSvgData: () -> Cmd msg
port getSvgDataFromJs: (String -> msg) -> Sub msg

port sendSvgData: String -> Cmd msg

port getBoundingClientRect: String -> Cmd msg
port getBoundingClientRectFromJs: (ClientRect -> msg) -> Sub msg

port getStyle: String -> Cmd msg
port getStyleFromJs: (Maybe StyleObject -> msg) -> Sub msg

port getMouseDownLeftFromJs: (Vec2 -> msg) -> Sub msg
port getMouseDownRightFromJs: (Vec2 -> msg) -> Sub msg
port getMouseUpFromJs: (Vec2 -> msg) -> Sub msg
port getMouseMoveFromJs: (Vec2 -> msg) -> Sub msg
