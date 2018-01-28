module Types exposing (..)

import Color exposing (Color)
import Dict exposing (Dict)
import Ext.Color
import Material
import Path.LowLevel exposing (..)
import Set exposing (Set)
import Ui.ColorPanel
import Vec2 exposing (Vec2)


type Mode
    = HandMode
    | NodeMode
    | RectMode
    | EllipseMode
    | PolygonMode
    | PathMode
    | GradientMode


type alias StyleInfo =
    Dict String String


type alias AttributeInfo =
    Dict String String

type alias Later a = Maybe a

-- モデルが所有するSVGの形


type SVGElement
    = Rectangle { leftTop : Vec2, size : Vec2 }
    | Ellipse { center : Vec2, size : Vec2 }
    | Polygon { points : List Vec2, enclosed : Bool }
    | Path { subPaths : List SubPath }
    | SVG { elems : List StyledSVGElement, size : Vec2 }
    | Defs { elems : List StyledSVGElement }
    | LinearGradient { identifier : String, stops : List StyledSVGElement }
    | RadialGradient { identifier : String, stops : List StyledSVGElement }
    | Stop { offset : Later Int, color : Later Color }
    | Text { elems: List StyledSVGElement, baseline: Vec2, leftTop: Later Vec2, size: Later Vec2 }
    | TextNode { value : String }
    | Unknown { name : String, elems : List StyledSVGElement }


type alias StyledSVGElement =
    { style : StyleInfo
    , attr : AttributeInfo
    , id : Int
    , shape : SVGElement
    }


type alias Model =
    { mdl : Material.Model
    , mode : Mode
    , dragBegin : Maybe Vec2
    , isMouseDown : Bool
    , svg : StyledSVGElement
    , styleInfo : StyleInfo
    , idGen : Int
    , selected : Set Int
    , nodeId : Maybe NodeId
    , fixedPoint : Maybe Vec2
    , selectedRef : List StyledSVGElement
    , clientLeft : Float
    , clientTop : Float
    , encoded : String
    , openedPicker : String
    , colorPicker : ColorPickerStates
    , colorPanel : Ui.ColorPanel.Model
    , gradients : Dict String GradientInfo
    , -- 定義されているすべての Gradient要素のid, 色の列
      gradIdGen : Int
    , gradientPanel : Ui.ColorPanel.Model
    , gradientPanelLink : Maybe ( String, Int ) -- ident, stopsのindex
    , isRotate : Bool
    , scale : Float
    }


type GradientType
    = Linear
    | Radial


type alias GradientInfo =
    { gradientType : GradientType
    , stops : List ( Int, Color )
    }


type Msg
    = Mdl (Material.Msg Msg)
    | OnProperty ChangePropertyMsg
    | OnAction Action
    | OnMouse MouseMsg
    | OnSelect Int Bool Vec2
    | FieldSelect ( Int, Vec2 )
    | OnVertex Vec2 Vec2
    | OnRotateVertex Vec2
    | OnNode Vec2 NodeId
    | SvgData String
    | EncodedSvgData String
    | SvgRootRect ClientRect
    | ComputedStyle (Maybe StyleObject)
    | GradientStyles (List GradientElementInfo)
    | OpenedPickerMsg String
    | ColorPickerMsg ColorPickerStates
    | ColorPanelMsg Ui.ColorPanel.Msg
    | ColorPanelChanged Ext.Color.Hsv
    | MakeNewGradient GradientType
    | ChangeStop String Int Int Color
    | FocusToStop String Int
    | GradientPanelMsg Ui.ColorPanel.Msg
    | GradientPanelChanged Ext.Color.Hsv
    | AddNewStop String
    | RemoveStop String Int
    | RemoveGradient String
    | TextSizes (List (Int, (Vec2, Vec2)))


type ChangePropertyMsg
    = SwichMode Mode
    | Style StyleInfo


type MouseMsg
    = MouseDownLeft Vec2
    | MouseDownRight Vec2
    | MouseUp Vec2
    | MouseMove Vec2


type Action
    = Duplicate
    | Delete
    | BringForward
    | SendBackward
    | ShapeToPath
    | AlignLeft
    | AlignRight
    | AlignTop
    | AlignBottom
    | ScaleUp
    | ScaleDown
    | DeleteNode
    | DuplicateNode


type alias Box =
    { leftTop : Vec2
    , rightBottom : Vec2
    }



-- portのgetCoumputedStyle用


type alias StyleObject =
    { fill : String
    , stroke : String
    , fillOpacity : String
    , strokeOpacity : String
    , strokeWidth : String
    , strokeLinecap : String
    , strokeLinejoin : String
    , strokeDasharray : String
    }


type alias StopStyleObject =
    { stopColor : String
    , stopOpacity : String
    , offset : String
    }



-- portのgetBoundingClientRect用


type alias ClientRect =
    { left : Float
    , top : Float
    }


type alias GradientElementInfo =
    { ident : String
    , tagName : String
    , styles : List StopStyleObject
    }


type alias ColorPickerStates =
    Dict String ColorPickerState


type ColorMode
    = NoneColor
    | SingleColor
    | AnyColor String -- カラーピッカーで使用する色の場合分け ex. AnyColor "#MyGradient"


type alias ColorPickerState =
    { colorMode : ColorMode
    , singleColor : Color
    }



-- fill などに指定される色の型（こちらでは単一色情報を常に持つ必要がないなど違いがある）


type ColorType
    = NoneColorType
    | SingleColorType Color
    | AnyColorType String


type alias Gradiation =
    List ( Float, String )


type LayerType
    = ColorLayer
    | PhysicsLayer



-- 単位は computedStyle では px or % が取れる


type ValueUnit
    = Px
    | Percent


type alias Node =
    { endpoint : Vec2, controlPoints : List Vec2 }


type alias NodeId =
    { index : Int, member : NodeKind }


type NodeKind
    = Endpoint
    | ControlPoint Int

type alias IdentSet = {
    textSizes: List Int,
    gradients: List Int
}
