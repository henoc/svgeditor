module Generator exposing (..)

import XmlParser
import Dict exposing (Dict)
import Types exposing (..)
import Debug
import Tuple exposing (first, second)

generateNode: StyledSVGElement -> XmlParser.Node
generateNode elem =
  case elem.shape of
  SVG {elems, size} ->
    let
      xmlSubNodes = List.map generateNode elems
      attrs = Dict.toList elem.attr |> List.map (\(x, y) -> {name = x, value = y}) 
      xmlElem = XmlParser.Element "svg" attrs xmlSubNodes
    in
    xmlElem
  Unknown {name, elems} ->
    let
      xmlSubNodes = List.map generateNode elems
      attrs = Dict.toList elem.attr |> List.map (\(x, y) -> {name = x, value = y}) 
      xmlElem = XmlParser.Element name attrs xmlSubNodes
    in
    xmlElem
  Rectangle {leftTop, size} ->
    let
      newAttrs =
        Dict.insert "x" (toString <| first leftTop) <<
        Dict.insert "y" (toString <| second leftTop) <<
        Dict.insert "width" (toString <| first size) <<
        Dict.insert "height" (toString <| second size) <| elem.attr
      attrs = Dict.toList newAttrs |> List.map (\(x, y) -> {name = x, value = y}) 
    in
    XmlParser.Element "rect" attrs []
  Ellipse {center, size} ->
    let
      newAttrs =
        Dict.insert "cx" (toString <| first center) <<
        Dict.insert "cy" (toString <| second center) <<
        Dict.insert "rx" (toString <| first size / 2) <<
        Dict.insert "ry" (toString <| second size / 2) <| elem.attr
      attrs = Dict.toList newAttrs |> List.map (\(x, y) -> {name = x, value = y}) 
    in
    XmlParser.Element "ellipse" attrs []

generateXml: StyledSVGElement -> String
generateXml elem =
  let
    xmlElem = generateNode elem
    xmlRoot = {
      processingInstructions = [],
      docType = Nothing,
      root = xmlElem
    }
    data = XmlParser.format xmlRoot
  in
  data