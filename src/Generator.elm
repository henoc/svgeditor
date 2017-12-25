module Generator exposing (..)

import XmlParser
import Dict exposing (Dict)
import Types exposing (..)
import Debug
import Tuple exposing (first, second)

maybeInsert: String -> Maybe String -> Dict String String -> Dict String String
maybeInsert key maybeValue dict = case maybeValue of
  Just x -> Dict.insert key x dict
  Nothing -> dict

generateNode: StyledSVGElement -> XmlParser.Node
generateNode elem =
  let
    styleAttr = if Dict.isEmpty elem.style then Nothing else Just <| String.join ";" (List.map (\(x,y) -> x ++ ":" ++ y) <| Dict.toList elem.style)
  in
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
      newAttr = maybeInsert "style" styleAttr elem.attr
      attrs = Dict.toList newAttr |> List.map (\(x, y) -> {name = x, value = y}) 
      xmlElem = XmlParser.Element name attrs xmlSubNodes
    in
    xmlElem
  Rectangle {leftTop, size} ->
    let
      newAttr =
        Dict.insert "x" (toString <| first leftTop) <<
        Dict.insert "y" (toString <| second leftTop) <<
        Dict.insert "width" (toString <| first size) <<
        Dict.insert "height" (toString <| second size) <<
        maybeInsert "style" styleAttr <| elem.attr
      attrs = Dict.toList newAttr |> List.map (\(x, y) -> {name = x, value = y}) 
    in
    XmlParser.Element "rect" attrs []
  Ellipse {center, size} ->
    let
      newAttr =
        Dict.insert "cx" (toString <| first center) <<
        Dict.insert "cy" (toString <| second center) <<
        Dict.insert "rx" (toString <| first size / 2) <<
        Dict.insert "ry" (toString <| second size / 2) <<
        maybeInsert "style" styleAttr <| elem.attr
      attrs = Dict.toList newAttr |> List.map (\(x, y) -> {name = x, value = y}) 
    in
    XmlParser.Element "ellipse" attrs []
  Polygon {points, enclosed} ->
    let
      newAttr =
        Dict.insert "points" (String.join "," (List.map (\(x,y) -> (toString x) ++ " " ++ (toString y)) points)) <<
        maybeInsert "style" styleAttr <| elem.attr
      attrs = Dict.toList newAttr |> List.map (\(x,y) -> {name = x, value = y})
    in 
    XmlParser.Element (if enclosed then "polygon" else "polyline") attrs []
  Path {operators} ->
    let
      opstr: PathOperator -> String
      opstr op = op.kind ++ " " ++ (String.join "," (List.map (\(x,y) -> (toString x ++ " " ++ toString y)) op.points))
      pathopstr = List.map opstr (List.reverse operators) |> String.join " "
      newAttr =
        Dict.insert "d" pathopstr <<
        maybeInsert "style" styleAttr <| elem.attr
      attrs = Dict.toList newAttr |> List.map (\(x,y) -> {name = x, value = y})
    in
    XmlParser.Element "path" attrs []

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