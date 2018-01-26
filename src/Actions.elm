module Actions exposing (..)

import Paths
import Set exposing (Set)
import Shape
import Traverse
import Tuple exposing (..)
import Types exposing (..)
import Utils
import Vec2 exposing (..)


duplicate : Model -> Model
duplicate model =
    let
        nextId =
            1 + (Maybe.withDefault 0 <| Utils.getLastId model)

        copied =
            List.map2 (\e -> \id -> { e | id = id }) model.selectedRef (List.range nextId (nextId + List.length model.selectedRef))

        newElems =
            Utils.getElems model ++ copied
    in
    { model
        | svg = Utils.changeContains newElems model.svg
    }


delete : Model -> Model
delete model =
    let
        elems =
            Utils.getElems model

        newElems =
            List.filter (\x -> not (Set.member x.id model.selected)) elems
    in
    { model
        | svg = Utils.changeContains newElems model.svg
    }


sendBackward : Model -> Model
sendBackward model =
    let
        loop : List StyledSVGElement -> List StyledSVGElement
        loop elems =
            case elems of
                hd :: hd2 :: tl ->
                    if Set.member hd2.id model.selected then
                        hd2 :: loop (hd :: tl)
                    else
                        hd :: loop (hd2 :: tl)

                others ->
                    others

        elems =
            Utils.getElems model
    in
    { model
        | svg = Utils.changeContains (loop elems) model.svg
    }


bringForward : Model -> Model
bringForward model =
    let
        loop : List StyledSVGElement -> List StyledSVGElement
        loop elems =
            case elems of
                hd :: hd2 :: tl ->
                    if Set.member hd2.id model.selected then
                        hd2 :: loop (hd :: tl)
                    else
                        hd :: loop (hd2 :: tl)

                others ->
                    others

        elems =
            Utils.getElems model
    in
    { model
        | svg = Utils.changeContains (List.reverse (loop (List.reverse elems))) model.svg
    }


shapeToPath : Model -> Model
shapeToPath model =
    let
        process : StyledSVGElement -> StyledSVGElement
        process elem =
            if Set.member elem.id model.selected then
                { elem | shape = Paths.shapeToPath elem.shape }
            else
                elem

        newSvg =
            Traverse.traverse process model.svg
    in
    { model | svg = newSvg }


alignLeft : Model -> Model
alignLeft model =
    let
        elems =
            Utils.getElems model

        mostLeft =
            elems |> List.map Shape.getBBox |> List.map .leftTop |> List.map first |> List.minimum |> Maybe.withDefault 0

        process : StyledSVGElement -> StyledSVGElement
        process elem =
            if Set.member elem.id model.selected then
                let
                    elemLeft =
                        Shape.getBBox elem |> .leftTop |> first

                    delta =
                        ( mostLeft - elemLeft, 0 )
                in
                Shape.translate delta elem
            else
                elem

        newSvg =
            Traverse.traverse process model.svg

        selectedRef =
            List.filter (\e -> Set.member e.id model.selected) (Utils.getElems { model | svg = newSvg })
    in
    { model | svg = newSvg, selectedRef = selectedRef }


alignRight : Model -> Model
alignRight model =
    let
        elems =
            Utils.getElems model

        mostRight =
            elems |> List.map Shape.getBBox |> List.map .rightBottom |> List.map first |> List.maximum |> Maybe.withDefault 0

        process : StyledSVGElement -> StyledSVGElement
        process elem =
            if Set.member elem.id model.selected then
                let
                    elemRight =
                        Shape.getBBox elem |> .rightBottom |> first

                    delta =
                        ( mostRight - elemRight, 0 )
                in
                Shape.translate delta elem
            else
                elem

        newSvg =
            Traverse.traverse process model.svg

        selectedRef =
            List.filter (\e -> Set.member e.id model.selected) (Utils.getElems { model | svg = newSvg })
    in
    { model | svg = newSvg, selectedRef = selectedRef }


alignTop : Model -> Model
alignTop model =
    let
        elems =
            Utils.getElems model

        mostTop =
            elems |> List.map Shape.getBBox |> List.map .leftTop |> List.map second |> List.minimum |> Maybe.withDefault 0

        process : StyledSVGElement -> StyledSVGElement
        process elem =
            if Set.member elem.id model.selected then
                let
                    elemTop =
                        Shape.getBBox elem |> .leftTop |> second

                    delta =
                        ( 0, mostTop - elemTop )
                in
                Shape.translate delta elem
            else
                elem

        newSvg =
            Traverse.traverse process model.svg

        selectedRef =
            List.filter (\e -> Set.member e.id model.selected) (Utils.getElems { model | svg = newSvg })
    in
    { model | svg = newSvg, selectedRef = selectedRef }


alignBottom : Model -> Model
alignBottom model =
    let
        elems =
            Utils.getElems model

        mostBottom =
            elems |> List.map Shape.getBBox |> List.map .rightBottom |> List.map second |> List.maximum |> Maybe.withDefault 0

        process : StyledSVGElement -> StyledSVGElement
        process elem =
            if Set.member elem.id model.selected then
                let
                    elemBottom =
                        Shape.getBBox elem |> .rightBottom |> second

                    delta =
                        ( 0, mostBottom - elemBottom )
                in
                Shape.translate delta elem
            else
                elem

        newSvg =
            Traverse.traverse process model.svg

        selectedRef =
            List.filter (\e -> Set.member e.id model.selected) (Utils.getElems { model | svg = newSvg })
    in
    { model | svg = newSvg, selectedRef = selectedRef }


scaleUp : Model -> Model
scaleUp model =
    if model.scale < 64 then
        { model | scale = model.scale + 0.2 }
    else
        model


scaleDown : Model -> Model
scaleDown model =
    if model.scale > 0.4 then
        { model | scale = model.scale - 0.2 }
    else
        model


duplicateNode : Model -> Model
duplicateNode model =
    let
        process: StyledSVGElement -> StyledSVGElement
        process elem =
            if Set.member elem.id model.selected then
                case model.nodeId of
                    Just nid ->
                        Shape.duplicateNode nid elem
                    Nothing ->
                        elem
            else elem
        
        newSvg =
            Traverse.traverse process model.svg

        selectedRef =
            List.filter (\e -> Set.member e.id model.selected) (Utils.getElems { model | svg = newSvg })
    in
    { model | svg = newSvg, selectedRef = selectedRef }


deleteNode : Model -> Model
deleteNode model =
    let
        process: StyledSVGElement -> StyledSVGElement
        process elem =
            if Set.member elem.id model.selected then
                case model.nodeId of
                    Just nid ->
                        Shape.removeNode nid elem
                    Nothing ->
                        elem
            else elem
        
        newSvg =
            Traverse.traverse process model.svg

        selectedRef =
            List.filter (\e -> Set.member e.id model.selected) (Utils.getElems { model | svg = newSvg })
    in
    { model | svg = newSvg, selectedRef = selectedRef }