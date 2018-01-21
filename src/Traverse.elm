module Traverse exposing (..)

import Types exposing (..)


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

        Unknown { name, elems } ->
            let
                newElems =
                    elems |> List.map (traverse fn)
            in
            fn { elem | shape = Unknown { name = name, elems = newElems } }

        _ ->
            fn elem
