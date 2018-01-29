module ViewBuilder exposing (..)

import Color
import Color.Convert exposing (..)
import Dict exposing (Dict)
import Gradients
import Html exposing (..)
import Html.Attributes exposing (attribute, checked, max, min, step, value)
import Html.Events exposing (..)
import Path.LowLevel
import Set exposing (Set)
import Shape
import ShapeList exposing (..)
import Svg exposing (circle, ellipse, path, polygon, polyline, rect, svg)
import Svg.Attributes exposing (..)
import Tuple exposing (first, second)
import Types exposing (..)
import Ui.ColorPanel
import Utils
import Utils2
import Vec2 exposing (..)


-- モデル所有のSVGモデルのDOMを構築する


build : LayerType -> Model -> StyledSVGElement -> Html Msg
build layerType model svg =
    let
        layerName =
            case layerType of
                ColorLayer ->
                    "color"

                PhysicsLayer ->
                    "physics"

        rdomId =
            toString svg.id

        -- 元からあったunknownな属性はそのまま入れる
        -- svgeditor-id属性を新たに加える
        attrList =
            Dict.insert "svgeditor-id" rdomId svg.attr
                |> Dict.insert "svgeditor-layer" layerName
                |> Dict.toList
                |> List.map (\( x, y ) -> attribute x y)

        styleStr =
            Dict.insert "opacity" "0" svg.style
                |> (case layerType of
                        ColorLayer ->
                            \x -> x

                        PhysicsLayer ->
                            Dict.insert "fill" "#000000"
                   )
                |> Dict.toList
                |> List.map (\( x, y ) -> x ++ ":" ++ y)
                |> String.join ";"

        -- 物理レイヤでは HandMode, NodeModeのときだけ図形にクリック判定を与える
        itemClick =
            case layerType of
                ColorLayer ->
                    []

                PhysicsLayer ->
                    case model.mode of
                        HandMode ->
                            [ Utils.onItemMouseDown <| \( shift, pos ) -> OnSelect svg.id shift pos ]

                        NodeMode ->
                            [ Utils.onItemMouseDown <| \( shift, pos ) -> OnSelect svg.id shift pos ]

                        _ ->
                            []
    in
    case svg.shape of
        TextNode { value } ->
            text value

        Text { elems, baseline, leftTop, size } ->
            Svg.text_
                (attrList
                    ++ itemClick
                    ++ [ x (toString <| first baseline)
                       , y (toString <| second baseline)
                       , style styleStr
                       ]
                )
                (List.map (build layerType model) elems)

        Rectangle { leftTop, size } ->
            rect
                (attrList
                    ++ itemClick
                    ++ [ x (toString <| first leftTop)
                       , y (toString <| second leftTop)
                       , width (toString <| first size)
                       , height (toString <| second size)
                       , style styleStr
                       ]
                )
                []

        Ellipse { center, size } ->
            let
                centx =
                    first center
            in
            let
                centy =
                    second center
            in
            let
                sizex =
                    first size
            in
            let
                sizey =
                    second size
            in
            ellipse
                (attrList
                    ++ itemClick
                    ++ [ cx (toString centx)
                       , cy (toString centy)
                       , rx (toString (sizex / 2))
                       , ry (toString (sizey / 2))
                       , style styleStr
                       ]
                )
                []

        Polygon pgn ->
            (if pgn.enclosed then
                polygon
             else
                polyline
            )
                (attrList
                    ++ itemClick
                    ++ [ points (String.join "," (List.map (\( x, y ) -> toString x ++ " " ++ toString y) pgn.points))
                       , style styleStr
                       ]
                )
                []

        Path { subPaths } ->
            let
                pathopstr =
                    Path.LowLevel.toString subPaths
            in
            Svg.path
                (attrList
                    ++ itemClick
                    ++ [ d pathopstr
                       , style styleStr
                       ]
                )
                []

        Stop stp ->
            Svg.stop
                (attrList
                    ++ (stp.offset |> Maybe.map toString |> Maybe.map (\k -> k ++ "%") |> Maybe.map offset |> Utils.maybeToList)
                    ++ (stp.color |> Maybe.map Utils2.colorToCssHsla2 |> Maybe.map stopColor |> Utils.maybeToList)
                    ++ [ style styleStr
                       ]
                )
                []

        SVG { elems, size } ->
            Svg.svg
                (attrList
                    ++ [ width (toString <| first size)
                       , height (toString <| second size)
                       ]
                )
                (List.map (build layerType model) elems)

        Defs { elems } ->
            Svg.defs attrList (List.map (build layerType model) elems)

        LinearGradient { stops } ->
            Svg.linearGradient attrList (List.map (build layerType model) stops)

        RadialGradient { stops } ->
            Svg.radialGradient attrList (List.map (build layerType model) stops)

        Unknown { name, elems } ->
            node name attrList (List.map (build layerType model) elems)



-- unknownは編集できないのでstyleStrはいらないはずである
-- handModeでの選択頂点などを与える


buildVertexes : Model -> List (Html Msg)
buildVertexes model =
    let
        svglst : List StyledSVGElement
        svglst =
            List.map (\k -> Utils.getById k model) (Set.toList model.selected) |> Utils.flatten

        box : Box
        box =
            getMergedBBox svglst

        left =
            first box.leftTop

        top =
            second box.leftTop

        right =
            first box.rightBottom

        bottom =
            second box.rightBottom

        positions =
            [ ( left, top )
            , ( (left + right) / 2, top )
            , ( right, top )
            , ( left, (top + bottom) / 2 )
            , ( right, (top + bottom) / 2 )
            , ( left, bottom )
            , ( (left + right) / 2, bottom )
            , ( right, bottom )
            ]

        rotatePos =
            ( (left + right) / 2, top - (bottom - top) / 2 )
    in
    if List.length svglst == 0 then
        []
    else
        List.map2
            (\pos anti ->
                circle
                    [ cx <| toString (first pos)
                    , cy <| toString (second pos)
                    , r (toString (5 / model.scale))
                    , class "node"
                    , Utils.onItemMouseDown <| \( shift, pos ) -> OnVertex anti pos
                    ]
                    []
            )
            positions
            (List.reverse positions)
            ++ [ circle
                    [ cx <| toString <| first rotatePos
                    , cy <| toString <| second rotatePos
                    , r (toString (7 / model.scale))
                    , class "node"
                    , Utils.onItemMouseDown <| \( shift, pos ) -> OnRotateVertex pos
                    ]
                    []
               ]



-- ノードモードでのノードを表示する 端点が四角で制御点が円


buildNodes : Model -> List (Html Msg)
buildNodes model =
    let
        svglst : List StyledSVGElement
        svglst =
            List.map (\k -> Utils.getById k model) (Set.toList model.selected) |> Utils.flatten

        nodes =
            case List.head svglst of
                Just selected ->
                    Shape.getNodes selected

                Nothing ->
                    []

        provideClass nodeId =
            case model.nodeId of
                Nothing ->
                    "node"

                Just x ->
                    if nodeId == x then
                        "node-toggled"
                    else
                        "node"
    in
    List.indexedMap
        (\index node ->
            let
                nodeIdEndpoint =
                    { index = index, member = Endpoint }
            in
            [ rect
                [ x <| toString (first node.endpoint - 5 / model.scale)
                , y <| toString (second node.endpoint - 5 / model.scale)
                , width <| toString (10 / model.scale)
                , height <| toString (10 / model.scale)
                , class (provideClass nodeIdEndpoint)
                , Utils.onItemMouseDown <| \( shift, pos ) -> OnNode pos nodeIdEndpoint
                ]
                []
            ]
                ++ List.indexedMap
                    (\index2 controlPoint ->
                        let
                            nodeIdControlPoint =
                                { index = index, member = ControlPoint index2 }
                        in
                        circle
                            [ cx <| toString (first controlPoint)
                            , cy <| toString (second controlPoint)
                            , r (toString (5 / model.scale))
                            , class (provideClass nodeIdControlPoint)
                            , Utils.onItemMouseDown <| \( shift, pos ) -> OnNode pos nodeIdControlPoint
                            ]
                            []
                    )
                    node.controlPoints
        )
        nodes
        |> Utils.flattenList


colorPicker : String -> Model -> List (Html Msg)
colorPicker sty model =
    let
        colorPickerState =
            Maybe.withDefault { colorMode = NoneColor, singleColor = Color.black } <| Dict.get sty model.colorPicker

        noneInserted =
            Dict.insert sty { colorPickerState | colorMode = NoneColor } model.colorPicker

        singleInserted =
            Dict.insert sty { colorPickerState | colorMode = SingleColor } model.colorPicker

        anyInserted url =
            Dict.insert sty { colorPickerState | colorMode = AnyColor url } model.colorPicker

        hsl =
            Utils2.toHsl2 colorPickerState.singleColor

        cgHue hue =
            Dict.insert sty { colorPickerState | singleColor = Color.hsla hue hsl.saturation hsl.lightness hsl.alpha } model.colorPicker

        cgSat sat =
            Dict.insert sty { colorPickerState | singleColor = Color.hsla hsl.hue sat hsl.lightness hsl.alpha } model.colorPicker

        cgLig lig =
            Dict.insert sty { colorPickerState | singleColor = Color.hsla hsl.hue hsl.saturation lig hsl.alpha } model.colorPicker

        cgAlp alp =
            Dict.insert sty { colorPickerState | singleColor = Color.hsla hsl.hue hsl.saturation hsl.lightness alp } model.colorPicker

        gradientUrlsNoSharp =
            Dict.keys model.gradients

        gradientUrls =
            gradientUrlsNoSharp |> List.map (\x -> "#" ++ x)

        noSharp url =
            String.dropLeft 1 url

        flex =
            "display: flex"
    in
    [ div [ style flex ]
        ([ div [ style "width: 120px" ] [ text <| sty ]
         , div
            [ style
                ("display: flex; justify-content: center; align-items: center; cursor: pointer; width: 48px; height: 48px; background: "
                    ++ (case colorPickerState.colorMode of
                            -- 色表示の四角形
                            NoneColor ->
                                "hsla(0, 0%, 100%, 0.1)"

                            SingleColor ->
                                Utils2.colorToCssHsla2 colorPickerState.singleColor

                            AnyColor url ->
                                Maybe.map (Gradients.toCssGradient url) (Dict.get (noSharp url) model.gradients)
                                    |> Maybe.withDefault "hsla(0, 0%, 100%, 0.1)"
                       )
                )
            , onClick <|
                OpenedPickerMsg
                    (if model.openedPicker == sty then
                        "none"
                     else
                        sty
                    )
            ]
            (case colorPickerState.colorMode of
                NoneColor ->
                    [ text "none" ]

                SingleColor ->
                    []

                AnyColor url ->
                    []
            )
         ]
            ++ (case model.openedPicker == sty of
                    False ->
                        []

                    True ->
                        [ div [ style "display: flex; flex-direction: column; margin: 0px 10px" ]
                            ([ label []
                                [ input
                                    [ type_ "radio"
                                    , name "colors"
                                    , onClick <| ColorPickerMsg noneInserted
                                    , value "NoneColor"
                                    , checked (colorPickerState.colorMode == NoneColor)
                                    ]
                                    []
                                , span [] []
                                , text "none"
                                ]
                             , label []
                                [ input
                                    [ type_ "radio"
                                    , name "colors"
                                    , onClick <| ColorPickerMsg singleInserted
                                    , value "SingleColor"
                                    , checked (colorPickerState.colorMode == SingleColor)
                                    ]
                                    []
                                , span [] []
                                , text "single"
                                ]
                             ]
                                ++ List.indexedMap
                                    (\index ->
                                        \url ->
                                            label []
                                                [ input
                                                    [ onClick <| ColorPickerMsg <| anyInserted url
                                                    , name "colors"
                                                    , value "AnyColor"
                                                    , type_ "radio"
                                                    , checked (colorPickerState.colorMode == AnyColor url)
                                                    ]
                                                    []
                                                , span [] []
                                                , text url
                                                ]
                                    )
                                    gradientUrls
                            )
                        , case colorPickerState.colorMode of
                            NoneColor ->
                                div [] []

                            AnyColor url ->
                                div [] []

                            SingleColor ->
                                Html.map ColorPanelMsg <| Ui.ColorPanel.view model.colorPanel
                        ]
               )
        )
    ]


gradientItem : String -> GradientInfo -> Model -> Html Msg
gradientItem ident ginfo model =
    let
        cssString =
            Gradients.toCssGradient ("#" ++ ident) ginfo

        stops =
            ginfo.stops

        svgClear =
            svg [ width "24px", height "24px" ] [ Svg.path [ fill "currentColor", d "M19,6.41L17.59,5L12,10.59L6.41,5L5,6.41L10.59,12L5,17.59L6.41,19L12,13.41L17.59,19L19,17.59L13.41,12L19,6.41Z" ] [] ]

        svgAdd =
            svg [ width "24px", height "24px" ] [ Svg.path [ fill "currentColor", d "M19,13H13V19H11V13H5V11H11V5H13V11H19V13Z" ] [] ]
    in
    div [ style "display: flex; flex-wrap: wrap; box-shadow: 4px 4px 8px black" ]
        [ div []
            [ div [ class "circle", style ("background: " ++ cssString) ] []
            , text ("#" ++ ident)
            , div [ class "button", RemoveGradient ident |> onClick ] [ svgClear ]
            ]
        , div [ style "display: flex; flex-wrap: wrap" ]
            (stops
                |> List.indexedMap (\index ( ofs, clr ) -> ( input [ type_ "range", onInput (\f -> ChangeStop ident index (floor <| Result.withDefault 0 <| String.toFloat f) clr), value <| toString ofs, Html.Attributes.min "0", Html.Attributes.max "100", step "10" ] [], clr ))
                |> List.indexedMap
                    (\index ( slider, clr ) ->
                        div
                            [ style "display: flex; flex-direction: column; margin: 1em; padding: 0.5em"
                            ]
                            [ div
                                [ class "mini-circle"
                                , style ("cursor: pointer; background: " ++ colorToCssRgba clr)
                                , onClick <| FocusToStop ident index
                                ]
                                []
                            , case model.gradientPanelLink of
                                Nothing ->
                                    slider

                                Just ( idt, idx ) ->
                                    if idt == ident && idx == index then
                                        Html.map GradientPanelMsg <| Ui.ColorPanel.view model.gradientPanel
                                    else
                                        slider
                            , div [ class "button", RemoveStop ident index |> onClick ] [ svgClear ]
                            ]
                    )
            )
        , div [ class "button", AddNewStop ident |> onClick ] [ svgAdd ]
        ]
