module Types exposing (..)

import Mouse
import Vec2 exposing (Vec2)
import Set exposing (Set)
import Dict exposing (Dict)

type Mode = HandMode | RectMode | EllipseMode | PolygonMode
type alias StyleInfo = Dict String String
type alias AttributeInfo = Dict String String

type alias PathOperator = { kind: String, points: List Vec2 }

-- モデルが所有するSVGの形
type SVGElement =
  Rectangle { leftTop: Vec2, size: Vec2 }
  | Ellipse { center: Vec2, size: Vec2 }
  | Polygon { points: List Vec2, enclosed: Bool}
  | Path { operators: List PathOperator }
  | SVG {elems: List StyledSVGElement, size: Vec2}
  | Unknown { name: String, elems: List StyledSVGElement }
type alias StyledSVGElement = {
  style: StyleInfo,     -- color以外もいれる予定
  attr: AttributeInfo,
  id: Int,
  shape: SVGElement
}

type alias Model = {
  mode: Mode,
  dragBegin: Maybe Vec2,
  svg: StyledSVGElement,
  styleInfo: StyleInfo,
  idGen: Int,
  selected: Set Int,
  fixedPoint: Maybe Vec2,
  selectedRef: List StyledSVGElement
}

type Msg = OnProperty ChangePropertyMsg | OnMouse MouseMsg | OnSelect Int Bool Vec2 | NoSelect | OnVertex Vec2 Vec2 | SvgData String
type ChangePropertyMsg = SwichMode Mode | Style StyleInfo
type MouseMsg = MouseDown Mouse.Position | MouseUp Mouse.Position | MouseMove Mouse.Position

type alias Box = {
  leftTop: Vec2,
  rightBottom: Vec2
}
