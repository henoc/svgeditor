module Gradients exposing (..)

import Color exposing (Color)
import Debug
import Dict exposing (Dict)
import Tuple exposing (..)
import Types exposing (..)
import Utils
import Utils2


toCssGradientName : GradientType -> String
toCssGradientName gradientType =
    case gradientType of
        Linear ->
            "linear-gradient"

        Radial ->
            "radial-gradient"


toCssGradient : String -> GradientInfo -> String
toCssGradient sharpedUrl ginfo =
    let
        urlNoSharp =
            String.right 1 sharpedUrl

        expandStops stops =
            case stops of
                hd :: tl ->
                    let
                        percent =
                            (toString <| first hd) ++ "%"

                        colorString =
                            Utils2.colorToCssHsla2 (second hd)
                    in
                    (colorString ++ " " ++ percent) :: expandStops tl

                [] ->
                    []

        leftOrNone gType =
            case gType of
                Linear ->
                    "to right, "

                Radial ->
                    ""
    in
    toCssGradientName ginfo.gradientType ++ "(" ++ leftOrNone ginfo.gradientType ++ String.join "," (expandStops ginfo.stops) ++ ")"



-- 与えられたgradElemがグラデーション要素ならば、idの一致したGradientInfoで更新する


updateGradient : Dict String GradientInfo -> StyledSVGElement -> StyledSVGElement
updateGradient definedGradients gradElem =
    let
        getOrderedGradInfo ginfo =
            ginfo.stops |> List.sortBy first

        loop stops orderedInfo =
            case ( stops, orderedInfo ) of
                ( stopHd :: stopTl, orderedInfoHd :: orderedInfoTl ) ->
                    case stopHd.shape of
                        Stop _ ->
                            { stopHd | shape = Stop { offset = Just <| first orderedInfoHd, color = Just <| second orderedInfoHd } } :: loop stopTl orderedInfoTl

                        _ ->
                            stopHd :: loop stopTl orderedInfo

                _ ->
                    stops
    in
    case gradElem.shape of
        LinearGradient { identifier, stops } ->
            case Dict.get identifier definedGradients of
                Just ginfo ->
                    { gradElem | shape = LinearGradient { identifier = identifier, stops = loop stops (getOrderedGradInfo ginfo) } }

                Nothing ->
                    gradElem

        RadialGradient { identifier, stops } ->
            case Dict.get identifier definedGradients of
                Just ginfo ->
                    { gradElem | shape = RadialGradient { identifier = identifier, stops = loop stops (getOrderedGradInfo ginfo) } }

                Nothing ->
                    gradElem

        other ->
            gradElem


removeAt : String -> Int -> StyledSVGElement -> StyledSVGElement
removeAt ident index gradElem =
    let
        helper : Int -> Int -> List StyledSVGElement -> List StyledSVGElement
        helper index cnt lst =
            case lst of
                hd :: tl ->
                    case hd.shape of
                        Stop stp ->
                            case index == cnt of
                                True ->
                                    tl

                                False ->
                                    hd :: helper index (cnt + 1) tl

                        _ ->
                            hd :: helper index cnt tl

                [] ->
                    []
    in
    case gradElem.shape of
        LinearGradient { identifier, stops } ->
            if ident == identifier then
                { gradElem | shape = LinearGradient { identifier = identifier, stops = helper index 0 stops } }
            else
                gradElem

        RadialGradient { identifier, stops } ->
            if ident == identifier then
                { gradElem | shape = RadialGradient { identifier = identifier, stops = helper index 0 stops } }
            else
                gradElem

        _ ->
            gradElem



-- intはsvgeditor-id


makeStops : Int -> List ( Int, Color ) -> ( List StyledSVGElement, Int )
makeStops i colors =
    let
        lst =
            colors
                |> List.indexedMap
                    (\index ( offset, color ) ->
                        { style = Dict.empty
                        , attr = Dict.empty
                        , id = i + index
                        , shape = Stop { offset = Just offset, color = Just color }
                        }
                    )
    in
    ( lst, List.length lst + i )


addElemInDefs : StyledSVGElement -> Model -> Model
addElemInDefs elem model =
    let
        model2 =
            Utils.addElem { style = Dict.empty, attr = Dict.empty, id = model.idGen, shape = Defs { elems = [ elem ] } } { model | idGen = model.idGen + 1 }
    in
    mergeAllDefs model2



-- identの一致するlinear or radial要素をelemに置換


replaceElemInDefs : String -> StyledSVGElement -> Model -> Model
replaceElemInDefs ident elem model =
    let
        defsElems =
            Utils.getDefsElems model

        loop defsElems =
            case defsElems of
                hd :: tl ->
                    case hd.shape of
                        LinearGradient { identifier, stops } ->
                            if ident == identifier then
                                elem :: loop tl
                            else
                                hd :: loop tl

                        RadialGradient { identifier, stops } ->
                            if ident == identifier then
                                elem :: loop tl
                            else
                                hd :: loop tl

                        other ->
                            hd :: loop tl

                [] ->
                    []

        newDefsElems =
            loop defsElems

        newDefs =
            { style = Dict.empty
            , attr = Dict.empty
            , id = model.idGen
            , shape = Defs { elems = newDefsElems }
            }

        newElems =
            newDefs :: (model |> removeAllDefs |> Utils.getElems)
    in
    model |> replaceElems newElems |> (\mdl -> { mdl | idGen = mdl.idGen + 1 })


mergeAllDefs : Model -> Model
mergeAllDefs model =
    let
        defsElems =
            Utils.getDefsElems model

        model2 =
            removeAllDefs model
    in
    Utils.addElem { style = Dict.empty, attr = Dict.empty, id = model.idGen, shape = Defs { elems = defsElems } } { model2 | idGen = model2.idGen + 1 }


removeAllDefs : Model -> Model
removeAllDefs model =
    let
        elems =
            Utils.getElems model

        loop : List StyledSVGElement -> List StyledSVGElement
        loop lst =
            case lst of
                hd :: tl ->
                    case hd.shape of
                        Defs _ ->
                            loop tl

                        _ ->
                            hd :: loop tl

                [] ->
                    []

        newElems =
            loop elems
    in
    replaceElems newElems model


remove : String -> Model -> Model
remove ident model =
    let
        defsElems =
            Utils.getDefsElems model

        loop : List StyledSVGElement -> List StyledSVGElement
        loop lst =
            case lst of
                hd :: tl ->
                    case hd.shape of
                        LinearGradient { identifier, stops } ->
                            if identifier == ident then
                                loop tl
                            else
                                hd :: loop tl

                        RadialGradient { identifier, stops } ->
                            if identifier == ident then
                                loop tl
                            else
                                hd :: loop tl

                        _ ->
                            hd :: loop tl

                [] ->
                    []

        newDefsElems =
            loop defsElems

        newDefs =
            { style = Dict.empty
            , attr = Dict.empty
            , id = model.idGen
            , shape = Defs { elems = newDefsElems }
            }

        newElems =
            newDefs :: (model |> removeAllDefs |> Utils.getElems)
    in
    model |> replaceElems newElems |> (\mdl -> { mdl | idGen = mdl.idGen + 1 })


replaceElems : List StyledSVGElement -> Model -> Model
replaceElems elemlst model =
    let
        newShape =
            case model.svg.shape of
                SVG { elems, size } ->
                    SVG { elems = elemlst, size = size }

                _ ->
                    model.svg.shape

        modelSvg =
            model.svg
    in
    { model | svg = { modelSvg | shape = newShape } }


addNewStopElems : String -> List StyledSVGElement -> Model -> Model
addNewStopElems ident stops model =
    let
        maybeGradElem =
            findGradElem ident model
    in
    maybeGradElem
        |> Maybe.map (addNewStopToGradElem stops)
        |> Maybe.map (\k -> replaceElemInDefs ident k model)
        |> Maybe.withDefault model


findGradElem : String -> Model -> Maybe StyledSVGElement
findGradElem ident model =
    let
        loop elems =
            case elems of
                hd :: tl ->
                    case hd.shape of
                        LinearGradient { identifier, stops } ->
                            if identifier == ident then
                                Just hd
                            else
                                loop tl

                        RadialGradient { identifier, stops } ->
                            if identifier == ident then
                                Just hd
                            else
                                loop tl

                        _ ->
                            loop tl

                [] ->
                    Nothing
    in
    loop (Utils.getDefsElems model)


addNewStopToGradElem : List StyledSVGElement -> StyledSVGElement -> StyledSVGElement
addNewStopToGradElem newStops gradElem =
    let
        gradElemShape =
            gradElem.shape
    in
    case gradElemShape of
        LinearGradient { identifier, stops } ->
            { gradElem | shape = LinearGradient { identifier = identifier, stops = stops ++ newStops } }

        RadialGradient { identifier, stops } ->
            { gradElem | shape = RadialGradient { identifier = identifier, stops = stops ++ newStops } }

        other ->
            gradElem
