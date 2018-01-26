module Parsers exposing (..)

import Color exposing (Color)
import Color.Convert exposing (..)
import Combinators exposing (..)
import Debug
import Dict exposing (Dict)
import Path.LowLevel.Parser as PathParser
import Paths
import Tuple exposing (..)
import Types exposing (..)
import Utils
import XmlParser


-- Non-Parsers
-- rgb(x,y,z) & opacity を ColorType にする


rgbToColorType : String -> Float -> ColorType
rgbToColorType data opacity =
    case data of
        "none" ->
            NoneColorType

        "" ->
            NoneColorType

        _ ->
            case rgbParser (input data "[\\(\\),\\s]+") of
                ParseSuccess ( r, g, b, Just a ) i ->
                    SingleColorType (Color.rgba r g b (a * opacity))

                ParseSuccess ( r, g, b, Nothing ) i ->
                    SingleColorType (Color.rgba r g b opacity)

                ParseFailure r i ->
                    case urlParser (input data "[\\(\\)\\s\"]+") of
                        ParseSuccess identifier i ->
                            AnyColorType identifier

                        ParseFailure r i ->
                            NoneColorType



-- rgb(x,y,z) & opacity を Color にする


rgbToColor : String -> Float -> Color
rgbToColor data opacity =
    case rgbParser (input data "[\\(\\),\\s]+") of
        ParseSuccess ( r, g, b, Just a ) i ->
            Color.rgba r g b (a * opacity)

        ParseSuccess ( r, g, b, Nothing ) i ->
            Color.rgba r g b opacity

        ParseFailure r i ->
            Color.black


percentAsInt : String -> Int
percentAsInt percent =
    case percentParser (input percent "[\\s]+") of
        ParseSuccess f i ->
            floor f

        ParseFailure r i ->
            0



-- 単位(px or %)付き値のパース


floatWithUnit : String -> Maybe ( Float, ValueUnit )
floatWithUnit valueWithUnit =
    case percentParser (input valueWithUnit "[\\s]+") of
        ParseSuccess f i ->
            Just ( f, Percent )

        ParseFailure r i ->
            case pixelParser (input valueWithUnit "[\\s]+") of
                ParseSuccess f i ->
                    Just ( f, Px )

                ParseFailure r i ->
                    Nothing



-- Parsers


intParser : Parser Int
intParser =
    \input ->
        case regexParser "[0-9]+" input of
            ParseSuccess r i ->
                case String.toInt r of
                    Ok k ->
                        ParseSuccess k i

                    Err _ ->
                        ParseFailure "unreached" i

            ParseFailure r i ->
                ParseFailure r i



-- rgb or rgba


rgbParser : Parser ( Int, Int, Int, Maybe Float )
rgbParser =
    let
        rgba =
            onlyRight (stringParser "rgba") (andThen (andThen (andThen intParser intParser) intParser) floatParser) |> map (\( ( ( x, y ), z ), w ) -> ( x, y, z, Just w ))

        rgb =
            onlyRight (stringParser "rgb") (andThen (andThen intParser intParser) intParser) |> map (\( ( x, y ), z ) -> ( x, y, z, Nothing ))
    in
    or rgba rgb


urlParser : Parser String
urlParser =
    onlyRight (stringParser "url") (regexParser "^#[a-zA-Z0-9_\\-.]+")


stylePairParser : Parser ( String, String )
stylePairParser =
    andThen (regexParser "[^:]+") (regexParser "[^;]+")


styleParser : Parser (Dict String String)
styleParser =
    Combinators.map Dict.fromList <| rep stylePairParser


floatParser : Parser Float
floatParser =
    regexParser "[+-]?[0-9]+(\\.[0-9]*)?([eE][+-]?[0-9]+)?" |> Combinators.map (\x -> Result.withDefault 0 <| String.toFloat x)


percentParser : Parser Float
percentParser =
    onlyLeft floatParser (stringParser "%")


pixelParser : Parser Float
pixelParser =
    onlyLeft floatParser (stringParser "px")


pointPairParser : Parser ( Float, Float )
pointPairParser =
    andThen floatParser floatParser


pointsParser : Parser (List ( Float, Float ))
pointsParser =
    rep pointPairParser


getAttr : String -> List XmlParser.Attribute -> Maybe String
getAttr name attrs =
    let
        attrMap =
            Dict.fromList <| List.map (\a -> ( a.name, a.value )) attrs
    in
    Dict.get name attrMap


getStyleAttr : String -> List XmlParser.Attribute -> Maybe String
getStyleAttr name attrs =
    case getAttr "style" attrs of
        Nothing ->
            Nothing

        Just style ->
            case styleParser <| input style "[:;]" of
                ParseSuccess d i ->
                    Dict.get name d

                _ ->
                    Nothing


getStyle : List XmlParser.Attribute -> StyleInfo
getStyle attrs =
    case getAttr "style" attrs of
        Nothing ->
            Dict.empty

        Just style ->
            case styleParser <| input style "[:;]" of
                ParseSuccess dict i ->
                    dict

                _ ->
                    Dict.empty


floatAttr : Float -> Maybe String -> Float
floatAttr default maybeAttr =
    case maybeAttr of
        Nothing ->
            default

        Just x ->
            Result.withDefault default (String.toFloat x)


getFloatAttr : String -> Float -> List XmlParser.Attribute -> Float
getFloatAttr name default attrs =
    floatAttr default <| getAttr name attrs


convertNode : Int -> XmlParser.Node -> ( Int, StyledSVGElement )
convertNode id node =
    case node of
        XmlParser.Text text ->
            ( id + 1
            , { style = Dict.empty
              , id = id
              , attr = Dict.empty
              , shape = TextNode { value = text }
              }
            )

        XmlParser.Element name attrs subNodes ->
            let
                styleMap =
                    getStyle attrs

                attrMap =
                    Dict.fromList <| List.map (\a -> ( a.name, a.value )) attrs

                loop id subNodes acc =
                    case subNodes of
                        [] ->
                            ( id, List.reverse acc )

                        hd :: tl ->
                            let
                                ( nextId, e ) =
                                    convertNode id hd
                            in
                            loop nextId tl (e :: acc)
            in
            case name of
                "svg" ->
                    let
                        ( nextId, subElems ) =
                            loop id subNodes []

                        w =
                            getFloatAttr "width" 400 attrs

                        h =
                            getFloatAttr "height" 400 attrs
                    in
                    ( nextId + 1
                    , { style = styleMap
                      , id = nextId
                      , attr = attrMap
                      , shape = SVG { elems = subElems, size = ( w, h ) }
                      }
                    )

                "defs" ->
                    let
                        ( nextId, subElems ) =
                            loop id subNodes []
                    in
                    ( nextId + 1
                    , { style = styleMap
                      , id = nextId
                      , attr = attrMap
                      , shape = Defs { elems = subElems }
                      }
                    )

                "linearGradient" ->
                    let
                        ( nextId, subElems ) =
                            loop id subNodes []
                    in
                    ( nextId + 1
                    , { style = styleMap
                      , id = nextId
                      , attr = attrMap
                      , shape = LinearGradient { identifier = Dict.get "id" attrMap |> Maybe.withDefault "NoId", stops = subElems }
                      }
                    )

                "radialGradient" ->
                    let
                        ( nextId, subElems ) =
                            loop id subNodes []
                    in
                    ( nextId + 1
                    , { style = styleMap
                      , id = nextId
                      , attr = attrMap
                      , shape = RadialGradient { identifier = Dict.get "id" attrMap |> Maybe.withDefault "NoId", stops = subElems }
                      }
                    )

                "stop" ->
                    ( id + 1
                    , { style = styleMap
                      , id = id
                      , attr = attrMap
                      , shape = Stop { offset = Nothing, color = Nothing }
                      }
                    )

                "rect" ->
                    let
                        x =
                            getFloatAttr "x" 0 attrs

                        y =
                            getFloatAttr "y" 0 attrs

                        w =
                            getFloatAttr "width" 0 attrs

                        h =
                            getFloatAttr "height" 0 attrs
                    in
                    ( id + 1
                    , { style = styleMap
                      , id = id
                      , attr = attrMap
                      , shape = Rectangle { leftTop = ( x, y ), size = ( w, h ) }
                      }
                    )

                "ellipse" ->
                    let
                        rx =
                            getFloatAttr "rx" 0 attrs

                        ry =
                            getFloatAttr "ry" 0 attrs

                        cx =
                            getFloatAttr "cx" 0 attrs

                        cy =
                            getFloatAttr "cy" 0 attrs
                    in
                    ( id + 1
                    , { style = styleMap
                      , id = id
                      , attr = attrMap
                      , shape = Ellipse { center = ( cx, cy ), size = ( rx * 2, ry * 2 ) }
                      }
                    )

                "polygon" ->
                    let
                        points =
                            case pointsParser <| input (Maybe.withDefault "" (getAttr "points" attrs)) "[\\s,]+" of
                                ParseSuccess r i ->
                                    r

                                ParseFailure _ _ ->
                                    []
                    in
                    ( id + 1
                    , { style = styleMap
                      , id = id
                      , attr = attrMap
                      , shape = Polygon { points = points, enclosed = True }
                      }
                    )

                "polyline" ->
                    let
                        points =
                            case pointsParser <| input (Maybe.withDefault "" (getAttr "points" attrs)) "[\\s,]+" of
                                ParseSuccess r i ->
                                    r

                                ParseFailure _ _ ->
                                    []
                    in
                    ( id + 1
                    , { style = styleMap
                      , id = id
                      , attr = attrMap
                      , shape = Polygon { points = points, enclosed = False }
                      }
                    )

                "path" ->
                    let
                        pathOps =
                            getAttr "d" attrs |> Maybe.map (PathParser.parse >> Result.withDefault []) |> Maybe.withDefault []
                    in
                    ( id + 1
                    , { style = styleMap
                      , id = id
                      , attr = attrMap
                      , shape = Path { subPaths = pathOps }
                      }
                    )

                others ->
                    let
                        ( nextId, subElems ) =
                            loop id subNodes []
                    in
                    ( nextId + 1
                    , { style = styleMap
                      , id = nextId
                      , attr = attrMap
                      , shape = Unknown { name = name, elems = subElems }
                      }
                    )


parseSvg : String -> Maybe ( Int, StyledSVGElement )
parseSvg text =
    let
        node =
            case XmlParser.parse text of
                Ok { processingInstructions, docType, root } ->
                    Just <| convertNode 0 root

                Err _ ->
                    Nothing
    in
    node
