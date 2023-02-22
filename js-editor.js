const elem = (type, props, ...children) => {
  const el = document.createElement(type);
  Object.assign(el, props);
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

const create = (element) => {
  const ta = elem("textarea", {
    className: "editor",
    value: element.innerText,
  });
  const play = elem(
    "button",
    {
      className: "toolbar-button",
      title: "Run",
      onclick: (e) => {
        currentOut = out;
        div.appendChild(outElement);
        const script = elem("script", {}, ta.value);
        document.head.appendChild(script);
        script.remove();
        currentOut = null;
      },
    },
    "▶"
  );
  const clear = elem(
    "button",
    {
      className: "toolbar-button",
      title: "Clear output",
      onclick: (e) => {
        out.replaceChildren();
      },
    },
    "⎚"
  );
  const out = elem("pre", { className: "output" });
  const div = elem(
    "div",
    { className: "editor-container" },
    ta,
    elem("div", { className: "toolbar" }, play, clear, out)
  );
  element.parentElement.replaceChild(div, element);
  ta.setAttribute("style", "height: 0;");
  ta.setAttribute("style", `height: ${ta.scrollHeight}px;`);
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

  const elems = [...document.getElementsByClassName("repl")];
  for (const el of elems) {
    create(el);
  }
});
