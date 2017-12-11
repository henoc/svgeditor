module Parsers exposing (..)

import XmlParser
import Types exposing (..)
import Combinators exposing (..)
import Dict exposing (Dict)
import Utils
import Debug

stylePairParser: Parser (String, String)
stylePairParser = andThen (regexParser "[^\\s:]+") (regexParser "[^\\s;]+")

styleParser: Parser (Dict String String)
styleParser = Combinators.map Dict.fromList <| rep stylePairParser

floatParser: Parser Float
floatParser = regexParser "[+-]?[0-9]+(\\.[0-9]*)?([eE][+-]?[0-9]+)?" |> Combinators.map (\x -> Result.withDefault 0 <| String.toFloat x)

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
  Just style -> case styleParser <| input style "[\\s:;]+" of
    ParseSuccess d i -> Dict.get name d
    _ -> Nothing

getStyle: List XmlParser.Attribute -> StyleInfo
getStyle attrs = case getAttr "style" attrs of
  Nothing -> Dict.empty
  Just style -> case styleParser <| input style "[\\s:;]+" of
    ParseSuccess dict i -> dict
    _ -> Dict.empty

floatAttr: Maybe String -> Float
floatAttr maybeAttr = case maybeAttr of
  Nothing -> 0
  Just x -> Result.withDefault 0 (String.toFloat x)

getFloatAttr: String -> List XmlParser.Attribute -> Float
getFloatAttr name attrs = floatAttr <| getAttr name attrs

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
          w = getFloatAttr "width" attrs
          h = getFloatAttr "height" attrs
        in
        (nextId+1, {
          style = styleMap,
          id = nextId,
          attr = attrMap,
          shape = SVG {elems = subElems, size = (w, h)}
        })
      "rect" ->
        let
          x = getFloatAttr "x" attrs
          y = getFloatAttr "y" attrs
          w = getFloatAttr "width" attrs
          h = getFloatAttr "height" attrs     
        in
        (id+1, {
          style = styleMap,
          id = id,
          attr = attrMap,
          shape = Rectangle {leftTop = (x, y), size = (w, h)}
        })
      "ellipse" ->
        let
          rx = getFloatAttr "rx" attrs
          ry = getFloatAttr "ry" attrs
          cx = getFloatAttr "cx" attrs
          cy = getFloatAttr "cy" attrs
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
          shape = Path {operators = pathOps}
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

parseSvg: String -> Maybe StyledSVGElement
parseSvg text =
  let
    node = case XmlParser.parse text of
      Ok {processingInstructions, docType, root} -> Maybe.map Tuple.second <| convertNode 0 root
      Err _ -> Nothing
    _ = Debug.log "nodes" node
  in
  node
