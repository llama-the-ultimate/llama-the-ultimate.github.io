"use strict";
(() => {
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

  const parse = require("./parse.js").parse;

  const create = (render, str) => {
    let previewDirty = true;
    const div = document.createElement("div");
    div.className = "editor-and-preview";
    const editorDiv = elem(div, "div", { className: "editor-container" });

    const toolbar = elem(editorDiv, "div", { className: "toolbar"});

    for (const arr of [
      ["```", "```\n", "\n```"],
      ["_ _", "_", "_"],
      ["` `", "`", "`"],
      ["“”", "“", "”"],
      ["’", "’"],
      ["—", "—"],
    ]) {
      const btn = elem(toolbar, "button", {
        innerText: arr[0],
        onclick: () => {
          if (arr.length === 3) {
            surroundSelection(arr[1], arr[2]);
          } else {
            replaceSelection(arr[1]);
          }
          editor.focus();
        },
      });
    }

    const editor = elem(editorDiv, "textarea", {
      className: "editor",
      wrap: "off",
      value: str,
    });
    const previewEl = elem(div, "div", { className: "preview" });

    const preview = () => {
      if (previewDirty) {
        const parsed = parse(editor.value).parsed;
        render(parsed, previewEl);
        previewDirty = false;
      }
    };

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

    div.getValue = () => editor.value;
    div.toolbar = toolbar;
    div.preview = preview;
    div.textFocus = () => editor.focus();
    return div;
  };
  module.exports = { create: create };
})();
