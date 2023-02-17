"use strict";
(() => {
  const syntax = (() => {
    class StrWs {
      constructor(str, ws) {
        this.str = str;
        this.ws = ws;
      }
      get length() {
        return this.str.length + this.ws.length;
      }
      get full() {
        return `${this.str}${this.ws}`;
      }
    }

    const modes = new Set(["_", "`"]);

    class Span {
      constructor(open, close, str) {
        this.open = open;
        this.str = str;
        this.close = close;
      }
      get length() {
        return this.open.length + this.str.length + this.close.length;
      }
      get full() {
        return `${this.open}${this.str}${this.close}`;
      }
    }

    class Text {
      constructor(list, ws) {
        this.list = list;
        this.ws = ws;
      }
      get str() {
        return this.list.reduce((a, b) => `${a}${b.str}`, "");
      }
      get full() {
        return this.list.reduce((a, b) => `${a}${b.full}`, "");
      }
      get length() {
        return this.list.reduce((a, b) => a + b, 0) + this.ws.length;
      }
    }

    class Line {
      constructor(type, start, args, text) {
        this.type = type;
        this.start = start;
        this.args = args;
        this.text = text;
      }
      get full() {
        let res = this.start.full;
        for (const sw of this.args) {
          res += sw.full;
        }
        res += this.text.full;
        return res;
      }
    }

    class PreLine {
      constructor(line) {
        this.type = "pre";
        this.line = line;
      }
      get full() {
        return this.line;
      }
    }

    class ErrorLine {
      constructor(line, description) {
        this.type = "error";
        this.line = line;
        this.description = description;
      }
      get full() {
        return this.line;
      }
    }

    class Insert {
      constructor(html, level) {
        this.type = "insert";
        this.html = html;
        this.level = level === undefined ? "outer" : level;
      }
    }

    return {
      StrWs: StrWs,
      modes: modes,
      Span: Span,
      Text: Text,
      Line: Line,
      PreLine: PreLine,
      ErrorLine: ErrorLine,
      Insert: Insert,
      end: { type: "end" },
    };
  })();

  const parse = (() => {
    const strws = (str, ws) => new syntax.StrWs(str, ws);

    const isWs = (s) => s === " " || s == "\t";

    const ws = (str, start) => {
      let i;
      for (i = start; i < str.length && isWs(str[i]); i++) {}
      return str.substring(start, i);
    };
    const start = (startString, type) => (str) =>
      !str.startsWith(startString)
        ? null
        : {
            type: type,
            strws: strws(startString, ws(str, startString.length)),
          };

    const word = (str, start) => {
      let res = "";
      let i;
      for (i = start; i < str.length && !isWs(str[i]); i++) {}
      if (i == start) {
        return null;
      }
      return strws(str.substring(start, i), ws(str, i));
    };

    const restText = (str, start) => {
      let res = [];
      let mode = "";
      let buf = "";
      let ws = "";
      const flush = (nextMode) => {
        res.push(new syntax.Span(mode, mode, buf));
        mode = nextMode;
        buf = "";
      };

      let escape = false;
      for (let i = start; i < str.length; i++) {
        const c = str[i];
        if (!escape && c === "\\") {
          escape = true;
          continue;
        }
        const escaping = escape;
        escape = false;
        if (isWs(c)) {
          ws += c;
        } else {
          buf += ws;
          ws = "";
          if (!escaping && syntax.modes.has(c)) {
            if (mode === "") {
              flush(c);
            } else if (mode === c) {
              flush("");
            } else {
              buf += c;
            }
          } else {
            buf += c;
          }
        }
      }
      res.push(new syntax.Span(mode, "", buf));
      return new syntax.Text(res, ws);
    };

    const parser = (typetest, args) => (str) => {
      const res = typetest(str);
      if (res === null) {
        return null;
      }
      const type = res.type;
      const first = res.strws;

      let pos = first.length;
      if (args === undefined) {
        return new syntax.Line(type, first, [], restText(str, pos));
      }
      const words = [];
      for (let i = 0; i < args; i++) {
        const current = word(str, pos);
        if (current === null) {
          return new syntax.ErrorLine(str, "missing some stuff");
        }
        pos += current.length;
        words.push(current);
      }
      return new syntax.Line(type, first, words, restText(str, pos));
    };

    const lparser = (type, startString, args) =>
      parser(start(startString, type), args);

    const toggleStart = (str) => {
      if (!str.startsWith("```")) {
        return null;
      }
      let res = "```";
      for (let i = 3; i < str.length && !isWs(str[i]); i++) {
        res += str[i];
      }
      return { type: "toggle", strws: strws(res, ws(str, res.length)) };
    };

    const quoteStart = (str) => {
      if (!str.startsWith(">")) {
        return null;
      }
      const rest = ws(str, 1);
      const type = rest.length === str.length - 1 ? "quoteempty" : "quote";
      return { type: type, strws: strws(">", rest) };
    };
    const textStart = (str) => {
      const rest = ws(str, 0);
      const type = rest.length === str.length ? "empty" : "par";
      return { type: type, strws: strws("", rest) };
    };

    const toggleParser = parser(toggleStart);
    const textParser = parser(textStart);
    const quoteParser = parser(quoteStart);
    const parsers = [
      lparser("h3", "###"),
      lparser("h2", "##"),
      lparser("h1", "#"),
      quoteParser,
      lparser("link", "=>", 2),
      lparser("include", "<=", 2),
      lparser("li", "*"),
      lparser("hr", "----"),
      lparser("keyval", ":", 1),
      textParser,
    ];

    const lineFrom = (str) => {
      for (const x of parsers) {
        const res = x(str);
        if (res !== null) {
          return res;
        }
      }
    };

    const parse = (str) => {
      let title = null;
      const res = [];
      const meta = new Map();

      const push = (line) => {
        const t = line.type;
        if (t === "keyval") {
          const k = line.args[0].str;
          const v = meta.has(k) ? meta.get(k) : [];
          v.push(line.text);
          meta.set(k, v);
        }
        res.push(line);
        if (t === "h1" && title === null) {
          title = line.text.str;
        }
      };

      let pre = null;
      const line = () => {
        const tg = toggleParser(buf);
        if (tg !== null) {
          if (pre === null) {
            pre = tg.start.str;
            push(tg);
          } else if (tg.start.str === pre) {
            pre = null;
            push(tg);
          } else {
            push(new syntax.PreLine(buf));
          }
        } else if (pre) {
          push(new syntax.PreLine(buf));
        } else {
          push(lineFrom(buf));
        }
        buf = "";
      };

      let prevCr = false;
      let buf = "";
      for (const c of str) {
        const cr = c === "\r";
        if (cr) {
          line();
        } else if (c === "\n") {
          if (!prevCr) {
            line();
          }
        } else {
          buf += c;
        }
        prevCr = c === "\r";
      }
      line();
      return {
        parsed: res,
        title: title === null ? "untitled" : title,
        meta: meta,
      };
    };

    return parse;
  })();

  const html = (() => {
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
      const urlPath =
        i === urlDir.length ? "" : `${urlDir.slice(i).join("/")}/`;
      return `./${parenting}${urlPath}${urlEnd}`;
    };

    const renderer = (relify) => {
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
            if (line.level === "outer") {
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

    return {
      escapeHtml: escapeHtml,
      textHtml: textHtml,
      renderer: renderer,
      render: render,
      relify: baseRelify,
    };
  })();

  module.exports = {
    syntax: syntax,
    parse: parse,
    html: html,
  };
})();
