"use strict";
(() => {
  const masto = (() => {
    const get = (url, success, fail) => {
      const xhr = new XMLHttpRequest();
      xhr.open("GET", url, true);

      xhr.setRequestHeader("Content-type", "text/plain; charset=UTF-8");

      xhr.onreadystatechange = () => {
        if (xhr.readyState == 4) {
          if (xhr.status == 200) {
            success(JSON.parse(xhr.responseText));
          } else {
            fail(xhr.status + " " + xhr.statusText);
          }
        }
      };
      xhr.send();
    };

    const statusContent = (json) => {
      const div = document.createElement("div");
      div.innerHTML = json.content;
      return {
        url: json.url,
        content: [...div.children].map((x) => x.innerText).join("\n\n"),
      };
    };

    return (url, success) => {
      const a = url.split("/");
      const start = `${a.slice(0, 3).join("/")}/api/v1/statuses/`;
      const statusUrl = (statusId) => `${start}${statusId}`;
      const contextUrl = (statusId) => `${statusUrl(statusId)}/context`;

      const statusId = a[a.length - 1];
      const res = [];
      const handled = new Set();
      get(
        statusUrl(statusId),
        (firstStatus) => {
          const addStatus = (statuses, idx, next) => {
            if (idx >= statuses.length) {
              return next();
            }
            const status = statuses[idx];
            if (status.account.id !== firstStatus.account.id) {
              return next();
            }
            if (handled.has(status.url)) {
              return next();
            }
            handled.add(status.url);
            res.push(statusContent(status));
            get(
              contextUrl(status.id),
              (json) => {
                addStatus(json.descendants, 0, () =>
                  addStatus(statuses, idx + 1, next)
                );
              },
              (str) => {
                res.push({ url: url, content: str });

                addStatus(statuses, idx + 1, next);
              }
            );
          };
          addStatus([firstStatus], 0, () => success(res));
        },
        (str) => {
          res.push({ url: url, content: str });
          success(res);
        }
      );
    };
  })();

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
              const selStart = editor.selectionStart;
              const selEnd = editor.selectionEnd;
              const dir = editor.selectionDirection;
              const moveSelection = () => {
                editor.setSelectionRange(
                  selStart + start.length,
                  selEnd + start.length,
                  dir
                );
              };
              if (end === undefined) {
                editor.setRangeText(start);
                if (selStart === selEnd) {
                  moveSelection();
                }
              } else {
                editor.setRangeText(start, selStart, selStart);
                editor.setRangeText(
                  end,
                  selEnd + start.length,
                  selEnd + start.length
                );
                moveSelection();
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

    toolbar.appendChild(
      elem(
        "button",
        {
          onclick: () => {
            const meta = gd.parser.parse(editor.value).meta;
            if (!meta.has("masto")) {
              return;
            }
            const existing = new Set();
            if (meta.has("mastostatus")) {
              for (const text of meta.get("mastostatus")) {
                existing.add(text.str);
              }
            }

            const url = meta.get("masto")[0].str;
            masto(url, (statuses) => {
              let res = "";
              for (const status of statuses) {
                if (!existing.has(status.url)) {
                  res += `\n----\n\:mastostatus ${status.url}\n\n${status.content}\n`;
                }
              }
              if (res !== "") {
                const oldLength = editor.value.length;
                editor.setSelectionRange(oldLength, oldLength);
                res = `\n${res}`;
                editor.setRangeText(res);
                editor.setSelectionRange(
                  oldLength,
                  oldLength + res.length,
                  "forward"
                );

                changed();
                editor.focus();
              }
            });
          },
        },
        "🐘"
      )
    );

    parent.replaceChild(div, editor);
    editorDiv.appendChild(editor);

    const previewEl = document.getElementById(editor.dataset.preview);
    if (previewEl !== null) {
      const key = Symbol("key");
      let previewDirty = true;
      const preview = () => {
        if (previewDirty) {
          previewEl.innerHTML = gd.html.render(
            gd.parser.parse(editor.value).parsed
          );
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
