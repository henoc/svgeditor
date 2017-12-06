module Utils exposing (..)
import Types exposing (..)
import Html exposing (Attribute)
import Html.Events exposing (onWithOptions, keyCode)
import Json.Decode as Json
import Vec2 exposing (..)
import Tuple exposing (first, second)

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

flatten : List (Maybe a) -> List a
flatten lst = case lst of
  (Just x) :: tl -> x :: flatten tl
  Nothing :: tl -> flatten tl
  [] -> []

getElems: Model -> List StyledSVGElement
getElems model = case model.svg.shape of
  SVG {elems} -> elems
  _ -> []

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

shiftKey: Json.Decoder Bool
shiftKey = Json.field "shiftKey" Json.bool

clientX: Json.Decoder Int
clientX = Json.field "clientX" Json.int

clientY: Json.Decoder Int
clientY = Json.field "clientY" Json.int

onItemMouseDown : ((Bool, Vec2) -> msg) -> Attribute msg
onItemMouseDown tagger =
  let
    clientPos: Json.Decoder Vec2
    clientPos = Json.map2 (\x -> \y -> (toFloat x, toFloat y)) clientX clientY

    mouseEvent: Json.Decoder (Bool, Vec2)
    mouseEvent = Json.map2 (\x -> \y -> (x, y)) shiftKey clientPos
  in
  onWithOptions "mousedown" { stopPropagation = True , preventDefault = False } (Json.map tagger mouseEvent)

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