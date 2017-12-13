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