module ShapeList exposing (..)

import Shape
import Tuple exposing (first, second)
import Types exposing (..)
import Vec2 exposing (..)


merge : List Box -> Box
merge boxes =
    case boxes of
        hd1 :: hd2 :: tl ->
            merge <|
                { leftTop = ( min (first hd1.leftTop) (first hd2.leftTop), min (second hd1.leftTop) (second hd2.leftTop) )
                , rightBottom = ( max (first hd1.rightBottom) (first hd2.rightBottom), max (second hd1.rightBottom) (second hd2.rightBottom) )
                }
                    :: tl

        hd :: [] ->
            hd

        [] ->
            { leftTop = ( 0, 0 ), rightBottom = ( 0, 0 ) }



-- should not reached


getMergedBBox : List StyledSVGElement -> Box
getMergedBBox lst =
    List.map Shape.getBBox lst |> merge


translate : Vec2 -> List StyledSVGElement -> List StyledSVGElement
translate delta elems =
    List.map (Shape.translate delta) elems


getCenter : List StyledSVGElement -> Vec2
getCenter elems =
    let
        box =
            getMergedBBox elems
    in
    (box.leftTop +# box.rightBottom) /# ( 2, 2 )


setCenter : Vec2 -> List StyledSVGElement -> List StyledSVGElement
setCenter cent elems =
    let
        oldCenter =
            getCenter elems

        delta =
            cent -# oldCenter
    in
    translate delta elems


getOffsettedCenter : Vec2 -> List StyledSVGElement -> Vec2
getOffsettedCenter offset elems =
    offset +# getCenter elems


setOffsettedCenter : Vec2 -> Vec2 -> List StyledSVGElement -> List StyledSVGElement
setOffsettedCenter offsettedCent offset elems =
    let
        oldOffsettedCenter =
            getOffsettedCenter offset elems

        delta =
            offsettedCent -# oldOffsettedCenter
    in
    translate delta elems


scale : Vec2 -> List StyledSVGElement -> List StyledSVGElement
scale ratio elems =
    let
        center =
            getCenter elems

        scaled =
            List.map (Shape.scale ratio) elems
    in
    setCenter center scaled


scale2 : Vec2 -> Vec2 -> List StyledSVGElement -> List StyledSVGElement
scale2 offset ratio elems =
    let
        fixedPoint =
            getOffsettedCenter offset elems

        centerScaled =
            List.map (Shape.scale ratio) elems
    in
    setOffsettedCenter fixedPoint (offset *# ratio) centerScaled
