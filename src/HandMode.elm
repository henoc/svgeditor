module HandMode exposing (..)

import Debug
import Dict exposing (Dict)
import Set exposing (Set)
import Shape
import ShapeList
import Tuple exposing (..)
import Types exposing (..)
import Utils
import Vec2 exposing (..)


update : MouseMsg -> Model -> Model
update msg model =
    case msg of
        MouseMove pos ->
            case model.dragBegin of
                Nothing ->
                    model

                Just dragBegin ->
                    case model.isRotate of
                        True ->
                            let
                                rotated =
                                    List.map (Shape.rotate (first (pos -# dragBegin) / 90)) model.selectedRef

                                newElems =
                                    Utils.replace
                                        (\elem -> Set.member elem.id model.selected)
                                        rotated
                                        (Utils.getElems model)
                            in
                            { model | svg = Utils.changeContains newElems model.svg }

                        False ->
                            case model.fixedPoint of
                                Nothing ->
                                    -- posとの差分だけ図形を動かす
                                    let
                                        moved =
                                            List.map (Shape.translate (pos -# dragBegin)) model.selectedRef

                                        newElems =
                                            Utils.replace
                                                (\elem -> Set.member elem.id model.selected)
                                                moved
                                                (Utils.getElems model)
                                    in
                                    { model
                                        | svg = Utils.changeContains newElems model.svg
                                    }

                                Just fixed ->
                                    -- posとの差分だけ縮尺を変更
                                    let
                                        delta =
                                            pos -# dragBegin

                                        selectedElems =
                                            model.selectedRef

                                        cent =
                                            ShapeList.getCenter selectedElems

                                        antiFixed =
                                            cent *# ( 2, 2 ) -# fixed

                                        newAntiFixed =
                                            antiFixed +# delta

                                        ratio =
                                            Utils.ratio (newAntiFixed -# fixed) (antiFixed -# fixed)

                                        newSelectedElems =
                                            ShapeList.scale2 (fixed -# cent) ratio selectedElems

                                        newElems =
                                            Utils.replace
                                                (\elem -> Set.member elem.id model.selected)
                                                newSelectedElems
                                                (Utils.getElems model)

                                        modelsvg =
                                            model.svg
                                    in
                                    { model
                                        | svg = Utils.changeContains newElems modelsvg
                                    }

        MouseUp _ ->
            let
                selectedRef =
                    List.filter (\e -> Set.member e.id model.selected) (Utils.getElems model)
            in
            { model
                | dragBegin = Nothing
                , fixedPoint = Nothing
                , selectedRef = selectedRef
                , isRotate = False
            }

        _ ->
            model


select : Int -> Bool -> Vec2 -> Model -> Model
select ident isAdd pos model =
    -- 選択中のものを選択
    if Set.member ident model.selected then
        { model | dragBegin = Just pos }
        -- 追加選択
    else if isAdd then
        let
            selected =
                Set.insert ident model.selected

            selectedRef =
                List.filter (\e -> Set.member e.id selected) (Utils.getElems model)
        in
        { model | selected = selected, dragBegin = Just pos, selectedRef = selectedRef }
        -- 新規選択
    else
        let
            selected =
                Set.singleton ident

            selectedRef =
                List.filter (\e -> Set.member e.id selected) (Utils.getElems model)
        in
        { model | selected = Set.singleton ident, dragBegin = Just pos, selectedRef = selectedRef }


noSelect : Model -> Model
noSelect model =
    { model | selected = Set.empty, dragBegin = Nothing }


scale : Vec2 -> Vec2 -> Model -> Model
scale fixed mpos model =
    { model | fixedPoint = Just fixed, dragBegin = Just mpos }


changeStyle : StyleInfo -> Model -> Model
changeStyle styleInfo model =
    let
        changed =
            List.map (\e -> { e | style = styleInfo }) model.selectedRef

        newElems =
            Utils.replace
                (\elem -> Set.member elem.id model.selected)
                changed
                (Utils.getElems model)
    in
    { model
        | svg = Utils.changeContains newElems model.svg
        , styleInfo = styleInfo
        , selectedRef = changed
    }


rotate : Vec2 -> Model -> Model
rotate mpos model =
    { model | isRotate = True, dragBegin = Just mpos }
