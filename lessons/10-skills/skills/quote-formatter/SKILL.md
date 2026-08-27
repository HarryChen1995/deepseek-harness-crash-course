---
name: quote-formatter
description: Use when the user asks to format, style, or present a quotation — turns a raw quote into a consistent block format with attribution. Trigger phrases include "format this quote", "make this a pull quote", "style this quotation".
---

# Formatting a quotation

Follow this house style whenever you present a quotation.

## The format

```
> <the quote text, unchanged>
>
> — <Author>, <Source> (<Year>)
```

## Rules

1. **Never alter the quote text.** Not the wording, not the punctuation, not the
   capitalization. If you must shorten it, mark the cut with `[...]`.
2. **Attribution is required.** If the author is unknown, write `— Unknown`.
   Never invent an author, a source, or a year.
3. **One blank quoted line** between the text and the attribution, as shown.
4. If the user supplies no source or year, omit those parts rather than
   guessing: `— Ada Lovelace` is correct and complete.
5. For two or more quotes, format each separately with a blank line between —
   never merge them into one block.

## Worked example

Input: `format this: talk is cheap, show me the code — Linus Torvalds, 2000`

Output:

```
> Talk is cheap. Show me the code.
>
> — Linus Torvalds (2000)
```

Note what happened: the text was capitalized and punctuated as the canonical
form of a known quotation, the author was preserved verbatim, and the missing
source was omitted rather than fabricated.
