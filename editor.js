"use strict";
(() => {
  const gd = require("./glorpdown.js");

  const soon = (() => {
    const tasks = new Map();
    const timer = () => {
      for (const key of [...tasks.keys()]) {
        const task = tasks.get(key);
        const time = task.time;
        if (time > 0) {
          task.time = time - 1;
        } else {
          tasks.delete(key);
          task.thunk();
        }
      }
      setTimeout(timer, 100);
    };
    timer();
    return (key, thunk) => tasks.set(key, { time: 10, thunk: thunk });
  })();

  const elem = (tagName, props, ...children) => {
    const el = Object.assign(document.createElement(tagName), props);
    el.replaceChildren(...children);
    return el;
  };

  const create = (editor) => {
    const div = elem("div", { className: "editor-and-preview" });
    const changed = () => div.dispatchEvent(new Event("changed"));
    const parent = editor.parentElement;
    const editorDiv = div.appendChild(
      elem("div", { className: "editor-container" })
    );

    const toolbar = editorDiv.appendChild(
      elem("div", { className: "toolbar" })
    );

    const btn = (name, start, end) =>
      toolbar.appendChild(
        elem(
          "button",
          {
            onclick: () => {
              if (end === undefined) {
                editor.setRangeText(start);
              } else {
                const selStart = editor.selectionStart;
                const selEnd = editor.selectionEnd;
                const dir = editor.selectionDirection;
                editor.setRangeText(start, selStart, selStart);
                editor.setRangeText(
                  end,
                  selEnd + start.length,
                  selEnd + start.length
                );
                editor.setSelectionRange(
                  selStart + start.length,
                  selEnd + start.length,
                  dir
                );
              }
              changed();
              editor.focus();
            },
          },
          name
        )
      );

    btn("```", "```\n", "\n```");
    btn("_ _", "_", "_");
    btn("` `", "`", "`");
    btn("“”", "“", "”");
    btn("’", "’");
    btn("—", "—");

    parent.replaceChild(div, editor);
    editorDiv.appendChild(editor);

    const previewEl = document.getElementById(editor.dataset.preview);
    if (previewEl !== null) {
      const key = Symbol("key");
      let previewDirty = true;
      const preview = () => {
        if (previewDirty) {
          previewEl.innerHTML = gd.html.render(gd.parse(editor.value).parsed);
          previewDirty = false;
        }
      };
      div.addEventListener("changed", () => {
        previewDirty = true;
        soon(key, preview);
      });
      preview();

      const matchSize = () =>
        (previewEl.style.maxHeight = `${div.offsetHeight}px`);
      new ResizeObserver(matchSize).observe(div);
      matchSize();
    }

    editor.oninput = changed;
    return div;
  };
  [...document.getElementsByClassName("editor")].forEach(create);
})();
