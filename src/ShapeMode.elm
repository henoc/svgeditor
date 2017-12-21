module ShapeMode exposing (..)

import Vec2 exposing (..)
import Types exposing (..)
import Utils
import Dict exposing (Dict)


update : MouseMsg -> Model -> Model
update msg model = case msg of
    MouseDownLeft pos ->
      let
        modelSvg = model.svg
        correctedPos = pos -# (model.clientLeft, model.clientTop)
      in
      { model |
        dragBegin = Just <| correctedPos,
        svg = Utils.changeContains (
                case model.mode of
                  RectMode -> (Utils.getElems model) ++ { shape = Rectangle {leftTop = correctedPos, size = (0, 0)}, style = model.styleInfo, attr = Dict.empty, id = model.idGen } :: []
                  EllipseMode -> (Utils.getElems model) ++ { shape = Ellipse {center = correctedPos, size = (0, 0)}, style = model.styleInfo, attr = Dict.empty, id = model.idGen } :: []
                  _ -> Utils.getElems model
              ) modelSvg
        ,
        idGen = model.idGen + 1
      }
    
    MouseDownRight pos -> model
    MouseUp pos ->
      {model | dragBegin = Nothing }
    
    MouseMove pos ->
      let
        correctedPos = pos -# (model.clientLeft, model.clientTop)      
      in
      case model.dragBegin of
      Nothing -> model
      Just (x, y) -> if model.mode == HandMode then model else case Utils.initLast (Utils.getElems model) of
        Nothing -> model
        Just (init, last) -> 
          -- dragBeginが存在する間は最終要素をdrag
          case last.shape of
            Rectangle {leftTop, size} ->
              let modelSvg = model.svg in
                {model | svg = Utils.changeContains (init ++ {last | shape = Rectangle {leftTop = leftTop, size = correctedPos -# (x, y) }} :: []) model.svg }
            Ellipse {center, size} ->
              let modelSvg = model.svg in
                {model | svg = Utils.changeContains (init ++ {last | shape = Ellipse {center = ((x, y) +# correctedPos) /# (2, 2), size = correctedPos -# (x, y)}} :: []) model.svg }
            others -> model

updatePolygon : MouseMsg -> Model -> Model
updatePolygon msg model = case msg of
  MouseDownRight pos ->
    {model|
      dragBegin = Nothing
    }
  MouseDownLeft pos ->
    let
      correctedPos = pos -# (model.clientLeft, model.clientTop)
    in
    case model.dragBegin of
      Nothing -> -- 新しくpolygonを作成
        {model |
          dragBegin = Just <| correctedPos,
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
        if dragBegin == correctedPos then
          {model| dragBegin = Nothing}
        else case Utils.initLast <| Utils.getElems model of -- ノードを追加
          Nothing -> model
          Just (init,last) ->
            case last.shape of
              Polygon {points, enclosed} ->
                {model|
                  dragBegin = Just <| correctedPos,
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
  MouseMove pos ->
    let
        correctedPos = pos -# (model.clientLeft, model.clientTop)    
    in
    case model.dragBegin of
    Nothing -> model
    Just (x, y) -> case Utils.initLast <| Utils.getElems model of
      Nothing -> model
      Just (init, last) ->
        case last.shape of
          Polygon {points, enclosed} ->
            {model|
              svg = Utils.changeContains (
                init ++ {last |
                  shape = Polygon {
                    points = Utils.updateHead (\p -> correctedPos) points,
                    enclosed = enclosed
                  }
                } :: []
              ) model.svg
            }
          others -> model
  MouseUp pos ->
    model

stopPolygon: Model -> Model
stopPolygon model = case model.dragBegin of
  Nothing -> model
  Just dragBegin ->
    {model|
      dragBegin = Nothing
    }

updatePath: MouseMsg -> Model -> Model
updatePath msg model = case msg of
  MouseDownRight pos ->
    {model|
      dragBegin = Nothing
    }
  MouseDownLeft pos ->
    let
      correctedPos = pos -# (model.clientLeft, model.clientTop)
    in
    case model.isMouseDown of
    True -> model
    False ->
      case model.dragBegin of
      Nothing -> --新しくpathを作成
        {model |
          dragBegin = Just <| correctedPos,
          svg = Utils.changeContains (
            Utils.getElems model ++ {
              shape = Path {
                operators = [
                  {kind = "C", points = [correctedPos, correctedPos, correctedPos]},
                  {kind = "M", points = [correctedPos]}
                ]
              },
              style = model.styleInfo,
              attr = Dict.empty,
              id = model.idGen
            } :: []) model.svg,
          idGen = model.idGen + 1,
          isMouseDown = True
        }
      Just dragBegin -> case Utils.initLast (Utils.getElems model) of
        Nothing -> model
        Just (init, last) -> case last.shape of
          Path {operators} ->
            {model|
              dragBegin = Just <| correctedPos,
              svg = Utils.changeContains (
                init ++ {last |
                  shape = Path {
                    operators =
                      {
                        kind = "C",
                        points = [dragBegin, correctedPos, correctedPos]
                      } :: operators
                  }
                } :: []
              ) model.svg,
              isMouseDown = True
            }
          others -> model
  MouseMove pos ->
    let
      correctedPos = pos -# (model.clientLeft, model.clientTop)
      operatorsFn =
        if model.isMouseDown then \x -> \y -> \z -> (updateLast2 x y z) << (updateLast x y z)
        else updateLast
    in
    case model.dragBegin of
      Nothing -> model
      Just dragBegin ->
      case Utils.initLast (Utils.getElems model) of
        Nothing -> model
        Just (init, last) -> case last.shape of
          Path {operators} ->
            {model|
              svg = Utils.changeContains (
                init ++ {last|
                  shape = Path {
                    operators = operatorsFn dragBegin correctedPos correctedPos operators
                  }
                } :: []
              ) model.svg
            }
          others -> model

  MouseUp pos ->
    let
      correctedPos = pos -# (model.clientLeft, model.clientTop)
    in
    case model.isMouseDown of
    False -> model
    True ->
      case model.dragBegin of
        Nothing -> model
        Just dragBegin ->
          case Utils.initLast (Utils.getElems model) of
            Nothing -> model
            Just (init, last) -> case last.shape of
              Path {operators} ->
                {model|
                  dragBegin = Just <| correctedPos,
                  svg = Utils.changeContains (
                    init ++ {last|
                      shape = Path {
                        operators = updateLast dragBegin correctedPos correctedPos operators
                      }
                    } :: []
                  ) model.svg,
                  isMouseDown = False
                }
              others -> model

updateLast: Vec2 -> Vec2 -> Vec2 -> List PathOperator -> List PathOperator
updateLast adjustBegin adjustEnd endPoint operators = case operators of
  hd :: tl ->
    if hd.kind /= "C" then operators else
    {
      kind = "C",
      points = adjustBegin :: adjustEnd :: endPoint :: []
    } :: tl
  [] -> operators

-- 最後から二番目のC命令の終点の制御点をいい感じに設定する
updateLast2 : Vec2 -> Vec2 -> Vec2 -> List PathOperator -> List PathOperator
updateLast2 adjustBegin adjustEnd endPoint operators = case operators of
  last2 :: last1 :: tl ->
    if last1.kind /= "C" then operators else
    case last1.points of
    last1adjustBegin :: last1adjustEnd :: last1endPoint :: [] ->
    let
      newLast1AdjustEnd = symmetry last1endPoint endPoint
    in
    last2 :: {
      kind = "C",
      points = last1adjustBegin :: newLast1AdjustEnd :: last1endPoint :: []
    } :: tl
    others -> operators
  others -> operators

-- c を中心として a と対称となる点を求める
symmetry: Vec2 -> Vec2 -> Vec2
symmetry c a = (2 * Tuple.first c, 2 * Tuple.second c) -# a

