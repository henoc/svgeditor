module Generator exposing (..)

import XmlParser
import Dict exposing (Dict)
import Types exposing (..)
import Debug

generateNode: StyledSVGElement -> XmlParser.Node
generateNode elem =
  let
    attrs = Dict.toList elem.attr |> List.map (\(x, y) -> {name = x, value = y})   
  in
  case elem.shape of
  SVG {elems, size} ->
    let
      xmlSubNodes = List.map generateNode elems
      xmlElem = XmlParser.Element "svg" attrs xmlSubNodes
    in
    xmlElem
  Unknown {name, elems} ->
    let
      xmlSubNodes = List.map generateNode elems
      xmlElem = XmlParser.Element name attrs xmlSubNodes
    in
    xmlElem
  Rectangle _ ->
    XmlParser.Element "rect" attrs []
  Ellipse _ ->
    XmlParser.Element "ellipse" attrs []

generateXml: StyledSVGElement -> String
generateXml elem =
  let
    xmlElem = generateNode elem
    xmlRoot = {
      processingInstructions = [{name="xml", value="version=\"1.0\""}],
      docType = Nothing,
      root = xmlElem
    }
    data = XmlParser.format xmlRoot
  in
  data