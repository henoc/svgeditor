module Parsers exposing (..)

import HtmlParser
import Types exposing (..)
import Combinators exposing (..)
import Dict exposing (Dict)
import Utils
import Debug

stylePairParser: Parser (String, String)
stylePairParser = andThen (regexParser "[^\\s:]+") (regexParser "[^\\s;]+")

styleParser: Parser (Dict String String)
styleParser = Combinators.map Dict.fromList <| rep stylePairParser

getAttr: String -> HtmlParser.Attributes -> Maybe String
getAttr name attrs =
  let
      attrMap = Dict.fromList attrs
  in
  Dict.get name attrMap

getStyleAttr: String -> HtmlParser.Attributes -> Maybe String
getStyleAttr name attrs = case getAttr "style" attrs of
  Nothing -> Nothing
  Just style -> case styleParser <| normalInput style of
    ParseSuccess d i -> Dict.get name d
    _ -> Nothing

convertNode: HtmlParser.Node -> Maybe StyledSVGElement
convertNode node = case node of
  HtmlParser.Text text -> Nothing
  HtmlParser.Comment text -> Nothing
  HtmlParser.Element name attrs subNodes ->
    case name of
      "svg" ->
        let subElems = List.map convertNode subNodes |> Utils.flatten in
        Just {style = {fill = Nothing, stroke = Nothing}, id = 0, shape = SVG {elems = subElems}}
      "rect" ->
        let
          xStr = Maybe.withDefault "0" <| getAttr "x" attrs
          yStr = Maybe.withDefault "0" <| getAttr "y" attrs
          wStr = Maybe.withDefault "0" <| getAttr "width" attrs
          hStr = Maybe.withDefault "0" <| getAttr "height" attrs
          x = Result.withDefault 0 (String.toFloat xStr)
          y = Result.withDefault 0 (String.toFloat yStr)
          w = Result.withDefault 0 (String.toFloat wStr)
          h = Result.withDefault 0 (String.toFloat hStr)          
        in
        Just {
          style = {fill = getStyleAttr "fill" attrs, stroke = getStyleAttr "stroke" attrs},
          id = 0,
          shape = Rectangle {leftTop = (x, y), size = (w, h)}
        }
      others ->
        let subElems = List.map convertNode subNodes |> Utils.flatten in
        Just {style = {fill = Nothing, stroke = Nothing}, id = 0, shape = Unknown {elems = subElems}}

parseSvg: String -> Maybe StyledSVGElement
parseSvg text =
  let
    nodes = HtmlParser.parse text
  in
  case List.map convertNode nodes |> Utils.flatten of
    hd :: tl -> Just hd
    _ -> Nothing
