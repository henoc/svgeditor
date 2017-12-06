module HandMode exposing (..)

import Vec2 exposing (..)
import Types exposing (..)
import Utils
import Set exposing (Set)
import Shape
import ShapeList
import Debug

update : MouseMsg -> Model -> (Model, Cmd Msg)
update msg model = case msg of
  MouseMove position -> case model.dragBegin of
    Nothing -> (model, Cmd.none)

    Just dragBegin -> case model.fixedPoint of
      Nothing ->
        -- posとの差分だけ図形を動かす
        let
          pos = toVec2 position
          selected = model.selected
          modelsvg = model.svg
          moved = List.map (\e -> Shape.translate (pos -# dragBegin) e) model.selectedRef
          newElems = Utils.replace
            (\elem -> Set.member elem.id model.selected)
            moved
            (Utils.getElems model)
        in
        (
          {model |
            svg = Utils.changeContains newElems modelsvg
          },
          Cmd.none
        )
      Just fixed ->
        -- posとの差分だけ縮尺を変更
        let
          pos = toVec2 position
          delta = pos -# dragBegin
          selectedElems = model.selectedRef
          cent = ShapeList.getCenter selectedElems
          antiFixed = cent *# (2, 2) -# fixed
          newAntiFixed = antiFixed +# delta
          ratio = Utils.ratio (newAntiFixed -# fixed) (antiFixed -# fixed)
          newSelectedElems = ShapeList.scale2 (fixed -# cent) ratio selectedElems
          newElems = Utils.replace
            (\elem -> Set.member elem.id model.selected)
            newSelectedElems
            (Utils.getElems model)
          modelsvg = model.svg
        in
        (
          {model|
            svg = Utils.changeContains newElems modelsvg
          },
          Cmd.none
        )

  MouseUp _ ->
    let
      selectedRef = List.filter (\e -> Set.member e.id model.selected) (Utils.getElems model)
    in
    ({model |
      dragBegin = Nothing,
      fixedPoint = Nothing,
      selectedRef = selectedRef
    }, Cmd.none)
  _ -> (model, Cmd.none)

select : Int -> Bool -> Vec2 -> Model -> (Model, Cmd Msg)
select ident isAdd pos model =
  -- 選択中のものを選択
  if Set.member ident model.selected then
    ({model | dragBegin = Just pos}, Cmd.none)
  
  -- 追加選択
  else if isAdd then
    let
      selected = Set.insert ident model.selected
      selectedRef = List.filter (\e -> Set.member e.id selected) (Utils.getElems model)
    in
    ({model | selected = selected, dragBegin = Just pos, selectedRef = selectedRef}, Cmd.none)

  -- 新規選択
  else
    let
      selected = Set.singleton ident
      selectedRef = List.filter (\e -> Set.member e.id selected) (Utils.getElems model)
    in
    ({ model | selected = Set.singleton ident, dragBegin = Just pos, selectedRef = selectedRef }, Cmd.none)

noSelect : Model -> (Model, Cmd Msg)
noSelect model =
  ({model | selected = Set.empty, dragBegin = Nothing }, Cmd.none)

scale: Vec2 -> Vec2 -> Model -> (Model, Cmd Msg)
scale fixed mpos model =
  ({model | fixedPoint = Just fixed, dragBegin = Just mpos}, Cmd.none)

