module Traverse exposing (..)

import Types exposing (..)

traverse: StyledSVGElement -> (StyledSVGElement -> StyledSVGElement) -> StyledSVGElement
traverse elem fn = case elem.shape of
  SVG {elems, size} ->
    let
      newElems = List.map fn elems
    in
    fn {elem | shape = SVG {elems = newElems, size = size}}
  Defs {elems} ->
    let
      newElems = List.map fn elems
    in
    fn {elem | shape = Defs {elems = elems}}
  Unknown {name, elems} ->
    let
      newElems = List.map fn elems
    in
    fn {elem | shape = Unknown {name = name, elems = newElems}}
  _ ->
    fn elem
