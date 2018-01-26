module Shape exposing (..)

import Paths
import Tuple exposing (first, second)
import Types exposing (..)
import Utils
import Vec2 exposing (..)
import List.Extra


getBBox : StyledSVGElement -> Box
getBBox elem =
    case elem.shape of
        Rectangle { leftTop, size } ->
            { leftTop = leftTop, rightBottom = leftTop +# size }

        Ellipse { center, size } ->
            { leftTop = center -# size /# ( 2, 2 ), rightBottom = center +# size /# ( 2, 2 ) }

        Polygon { points, enclosed } ->
            let
                left =
                    List.map first points |> List.minimum |> Maybe.withDefault 0

                top =
                    List.map second points |> List.minimum |> Maybe.withDefault 0

                right =
                    List.map first points |> List.maximum |> Maybe.withDefault 0

                bottom =
                    List.map second points |> List.maximum |> Maybe.withDefault 0
            in
            { leftTop = ( left, top ), rightBottom = ( right, bottom ) }

        Path { subPaths } ->
            let
                nodes =
                    Paths.nodes subPaths

                left =
                    List.map (.endpoint >> first) nodes |> List.minimum |> Maybe.withDefault 0

                top =
                    List.map (.endpoint >> second) nodes |> List.minimum |> Maybe.withDefault 0

                right =
                    List.map (.endpoint >> first) nodes |> List.maximum |> Maybe.withDefault 0

                bottom =
                    List.map (.endpoint >> second) nodes |> List.maximum |> Maybe.withDefault 0
            in
            { leftTop = ( left, top ), rightBottom = ( right, bottom ) }

        others ->
            { leftTop = ( 0, 0 ), rightBottom = ( 0, 0 ) }



-- 平行移動


translate : Vec2 -> StyledSVGElement -> StyledSVGElement
translate delta elem =
    { elem
        | shape =
            case elem.shape of
                Rectangle { leftTop, size } ->
                    Rectangle { leftTop = leftTop +# delta, size = size }

                Ellipse { center, size } ->
                    Ellipse { center = center +# delta, size = size }

                Polygon { points, enclosed } ->
                    Polygon { points = List.map ((+#) delta) points, enclosed = enclosed }

                Path { subPaths } ->
                    Path
                        { subPaths = Paths.generic ((+#) delta) subPaths
                        }

                others ->
                    others
    }



-- 中心


getCenter : StyledSVGElement -> Vec2
getCenter elem =
    case elem.shape of
        Rectangle { leftTop, size } ->
            leftTop +# size /# ( 2, 2 )

        Ellipse { center, size } ->
            center

        Polygon { points, enclosed } ->
            let
                bbox =
                    getBBox elem
            in
            (bbox.leftTop +# bbox.rightBottom) /# ( 2, 2 )

        Path { subPaths } ->
            let
                bbox =
                    getBBox elem
            in
            (bbox.leftTop +# bbox.rightBottom) /# ( 2, 2 )

        others ->
            ( 0, 0 )


setCenter : Vec2 -> StyledSVGElement -> StyledSVGElement
setCenter cent elem =
    let
        oldCenter =
            getCenter elem

        delta =
            cent -# oldCenter
    in
    translate delta elem



-- 中心から offset 離れた点


getOffsettedCenter : Vec2 -> StyledSVGElement -> Vec2
getOffsettedCenter offset elem =
    offset +# getCenter elem



-- 中心から offset 離れた点を絶対座標 offsettedCent に設定する


setOffsettedCenter : Vec2 -> Vec2 -> StyledSVGElement -> StyledSVGElement
setOffsettedCenter offsettedCent offset elem =
    let
        oldOffsettedCenter =
            getOffsettedCenter offset elem

        delta =
            offsettedCent -# oldOffsettedCenter
    in
    translate delta elem



-- 回転


rotate : Float -> StyledSVGElement -> StyledSVGElement
rotate angle elem =
    let
        center =
            getCenter elem

        rotated =
            { elem
                | shape =
                    case elem.shape of
                        Path { subPaths } ->
                            Path { subPaths = Paths.rotate angle center subPaths }

                        others ->
                            let
                                path =
                                    Paths.shapeToPath elem.shape
                            in
                            case path of
                                Path { subPaths } ->
                                    Path { subPaths = Paths.rotate angle center subPaths }

                                _ ->
                                    elem.shape
            }
    in
    rotated



-- 図形中心を中心として縮尺を変更


scale : Vec2 -> StyledSVGElement -> StyledSVGElement
scale ratio elem =
    let
        center =
            getCenter elem

        scaled =
            { elem
                | shape =
                    case elem.shape of
                        Rectangle { leftTop, size } ->
                            Rectangle { leftTop = leftTop, size = size *# ratio }

                        Ellipse { center, size } ->
                            Ellipse { center = center, size = size *# ratio }

                        Polygon { points, enclosed } ->
                            Polygon { points = List.map ((*#) ratio) points, enclosed = enclosed }

                        Path { subPaths } ->
                            Path
                                { subPaths = Paths.generic ((*#) ratio) subPaths
                                }

                        others ->
                            others
            }
    in
    setCenter center scaled



-- 図形中心から offset 離れた点を不動点として縮尺を変更


scale2 : Vec2 -> Vec2 -> StyledSVGElement -> StyledSVGElement
scale2 offset ratio elem =
    let
        fixedPoint =
            getOffsettedCenter offset elem

        centerScaled =
            scale ratio elem
    in
    setOffsettedCenter fixedPoint (offset *# ratio) elem



-- ノードの座標をfnにする


replaceNode : NodeId -> (Vec2 -> Vec2) -> StyledSVGElement -> StyledSVGElement
replaceNode nid fn elem =
    case elem.shape of
        Polygon { points, enclosed } ->
            { elem | shape = Polygon { points = Utils.replaceNth nid.index fn points, enclosed = enclosed } }

        Path { subPaths } ->
            { elem | shape = Path { subPaths = Paths.replaceNode nid fn subPaths } }

        others ->
            elem

-- ノードを消す

removeNode: NodeId -> StyledSVGElement -> StyledSVGElement
removeNode nid elem =
    case elem.shape of
        Polygon {points, enclosed} ->
            {elem | shape = Polygon {points = List.Extra.removeAt nid.index points, enclosed = enclosed}}
        Path {subPaths} ->
            {elem | shape = Path { subPaths = Paths.removeNode nid subPaths}}
        others ->
            elem

-- ノードのリストを返す


getNodes : StyledSVGElement -> List Node
getNodes elem =
    case elem.shape of
        Polygon { points, enclosed } ->
            List.map (\k -> { endpoint = k, controlPoints = [] }) points

        Path { subPaths } ->
            Paths.nodes subPaths

        others ->
            []
