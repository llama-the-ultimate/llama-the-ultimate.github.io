/* globals
  Match
  Exp
*/

const Parse = (() => {
  class ParseError {
    #message;
    #index;
    constructor(message, index) {
      this.#message = message;
      this.#index = index;
    }
    match(cases) {
      return Match.match("ParseError", this, [this.#message, this.#index], cases);
    }
    isError() {
      return true;
    }
    flatMap(f) {
      return this;
    }
    either(f, g) {
      return g();
    }
  }
  class ParseResult {
    #value;
    #index;
    constructor(value, index) {
      this.#value = value;
      this.#index = index;
    }
    isError() {
      return false;
    }
    get value() {
      return this.#value;
    }
    get index() {
      return this.#index;
    }
    flatMap(f) {
      return f(this.#value, this.#index);
    }
    either(f, g) {
      return f(this.#value, this.#index);
    }
  }

  class Define {
    #name;
    #expression;
    constructor(name, expression) {
      this.#name = name;
      this.#expression = expression;
    }
    match(cases) {
      return Match.match("Define", this, [this.#name, this.#expression], cases);
    }
    get name() {
      return this.#name;
    }
    get expression() {
      return this.#expression;
    }
  }

  class Undefine {
    #name;
    constructor(name) {
      this.#name = name;
    }
    match(cases) {
      return Match.match("Undefine", this, [this.#name], cases);
    }
    get name() {
      return this.#name;
    }
  }
  class Expression {
    #expression;
    constructor(expression) {
      this.#expression = expression;
    }
    match(cases) {
      return Match.match("Expression", this, [this.#expression], cases);
    }
    get expression() {
      return this.#expression;
    }
  }

  const isLambda = (code) => code === 92 || code === 955;
  const isWhite = (code) =>
    code === 32 || code === 9 || code === 10 || code === 13;
  const isDot = (code) => code === 46;

  const isDef = (code) => code === 8796;
  const isColon = (code) => code === 58;
  const isEquals = (code) => code === 61;

  const isId = (code) =>
    !(
      isLambda(code) ||
      isWhite(code) ||
      isDot(code) ||
      isOpen(code) ||
      isClose(code) ||
      isDef(code) ||
      isColon(code) ||
      isEquals(code)
    );

  const isOpen = (code) => code === 40;
  const isClose = (code) => code === 41;

  const isBar = (code) => code === 124;

  const strCode = (s, i) => s.charCodeAt(i);
  const strAtEnd = (s, i) => i >= s.length || isBar(strCode(s, i));

  const skipChars = (pred) => (s, i) => {
    var idx;
    for (idx = i; idx < s.length; idx++) {
      if (!pred(s.charCodeAt(idx))) {
        break;
      }
    }
    return idx;
  };

  const skipWhites = skipChars(isWhite);

  const parseIdentifier = (s, startI) => {
    const stopI = skipChars(isId)(s, startI);
    return stopI === startI
      ? new ParseError("expected identifier", stopI)
      : new ParseResult(s.substr(startI, stopI - startI), stopI);
  };

  const parseLambda = (s, lamI) => {
    if (!isLambda(strCode(s, lamI))) {
      return new ParseError("expected lambda", lamI);
    }

    const paramStartI = skipWhites(s, lamI + 1);
    return parseIdentifier(s, paramStartI).flatMap((param, paramStopI) => {
      const dotI = skipWhites(s, paramStopI);

      if (!isDot(strCode(s, dotI))) {
        return new ParseError("expected dot", dotI);
      }

      return parseApps(s, dotI + 1).flatMap(
        (body, nextI) => new ParseResult(new Exp.Lam(param, body), nextI)
      );
    });
  };

  const parseOne = (s, startI) => {
    const code = strCode(s, startI);
    if (isId(code)) {
      return parseIdentifier(s, startI).flatMap(
        (v, i) => new ParseResult(new Exp.Var(v), i)
      );
    }
    if (isLambda(code)) {
      return parseLambda(s, startI);
    }
    if (isOpen(code)) {
      return parseApps(s, startI + 1).flatMap((exp, closeI) => {
        if (!isClose(strCode(s, closeI))) {
          return new ParseError("expected close paren", closeI);
        }
        return new ParseResult(exp, closeI + 1);
      });
    }
  };

  const parseApps = (s, beforeI) => {
    const exps = [];
    var currentI = beforeI;
    while (true) {
      currentI = skipWhites(s, currentI);
      if (strAtEnd(s, currentI)) {
        break;
      }
      const code = strCode(s, currentI);
      if (!(isId(code) || isLambda(code) || isOpen(code))) {
        break;
      }
      const res = parseOne(s, currentI);
      if (res.isError()) {
        return res;
      }
      exps.push(res.value);
      currentI = res.index;
    }

    if (exps.length === 0) {
      return new ParseError("expected _something_", currentI);
    }
    return new ParseResult(makeApps(exps), currentI);
  };

  const makeApps = (exps) => {
    var res = exps[0];
    for (var i = 1; i < exps.length; i++) {
      res = new Exp.App(res, exps[i]);
    }
    return res;
  };

  const parseExpression = (s, startI) => {
    const res = parseApps(s, startI);
    if (res.isError()) {
      return res;
    }
    if (!strAtEnd(s, res.index)) {
      return new ParseError("expected _not that_", res.index);
    }
    return res;
  };

  const parseDef = (name, s, i) =>
    isDef(strCode(s, i))
      ? new ParseResult(name, i + 1)
      : isColon(strCode(s, i)) && isEquals(strCode(s, i + 1))
      ? new ParseResult(name, i + 2)
      : new ParseError("expected ≜ or :=", i);

  const parse = (s) => {
    const startI = skipWhites(s, 0);
    const defRes = parseIdentifier(s, startI).flatMap((name, afterIdI) =>
      parseDef(name, s, skipWhites(s, afterIdI))
    );

    return defRes.either(
      (name, afterDefId) =>
        strAtEnd(s, skipWhites(s, afterDefId))
          ? new Undefine(name)
          : parseExpression(s, afterDefId).flatMap(
              (exp, u) => new Define(name, exp)
            ),
      () => parseExpression(s, 0).flatMap((exp, ui) => new Expression(exp))
    );
  };

  return {
    parse: parse,
  };
})();
