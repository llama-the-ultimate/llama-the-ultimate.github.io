"use strict";
(() => {
  const syntax = require("./syntax.js");

  const escapeMap = new Map([
    ["&", "&amp;"],
    ["<", "&lt;"],
    [">", "&gt;"],
    ['"', "&quot;"],
    ["''", "&apos;"],
  ]);

  const escapeHtml = (str) => {
    let res = "";
    for (const c of str) {
      res += escapeMap.has(c) ? escapeMap.get(c) : c;
    }
    return res;
  };

  const textHtml = (text) => {
    let res = "";
    for (const x of text.list) {
      const html = escapeHtml(x.str);
      if (x.open === "_") {
        res += `<em>${html}</em>`;
      } else if (x.open === "`") {
        res += `<code>${html}</code>`;
      } else {
        res += `${x.open}${html}${x.close}`;
      }
    }
    return res;
  };

  const baseRelify = (dirlist) => (url) => {
    if (url[0] !== "/") {
      return url;
    }
    const urlDir = url.slice(1).split("/");
    const urlEnd = urlDir.pop();
    const len = Math.min(dirlist.length, urlDir.length);
    let i;
    for (i = 0; i < len; i++) {
      if (urlDir[i] !== dirlist[i]) {
        break;
      }
    }
    const parenting = "../".repeat(dirlist.length - i);
    const urlPath = i === urlDir.length ? "" : `${urlDir.slice(i).join("/")}/`;
    return `./${parenting}${urlPath}${urlEnd}`;
  };

  const create = (relify) => {
    const myRelify = relify === undefined ? baseRelify([]) : relify;
    const renderError = (content, description) =>
      `<del title="${escapeHtml(description)}">${escapeHtml(content)}</del>`;

    const renderLink = (line) => {
      const descHtml = textHtml(line.text);
      const linkType = line.args[0].str;
      const url = line.args[1].str;
      const descStr = descHtml !== "" ? descHtml : url;
      if (linkType === "gd") {
        const withHtml = `${
          url.endsWith(".txt") ? url.slice(0, -4) : url
        }.html`;
        const htmlUrl = `/notes/${withHtml}`;
        return `<a href="${myRelify(htmlUrl)}">${descStr}</a>`;
      }
      if (linkType === "url") {
        return `<a href="${myRelify(url)}">${descStr}</a>`;
      } else if (linkType === "me") {
        return `<a rel="me" href="${myRelify(url)}">${descStr}</a>`;
      }
      return `<p>${renderError(
        line.full,
        `unknown type "${escapeHtml(linkType)}"`
      )}</p>`;
    };

    const captionFrom = (line) => {
      const html = textHtml(line.text);
      return html.length === "" ? "" : `<figcaption>${html}</figcaption>`;
    };
    const renderInclude = (line) => {
      const includeType = line.args[0].str;
      const url = myRelify(line.args[1].str);
      if (includeType === "img") {
        return `<figure><a href="${url}"><img src="${url}"></a>${captionFrom(
          line
        )}</figure>`;
      }
      return `<p>${renderError(
        line.full,
        `unknown type "${escapeHtml(includeType)}"`
      )}</p>`;
    };

    const renderLine = (line) => {
      switch (line.type) {
        case "par":
        case "quote":
          return textHtml(line.text);
        case "link":
          return renderLink(line);
        case "li":
          return `<li>${textHtml(line.text)}</li>`;
        case "hr":
          return "<hr>";
        case "h1":
          return `<h1>${textHtml(line.text)}</h1>`;
        case "h2":
          return `<h2>${textHtml(line.text)}</h2>`;
        case "h3":
          return `<h3>${textHtml(line.text)}</h3>`;
        case "include":
          return renderInclude(line);
        case "error":
          return renderError(line.line, line.description);
        default:
          throw "oh no";
      }
    };

    const text = (res) => (line) => {
      switch (line.type) {
        case "par":
        case "link":
        case "error":
          return text(res + `<br>${renderLine(line)}`);
        default:
          return nothing(res + "</p>")(line);
      }
    };

    const li = (res) => (line) =>
      line.type === "li"
        ? li(res + renderLine(line))
        : nothing(res + "</ul>")(line);

    const quoteempty = (res) => (line) => {
      switch (line.type) {
        case "quoteempty":
          return quoteempty(res + "<br>");
        case "quote":
          return quote(res + `<p>${renderLine(line)}`);
        default:
          return nothing(res + "<br></blockquote>")(line);
      }
    };

    const quote = (res) => (line) => {
      switch (line.type) {
        case "quoteempty":
          return quoteempty(res + "</p>");
        case "quote":
          return quote(res + `<br>${renderLine(line)}`);
        default:
          return nothing(res + "</p></blockquote>")(line);
      }
    };

    const emptyline = (res) => (line) =>
      line.type === "empty" ? emptyline(res + "<br>") : nothing(res)(line);

    const pre = (caption, startres) => {
      const halp = (res) => (line) => {
        switch (line.type) {
          case "pre":
            return halp(res + `${escapeHtml(line.full)}\n`);
          case "toggle":
            return nothing((res += `</code></pre>${caption}</figure>`));
          case "end":
            return nothing((res += `</code></pre>${caption}</figure>`))(line);
          default:
            throw "oh no";
        }
      };
      return halp(startres);
    };

    const nothing = (res) => (line) => {
      switch (line.type) {
        case "empty":
          return emptyline(res);
        case "par":
        case "link":
        case "error":
          return text(res + `<p>${renderLine(line)}`);
        case "quote":
          return quote(res + `<blockquote><p>${renderLine(line)}`);
        case "quoteempty":
          return quote(res + "<blockquote><br>")(line);
        case "li":
          return li(res + "<ul>")(line);
        case "hr":
          return nothing(res + "<hr>");
        case "toggle":
          return pre(captionFrom(line), res + `<figure><pre><code>`);
        case "h1":
        case "h2":
        case "h3":
        case "include":
          return nothing(res + renderLine(line));
        case "keyval":
          return nothing(res);
        case "end":
          return res;
        case "insert":
          if (line.level === "text") {
            return text(res + `<p>${line.html}`);
          }
          if  (line.level === "outer") {
            return nothing(res + line.html);
          }
          if (line.level === "end") {
            return nothing(res + line.html)(syntax.End);
          }
          throw "oh no";
        default:
          throw "oh no";
      }
    };
    return nothing("");
  };

  const render = (renderer, list) => {
    let state = renderer;
    for (const line of list) {
      state = state(line);
    }
    return state(syntax.end);
  };

  module.exports = {
    escapeHtml: escapeHtml,
    textHtml: textHtml,
    create: create,
    render: render,
    relify: baseRelify,
  };
})();
