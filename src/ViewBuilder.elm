module ViewBuilder exposing (..)

import Color
import Color.Convert exposing (..)
import Dict exposing (Dict)
import Gradients
import Html exposing (..)
import Html.Attributes exposing (attribute, value)
import Html.Events exposing (..)
import Material.Button as Button
import Material.Card as Card
import Material.Elevation as Elevation
import Material.Icon as Icon
import Material.Options as Options
import Material.Slider as Slider
import Material.Toggles as Toggles
import Material.Typography as Typo
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
        Rectangle { leftTop, size } ->
            let
                left =
                    leftTop -# size /# ( 2, 2 )
            in
            rect
                (attrList
                    ++ itemClick
                    ++ [ x (toString <| Tuple.first leftTop)
                       , y (toString <| Tuple.second leftTop)
                       , width (toString <| Tuple.first size)
                       , height (toString <| Tuple.second size)
                       , style styleStr
                       ]
                )
                []

        Ellipse { center, size } ->
            let
                centx =
                    Tuple.first center
            in
            let
                centy =
                    Tuple.second center
            in
            let
                sizex =
                    Tuple.first size
            in
            let
                sizey =
                    Tuple.second size
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

        Path { subPathes } ->
            let
                pathopstr =
                    Path.LowLevel.toString subPathes
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
                    ++ [ width (toString <| Tuple.first size)
                       , height (toString <| Tuple.second size)
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
    in
    if List.length svglst == 0 then
        []
    else
        List.map2
            (\pos ->
                \anti ->
                    circle
                        [ cx <| toString (first pos)
                        , cy <| toString (second pos)
                        , r "5"
                        , fill "#AA5533"
                        , stroke "#553311"
                        , Utils.onItemMouseDown <| \( shift, pos ) -> OnVertex anti pos
                        ]
                        []
            )
            positions
            (List.reverse positions)



-- ノードモードでのノードを表示する


buildNodes : Model -> List (Html Msg)
buildNodes model =
    let
        svglst : List StyledSVGElement
        svglst =
            List.map (\k -> Utils.getById k model) (Set.toList model.selected) |> Utils.flatten

        positions =
            case List.head svglst of
                Just selected ->
                    Shape.getPoints selected

                Nothing ->
                    []

        nodeIds =
            List.range 0 (List.length positions - 1)
    in
    List.map2
        (\pos ->
            \nodeId ->
                circle
                    [ cx <| toString (first pos)
                    , cy <| toString (second pos)
                    , r "5"
                    , fill "#AA5533"
                    , stroke "#553311"
                    , Utils.onItemMouseDown <| \( shift, pos ) -> OnNode pos nodeId
                    ]
                    []
        )
        positions
        nodeIds


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

        gradients =
            Utils.getGradients model

        gradientUrlsNoSharp =
            List.map .attr gradients |> List.map (Dict.get "id") |> Utils.flatten

        gradientUrls =
            gradientUrlsNoSharp |> List.map (\x -> "#" ++ x)

        noSharp url =
            String.dropLeft 1 url

        flex =
            "display: flex"
    in
    [ div [ style flex ]
        ([ Options.styled p [ Typo.subhead, Options.css "width" "60px" ] [ text <| sty ++ ":" ]
         , Options.div
            [ if model.openedPicker == sty then
                Elevation.e0
              else
                Elevation.e4
            , Elevation.transition 300
            , Options.css "width" "48px"
            , Options.css "height" "48px"
            , Options.css "background"
                (case colorPickerState.colorMode of
                    -- 色表示の四角形
                    NoneColor ->
                        "hsla(0, 0%, 100%, 0.1)"

                    SingleColor ->
                        Utils2.colorToCssHsla2 colorPickerState.singleColor

                    AnyColor url ->
                        Maybe.map (Gradients.toCssGradient url) (Dict.get (noSharp url) model.gradients)
                            |> Maybe.withDefault "hsla(0, 0%, 100%, 0.1)"
                )
            , Options.css "cursor" "pointer"
            , Options.center
            , Options.onClick <|
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
                            ([ Toggles.radio Mdl
                                [ 0 ]
                                model.mdl
                                [ Options.onToggle <| ColorPickerMsg noneInserted
                                , Toggles.value (colorPickerState.colorMode == NoneColor)
                                ]
                                [ text "none" ]
                             , Toggles.radio Mdl
                                [ 1 ]
                                model.mdl
                                [ Options.onToggle <| ColorPickerMsg singleInserted
                                , Toggles.value (colorPickerState.colorMode == SingleColor)
                                ]
                                [ text "single" ]
                             ]
                                ++ List.indexedMap
                                    (\index ->
                                        \url ->
                                            Toggles.radio Mdl
                                                [ 2 + index ]
                                                model.mdl
                                                [ Options.onToggle <| ColorPickerMsg <| anyInserted url
                                                , Toggles.value (colorPickerState.colorMode == AnyColor url)
                                                ]
                                                [ text url ]
                                    )
                                    gradientUrls
                            )
                        ]
                            ++ (case colorPickerState.colorMode of
                                    NoneColor ->
                                        []

                                    AnyColor url ->
                                        []

                                    SingleColor ->
                                        [ Html.map ColorPanelMsg <| Ui.ColorPanel.view model.colorPanel
                                        ]
                               )
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

        buttonCss =
            [ Button.icon, Button.colored ]
    in
    Options.div
        [ Elevation.e4
        ]
        [ div [ style "display: flex; flex-wrap: wrap" ]
            [ div []
                [ div [ class "circle", style ("background: " ++ cssString) ] []
                , Options.styled p [ Typo.subhead ] [ text ("#" ++ ident) ]
                , Button.render Mdl [ 200 ] model.mdl (buttonCss ++ [ RemoveGradient ident |> Options.onClick ]) [ Icon.i "clear" ]
                ]
            , div [ style "display: flex; flex-wrap: wrap" ]
                (stops
                    |> List.indexedMap (\index ( ofs, clr ) -> ( Slider.view [ Slider.onChange (\f -> ChangeStop ident index (floor f) clr), Slider.value <| toFloat ofs, Slider.min 0, Slider.max 100, Slider.step 10 ], clr ))
                    |> List.indexedMap
                        (\index ( slider, clr ) ->
                            Options.div
                                [ Options.css "display" "flex"
                                , Options.css "flex-direction" "column"
                                , Options.css "margin" "1em"
                                , Options.css "padding" "0.5em"
                                , Elevation.e4
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
                                , Button.render Mdl [ 201 ] model.mdl (buttonCss ++ [ RemoveStop ident index |> Options.onClick ]) [ Icon.i "clear" ]
                                ]
                        )
                )
            , Button.render Mdl [ 202 ] model.mdl (buttonCss ++ [ AddNewStop ident |> Options.onClick ]) [ Icon.i "add" ]
            ]
        ]
