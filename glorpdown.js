"use strict";
/* require */

(() => {
  const render = require("./renderHtml.js");
  const myRender = (parsed, element) =>
    (element.innerHTML = render.render(
      parsed,
      render.linker((url) => render.relify(url, [])),
      render.prextra
    ));
  const editor = require("./editor.js").create(
    myRender,
    `# Test

Some text.
More text after a linebreak.

New paragraph.

<= img https://placekitten.com/g/320/200 A kitten.

=> url https://placekitten.com A link to the kitten place.

## Stuff

A list of some upcoming stuff:
* Racket stuff
* Something else

### Racket stuff

Bla bla you know in _Racket_, with the \`a\`s and the \`b\`s and that:
\`\`\`
#lang racket
(define b 4)
(for ([a (range 10)])
  (printf "~a is ~amore than ~a~n"
          a
          (if (> a b) "" "not ")
          b))
\`\`\`

### Something else

No code, but:
> Something someone said about something else sometime.
`
  );
  const editors = document.getElementById("editors");
  editors.appendChild(editor);
})();
