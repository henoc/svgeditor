module Combinators exposing (..)

import Regex exposing (..)

type alias Input = { data: String, position: Int, whitespace: List Char }

normalInput: String -> Input
normalInput data = { data = data, position = 0, whitespace = ' ' :: '\n' :: [] }

type ParseResult result = ParseSuccess result Input | ParseFailure String Input

resultMap: (a -> b) -> ParseResult a -> ParseResult b
resultMap fn p = case p of
  ParseSuccess r i -> ParseSuccess (fn r) i
  ParseFailure r i -> ParseFailure r i

type alias Parser result = Input -> ParseResult result

skipwhitespace: Input -> Input
skipwhitespace input =
  let
    spaces: List String
    spaces = List.map String.fromChar input.whitespace
    firstStr = String.left 1 input.data
  in
  if List.any (\x -> x == firstStr) spaces then skipwhitespace {input | position = input.position + 1}
  else input

stringParser: String -> Parser String
stringParser str = \rawInput ->
  let
    input = skipwhitespace rawInput
  in
  if String.startsWith str (String.dropLeft input.position input.data) then ParseSuccess str {input | position = input.position + String.length str}
  else ParseFailure ("input doesn't start with " ++ str) input

regexParser: String -> Parser String
regexParser str = \rawInput ->
  let
    input = skipwhitespace rawInput
    regex = Regex.regex str
    result = find (AtMost 1) regex <| String.dropLeft input.position input.data
  in
  case result of
  [] -> ParseFailure ("input doesn't match with " ++ str) input
  hd :: tl ->
    if hd.index /= 0 then ParseFailure ("input doesn't match with " ++ str) input
    else ParseSuccess hd.match {input | position = input.position + hd.index}

andThen: Parser a -> Parser b -> Parser (a, b)
andThen p q = \input ->
  case p input of
    ParseSuccess r i2 -> resultMap (\r2 -> (r, r2)) (q i2)
    ParseFailure r _ -> ParseFailure r input

onlyLeft: Parser a -> Parser b -> Parser a
onlyLeft p q = map (\(x, y) -> x) (andThen p q)

onlyRight: Parser a -> Parser b -> Parser b
onlyRight p q = map (\(x, y) -> y) (andThen p q)

or: Parser a -> Parser a -> Parser a
or p q = \input ->
  case p input of
    ParseSuccess r i2 -> ParseSuccess r i2
    ParseFailure _ _ -> case q input of
      ParseSuccess r i2 -> ParseSuccess r i2
      ParseFailure r _ -> ParseFailure r input

option: Parser a -> Parser (Maybe a)
option p = \input ->
  case p input of
    ParseSuccess r i2 -> ParseSuccess (Just r) i2
    ParseFailure _ _ -> ParseSuccess Nothing input

map: (a -> b) -> Parser a -> Parser b
map fn p = \input ->
  case p input of
    ParseSuccess r i2 -> ParseSuccess (fn r) i2
    ParseFailure r i2 -> ParseFailure r i2
    
rep: Parser a -> Parser (List a)
rep p = \input ->
  let
    loop: Parser a -> Input -> (List a) -> ParseResult (List a)
    loop p i acc = case p i of
      ParseSuccess r i2 -> loop p i2 (r::acc)
      ParseFailure _ iLast -> ParseSuccess (List.reverse acc) iLast
  in
  loop p input []

rep1: Parser a -> Parser (List a)
rep1 p = \input ->
  let 
    p2 = andThen p (rep p)
  in
  case p2 input of
    ParseSuccess (hd, tl) i2 -> ParseSuccess (hd :: tl) i2
    ParseFailure r i2 -> ParseFailure r i2

rep1sep: Parser a -> Parser b -> Parser (List a)
rep1sep p s = \input ->
  let
    p2 = andThen p <| rep (onlyRight s p)
  in
  case p2 input of
    ParseSuccess (hd, tl) i2 -> ParseSuccess (hd :: tl) i2
    ParseFailure r i2 -> ParseFailure r i2

repsep: Parser a -> Parser b -> Parser (List a)
repsep p s = \input ->
  let
    p2 = andThen p <| rep (onlyRight s p)
  in
  case p2 input of
    ParseSuccess (hd, tl) i2 -> ParseSuccess (hd :: tl) i2
    ParseFailure r i2 -> ParseSuccess [] input

