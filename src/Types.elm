module Types exposing (..)

import Mouse
import Vec2 exposing (Vec2)
import Set exposing (Set)
import Dict exposing (Dict)

type Mode = HandMode | RectMode | EllipseMode
type alias ColorInfo = {fill: String, stroke: String}
type alias AnyStyleInfo = Dict String String

-- モデルが所有するSVGの形
type SVGElement = Rectangle { leftTop: Vec2, size: Vec2 } | Ellipse { center: Vec2, size: Vec2 }
type alias StyledSVGElement = {
  style: ColorInfo,
  id: Int,
  shape: SVGElement
}
type alias SVGSVGElement = {
  size: Vec2,
  elems: List StyledSVGElement
}

type alias Model = {
  mode: Mode,
  dragBegin: Maybe Vec2,
  svg: SVGSVGElement,
  colorInfo: ColorInfo,
  idGen: Int,
  selected: Set Int,
  fixedPoint: Maybe Vec2,
  selectedRef: List StyledSVGElement
}

type Msg = OnProperty ChangePropertyMsg | OnMouse MouseMsg | OnSelect Int Bool Vec2 | NoSelect | OnVertex Vec2 Vec2
type ChangePropertyMsg = SwichMode Mode | Color ColorInfo
type MouseMsg = MouseDown Mouse.Position | MouseUp Mouse.Position | MouseMove Mouse.Position

type alias Box = {
  leftTop: Vec2,
  rightBottom: Vec2
}
