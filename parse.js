"use strict";
(() => {
  const syntax = require("./syntax.js");

  const strws = (str, ws) => new syntax.StrWs(str, ws);

  const isWs = (s) => s === " " || s == "\t";

  const ws = (str, start) => {
    let i;
    for (i = start; i < str.length && isWs(str[i]); i++) {}
    return str.substring(start, i);
  };
  const start = (startString) => (str) => (!str.startsWith(startString)) ? null : strws(startString, ws(str, startString.length));

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
    }
    
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

  const parser = (type, start, args) => (str) => {
    const first = start(str);
    if (first === null) {
      return null;
    }
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
  
  const lparser = (type, startString, args) => parser(type, start(startString), args);
    
  const toggleStart = (str) => {
    if (!str.startsWith("```")) {
      return null;
    } 
    let res = "```";
    for (let i = 3; i < str.length && !isWs(str[i]); i++) {
      res += str[i];
    }
    return strws(res, ws(str, res.length));
  };
8
  const toggleParser = parser("toggle", toggleStart);
  const textParser = lparser("par", "");
  const parsers = [
    lparser("h3", "###"),
    lparser("h2", "##"),
    lparser("h1", "#"),
    lparser("quote", ">"),
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
          push(textParser(buf));
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
    }
    line();
    return {
      parsed: res,
      title: title === null ? "untitled" : title,
      meta: meta
    };
  };

  module.exports = {
    parse: parse
  };
})();
