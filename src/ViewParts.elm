module ViewParts exposing (..)

import Html exposing (..)
import Html.Attributes exposing (class, id)
import Material.Options as Options
import Material.Tooltip as Tooltip
import Svg exposing (path, rect, script, svg)
import Svg.Attributes exposing (d, fill, height, viewBox, width, x, y)
import Types exposing (..)


-- ボタンなど細かいもの
-- https://materialdesignicons.com/


toggled : Mode -> Mode -> List (Options.Property c m)
toggled mode now =
    if now == mode then
        [ Options.attribute (class "button-toggled") ]
    else
        []


makeMenu : Int -> Mode -> String -> Model -> String -> List (Html Msg)
makeMenu i mode description model dstring =
    [Options.div
        ([ Options.attribute (class "button")
         , Options.onClick <| OnProperty <| SwichMode mode,
           Tooltip.attach Mdl [i]
         ]
            ++ toggled mode model.mode
        )
        [ svg [ width "36", height "36", viewBox "0 0 24 24" ]
            [ path [ fill "currentColor", d dstring ] []
            ]
        ]
      , Tooltip.render Mdl [i] model.mdl
        []
        [ text description ]
    ]


makeAction : Int -> Action -> String -> Model -> String -> List (Html Msg)
makeAction i action description model dstring =
    [Options.div
        [ Options.attribute (class "button")
        , Options.onClick <| OnAction <| action,
          Tooltip.attach Mdl [i]
        ]
        [ svg [ width "24", height "24", viewBox "0 0 24 24" ]
            [ path [ fill "currentColor", d dstring ] []
            ]
        ]
      , Tooltip.render Mdl [i] model.mdl
        []
        [ text description ]
    ]


selectButton : Model -> List (Html Msg)
selectButton model =
    makeMenu 0 HandMode "Select" model "M13.64,21.97C13.14,22.21 12.54,22 12.31,21.5L10.13,16.76L7.62,18.78C7.45,18.92 7.24,19 7,19A1,1 0 0,1 6,18V3A1,1 0 0,1 7,2C7.24,2 7.47,2.09 7.64,2.23L7.65,2.22L19.14,11.86C19.57,12.22 19.62,12.85 19.27,13.27C19.12,13.45 18.91,13.57 18.7,13.61L15.54,14.23L17.74,18.96C18,19.46 17.76,20.05 17.26,20.28L13.64,21.97Z"


nodeButton : Model -> List (Html Msg)
nodeButton model =
    makeMenu 1 NodeMode "Node" model "M9,3V9H9.73L5.79,16H2V22H8V20H16V22H22V16H18.21L14.27,9H15V3M11,5H13V7H11M12,9.04L16,16.15V18H8V16.15M4,18H6V20H4M18,18H20V20H18"


rectButton : Model -> List (Html Msg)
rectButton model =
    makeMenu 2 RectMode "Rectangle" model "M3,3V21H21V3"


ellipseButton : Model -> List (Html Msg)
ellipseButton model =
    makeMenu 3 EllipseMode "Ellipse" model "M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2Z"


polygonButton : Model -> List (Html Msg)
polygonButton model =
    makeMenu 4 PolygonMode "Polygon" model "M12,2.5L2,9.8L5.8,21.5H18.2L22,9.8L12,2.5Z"


pathButton : Model -> List (Html Msg)
pathButton model =
    makeMenu 5 PathMode "Path" model "M18.5,2A1.5,1.5 0 0,1 20,3.5A1.5,1.5 0 0,1 18.5,5C18.27,5 18.05,4.95 17.85,4.85L14.16,8.55L14.5,9C16.69,7.74 19.26,7 22,7L23,7.03V9.04L22,9C19.42,9 17,9.75 15,11.04A3.96,3.96 0 0,1 11.04,15C9.75,17 9,19.42 9,22L9.04,23H7.03L7,22C7,19.26 7.74,16.69 9,14.5L8.55,14.16L4.85,17.85C4.95,18.05 5,18.27 5,18.5A1.5,1.5 0 0,1 3.5,20A1.5,1.5 0 0,1 2,18.5A1.5,1.5 0 0,1 3.5,17C3.73,17 3.95,17.05 4.15,17.15L7.84,13.45C7.31,12.78 7,11.92 7,11A4,4 0 0,1 11,7C11.92,7 12.78,7.31 13.45,7.84L17.15,4.15C17.05,3.95 17,3.73 17,3.5A1.5,1.5 0 0,1 18.5,2M11,9A2,2 0 0,0 9,11A2,2 0 0,0 11,13A2,2 0 0,0 13,11A2,2 0 0,0 11,9Z"


gradientButton : Model -> List (Html Msg)
gradientButton model =
    makeMenu 6 GradientMode "Gradient" model "M11,9H13V11H11V9M9,11H11V13H9V11M13,11H15V13H13V11M15,9H17V11H15V9M7,9H9V11H7V9M19,3H5A2,2 0 0,0 3,5V19A2,2 0 0,0 5,21H19A2,2 0 0,0 21,19V5A2,2 0 0,0 19,3M9,18H7V16H9V18M13,18H11V16H13V18M17,18H15V16H17V18M19,11H17V13H19V15H17V13H15V15H13V13H11V15H9V13H7V15H5V13H7V11H5V5H19V11Z"


duplicateButton : Model -> List (Html Msg)
duplicateButton model =
    makeAction 100 Duplicate "Duplicate" model "M19,21H8V7H19M19,5H8A2,2 0 0,0 6,7V21A2,2 0 0,0 8,23H19A2,2 0 0,0 21,21V7A2,2 0 0,0 19,5M16,1H4A2,2 0 0,0 2,3V17H4V3H16V1Z"


deleteButton : Model -> List (Html Msg)
deleteButton model =
    makeAction 101 Delete "Delete" model "M19,4H15.5L14.5,3H9.5L8.5,4H5V6H19M6,19A2,2 0 0,0 8,21H16A2,2 0 0,0 18,19V7H6V19Z"


bringForwardButton : Model -> List (Html Msg)
bringForwardButton model =
    makeAction 102 BringForward "Bring forward" model "M2,2H16V16H2V2M22,8V22H8V18H10V20H20V10H18V8H22Z"


sendBackwardButton : Model -> List (Html Msg)
sendBackwardButton model =
    makeAction 103 SendBackward "Send backward" model "M2,2H16V16H2V2M22,8V22H8V18H18V8H22M4,4V14H14V4H4Z"


shapeToPathButton : Model -> List (Html Msg)
shapeToPathButton model =
    makeAction 104 ShapeToPath "Object to path" model "M3,8H5V16H3V8M7,8H9V16H7V8M11,8H13V16H11V8M15,19.25V4.75L22.25,12L15,19.25Z"
