module Parsers exposing (..)

import HtmlParser exposing (parse)
import Types exposing (..)

-- parseSvg: String -> SVGSVGElement
-- parseSvg text =
--   let
--     nodeList = parse text
--     -- ルートにあるsvgノードをみつける
--     findSvg : List HtmlParser.Node -> Maybe HtmlPArser.Element
--     findSvg nlst = case nlst of
--       [] -> Nothing
--       hd :: tl -> case hd of
--         Element name _ _->
--           if name == "svg" then Just hd
--           else findSvg tl
--         _ -> findSvg tl
--   in


-- convert: HtmlParser.Element -> StyledSVGElement
-- convert elem = ?

-- styleParser: String -> AnyStyleInfo


-- stylePairParser: String -> Parser (String, String)
-- stylePairParser text = (((regex "[^ :]+") <* whitespace) <* (string ":") <* whitespace) >>= (regex "[^ ;]+")

