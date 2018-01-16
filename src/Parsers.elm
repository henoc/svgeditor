module Parsers exposing (..)

import XmlParser
import Types exposing (..)
import Combinators exposing (..)
import Dict exposing (Dict)
import Utils
import Debug
import Color.Convert exposing (..)
import Color exposing (Color)

intParser: Parser Int
intParser = \input -> case (regexParser "[0-9]+") input of
  ParseSuccess r i -> case String.toInt r of
    Ok k -> ParseSuccess k i
    Err _ -> ParseFailure "unreached" i
  ParseFailure r i -> ParseFailure r i

rgbParser: Parser (Int, Int, Int)
rgbParser = onlyRight (stringParser "rgb") (andThen (andThen intParser intParser) intParser) |> map (\((x,y),z) -> (x,y,z))

urlParser: Parser String
urlParser = onlyRight (stringParser "url") (regexParser "^#[a-zA-Z0-9_\\-.]+")

-- rgb(x,y,z) & opacity を ColorType にする
rgbToColorType: String -> Float -> ColorType
rgbToColorType data a = case data of
  "none" -> NoneColorType
  "" -> NoneColorType
  _ -> case rgbParser (input data "[\\(\\),\\s]+" ) of
    ParseSuccess (r,g,b) i -> SingleColorType (Color.rgba r g b a)
    ParseFailure r i ->
      case urlParser (input data "[\\(\\)\\s\"]+") of
        ParseSuccess identifier i -> AnyColorType identifier
        ParseFailure r i -> NoneColorType

-- rgb(x,y,z) & opacity を Color にする
rgbToColor: String -> Float -> Color
rgbToColor data a = case rgbParser (input data "[\\(\\),\\s]+") of
  ParseSuccess (r,g,b) i -> Color.rgba r g b a
  ParseFailure r i -> Color.black

percentToFloat: String -> Float
percentToFloat percent = case floatOrPercentParser (input percent "[\\s]+") of
  ParseSuccess f i -> f
  ParseFailure r i -> 0

stylePairParser: Parser (String, String)
stylePairParser = andThen (regexParser "[^:]+") (regexParser "[^;]+")

styleParser: Parser (Dict String String)
styleParser = Combinators.map Dict.fromList <| rep stylePairParser

floatParser: Parser Float
floatParser = regexParser "[+-]?[0-9]+(\\.[0-9]*)?([eE][+-]?[0-9]+)?" |> Combinators.map (\x -> Result.withDefault 0 <| String.toFloat x)

percentParser: Parser Int
percentParser = onlyLeft intParser (stringParser "%")

floatOrPercentParser: Parser Float
floatOrPercentParser = or (Combinators.map (\x -> (toFloat x) / 100) percentParser) floatParser

pointPairParser: Parser (Float, Float)
pointPairParser = andThen floatParser floatParser

pointsParser: Parser (List (Float, Float))
pointsParser = rep pointPairParser

pathOpParser: Parser PathOperator
pathOpParser = andThen (regexParser "[a-zA-Z]") pointsParser |> Combinators.map (\(o, p) -> {kind = o, points = p})

pathOpsParser: Parser (List PathOperator)
pathOpsParser = rep pathOpParser

getAttr: String -> List XmlParser.Attribute -> Maybe String
getAttr name attrs =
  let
      attrMap = Dict.fromList <| List.map (\a -> (a.name, a.value)) attrs
  in
  Dict.get name attrMap

getStyleAttr: String -> List XmlParser.Attribute -> Maybe String
getStyleAttr name attrs = case getAttr "style" attrs of
  Nothing -> Nothing
  Just style -> case styleParser <| input style "[:;]" of
    ParseSuccess d i -> Dict.get name d
    _ -> Nothing

getStyle: List XmlParser.Attribute -> StyleInfo
getStyle attrs = case getAttr "style" attrs of
  Nothing -> Dict.empty
  Just style -> case styleParser <| input style "[:;]" of
    ParseSuccess dict i -> dict
    _ -> Dict.empty

floatAttr: Float -> Maybe String -> Float
floatAttr default maybeAttr = case maybeAttr of
  Nothing -> default
  Just x -> Result.withDefault default (String.toFloat x)

getFloatAttr: String -> Float -> List XmlParser.Attribute -> Float
getFloatAttr name default attrs = floatAttr default <| getAttr name attrs

convertNode: Int -> XmlParser.Node -> Maybe (Int, StyledSVGElement)
convertNode id node = case node of
  XmlParser.Text text -> Nothing
  XmlParser.Element name attrs subNodes ->
    let
      styleMap = getStyle attrs
      attrMap = Dict.fromList <| List.map (\a -> (a.name, a.value)) attrs
      loop id subNodes acc = case subNodes of
        [] -> (id, List.reverse acc)
        hd :: tl ->
          case convertNode id hd of
            Nothing -> loop id tl acc
            Just (nextId, e) -> loop nextId tl (e::acc)
    in
    Just <| case name of
      "svg" ->
        let
          (nextId, subElems) = loop id subNodes []
          w = getFloatAttr "width" 400 attrs
          h = getFloatAttr "height" 400 attrs
        in
        (nextId+1, {
          style = styleMap,
          id = nextId,
          attr = attrMap,
          shape = SVG {elems = subElems, size = (w, h)}
        })
      "defs" ->
        let
          (nextId, subElems) = loop id subNodes []          
        in
        (nextId+1, {
          style = styleMap,
          id = nextId,
          attr = attrMap,
          shape = Defs {elems = subElems}
        })
      "linearGradient" ->
        let
          (nextId, subElems) = loop id subNodes []
        in
        (nextId+1, {
          style = styleMap,
          id = nextId,
          attr = attrMap,
          shape = LinearGradient {stops = subElems}
        })
      "radialGradient" ->
        let
          (nextId, subElems) = loop id subNodes []
        in
        (nextId+1, {
          style = styleMap,
          id = nextId,
          attr = attrMap,
          shape = RadialGradient {stops = subElems}
        })
      "stop" ->
        (id+1, {
          style = styleMap,
          id = id,
          attr = attrMap,
          shape = Stop
        })
      "rect" ->
        let
          x = getFloatAttr "x" 0 attrs
          y = getFloatAttr "y" 0 attrs
          w = getFloatAttr "width" 0 attrs
          h = getFloatAttr "height" 0 attrs     
        in
        (id+1, {
          style = styleMap,
          id = id,
          attr = attrMap,
          shape = Rectangle {leftTop = (x, y), size = (w, h)}
        })
      "ellipse" ->
        let
          rx = getFloatAttr "rx" 0 attrs
          ry = getFloatAttr "ry" 0 attrs
          cx = getFloatAttr "cx" 0 attrs
          cy = getFloatAttr "cy" 0 attrs
        in
        (id+1, {
          style = styleMap,
          id = id,
          attr = attrMap,
          shape = Ellipse {center = (cx, cy), size = (rx * 2, ry * 2)}
        })
      "polygon" ->
        let
          points = case pointsParser <| input (Maybe.withDefault "" (getAttr "points" attrs)) "[\\s,]+" of
            ParseSuccess r i -> r
            ParseFailure _ _ -> []
        in
        (id+1, {
          style = styleMap,
          id = id,
          attr = attrMap,
          shape = Polygon {points = points, enclosed = True}
        })
      "polyline" ->
        let
          points = case pointsParser <| input (Maybe.withDefault "" (getAttr "points" attrs)) "[\\s,]+" of
            ParseSuccess r i -> r
            ParseFailure _ _ -> []
        in
        (id+1, {
          style = styleMap,
          id = id,
          attr = attrMap,
          shape = Polygon {points = points, enclosed = False}
        })
      "path" ->
        let
          pathOps = case pathOpsParser <| input (Maybe.withDefault "" (getAttr "d" attrs)) "[\\s,]+" of
            ParseSuccess r i -> r
            ParseFailure _ _ -> []
        in
        (id+1, {
          style = styleMap,
          id = id,
          attr = attrMap,
          shape = Path {operators = List.reverse pathOps}
        })
      others ->
        let
          (nextId, subElems) = loop id subNodes []
        in
        (nextId+1, {
          style = styleMap,
          id = nextId,
          attr = attrMap,
          shape = Unknown {name = name, elems = subElems}
        })

parseSvg: String -> Maybe (Int, StyledSVGElement)
parseSvg text =
  let
    node = case XmlParser.parse text of
      Ok {processingInstructions, docType, root} -> convertNode 0 root
      Err _ -> Nothing
  in
  node
