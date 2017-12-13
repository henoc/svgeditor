module Actions exposing (..)

import Types exposing (..)
import Utils
import Set exposing (Set)

duplicate: Model -> Model
duplicate model =
  let
    nextId = 1 + (Maybe.withDefault 0 <| Utils.getLastId model)
    copied = List.map2 (\e -> \id -> {e| id = id})  model.selectedRef (List.range nextId (nextId + List.length model.selectedRef))
    newElems = (Utils.getElems model) ++ copied
  in
  {model|
    svg = Utils.changeContains newElems model.svg
  }


delete: Model -> Model
delete model =
  let
    elems = Utils.getElems model
    newElems = List.filter (\x -> not (Set.member x.id model.selected) ) elems
  in
  {model|
    svg = Utils.changeContains newElems model.svg
  }


sendBackward: Model -> Model
sendBackward model =
  let
    loop: List StyledSVGElement -> List StyledSVGElement
    loop elems = case elems of
      hd :: hd2 :: tl ->
        if Set.member hd2.id model.selected then hd2 :: loop (hd :: tl)
        else hd :: loop (hd2 :: tl)
      others -> others
    elems = Utils.getElems model
  in
  {model|
    svg = Utils.changeContains (loop elems) model.svg
  }

bringForward: Model -> Model
bringForward model =
  let
    loop: List StyledSVGElement -> List StyledSVGElement
    loop elems = case elems of
      hd :: hd2 :: tl ->
        if Set.member hd2.id model.selected then hd2 :: loop (hd :: tl)
        else hd :: loop (hd2 :: tl)
      others -> others
    elems = Utils.getElems model
  in
  {model|
    svg = Utils.changeContains (List.reverse (loop (List.reverse elems) ) ) model.svg
  }
