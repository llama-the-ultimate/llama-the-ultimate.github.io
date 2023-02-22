"use strict";

(() => {
  const gd = require("./glorpdown.js");
  
  const setProps = (elem, props) => {
    for (const prop in props) {
      elem[prop] = props[prop];
    }
  };

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

  const elem = (parent, type, props) => {
    const el = document.createElement(type);
    parent.appendChild(el);
    if (props !== undefined) {
      setProps(el, props);
    }
    return el;
  };

  const create = (editor) => {
    let previewDirty = true;
    const div = document.createElement("div");
    div.className = "editor-and-preview";
    const parent = editor.parentElement;
    const editorDiv = elem(div, "div", { className: "editor-container" });

    const toolbar = elem(editorDiv, "div", { className: "toolbar" });

    const btn = (name, start, stop) =>
      elem(toolbar, "button", {
        innerText: name,
        onclick: () => {
          if (stop === undefined) {
            replaceSelection(start);
          } else {
            surroundSelection(start, stop);
          }
          editor.focus();
        },
      });

    btn("```", "```\n", "\n```");
    btn("_ _", "_", "_");
    btn("` `", "`", "`");
    btn("“”", "“", "”");
    btn("’", "’");
    btn("—", "—");

    parent.replaceChild(div, editor);
    editorDiv.appendChild(editor);

    const previewEl = document.getElementById(editor.dataset.preview);
    const renderer = gd.html.renderer((url) => url);
    const preview = () => {
      if (previewEl !== null && previewDirty) {
        const parsed = gd.parse(editor.value).parsed;
        previewEl.innerHTML = gd.html.render(renderer, parsed);
        previewDirty = false;
      }
    };
    if (previewEl !== null) {
      const matchSize = () => previewEl.style.maxHeight = `${div.offsetHeight}px`;
      new ResizeObserver(matchSize).observe(div);
      matchSize();
    }
    const key = Symbol("key");
    const changed = () => {
      previewDirty = true;
      soon(key, preview);
      div.dispatchEvent(new Event("changed"));
    };

    const replaceSelection = (replacement) => {
      const str = editor.value;
      const before = str.substring(0, editor.selectionStart);
      const after = str.substring(editor.selectionEnd);
      const dir = editor.selectionDirection;
      editor.value = `${before}${replacement}${after}`;
      editor.setSelectionRange(
        before.length + replacement.length,
        before.length + replacement.length,
        dir
      );
      changed();
    };

    const surroundSelection = (open, close) => {
      const str = editor.value;
      const before = str.substring(0, editor.selectionStart);
      const selected = str.substring(
        editor.selectionStart,
        editor.selectionEnd
      );
      const after = str.substring(editor.selectionEnd);
      const dir = editor.selectionDirection;
      editor.value = `${before}${open}${selected}${close}${after}`;
      editor.setSelectionRange(
        before.length + open.length,
        before.length + open.length + selected.length,
        dir
      );
      changed();
    };
    editor.oninput = changed;
    preview();
    return div;
  };
  [...document.getElementsByClassName("editor")].forEach(create);
})();
