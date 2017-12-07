module ShapeMode exposing (..)

import Vec2 exposing (..)
import Types exposing (..)
import Utils
import Dict exposing (Dict)

update : MouseMsg -> Model -> (Model, Cmd Msg)
update msg model = case msg of
    MouseDown position ->
          let modelSvg = model.svg in
          ({ model |
            dragBegin = Just <| toVec2 position,
            svg = Utils.changeContains (
                    case model.mode of
                      HandMode -> Utils.getElems model
                      RectMode -> (Utils.getElems model) ++ { shape = Rectangle {leftTop = toVec2 position, size = (0, 0)}, style = model.styleInfo, attr = Dict.empty, id = model.idGen } :: []
                      EllipseMode -> (Utils.getElems model) ++ { shape = Ellipse {center = toVec2 position, size = (0, 0)}, style = model.styleInfo, attr = Dict.empty, id = model.idGen } :: []
                  ) modelSvg
            ,
            idGen = model.idGen + 1
          }, Cmd.none)
    
    MouseUp position ->
      ({model | dragBegin = Nothing }, Cmd.none)
    
    MouseMove position -> case model.dragBegin of
      Nothing -> (model, Cmd.none)
      Just (x, y) -> if model.mode == HandMode then (model, Cmd.none) else case Utils.last (Utils.getElems model) of
        Nothing -> (model, Cmd.none)
        Just last -> 
          let init = Utils.init (Utils.getElems model) in
          -- dragBeginが存在する間は最終要素をdrag
          case last.shape of
            Rectangle {leftTop, size} ->
              let modelSvg = model.svg in
              (
                {model | svg = Utils.changeContains (init ++ {last | shape = Rectangle {leftTop = leftTop, size = (toVec2 position) -# (x, y) }} :: []) model.svg },
                Cmd.none
              )
            Ellipse {center, size} ->
              let modelSvg = model.svg in
              (
                {model | svg = Utils.changeContains (init ++ {last | shape = Ellipse {center = ((x, y) +# (toVec2 position)) /# (2, 2), size = (toVec2 position) -# (x, y)}} :: []) model.svg },
                Cmd.none
              )
            others -> (model, Cmd.none)