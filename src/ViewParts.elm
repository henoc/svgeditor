module ViewParts exposing (..)

import Html exposing (..)
import Html.Attributes exposing (class, id)
import Html.Events exposing (onClick)
import Svg exposing (path, rect, script, svg)
import Svg.Attributes exposing (d, fill, height, viewBox, width, x, y)
import Types exposing (..)


-- ボタンなど細かいもの
-- https://materialdesignicons.com/


toggled : Mode -> Mode -> List (Html.Attribute msg)
toggled mode now =
    if now == mode then
        [ class "button-toggled" ]
    else
        []


makeMenu : Int -> Mode -> String -> Model -> String -> Html Msg
makeMenu i mode description model dstring =
    div [ class "hint-container" ]
        [ div
            ([ class "button"
             , onClick <| OnProperty <| SwichMode mode
             ]
                ++ toggled mode model.mode
            )
            [ svg [ width "36", height "36", viewBox "0 0 24 24" ]
                [ path [ fill "currentColor", d dstring ] []
                ]
            ]
        , p [ class "hint" ] [ text description ]
        ]


makeAction : Int -> Action -> String -> Model -> String -> Html Msg
makeAction i action description model dstring =
    div [ class "hint-container" ]
        [ div
            [ class "button"
            , onClick <| OnAction <| action
            ]
            [ svg [ width "24", height "24", viewBox "0 0 24 24" ]
                [ path [ fill "currentColor", d dstring ] []
                ]
            ]
        , p [ class "hint" ] [ text description ]
        ]


selectButton : Model -> Html Msg
selectButton model =
    makeMenu 0 HandMode "Select" model "M13.64,21.97C13.14,22.21 12.54,22 12.31,21.5L10.13,16.76L7.62,18.78C7.45,18.92 7.24,19 7,19A1,1 0 0,1 6,18V3A1,1 0 0,1 7,2C7.24,2 7.47,2.09 7.64,2.23L7.65,2.22L19.14,11.86C19.57,12.22 19.62,12.85 19.27,13.27C19.12,13.45 18.91,13.57 18.7,13.61L15.54,14.23L17.74,18.96C18,19.46 17.76,20.05 17.26,20.28L13.64,21.97Z"


nodeButton : Model -> Html Msg
nodeButton model =
    makeMenu 1 NodeMode "Node" model "M9,3V9H9.73L5.79,16H2V22H8V20H16V22H22V16H18.21L14.27,9H15V3M11,5H13V7H11M12,9.04L16,16.15V18H8V16.15M4,18H6V20H4M18,18H20V20H18"


rectButton : Model -> Html Msg
rectButton model =
    makeMenu 2 RectMode "Rectangle" model "M3,3V21H21V3"


ellipseButton : Model -> Html Msg
ellipseButton model =
    makeMenu 3 EllipseMode "Ellipse" model "M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2Z"


polygonButton : Model -> Html Msg
polygonButton model =
    makeMenu 4 PolygonMode "Polygon" model "M12,2.5L2,9.8L5.8,21.5H18.2L22,9.8L12,2.5Z"


pathButton : Model -> Html Msg
pathButton model =
    makeMenu 5 PathMode "Path" model "M18.5,2A1.5,1.5 0 0,1 20,3.5A1.5,1.5 0 0,1 18.5,5C18.27,5 18.05,4.95 17.85,4.85L14.16,8.55L14.5,9C16.69,7.74 19.26,7 22,7L23,7.03V9.04L22,9C19.42,9 17,9.75 15,11.04A3.96,3.96 0 0,1 11.04,15C9.75,17 9,19.42 9,22L9.04,23H7.03L7,22C7,19.26 7.74,16.69 9,14.5L8.55,14.16L4.85,17.85C4.95,18.05 5,18.27 5,18.5A1.5,1.5 0 0,1 3.5,20A1.5,1.5 0 0,1 2,18.5A1.5,1.5 0 0,1 3.5,17C3.73,17 3.95,17.05 4.15,17.15L7.84,13.45C7.31,12.78 7,11.92 7,11A4,4 0 0,1 11,7C11.92,7 12.78,7.31 13.45,7.84L17.15,4.15C17.05,3.95 17,3.73 17,3.5A1.5,1.5 0 0,1 18.5,2M11,9A2,2 0 0,0 9,11A2,2 0 0,0 11,13A2,2 0 0,0 13,11A2,2 0 0,0 11,9Z"


gradientButton : Model -> Html Msg
gradientButton model =
    makeMenu 6 GradientMode "Gradient" model "M11,9H13V11H11V9M9,11H11V13H9V11M13,11H15V13H13V11M15,9H17V11H15V9M7,9H9V11H7V9M19,3H5A2,2 0 0,0 3,5V19A2,2 0 0,0 5,21H19A2,2 0 0,0 21,19V5A2,2 0 0,0 19,3M9,18H7V16H9V18M13,18H11V16H13V18M17,18H15V16H17V18M19,11H17V13H19V15H17V13H15V15H13V13H11V15H9V13H7V15H5V13H7V11H5V5H19V11Z"

textButton: Model -> Html Msg
textButton model =
    makeMenu 7 TextMode "Text" model "M9.62,12L12,5.67L14.37,12M11,3L5.5,17H7.75L8.87,14H15.12L16.25,17H18.5L13,3H11Z"

duplicateButton : Model -> Html Msg
duplicateButton model =
    makeAction 100 Duplicate "Duplicate" model "M19,21H8V7H19M19,5H8A2,2 0 0,0 6,7V21A2,2 0 0,0 8,23H19A2,2 0 0,0 21,21V7A2,2 0 0,0 19,5M16,1H4A2,2 0 0,0 2,3V17H4V3H16V1Z"


deleteButton : Model -> Html Msg
deleteButton model =
    makeAction 101 Delete "Delete" model "M19,4H15.5L14.5,3H9.5L8.5,4H5V6H19M6,19A2,2 0 0,0 8,21H16A2,2 0 0,0 18,19V7H6V19Z"


bringForwardButton : Model -> Html Msg
bringForwardButton model =
    makeAction 102 BringForward "Bring forward" model "M2,2H16V16H2V2M22,8V22H8V18H10V20H20V10H18V8H22Z"


sendBackwardButton : Model -> Html Msg
sendBackwardButton model =
    makeAction 103 SendBackward "Send backward" model "M2,2H16V16H2V2M22,8V22H8V18H18V8H22M4,4V14H14V4H4Z"


shapeToPathButton : Model -> Html Msg
shapeToPathButton model =
    makeAction 104 ShapeToPath "Object to path" model "M3,8H5V16H3V8M7,8H9V16H7V8M11,8H13V16H11V8M15,19.25V4.75L22.25,12L15,19.25Z"


alignLeftButton : Model -> Html Msg
alignLeftButton model =
    makeAction 105 AlignLeft "Align left" model "M3,3H21V5H3V3M3,7H15V9H3V7M3,11H21V13H3V11M3,15H15V17H3V15M3,19H21V21H3V19Z"


alignRightButton : Model -> Html Msg
alignRightButton model =
    makeAction 106 AlignRight "Align right" model "M3,3H21V5H3V3M9,7H21V9H9V7M3,11H21V13H3V11M9,15H21V17H9V15M3,19H21V21H3V19Z"


alignTopButton : Model -> Html Msg
alignTopButton model =
    makeAction 107 AlignTop "Align top" model "M3 22.4v-18h2v18H3m3.8-6l.1-12h2l-.1 12h-2m4.3 6l-.2-18h2l.2 18h-2m3.7-6l.1-12h2l-.1 12h-2m4.3 6l-.2-18h2l.2 18h-2z"


alignBottomButton : Model -> Html Msg
alignBottomButton model =
    makeAction 108 AlignBottom "Align bottom" model "M20.9 4.4l.2 18h-2l-.2-18h2m-3.6 6l-.2 12h-2l.2-12h2m-4.4-6l.2 18h-2l-.2-18h2m-3.6 6l-.2 12h-2l.2-12h2m-4.4-6l.2 18h-2L3 4.5h2z"


scaleUpButton : Model -> Html Msg
scaleUpButton model =
    makeAction 109 ScaleUp "Scale-up" model "M15.5,14L20.5,19L19,20.5L14,15.5V14.71L13.73,14.43C12.59,15.41 11.11,16 9.5,16A6.5,6.5 0 0,1 3,9.5A6.5,6.5 0 0,1 9.5,3A6.5,6.5 0 0,1 16,9.5C16,11.11 15.41,12.59 14.43,13.73L14.71,14H15.5M9.5,14C12,14 14,12 14,9.5C14,7 12,5 9.5,5C7,5 5,7 5,9.5C5,12 7,14 9.5,14M12,10H10V12H9V10H7V9H9V7H10V9H12V10Z"


scaleDownButton : Model -> Html Msg
scaleDownButton model =
    makeAction 110 ScaleDown "Scale-down" model "M15.5,14H14.71L14.43,13.73C15.41,12.59 16,11.11 16,9.5A6.5,6.5 0 0,0 9.5,3A6.5,6.5 0 0,0 3,9.5A6.5,6.5 0 0,0 9.5,16C11.11,16 12.59,15.41 13.73,14.43L14,14.71V15.5L19,20.5L20.5,19L15.5,14M9.5,14C7,14 5,12 5,9.5C5,7 7,5 9.5,5C12,5 14,7 14,9.5C14,12 12,14 9.5,14M7,9H12V10H7V9Z"


deleteNodeButton : Model -> Html Msg
deleteNodeButton model =
    makeAction 111 DeleteNode "Delete node" model "M8 2.1l8 .2v3h6v2h-6v3l-8-.2v-3l-6 .1v-2h6v-3m2 2v4l4-.1v-4h-4zM6.9 15.9h10.3v2.2H6.9z"


duplicateNodeButton : Model -> Html Msg
duplicateNodeButton model =
    makeAction 112 DuplicateNode "Duplicate node" model "M8 2.1l8 .2v3h6v2h-6v3L8 10V7l-6 .2v-2L8 5V2m2 2v4l4 .1v-4h-4zM13 12l-.1 4.1h4.3v2.8l-4.1-.1v3.7h-2.6l-.3-4H6.1l.1-2.7 4.1.2.2-4.1"
