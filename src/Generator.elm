module Generator exposing (..)

import Color exposing (Color)
import Color.Convert exposing (..)
import Debug
import Dict exposing (Dict)
import Path.LowLevel
import Tuple exposing (first, second)
import Types exposing (..)
import Utils2 exposing (..)
import XmlParser


generateNode : StyledSVGElement -> XmlParser.Node
generateNode elem =
    let
        styleAttr =
            if Dict.isEmpty elem.style then
                Nothing
            else
                Just <| String.join ";" (List.map (\( x, y ) -> x ++ ":" ++ y) <| Dict.toList elem.style)
    in
    case elem.shape of
        TextNode { value } ->
            XmlParser.Text value

        SVG { elems, size } ->
            let
                xmlSubNodes =
                    List.map generateNode elems

                attrs =
                    Dict.toList elem.attr |> List.map (\( x, y ) -> { name = x, value = y })

                xmlElem =
                    XmlParser.Element "svg" attrs xmlSubNodes
            in
            xmlElem

        Defs { elems } ->
            let
                xmlSubNodes =
                    List.map generateNode elems

                newAttr =
                    maybeInsert "style" styleAttr elem.attr

                attrs =
                    Dict.toList newAttr |> List.map (\( x, y ) -> { name = x, value = y })

                xmlElem =
                    XmlParser.Element "defs" attrs xmlSubNodes
            in
            xmlElem

        LinearGradient { stops } ->
            let
                xmlSubNodes =
                    List.map generateNode stops

                newAttr =
                    maybeInsert "style" styleAttr elem.attr

                attrs =
                    Dict.toList newAttr |> List.map (\( x, y ) -> { name = x, value = y })

                xmlElem =
                    XmlParser.Element "linearGradient" attrs xmlSubNodes
            in
            xmlElem

        RadialGradient { stops } ->
            let
                xmlSubNodes =
                    List.map generateNode stops

                newAttr =
                    maybeInsert "style" styleAttr elem.attr

                attrs =
                    Dict.toList newAttr |> List.map (\( x, y ) -> { name = x, value = y })

                xmlElem =
                    XmlParser.Element "radialGradient" attrs xmlSubNodes
            in
            xmlElem

        Stop stp ->
            let
                newAttr =
                    maybeInsert "offset" (Maybe.map (toString >> (\y -> y ++ "%")) stp.offset)
                        << maybeInsert "stop-color" (Maybe.map colorToCssHsla2 stp.color)
                        << maybeInsert "style" styleAttr
                    <|
                        elem.attr

                attrs =
                    Dict.toList newAttr |> List.map (\( x, y ) -> { name = x, value = y })

                xmlElem =
                    XmlParser.Element "stop" attrs []
            in
            xmlElem

        Unknown { name, elems } ->
            let
                xmlSubNodes =
                    List.map generateNode elems

                newAttr =
                    maybeInsert "style" styleAttr elem.attr

                attrs =
                    Dict.toList newAttr |> List.map (\( x, y ) -> { name = x, value = y })

                xmlElem =
                    XmlParser.Element name attrs xmlSubNodes
            in
            xmlElem

        Rectangle { leftTop, size } ->
            let
                newAttr =
                    Dict.insert "x" (toString <| first leftTop)
                        << Dict.insert "y" (toString <| second leftTop)
                        << Dict.insert "width" (toString <| first size)
                        << Dict.insert "height" (toString <| second size)
                        << maybeInsert "style" styleAttr
                    <|
                        elem.attr

                attrs =
                    Dict.toList newAttr |> List.map (\( x, y ) -> { name = x, value = y })
            in
            XmlParser.Element "rect" attrs []

        Ellipse { center, size } ->
            let
                newAttr =
                    Dict.insert "cx" (toString <| first center)
                        << Dict.insert "cy" (toString <| second center)
                        << Dict.insert "rx" (toString <| first size / 2)
                        << Dict.insert "ry" (toString <| second size / 2)
                        << maybeInsert "style" styleAttr
                    <|
                        elem.attr

                attrs =
                    Dict.toList newAttr |> List.map (\( x, y ) -> { name = x, value = y })
            in
            XmlParser.Element "ellipse" attrs []

        Polygon { points, enclosed } ->
            let
                newAttr =
                    Dict.insert "points" (String.join "," (List.map (\( x, y ) -> toString x ++ " " ++ toString y) points))
                        << maybeInsert "style" styleAttr
                    <|
                        elem.attr

                attrs =
                    Dict.toList newAttr |> List.map (\( x, y ) -> { name = x, value = y })
            in
            XmlParser.Element
                (if enclosed then
                    "polygon"
                 else
                    "polyline"
                )
                attrs
                []

        Path { subPaths } ->
            let
                pathopstr =
                    Path.LowLevel.toString subPaths

                newAttr =
                    Dict.insert "d" pathopstr
                        << maybeInsert "style" styleAttr
                    <|
                        elem.attr

                attrs =
                    Dict.toList newAttr |> List.map (\( x, y ) -> { name = x, value = y })
            in
            XmlParser.Element "path" attrs []
        
        -- leftTop, size is ignored
        Text {elems, baseline, leftTop, size} ->
            let
                xmlSubNodes =
                    List.map generateNode elems

                newAttr =
                    Dict.insert "x" (toString <| first baseline)
                    << Dict.insert "y" (toString <| second baseline)
                    << maybeInsert "style" styleAttr
                    <| elem.attr
                
                attrs =
                    Dict.toList newAttr |> List.map (\( x, y ) -> { name = x, value = y })
            in
            XmlParser.Element "text" attrs xmlSubNodes


generateXml : StyledSVGElement -> String
generateXml elem =
    let
        xmlElem =
            generateNode elem

        xmlRoot =
            { processingInstructions = []
            , docType = Nothing
            , root = xmlElem
            }

        data =
            XmlParser.format xmlRoot
    in
    data
