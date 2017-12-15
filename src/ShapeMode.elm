module ShapeMode exposing (..)

import Vec2 exposing (..)
import Types exposing (..)
import Utils
import Dict exposing (Dict)

update : MouseMsg -> Model -> Model
update msg model = case msg of
    MouseDown position ->
          let
            modelSvg = model.svg
            correctedPos = (toVec2 position) -# (model.clientLeft, model.clientTop)
          in
          { model |
            dragBegin = Just <| toVec2 position,
            svg = Utils.changeContains (
                    case model.mode of
                      RectMode -> (Utils.getElems model) ++ { shape = Rectangle {leftTop = correctedPos, size = (0, 0)}, style = model.styleInfo, attr = Dict.empty, id = model.idGen } :: []
                      EllipseMode -> (Utils.getElems model) ++ { shape = Ellipse {center = correctedPos, size = (0, 0)}, style = model.styleInfo, attr = Dict.empty, id = model.idGen } :: []
                      _ -> Utils.getElems model
                  ) modelSvg
            ,
            idGen = model.idGen + 1
          }
    
    MouseUp position ->
      {model | dragBegin = Nothing }
    
    MouseMove position -> case model.dragBegin of
      Nothing -> model
      Just (x, y) -> if model.mode == HandMode then model else case Utils.last (Utils.getElems model) of
        Nothing -> model
        Just last -> 
          let init = Utils.init (Utils.getElems model) in
          -- dragBeginが存在する間は最終要素をdrag
          case last.shape of
            Rectangle {leftTop, size} ->
              let modelSvg = model.svg in
                {model | svg = Utils.changeContains (init ++ {last | shape = Rectangle {leftTop = leftTop, size = (toVec2 position) -# (x, y) }} :: []) model.svg }
            Ellipse {center, size} ->
              let modelSvg = model.svg in
                {model | svg = Utils.changeContains (init ++ {last | shape = Ellipse {center = ((x, y) +# (toVec2 position)) /# (2, 2), size = (toVec2 position) -# (x, y)}} :: []) model.svg }
            others -> model

updatePolygon : MouseMsg -> Model -> Model
updatePolygon msg model = case msg of
  MouseDown position ->
    let
      correctedPos = (toVec2 position) -# (model.clientLeft, model.clientTop)
    in
    case model.dragBegin of
      Nothing -> -- 新しくpolygonを作成
        {model |
          dragBegin = Just <| toVec2 position,
          svg = Utils.changeContains (
            Utils.getElems model ++ {
              shape = Polygon {points = [correctedPos, correctedPos], enclosed = False },
              style = model.styleInfo,
              attr = Dict.empty,
              id = model.idGen
            } :: []
          ) model.svg,
          idGen = model.idGen + 1
        }
      Just dragBegin ->
        -- ダブルクリックで終了
        if dragBegin == (toVec2 position) then
          {model| dragBegin = Nothing}
        else case Utils.last <| Utils.getElems model of -- ノードを追加
          Nothing -> model
          Just last ->
            let
              init = Utils.init <| Utils.getElems model
            in
            case last.shape of
              Polygon {points, enclosed} ->
                {model|
                  dragBegin = Just <| toVec2 position,
                  svg = Utils.changeContains (
                    init ++ {last|
                      shape = Polygon {
                        points = correctedPos :: points,
                        enclosed = enclosed
                      }
                    } :: []
                  ) model.svg
                }
              others -> model
  MouseMove position -> case model.dragBegin of
    Nothing -> model
    Just (x, y) -> case Utils.last <| Utils.getElems model of
      Nothing -> model
      Just last ->
        let
          init = Utils.init <| Utils.getElems model
        in
        case last.shape of
          Polygon {points, enclosed} ->
            {model|
              svg = Utils.changeContains (
                init ++ {last |
                  shape = Polygon {
                    points = Utils.updateHead (\p -> toVec2 position) points,
                    enclosed = enclosed
                  }
                } :: []
              ) model.svg
            }
          others -> model
  MouseUp position ->
    model