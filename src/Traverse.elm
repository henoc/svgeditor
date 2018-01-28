module Traverse exposing (..)

import Types exposing (..)
import Utils

traverse : (StyledSVGElement -> StyledSVGElement) -> StyledSVGElement -> StyledSVGElement
traverse fn elem =
    case elem.shape of
        SVG { elems, size } ->
            let
                newElems =
                    elems |> List.map (traverse fn)
            in
            fn { elem | shape = SVG { elems = newElems, size = size } }

        Defs { elems } ->
            let
                newElems =
                    elems |> List.map (traverse fn)
            in
            fn { elem | shape = Defs { elems = newElems } }
        
        LinearGradient { identifier, stops } ->
            let
                newElems =
                    stops |> List.map (traverse fn)
            in
            fn { elem | shape = LinearGradient { identifier = identifier, stops = newElems } }

        RadialGradient { identifier, stops } ->
            let
                newElems =
                    stops |> List.map (traverse fn)
            in
            fn { elem | shape = RadialGradient { identifier = identifier, stops = newElems } }

        Unknown { name, elems } ->
            let
                newElems =
                    elems |> List.map (traverse fn)
            in
            fn { elem | shape = Unknown { name = name, elems = newElems } }

        _ ->
            fn elem

(+): IdentSet -> IdentSet -> IdentSet
(+) set1 set2 = {textSizes = set1.textSizes ++ set2.textSizes, gradients = set1.gradients ++ set2.gradients}

zero: IdentSet
zero = {textSizes = [], gradients = []}

-- For resolve Later parameters

accumulateIdents: StyledSVGElement -> IdentSet -> IdentSet
accumulateIdents elem cmds =
    case elem.shape of
        SVG { elems, size } ->
            List.foldl accumulateIdents cmds elems

        Defs { elems } ->
            List.foldl accumulateIdents cmds elems


        Unknown { name, elems } ->
            List.foldl accumulateIdents cmds elems
        
        LinearGradient { identifier, stops } ->
            let newCmds = List.foldl accumulateIdents cmds stops in
            newCmds + {textSizes = [], gradients = [elem.id]}

        RadialGradient { identifier, stops } ->
            let newCmds = List.foldl accumulateIdents cmds stops in
            newCmds + {textSizes = [], gradients = [elem.id]}

        Text { elems, baseline, leftTop, size } ->
            let newCmds = List.foldl accumulateIdents cmds elems in
            newCmds + {textSizes = [elem.id], gradients = []}
        _ ->
            cmds

genCommands: IdentSet -> Cmd Msg
genCommands cmds = Cmd.batch [Utils.getTextSizes cmds.textSizes, Utils.getGradientStyles cmds.gradients]
