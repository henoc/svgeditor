module ShapeMode exposing (..)

import Dict exposing (Dict)
import List.Extra
import Path.LowLevel exposing (..)
import Paths
import Types exposing (..)
import Utils
import Vec2 exposing (..)


update : MouseMsg -> Model -> Model
update msg model =
    case msg of
        MouseDownLeft pos ->
            let
                modelSvg =
                    model.svg

                correctedPos =
                    pos -# ( model.clientLeft, model.clientTop )
            in
            { model
                | dragBegin = Just <| correctedPos
                , svg =
                    Utils.changeContains
                        (case model.mode of
                            RectMode ->
                                Utils.getElems model ++ { shape = Rectangle { leftTop = correctedPos, size = ( 0, 0 ) }, style = model.styleInfo, attr = Dict.empty, id = model.idGen } :: []

                            EllipseMode ->
                                Utils.getElems model ++ { shape = Ellipse { center = correctedPos, size = ( 0, 0 ) }, style = model.styleInfo, attr = Dict.empty, id = model.idGen } :: []

                            _ ->
                                Utils.getElems model
                        )
                        modelSvg
                , idGen = model.idGen + 1
            }

        MouseDownRight pos ->
            model

        MouseUp pos ->
            { model | dragBegin = Nothing, mode = HandMode }

        MouseMove pos ->
            let
                correctedPos =
                    pos -# ( model.clientLeft, model.clientTop )
            in
            case model.dragBegin of
                Nothing ->
                    model

                Just ( x, y ) ->
                    if model.mode == HandMode then
                        model
                    else
                        case Utils.initLast (Utils.getElems model) of
                            Nothing ->
                                model

                            Just ( init, last ) ->
                                -- dragBeginが存在する間は最終要素をdrag
                                case last.shape of
                                    Rectangle { leftTop, size } ->
                                        let
                                            modelSvg =
                                                model.svg
                                        in
                                        { model | svg = Utils.changeContains (init ++ { last | shape = Rectangle { leftTop = leftTop, size = correctedPos -# ( x, y ) } } :: []) model.svg }

                                    Ellipse { center, size } ->
                                        let
                                            modelSvg =
                                                model.svg
                                        in
                                        { model | svg = Utils.changeContains (init ++ { last | shape = Ellipse { center = (( x, y ) +# correctedPos) /# ( 2, 2 ), size = correctedPos -# ( x, y ) } } :: []) model.svg }

                                    others ->
                                        model


updatePolygon : MouseMsg -> Model -> Model
updatePolygon msg model =
    case msg of
        MouseDownRight pos ->
            { model
                | dragBegin = Nothing
                , mode = HandMode
            }

        MouseDownLeft pos ->
            let
                correctedPos =
                    pos -# ( model.clientLeft, model.clientTop )
            in
            case model.dragBegin of
                Nothing ->
                    -- 新しくpolygonを作成
                    { model
                        | dragBegin = Just <| correctedPos
                        , svg =
                            Utils.changeContains
                                (Utils.getElems model
                                    ++ { shape = Polygon { points = [ correctedPos, correctedPos ], enclosed = False }
                                       , style = model.styleInfo
                                       , attr = Dict.empty
                                       , id = model.idGen
                                       }
                                    :: []
                                )
                                model.svg
                        , idGen = model.idGen + 1
                    }

                Just dragBegin ->
                    -- ダブルクリックで終了
                    if dragBegin == correctedPos then
                        { model | dragBegin = Nothing }
                    else
                        case Utils.initLast <| Utils.getElems model of
                            -- ノードを追加
                            Nothing ->
                                model

                            Just ( init, last ) ->
                                case last.shape of
                                    Polygon { points, enclosed } ->
                                        { model
                                            | dragBegin = Just <| correctedPos
                                            , svg =
                                                Utils.changeContains
                                                    (init
                                                        ++ { last
                                                            | shape =
                                                                Polygon
                                                                    { points = correctedPos :: points
                                                                    , enclosed = enclosed
                                                                    }
                                                           }
                                                        :: []
                                                    )
                                                    model.svg
                                        }

                                    others ->
                                        model

        MouseMove pos ->
            let
                correctedPos =
                    pos -# ( model.clientLeft, model.clientTop )
            in
            case model.dragBegin of
                Nothing ->
                    model

                Just ( x, y ) ->
                    case Utils.initLast <| Utils.getElems model of
                        Nothing ->
                            model

                        Just ( init, last ) ->
                            case last.shape of
                                Polygon { points, enclosed } ->
                                    { model
                                        | svg =
                                            Utils.changeContains
                                                (init
                                                    ++ { last
                                                        | shape =
                                                            Polygon
                                                                { points = Utils.updateHead (\p -> correctedPos) points
                                                                , enclosed = enclosed
                                                                }
                                                       }
                                                    :: []
                                                )
                                                model.svg
                                    }

                                others ->
                                    model

        MouseUp pos ->
            model


updatePath : MouseMsg -> Model -> Model
updatePath msg model =
    case msg of
        MouseDownRight pos ->
            { model
                | dragBegin = Nothing
                , mode = HandMode
            }

        MouseDownLeft pos ->
            let
                correctedPos =
                    pos -# ( model.clientLeft, model.clientTop )
            in
            case model.isMouseDown of
                True ->
                    model

                False ->
                    case model.dragBegin of
                        Nothing ->
                            --新しくpathを作成
                            { model
                                | dragBegin = Just <| correctedPos
                                , svg =
                                    Utils.changeContains
                                        (Utils.getElems model
                                            ++ { shape =
                                                    Path
                                                        { subPaths =
                                                            [ { moveto = MoveTo Absolute correctedPos, drawtos = [ CurveTo Absolute [ ( correctedPos, correctedPos, correctedPos ) ] ] }
                                                            ]
                                                        }
                                               , style = model.styleInfo
                                               , attr = Dict.empty
                                               , id = model.idGen
                                               }
                                            :: []
                                        )
                                        model.svg
                                , idGen = model.idGen + 1
                                , isMouseDown = True
                            }

                        Just dragBegin ->
                            case Utils.initLast (Utils.getElems model) of
                                Nothing ->
                                    model

                                Just ( init, last ) ->
                                    case last.shape of
                                        Path { subPaths } ->
                                            { model
                                                | dragBegin = Just <| correctedPos
                                                , svg =
                                                    Utils.changeContains
                                                        (init
                                                            ++ { last
                                                                | shape =
                                                                    Path
                                                                        { subPaths = Paths.add (CurveTo Absolute [ ( dragBegin, correctedPos, correctedPos ) ]) subPaths
                                                                        }
                                                               }
                                                            :: []
                                                        )
                                                        model.svg
                                                , isMouseDown = True
                                            }

                                        others ->
                                            model

        MouseMove pos ->
            let
                correctedPos =
                    pos -# ( model.clientLeft, model.clientTop )

                operatorsFn =
                    if model.isMouseDown then
                        \x -> \y -> \z -> updateLast2 x y z << updateLast x y z
                    else
                        updateLast
            in
            case model.dragBegin of
                Nothing ->
                    model

                Just dragBegin ->
                    case Utils.initLast (Utils.getElems model) of
                        Nothing ->
                            model

                        Just ( init, last ) ->
                            case last.shape of
                                Path { subPaths } ->
                                    { model
                                        | svg =
                                            Utils.changeContains
                                                (init
                                                    ++ { last
                                                        | shape =
                                                            Path
                                                                { subPaths = operatorsFn dragBegin correctedPos correctedPos subPaths
                                                                }
                                                       }
                                                    :: []
                                                )
                                                model.svg
                                    }

                                others ->
                                    model

        MouseUp pos ->
            let
                correctedPos =
                    pos -# ( model.clientLeft, model.clientTop )
            in
            case model.isMouseDown of
                False ->
                    model

                True ->
                    case model.dragBegin of
                        Nothing ->
                            model

                        Just dragBegin ->
                            case Utils.initLast (Utils.getElems model) of
                                Nothing ->
                                    model

                                Just ( init, last ) ->
                                    case last.shape of
                                        Path { subPaths } ->
                                            { model
                                                | dragBegin = Just <| correctedPos
                                                , svg =
                                                    Utils.changeContains
                                                        (init
                                                            ++ { last
                                                                | shape =
                                                                    Path
                                                                        { subPaths = updateLast dragBegin correctedPos correctedPos subPaths
                                                                        }
                                                               }
                                                            :: []
                                                        )
                                                        model.svg
                                                , isMouseDown = False
                                            }

                                        others ->
                                            model



-- 最後のオペレータがCであるとき、その制御点などを設定する


updateLast : Vec2 -> Vec2 -> Vec2 -> List SubPath -> List SubPath
updateLast adjustBegin adjustEnd endPoint subPaths =
    case List.Extra.splitAt (List.length subPaths - 1) subPaths of
        ( initSubPath, lastSubPathLst ) ->
            case lastSubPathLst of
                lastSubPath :: [] ->
                    case List.Extra.splitAt (List.length lastSubPath.drawtos - 1) lastSubPath.drawtos of
                        ( initDrawTo, lastDrawToLst ) ->
                            case lastDrawToLst of
                                lastDrawTo :: [] ->
                                    case lastDrawTo of
                                        CurveTo mode lst ->
                                            case List.Extra.splitAt (List.length lst - 1) lst of
                                                ( init, last ) ->
                                                    let
                                                        newCurveTo =
                                                            CurveTo mode <| init ++ [ ( adjustBegin, adjustEnd, endPoint ) ]

                                                        newSubPath =
                                                            { lastSubPath | drawtos = initDrawTo ++ [ newCurveTo ] }
                                                    in
                                                    initSubPath ++ [ newSubPath ]

                                        _ ->
                                            subPaths

                                _ ->
                                    subPaths

                _ ->
                    subPaths



-- 最後から2番目のC命令の終点の制御点をいい感じに設定する


updateLast2 : Vec2 -> Vec2 -> Vec2 -> List SubPath -> List SubPath
updateLast2 adjustBegin adjustEnd endPoint subPaths =
    Paths.recurve
        ((List.map Paths.opcount subPaths |> List.sum) - 2)
        (\( p, q, r ) -> ( p, symmetry r endPoint, r ))
        subPaths



-- c を中心として a と対称となる点を求める


symmetry : Vec2 -> Vec2 -> Vec2
symmetry c a =
    ( 2 * Tuple.first c, 2 * Tuple.second c ) -# a
