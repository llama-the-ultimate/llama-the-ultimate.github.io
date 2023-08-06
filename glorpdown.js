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
      end: { type: "end", text: new Text([], "") },
    };
  })();

  const parser = (() => {
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

    const wordsParser = (typetest) => (str) => {
      const res = typetest(str);
      if (res === null) {
        return null;
      }
      const type = res.type;
      const first = res.strws;

      const words = [];
      let pos = first.length;
      while (true) {
        const current = word(str, pos);
        if (current === null) {
          return new syntax.Line(type, first, words, new syntax.Text([], ""));
        }
        pos += current.length;
        words.push(current);
      }
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

    const toggleStartParser = wordsParser(toggleStart);
    const toggleEndParser = parser(toggleStart);
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
      lparser("details", "+++"),
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
        if (pre === null) {
          const tg = toggleStartParser(buf);
          if (tg === null) {
            push(lineFrom(buf));
          } else {
            pre = tg.start.str;
            push(tg);
          }
        } else {
          const tg = toggleEndParser(buf);
          if (tg === null || tg.start.str !== pre) {
            push(new syntax.PreLine(buf));
          } else {
            pre = null;
            push(tg);
          }
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

    return {
      parse: parse,
      wordsParser: wordsParser,
      start: start,
      lparser: lparser,
    };
  })();

  const linesPreHtml = (line) => {
    const readNum = (str) => {
      const res = parseInt(str);
      if (isNaN(res)) {
        return null;
      }
      return res;
    };

    const linesParser = parser.wordsParser(parser.start("l", "lines"));
    const textParser = parser.lparser("text", "t", 2);

    let w = 240;
    let h = 120;
    if (line.args.length > 2) {
      const newX = readNum(line.args[1].str);
      const newY = readNum(line.args[2].str);
      if (newX !== null && newY !== null) {
        w = newX;
        h = newY;
      }
    }
    const x = (v) => `${v * (100 / w)}%`;
    const y = (v) => `${v * (100 / h)}%`;

    let str = `<figure><svg width="${w / 4}em" height="${h / 4}em">`;
    str += `<style>svg {stroke: currentColor;fill: none;}`;
    str += `text {stroke: none;dominant-baseline: middle;text-anchor: middle;fill: currentColor;}</style>`;

    return {
      str: str,
      process: (line) => {
        if (line.type === "toggle") {
          return `</svg>${html.captionFrom(line)}</figure>`;
        }
        const lines = linesParser(line.full);
        if (lines !== null) {
          let prev = null;
          let res = "";
          const args = lines.args;
          for (let i = 0; i + 1 < args.length; i = i + 2) {
            const curX = readNum(args[i].str);
            const curY = readNum(args[i + 1].str);
            if (curX === null || curY === null) {
              continue;
            }
            if (prev !== null) {
              res += `<line x1="${x(prev.x)}" y1="${y(prev.y)}" x2="${x(
                curX
              )}" y2="${y(curY)}" />`;
            }
            prev = { x: curX, y: curY };
          }
          return res;
        }
        const text = textParser(line.full);
        if (text !== null) {
          const posX = readNum(text.args[0].str);
          const posY = readNum(text.args[1].str);
          if (posX === null || posY === null) {
            return "";
          }
          return `<text x="${x(posX)}" y="${y(posY)}">${html.escapeHtml(
            text.text.full
          )}</text>`;
        }
        return "";
      },
    };
  };

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

    const relify = (dirlist) => (url) => {
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

    const renderError = (content, description) =>
      `<del title="${escapeHtml(description)}">${escapeHtml(content)}</del>`;

    const renderLink = (data, line) => {
      const descHtml = textHtml(line.text);
      const linkType = line.args[0].str;
      const url = line.args[1].str;
      const descStr = descHtml !== "" ? descHtml : url;
      if (linkType === "gd") {
        const withHtml = `${
          url.endsWith(".txt") ? url.slice(0, -4) : url
        }.html`;
        const htmlUrl = `/notes/${withHtml}`;
        return `<a href="${data.url(htmlUrl)}">${descStr}</a>`;
      }
      if (linkType === "url") {
        return `<a href="${data.url(url)}">${descStr}</a>`;
      } else if (linkType === "me") {
        return `<a rel="me" href="${data.url(url)}">${descStr}</a>`;
      }
      return `<p>${renderError(
        line.full,
        `unknown type "${escapeHtml(linkType)}"`
      )}</p>`;
    };

    const captionFrom = (line) => {
      if (line === null) {
        return "";
      }
      const html = textHtml(line.text);
      return html.length === 0 ? "" : `<figcaption>${html}</figcaption>`;
    };
    const summaryFrom = (data, line) => {
      const html = textHtml(line.text);
      return `<summary>${
        html.length === 0 ? data.defaultSummary : html
      }</summary>`;
    };

    const renderInclude = (data, line) => {
      const includeType = line.args[0].str;
      const url = data.url(line.args[1].str);
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

    const renderLine = (data, line) => {
      switch (line.type) {
        case "par":
        case "quote":
          return textHtml(line.text);
        case "link":
          return renderLink(data, line);
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
          return renderInclude(data, line);
        case "error":
          return renderError(line.line, line.description);
        default:
          throw "oh no";
      }
    };

    const text = (data, res) => (line) => {
      switch (line.type) {
        case "par":
        case "link":
        case "error":
          return text(data, res + `<br>${renderLine(data, line)}`);
        default:
          return nothing(data, res + "</p>")(line);
      }
    };

    const li = (data, res) => (line) =>
      line.type === "li"
        ? li(data, res + renderLine(data, line))
        : nothing(data, res + "</ul>")(line);

    const quoteempty = (data, res) => (line) => {
      switch (line.type) {
        case "quoteempty":
          return quoteempty(data, res + "<br>");
        case "quote":
          return quote(data, res + `<p>${renderLine(data, line)}`);
        default:
          return nothing(data, res + "<br></blockquote>")(line);
      }
    };

    const quote = (data, res) => (line) => {
      switch (line.type) {
        case "quoteempty":
          return quoteempty(data, res + "</p>");
        case "quote":
          return quote(data, res + `<br>${renderLine(data, line)}`);
        default:
          return nothing(data, res + "</p></blockquote>")(line);
      }
    };

    const emptyline = (data, res) => (line) =>
      line.type === "empty"
        ? emptyline(data, res + "<br>")
        : nothing(data, res)(line);

    const pre = (data, preHtml, res, line) => {
      const firstRes = preHtml(line);
      const process = firstRes.process;
      const start = (res) => (line) => {
        switch (line.type) {
          case "pre":
            return rest(res + process(line));
          case "toggle":
            return nothing(data, res + process(line));
          case "end":
            return nothing(data, res + process(line))(line);
          default:
            throw "oh no";
        }
      };
      const rest = (res) => (line) => {
        switch (line.type) {
          case "pre":
            return rest(res + `\n${process(line)}`);
          case "toggle":
            return nothing(data, res + process(line));
          case "end":
            return nothing(data, res + process(line))(line);
          default:
            throw "oh no";
        }
      };
      return start(res + firstRes.str);
    };

    const nothing = (data, res) => (line) => {
      switch (line.type) {
        case "empty":
          return emptyline(data, res);
        case "par":
        case "link":
        case "error":
          return text(data, res + `<p>${renderLine(data, line)}`);
        case "quote":
          return quote(data, res + `<blockquote><p>${renderLine(data, line)}`);
        case "quoteempty":
          return quote(data, res + "<blockquote><br>")(line);
        case "li":
          return li(data, res + "<ul>")(line);
        case "hr":
          return nothing(data, res + "<hr>");
        case "toggle":
          let preHtml = basePreHtml;
          if (line.args.length > 0) {
            const preType = line.args[0].str;
            if (data.pre.has(preType)) {
              preHtml = data.pre.get(preType);
            }
          }
          return pre(data, preHtml, res, line);
        case "details":
          const newData = Object.assign({}, data, { details: !data.details });
          const str = newData.details
            ? `<details>${summaryFrom(data, line)}`
            : "</details>";
          return nothing(newData, res + str);
        case "h1":
        case "h2":
        case "h3":
        case "include":
          return nothing(data, res + renderLine(data, line));
        case "keyval":
          return nothing(data, res);
        case "end":
          return data.details ? res + "</details>" : res;
        default:
          throw "oh no";
      }
    };

    const basePreHtml = (line) => ({
      str: `<figure><pre><code>`,
      process: (line) => {
        if (line.type === "pre") {
          return escapeHtml(line.full);
        }
        return `</code></pre>${captionFrom(line)}</figure>`;
      },
    });

    const render = (list, config) => {
      let data = Object.assign(
        {
          url: (url) => url,
          pre: new Map(),
          details: false,
          defaultSummary: "Details",
        },
        config
      );
      if (!data.pre.has("lines")) {
        data.pre = new Map(data.pre);
        data.pre.set("lines", linesPreHtml);
      }

      let state = nothing(data, "");
      for (const line of list) {
        state = state(line);
      }
      return state(syntax.end);
    };

    return {
      escapeHtml: escapeHtml,
      textHtml: textHtml,
      render: render,
      captionFrom: captionFrom,
      preHtml: basePreHtml,
      relify: relify,
    };
  })();

  module.exports = {
    syntax: syntax,
    parser: parser,
    html: html,
  };
})();
