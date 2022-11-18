/* globals 
  Match
  Maybe
  Exp
*/

const Path = (() => {
  class Found {
    #path;
    #value;
    constructor(path, value) {
      this.#path = path;
      this.#value = value;
    }
    get path() {
      return this.#path;
    }
    get value() {
      return this.#value;
    }
  }

  class Path {
    assemble(exp) {
      const halp = (path, missing) =>
        path.match({
          LamStep: (p, rest) => halp(rest, new Exp.Lam(p, missing)),
          AppFunStep: (a, rest) => halp(rest, new Exp.App(missing, a)),
          AppArgStep: (f, rest) => halp(rest, new Exp.App(f, missing)),
          Stop: () => missing,
        });
      return halp(this, exp);
    }
  }

  class LamStep extends Path {
    #parameter;
    #rest;
    constructor(parameter, rest) {
      super();
      this.#parameter = parameter;
      this.#rest = rest;
    }
    match(cases) {
      return Match.match("LamStep", this, [this.#parameter, this.#rest], cases);
    }
  }

  class AppFunStep extends Path {
    #argument;
    #rest;
    constructor(argument, rest) {
      super();
      this.#argument = argument;
      this.#rest = rest;
    }
    match(cases) {
      return Match.match("AppFunStep", this, [this.#argument, this.#rest], cases);
    }
  }

  class AppArgStep extends Path {
    #function;
    #rest;
    constructor(fun, rest) {
      super();
      this.#function = fun;
      this.#rest = rest;
    }
    match(cases) {
      return Match.match("AppArgStep", this, [this.#function, this.#rest], cases);
    }
  }

  const Stop = (() => {
    class Stop extends Path {
      match(cases) {
        return Match.match("Stop", this, [], cases);
      }
    }
    return new Stop();
  })();

  const findExp = (pred, exp) => {
    const halp = (exp, path) =>
      pred(exp).either(
        (x) => Maybe.Just(new Found(path, x)),
        () =>
          exp.match({
            Var: () => Maybe.Nope,
            Lam: (p, b) => halp(b, new LamStep(p, path)),
            App: (f, a) =>
              halp(f, new AppFunStep(a, path)).either(
                (x) => Maybe.Just(x),
                () => halp(a, new AppArgStep(f, path))
              ),
          })
      );
    return halp(exp, Stop);
  };

  return {
    LamStep: LamStep,
    AppFunStep: AppFunStep,
    AppArgStep: AppArgStep,
    Stop: Stop,
    Found: Found,
    findExp: findExp,
  };
})();
