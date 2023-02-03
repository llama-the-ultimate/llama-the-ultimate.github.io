"use strict";
(() => {
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
  
  module.exports = {
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