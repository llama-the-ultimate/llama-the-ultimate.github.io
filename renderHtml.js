"use strict";
(() => {
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

  const split = (arr) => {
    const res = [];
    let current = [];
    for (const x of arr) {
      if (x.text.str === "") {
        res.push(current);
        current = [];
      } else {
        current.push(x);
      }
    }
    res.push(current);
    return res;
  };

  const splitPara = (arr) => {
    const res = split(arr);
    if (res[res.length - 1].length === 0) {
      res.pop();
    }
    if (res.length > 0 && res[0].length === 0) {
      res.shift();
    }
    return res;
  };

  const renderLines = (arr) => {
    let str = textHtml(arr[0].text);
    for (let i = 1; i < arr.length; i++) {
      str += "<br>";
      str += textHtml(arr[i].text);
    }
    return str;
  };

  const renderPara = (arr) => {
    let str = "";
    for (const a of splitPara(arr)) {
      if (a.length === 0) {
        str += "<br>";
      } else {
        str += `<p>${renderLines(a)}</p>`;
      }
    }
    return str;
  };

  const renderQuote = (arr) => {
    let splitted = split(arr);

    if (splitted.every(a =>  a.length === 0)) {
      return `<blockquote>${"<br>".repeat(splitted.length - 1)}</blockquote>`;
    };
    
    const pars = splitted.length > 1;
    let str = "<blockquote>";
    for (const a of splitted) {
      if (a.length === 0) {
        str += "<br>";
      } else {
         str += pars ? `<p>${renderLines(a)}</p>` : renderLines(a);
      }
    }
    str += "</blockquote>";
    return str;
  };

  const relify = (url, dirlist) => {
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
  
  const textHtml = (text) => {
    let res = "";
    for (const x of text.list) {
      const html =  escapeHtml(x.str);
      if (x.open === "_") {
        res += `<em>${html}</em>`;
      } else if (x.open === "`") {
        res += `<code>${html}</code>`;
      } else {
        res += `${x.open}${html}${x.close}`;
      }
    }
    return res;
  }

  const baseLinker = (relify) => (line) => {
    const linkType = line.args[0].str;
    if (line.type === "include") {
      if (linkType === "img") {
        return `<p><img src="${relify(line.args[1].str)}" alt="${
          line.text.str
        }"></p>`;
      } else {
        return renderError(line.full, `unknown type "${escapeHtml(linkType)}"`);
      }
    }
    if (line.type === "link") {

      const descHtml = textHtml(line.text);
      const url = line.args[1].str;
      const descStr = descHtml !== "" ? descHtml : url;
      if (linkType === "gd") {
        const withHtml = `${url.endsWith(".txt") ? url.slice(0, -4) : url}.html`;
        const htmlUrl = relify(`/notes/${withHtml}`);
        return `<a href="${htmlUrl}">${descStr}</a>`;
      }
      if (linkType === "url") {
        return `<a href="${relify(url)}">${descStr}</a>`;
      } else if (linkType === "me") {
        return `<a rel="me" href="${relify(url)}">${descStr}</a>`;
      }
      return renderError(line.full, `unknown type "${escapeHtml(linkType)}"`);
    }
    return renderError(line.full, `unkown link type "${line.type}"`);
  };

  const renderLinks = (arr, linker, plain) => {
    if (arr.length === 1) {
      return `<p>${linker(arr[0])}</p>`;
    }
    let str = `<ul${plain ? "" : ` class="links"`}>` ;
    for (const x of arr) {
      str += `<li>${linker(x)}</li>`;
    }
    str += "</ul>";
    return str;
  };

  const renderLis = (arr) => {
    let str = "<ul>";
    for (const x of arr) {
      str += `<li>${textHtml(x.text)}</li>`;
    }
    str += "</ul>";
    return str;
  };

  const renderError = (content, description, plain) => plain ? "" :
    `<pre class="error" title="${escapeHtml(description)}">${escapeHtml(
      content
    )}</pre>`;

  const basePrextra = (alt) => alt.str === "" ? "" : ` title="${alt.str}"`;
  
  const renderPre = (arr, prextra) => {
    let str = `<pre${prextra(arr[0].text)}>`;
    const len =
      arr[arr.length - 1].type === "toggle" ? arr.length - 1 : arr.length;
    for (let i = 1; i < len; i++) {
      const line = arr[i];
      str += `${escapeHtml(line.full)}\n`;
    }
    str += "</pre>";
    return str;
  };

  const render = (arr, linker, prextra, plainHtml) => {
    const plain = plainHtml === true;
    let i;
    const gather = (type) => {
      const res = [arr[i]];
      let next;
      for (next = i + 1; next < arr.length; next++) {
        const line = arr[next];
        if (line.type !== type) {
          i = next - 1;
          return res;
        }
        res.push(arr[next]);
      }
      i = next - 1;
      return res;
    };
    const gatherPre = () => {
      const res = [arr[i]];
      for (i++; i < arr.length; i++) {
        const line = arr[i];
        res.push(arr[i]);
        if (line.type === "toggle") {
          return res;
        }
      }
      return res;
    };

    let str = "";
    for (i = 0; i < arr.length; i++) {
      const line = arr[i];

      const nextStr = () => {
        switch (line.type) {
          case "par":
            return renderPara(gather("par"));
          case "quote":
            return renderQuote(gather("quote"));
          case "link":
            return renderLinks(gather("link"), linker, plain);
          case "li":
            return renderLis(gather("li"));
          case "hr":
            return "<hr>";
          case "toggle":
            return renderPre(gatherPre(), prextra);
          case "h1":
            return `<h1>${textHtml(line.text)}</h1>`;
          case "h2":
            return `<h2>${textHtml(line.text)}</h2>`;
          case "h3":
            return `<h3>${textHtml(line.text)}</h3>`;
          case "include":
            return linker(line);
          case "error":
            return renderError(line.line, line.description, plain);
          case "keyval":
            return "";
          default:
            throw "oh no";
        }
      };

      str += nextStr();
    }
    return str;
  };

  module.exports = {
    render: render,
    textHtml: textHtml,
    linker: baseLinker,
    prextra: basePrextra,
    relify: relify,
  };
})();
