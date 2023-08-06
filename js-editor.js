"use strict";

const outElement = (() => {
  const elem = (tagName, props, ...children) => {
    const el = Object.assign(document.createElement(tagName), props);
    el.replaceChildren(...children);
    return el;
  };

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
    const buttons = prelude
      ? []
      : [
          elem(
            "button",
            {
              className: "toolbar-button",
              title: "Run",
              onclick: run,
            },
            "▶"
          ),
          elem(
            "button",
            {
              className: "toolbar-button",
              title: "Clear output",
              onclick: (e) => {
                out.replaceChildren();
              },
            },
            "⎚"
          ),
        ];
    const out = elem("pre", { className: "output" });
    const div = elem(
      "div",
      { className: "editor-container" },
      ta,
      elem("div", { className: "toolbar" }, ...buttons, out)
    );
    document.body.appendChild(div);
    ta.setAttribute("style", "height: 0;");
    ta.setAttribute("style", `height: ${ta.scrollHeight}px;`);
    placeholder.parentElement.replaceChild(div, placeholder);
    if (prelude) {
      run();
    }
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
    for (const el of [...document.querySelectorAll(".js-prelude")]) {
      create(el, true);
    }
    for (const el of [...document.querySelectorAll(".js-repl")]) {
      create(el, false);
    }
  });
  return outElement;
})();
