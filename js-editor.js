"use strict";

const outElement = (() => {
  const elem = (tagName, props, ...children) => {
    const el = Object.assign(document.createElement(tagName), props);
    el.replaceChildren(...children);
    return el;
  };
  const params = new URLSearchParams(window.location.search);
  const wait = params.has("wait") && params.get("wait") !== "false";
  let currentOut = null;
  window.addEventListener("error", (event) => {
    if (currentOut !== null) {
      currentOut.append(
        elem("span", { className: "error" }, event.message),
        elem("br")
      );
    }
  });

  const outElement = elem("div");

  const create = (element, prelude) => {
    const placeholder = elem("div", {});
    element.parentElement.replaceChild(placeholder, element);
    document.body.appendChild(element);

    const ta = elem("textarea", {
      className: "editor",
      readOnly: prelude,
      value: element.innerText,
    });
    element.remove();
    const run = (e) => {
      currentOut = out;
      div.appendChild(outElement);
      const script = elem("script", {}, ta.value);
      document.head.appendChild(script);
      script.remove();
      currentOut = null;
    };
    const toolbar = elem("div", { className: "toolbar" });
    const out = elem("pre", { className: "output" });
    const div = elem("div", { className: "editor-container" }, ta, elem("div", { className: "row" }, toolbar, out));
    document.body.appendChild(div);
    ta.setAttribute("style", "height: 0;");
    const height = ta.scrollHeight;
    ta.setAttribute("style", `height: ${height }px;`);
    const extra = ta.offsetHeight - ta.clientHeight;
    ta.setAttribute("style", `height: ${height + extra}px;`);
    placeholder.parentElement.replaceChild(div, placeholder);
    if (prelude) {
      run();
    }

    return { textarea: ta, toolbar: toolbar, out: out, run: run };
  };

  const thingToString = (level) => (thing) => {
    const keyString = (str) =>
      /^\p{L}[\p{Nd}\p{L}]*$/u.test(str) ? str : JSON.stringify(str);

    if (level > 2) {
      return `${thing}`;
    }
    if (Array.isArray(thing)) {
      const list = thing.map(thingToString(level + 1));
      if (level === 0 && list.length > 3) {
        return `[\n  ${list.join(",\n  ")}\n]`;
      } else {
        return `[${list.join(", ")}]`;
      }
    }
    if (typeof thing === "object") {
      const list = Object.keys(thing).map(
        (key) => `${keyString(key)}: ${thingToString(level + 1)(thing[key])}`
      );
      if (level === 0 && list.length > 3) {
        return `{ \n  ${list.join(",\n  ")}\n}`;
      } else {
        return `{ ${list.join(", ")} }`;
      }
    }
    if (typeof thing === "string" && level > 0) {
      return JSON.stringify(thing);
    }
    return `${thing}`;
  };

  window.addEventListener("load", (e) => {
    const log = console.log;
    console.log = (...args) => {
      log.apply(console, args);
      if (currentOut !== null) {
        currentOut.append(
          elem("samp", {}, args.map(thingToString(0)).join(" ")),
          "\n"
        );
      }
    };

    const preludes = [...document.querySelectorAll(".js-prelude")].map((el) =>
      create(el)
    );
    const repls = [...document.querySelectorAll(".js-repl")].map((el) =>
      create(el)
    );
    for (const editor of preludes) {
      editor.run();
    }
    for (const editor of repls) {
      editor.toolbar.append(
        elem("button", { className: "toolbar-button", title: "Run", onclick: editor.run }, "▶"),
        elem("button", { className: "toolbar-button", title: "Clear output", onclick: (e) => { editor.out.replaceChildren(); }}, "⎚"));
    }
  });
  return outElement;
})();
