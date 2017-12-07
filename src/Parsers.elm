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
        in
        (nextId+1, {style = {fill = Nothing, stroke = Nothing}, id = nextId, shape = SVG {elems = subElems}})
      "rect" ->
        let
          x = getFloatAttr "x" attrs
          y = getFloatAttr "y" attrs
          w = getFloatAttr "width" attrs
          h = getFloatAttr "height" attrs     
        in
        (id+1, {
          style = {fill = getStyleAttr "fill" attrs, stroke = getStyleAttr "stroke" attrs},
          id = id,
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
          style = {fill = getStyleAttr "fill" attrs, stroke = getStyleAttr "stroke" attrs},
          id = id,
          shape = Ellipse {center = (cx, cy), size = (rx * 2, ry * 2)}
        })
      others ->
        let
          (nextId, subElems) = loop id subNodes []
        in
        (nextId+1, {style = {fill = Nothing, stroke = Nothing}, id = nextId, shape = Unknown {elems = subElems}})

parseSvg: String -> Maybe StyledSVGElement
parseSvg text =
  let
    node = case XmlParser.parse text of
      Ok {processingInstructions, docType, root} -> Maybe.map Tuple.second <| convertNode 0 root
      Err _ -> Nothing
    _ = Debug.log "nodes" node
  in
  node
