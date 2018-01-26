module Paths exposing (..)

import List.Extra exposing (removeAt)
import Matrix3 exposing (Mat3)
import Path.LowLevel exposing (..)
import Tuple exposing (..)
import Types exposing (..)
import Utils
import Vec2 exposing (..)
import Vector3 exposing (Vec3)


-- ノードを集める


nodes : List SubPath -> List Node
nodes subPaths =
    case subPaths of
        hd :: tl ->
            subpathToNode hd ++ nodes tl

        [] ->
            []


subpathToNode : SubPath -> List Node
subpathToNode subpath =
    movetoToNode subpath.moveto :: (List.map drawtoToNode subpath.drawtos |> Utils.flattenList)


movetoToNode : MoveTo -> Node
movetoToNode moveto =
    case moveto of
        MoveTo mode coordinate ->
            { endpoint = coordinate, controlPoints = [] }


drawtoToNode : DrawTo -> List Node
drawtoToNode drawto =
    case drawto of
        LineTo mode lst ->
            List.map (\k -> { endpoint = k, controlPoints = [] }) lst

        Horizontal mode lst ->
            []

        Vertical mode lst ->
            []

        CurveTo mode lst ->
            List.map
                (\k ->
                    case k of
                        ( c1, c2, e ) ->
                            { endpoint = e, controlPoints = [ c1, c2 ] }
                )
                lst

        SmoothCurveTo mode lst ->
            List.map (\k -> { endpoint = second k, controlPoints = [ first k ] }) lst

        QuadraticBezierCurveTo mode lst ->
            List.map (\k -> { endpoint = second k, controlPoints = [ first k ] }) lst

        SmoothQuadraticBezierCurveTo mode lst ->
            List.map (\k -> { endpoint = k, controlPoints = [] }) lst

        EllipticalArc mode lst ->
            List.map (\k -> { endpoint = k.target, controlPoints = [ k.radii ] }) lst

        ClosePath ->
            []



-- 端点と制御点の集合を集めて返す
-- points : List SubPath -> List Coordinate
-- points subPaths =
--     case subPaths of
--         hd :: tl ->
--             subpathToPoint hd ++ points tl
--         [] ->
--             []


subpathToPoint : SubPath -> List Coordinate
subpathToPoint subpath =
    movetoToPoint subpath.moveto :: (List.map drawtoToPoint subpath.drawtos |> Utils.flattenList)


movetoToPoint : MoveTo -> Coordinate
movetoToPoint moveto =
    case moveto of
        MoveTo mode coordinate ->
            coordinate


drawtoToPoint : DrawTo -> List Coordinate
drawtoToPoint drawto =
    case drawto of
        LineTo mode lst ->
            lst

        Horizontal mode lst ->
            []

        Vertical mode lst ->
            []

        CurveTo mode lst ->
            Utils.flattenTriple lst

        SmoothCurveTo mode lst ->
            Utils.flattenTuple lst

        QuadraticBezierCurveTo mode lst ->
            Utils.flattenTuple lst

        SmoothQuadraticBezierCurveTo mode lst ->
            lst

        EllipticalArc mode lst ->
            lst |> List.map (\k -> [ k.radii, k.target ]) |> Utils.flattenList

        ClosePath ->
            []



-- ノードに関数cfnをかけて返す


replaceNode : NodeId -> (Coordinate -> Coordinate) -> List SubPath -> List SubPath
replaceNode n cfn subPaths =
    case subPaths of
        hd :: tl ->
            let
                k =
                    n.index - subPathLength hd
            in
            if k < 0 then
                replaceSubPathNode n cfn hd :: tl
            else
                hd :: replaceNode { n | index = k } cfn tl

        [] ->
            []


subPathLength : SubPath -> Int
subPathLength subpath =
    subpathToNode subpath |> List.length


replaceSubPathNode : NodeId -> (Coordinate -> Coordinate) -> SubPath -> SubPath
replaceSubPathNode n cfn subpath =
    if n.index == 0 then
        case subpath.moveto of
            MoveTo mode c ->
                { subpath | moveto = MoveTo mode (cfn c) }
    else
        { subpath | drawtos = replaceDrawTosNode { n | index = n.index - 1 } cfn subpath.drawtos }


replaceDrawTosNode : NodeId -> (Coordinate -> Coordinate) -> List DrawTo -> List DrawTo
replaceDrawTosNode n cfn drawtos =
    case drawtos of
        hd :: tl ->
            let
                k =
                    n.index - drawtoLength hd
            in
            if k < 0 then
                replaceDrawToNode n cfn hd :: tl
            else
                hd :: replaceDrawTosNode { n | index = k } cfn tl

        [] ->
            []


drawtoLength : DrawTo -> Int
drawtoLength drawto =
    drawtoToNode drawto |> List.length


replaceDrawToNode : NodeId -> (Coordinate -> Coordinate) -> DrawTo -> DrawTo
replaceDrawToNode n cfn drawto =
    case drawto of
        LineTo mode lst ->
            LineTo mode (Utils.replaceNth n.index cfn lst)

        Horizontal mode lst ->
            Horizontal mode lst

        Vertical mode lst ->
            Vertical mode lst

        CurveTo mode lst ->
            CurveTo mode (replaceTriple n cfn lst)

        SmoothCurveTo mode lst ->
            SmoothCurveTo mode (replaceTuple n cfn lst)

        QuadraticBezierCurveTo mode lst ->
            QuadraticBezierCurveTo mode (replaceTuple n cfn lst)

        SmoothQuadraticBezierCurveTo mode lst ->
            SmoothQuadraticBezierCurveTo mode (Utils.replaceNth n.index cfn lst)

        EllipticalArc mode args ->
            EllipticalArc mode args

        -- 前処理で破棄されているので省略
        ClosePath ->
            ClosePath


replaceTuple : NodeId -> (Coordinate -> Coordinate) -> List ( Coordinate, Coordinate ) -> List ( Coordinate, Coordinate )
replaceTuple nodeId cfn lst =
    case lst of
        ( h1, h2 ) :: tl ->
            if nodeId.index == 0 then
                case nodeId.member of
                    ControlPoint _ ->
                        ( cfn h1, h2 ) :: tl

                    Endpoint ->
                        ( h1, cfn h2 ) :: tl
            else
                ( h1, h2 ) :: replaceTuple { nodeId | index = nodeId.index - 1 } cfn tl

        _ ->
            []


replaceTriple : NodeId -> (Coordinate -> Coordinate) -> List TripleCoord -> List TripleCoord
replaceTriple nodeId cfn lst =
    case lst of
        ( h1, h2, h3 ) :: tl ->
            if nodeId.index == 0 then
                case nodeId.member of
                    ControlPoint 0 ->
                        ( cfn h1, h2, h3 ) :: tl

                    ControlPoint _ ->
                        ( h1, cfn h2, h3 ) :: tl

                    Endpoint ->
                        ( h1, h2, cfn h3 ) :: tl
            else
                ( h1, h2, h3 ) :: replaceTriple { nodeId | index = nodeId.index - 1 } cfn tl

        _ ->
            []


eargLength : EllipticalArcArgument -> Int
eargLength arg =
    2


eargNth : Int -> (Coordinate -> Coordinate) -> EllipticalArcArgument -> EllipticalArcArgument
eargNth n cfn arg =
    case n of
        0 ->
            { arg | radii = cfn arg.radii }

        1 ->
            { arg | target = cfn arg.target }

        _ ->
            arg


generic : (Coordinate -> Coordinate) -> List SubPath -> List SubPath
generic cfn lst =
    List.map (genericSubPath cfn) lst


genericSubPath : (Coordinate -> Coordinate) -> SubPath -> SubPath
genericSubPath cfn subpath =
    { moveto = genericMoveTo cfn subpath.moveto, drawtos = List.map (genericDrawTo cfn) subpath.drawtos }


genericMoveTo : (Coordinate -> Coordinate) -> MoveTo -> MoveTo
genericMoveTo cfn moveto =
    case moveto of
        MoveTo mode c ->
            MoveTo mode (cfn c)


genericDrawTo : (Coordinate -> Coordinate) -> DrawTo -> DrawTo
genericDrawTo cfn drawto =
    case drawto of
        LineTo mode lst ->
            LineTo mode (List.map cfn lst)

        Horizontal mode lst ->
            Horizontal mode lst

        Vertical mode lst ->
            Vertical mode lst

        CurveTo mode lst ->
            CurveTo mode (Utils.tripleMap cfn lst)

        SmoothCurveTo mode lst ->
            SmoothCurveTo mode (Utils.tupleMap cfn lst)

        QuadraticBezierCurveTo mode lst ->
            QuadraticBezierCurveTo mode (Utils.tupleMap cfn lst)

        SmoothQuadraticBezierCurveTo mode lst ->
            SmoothQuadraticBezierCurveTo mode (List.map cfn lst)

        EllipticalArc mode lst ->
            EllipticalArc mode (List.map (genericEarg cfn) lst)

        ClosePath ->
            ClosePath


genericEarg : (Coordinate -> Coordinate) -> EllipticalArcArgument -> EllipticalArcArgument
genericEarg cfn earg =
    { earg | target = cfn earg.target }


type alias TripleCoord =
    ( Coordinate, Coordinate, Coordinate )



-- n番目の命令について、それがCurveToであるとき関数を適用する


recurve : Int -> (TripleCoord -> TripleCoord) -> List SubPath -> List SubPath
recurve n fn subPaths =
    case subPaths of
        hd :: tl ->
            let
                k =
                    n - opcount hd
            in
            if k < 0 then
                recurveSubPath n fn hd :: tl
            else
                hd :: recurve k fn tl

        [] ->
            []


recurveSubPath : Int -> (TripleCoord -> TripleCoord) -> SubPath -> SubPath
recurveSubPath n fn subPath =
    if n == 0 then
        subPath
    else
        { subPath | drawtos = recurveDrawTos (n - 1) fn subPath.drawtos }


recurveDrawTos : Int -> (TripleCoord -> TripleCoord) -> List DrawTo -> List DrawTo
recurveDrawTos n fn drawtos =
    case drawtos of
        hd :: tl ->
            let
                k =
                    n - opcountDrawTo hd
            in
            if k < 0 then
                recurveDrawTo n fn hd :: tl
            else
                hd :: recurveDrawTos k fn tl

        [] ->
            []


recurveDrawTo : Int -> (TripleCoord -> TripleCoord) -> DrawTo -> DrawTo
recurveDrawTo n fn drawto =
    case drawto of
        CurveTo mode lst ->
            CurveTo mode <| recurveTripleList n fn lst

        _ ->
            drawto


recurveTripleList : Int -> (TripleCoord -> TripleCoord) -> List TripleCoord -> List TripleCoord
recurveTripleList n fn lst =
    case lst of
        hd :: tl ->
            if n == 0 then
                fn hd :: tl
            else
                hd :: recurveTripleList (n - 1) fn lst

        [] ->
            []



-- 命令数をカウントする


opcount : SubPath -> Int
opcount subpath =
    1 + (List.map opcountDrawTo subpath.drawtos |> List.sum)


opcountDrawTo : DrawTo -> Int
opcountDrawTo drawto =
    case drawto of
        LineTo mode lst ->
            List.length lst

        Horizontal mode lst ->
            List.length lst

        Vertical mode lst ->
            List.length lst

        CurveTo mode lst ->
            List.length lst

        SmoothCurveTo mode lst ->
            List.length lst

        QuadraticBezierCurveTo mode lst ->
            List.length lst

        SmoothQuadraticBezierCurveTo mode lst ->
            List.length lst

        EllipticalArc mode args ->
            List.length args

        ClosePath ->
            1



-- 末尾に新しい命令をつける subpathが一つもない場合はつけられない


add : DrawTo -> List SubPath -> List SubPath
add drawto subPaths =
    let
        ( initSubPath, lastSubPath ) =
            ( List.Extra.init subPaths, List.Extra.last subPaths )

        newLastSubPath =
            lastSubPath |> Maybe.map (\k -> { k | drawtos = k.drawtos ++ [ drawto ] })
    in
    case ( initSubPath, newLastSubPath ) of
        ( Just a, Just b ) ->
            a ++ [ b ]

        ( Nothing, Just b ) ->
            [ b ]

        _ ->
            subPaths



-- 基本図形をパスへ


shapeToPath : SVGElement -> SVGElement
shapeToPath svg =
    case svg of
        Rectangle { leftTop, size } ->
            let
                x =
                    first leftTop

                y =
                    second leftTop
            in
            Path
                { subPaths =
                    [ { moveto = MoveTo Absolute ( x, y )
                      , drawtos =
                            [ LineTo Absolute
                                [ ( x + first size, y )
                                , ( x + first size, y + second size )
                                , ( x, y + second size )
                                ]
                            , ClosePath
                            ]
                      }
                    ]
                }

        Polygon { points, enclosed } ->
            case points of
                hd1 :: hd2 :: tl ->
                    Path
                        { subPaths =
                            [ { moveto = MoveTo Absolute hd1
                              , drawtos =
                                    [ LineTo Absolute (hd2 :: tl) ]
                                        ++ (if enclosed then
                                                [ ClosePath ]
                                            else
                                                []
                                           )
                              }
                            ]
                        }

                _ ->
                    svg

        -- https://stackoverflow.com/questions/2172798/how-to-draw-an-oval-in-html5-canvas
        Ellipse { center, size } ->
            let
                cx =
                    first center

                cy =
                    second center

                w =
                    first size

                h =
                    second size

                x =
                    cx - w / 2

                y =
                    cy - h / 2

                kappa =
                    0.5522848

                ox =
                    (w / 2) * kappa

                oy =
                    (h / 2) * kappa

                xe =
                    x + w

                ye =
                    y + h

                xm =
                    x + w / 2

                ym =
                    y + h / 2
            in
            Path
                { subPaths =
                    [ { moveto = MoveTo Absolute ( x, ym )
                      , drawtos =
                            [ CurveTo Absolute
                                [ ( ( x, ym - oy ), ( xm - ox, y ), ( xm, y ) )
                                , ( ( xm + ox, y ), ( xe, ym - oy ), ( xe, ym ) )
                                , ( ( xe, ym + oy ), ( xm + ox, ye ), ( xm, ye ) )
                                , ( ( xm - ox, ye ), ( x, ym + oy ), ( x, ym ) )
                                ]
                            ]
                      }
                    ]
                }

        _ ->
            svg


rotate : Float -> Vec2 -> List SubPath -> List SubPath
rotate angle center subPathes =
    let
        translate vec2 =
            ( ( 1, 0, first vec2 ), ( 0, 1, second vec2 ), ( 0, 0, 1 ) )

        rotate a =
            ( ( cos a, -(sin a), 0 ), ( sin a, cos a, 0 ), ( 0, 0, 1 ) )

        rotateFn vec2 =
            Matrix3.mulVector (translate ( -(first center), -(second center) )) ( first vec2, second vec2, 1 )
                |> Matrix3.mulVector (rotate angle)
                |> Matrix3.mulVector (translate center)
                |> (\ret -> ( Vector3.getX ret, Vector3.getY ret ))
    in
    generic rotateFn subPathes


-- ノードをけす

removeNode: NodeId -> List SubPath -> List SubPath
removeNode nodeId subPaths =
    case subPaths of
        hd :: tl ->
            let
                k = nodeId.index - subPathLength hd
            in
            if k < 0 then
                removeSubPathNode nodeId hd :: tl
            else
                hd :: removeNode {nodeId | index = k} tl
        [] -> []

removeSubPathNode: NodeId -> SubPath -> SubPath
removeSubPathNode nodeId subpath =
    -- MoveToなので消せない
    if nodeId.index == 0 then subpath
    else  {subpath | drawtos = removeDrawTosNode {nodeId | index = nodeId.index - 1} subpath.drawtos}

removeDrawTosNode: NodeId -> List DrawTo -> List DrawTo
removeDrawTosNode nodeId drawtos =
    case drawtos of
        hd :: tl ->
            let
                k = nodeId.index - drawtoLength hd
            in
            if k < 0 then
                removeDrawToNode nodeId hd :: tl
            else
                hd :: removeDrawTosNode {nodeId | index = k} tl
        [] -> []

removeDrawToNode: NodeId -> DrawTo -> DrawTo
removeDrawToNode nodeId drawto = case drawto of
    LineTo mode lst ->
        LineTo mode (removeAt nodeId.index lst)
    Horizontal mode lst -> Horizontal mode lst
    Vertical mode lst -> Vertical mode lst
    CurveTo mode lst ->
        CurveTo mode (removeAt nodeId.index lst)
    SmoothCurveTo mode lst ->
        SmoothCurveTo mode (removeAt nodeId.index lst)
    QuadraticBezierCurveTo mode lst ->
        QuadraticBezierCurveTo mode (removeAt nodeId.index lst)
    SmoothQuadraticBezierCurveTo mode lst ->
        SmoothQuadraticBezierCurveTo mode (removeAt nodeId.index lst)
    EllipticalArc mode args ->
        EllipticalArc mode (removeAt nodeId.index args)
    ClosePath ->
        ClosePath