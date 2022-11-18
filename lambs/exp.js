/* globals
  Match
*/

const Exp = (() => {
  class Var {
    #name;
    constructor(name) {
      this.#name = name;
    }
    match(cases) {
      return Match.match("Var", this, [this.#name], cases);
    }
  }

  class Lam {
    #parameter;
    #body;
    constructor(parameter, body) {
      this.#parameter = parameter;
      this.#body = body;
    }
    match(cases) {
      return Match.match("Lam", this, [this.#parameter, this.#body], cases);
    }
  }
  class App {
    #function;
    #argument;
    constructor(fun, arg) {
      this.#function = fun;
      this.#argument = arg;
    }
    match(cases) {
      return Match.match("App", this, [this.#function, this.#argument], cases);
    }
  }

  return {
    Var: Var,
    Lam: Lam,
    App: App,
  };
})();
