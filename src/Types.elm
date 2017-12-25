module Types exposing (..)

import Vec2 exposing (Vec2)
import Set exposing (Set)
import Dict exposing (Dict)

type Mode = HandMode | NodeMode | RectMode | EllipseMode | PolygonMode | PathMode
type alias StyleInfo = Dict String String
type alias AttributeInfo = Dict String String

type alias PathOperator = { kind: String, points: List Vec2 }

-- モデルが所有するSVGの形
type SVGElement =
  Rectangle { leftTop: Vec2, size: Vec2 }
  | Ellipse { center: Vec2, size: Vec2 }
  | Polygon { points: List Vec2, enclosed: Bool}
  | Path { operators: List PathOperator }    -- このリストは新しい方が左
  | SVG {elems: List StyledSVGElement, size: Vec2}
  | Unknown { name: String, elems: List StyledSVGElement }
type alias StyledSVGElement = {
  style: StyleInfo,
  attr: AttributeInfo,
  id: Int,
  shape: SVGElement
}

type alias Model = {
  mode: Mode,
  dragBegin: Maybe Vec2,
  isMouseDown: Bool,
  svg: StyledSVGElement,
  styleInfo: StyleInfo,
  idGen: Int,
  selected: Set Int,
  nodeId: Maybe Int,
  fixedPoint: Maybe Vec2,
  selectedRef: List StyledSVGElement,
  clientLeft: Float,
  clientTop: Float,
  encoded: String
}

type Msg = OnProperty ChangePropertyMsg | OnAction Action | OnMouse MouseMsg | OnSelect Int Bool Vec2 | NoSelect | OnVertex Vec2 Vec2 | OnNode Vec2 Int
  | SvgData String | EncodedSvgData String | SvgRootRect ClientRect | ComputedStyle (Maybe StyleObject)
type ChangePropertyMsg = SwichMode Mode | Style StyleInfo
type MouseMsg = MouseDownLeft Vec2 | MouseDownRight Vec2 | MouseUp Vec2 | MouseMove Vec2
type Action = Duplicate | Delete | BringForward | SendBackward

type alias Box = {
  leftTop: Vec2,
  rightBottom: Vec2
}

-- portのgetCoumputedStyle用
type alias StyleObject = {
  fill: String,
  stroke: String
}

-- portのgetBoundingClientRect用
type alias ClientRect = {
  left: Float,
  top: Float
}
