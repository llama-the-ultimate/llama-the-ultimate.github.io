/* globals
  Match
  Maybe
  Exp
  Path
*/

const Redex = (() => {
  class Conflict {
    #parameter;
    #body;
    constructor(parameter, body) {
      this.#parameter = parameter;
      this.#body = body;
    }
    get parameter() {
      return this.#parameter;
    }
    get body() {
      return this.#body;
    }
  }

  class Redex {
    #argument;
    #parameter;
    #body;
    constructor(argument, parameter, body) {
      this.#argument = argument;
      this.#parameter = parameter;
      this.#body = body;
    }
    get argument() {
      return this.#argument;
    }
    get parameter() {
      return this.#parameter;
    }
    get body() {
      return this.#body;
    }

    findConflict() {
      const freeIds = (exp) => {
        const halp = (used, x) => {
          //console.log({x: unparse(x), used: used});
          const res = x.match({
            Var: (s) => (used.has(s) ? new Set() : new Set([s])),
            Lam: (p, b) => halp(new Set([p, ...used]), b),
            App: (f, a) => new Set([...halp(used, f), ...halp(used, a)]),
          });

          return res;
        };
        return halp(new Set(), exp);
      };

      const conflict = (param, bad, exp) =>
        exp.match({
          Lam: (p, b) =>
            p !== param && bad.has(p) && freeIds(b).has(param)
              ? Maybe.Just(new Conflict(p, b))
              : Maybe.Nope,
          default: (u) => Maybe.Nope,
        });

      const freeInArg = freeIds(this.#argument);
      const find = (path, exp) => {
        const next = Match.matchf({
          Var: (v) => Maybe.Nope,
          Lam: (p, b) =>
            p === b ? Maybe.Nope : find(new Path.LamStep(p, path), b),
          App: (a, f) =>
            find(new Path.AppFunStep(a, path), f).or(() =>
              find(new Path.AppArgStep(f, path), a)
            )
        });

        return conflict(this.#parameter, freeInArg, exp).either(
          (c) => Maybe.Just(new Path.Found(path, c)),
          () => next(exp)
        );
      };
      return find(Path.Stop, this.#body);
    }

    subst() {
      const halp = Match.matchf({
        Var: (v) => (this.#parameter === v ? this.#argument : new Exp.Var(v)),
        Lam: (p, b) =>
          this.#parameter === p ? new Exp.Lam(p, b) : new Exp.Lam(p, halp(b)),
        App: (f, a) => new Exp.App(halp(f), halp(a)),
      });
      return halp(this.#body);
    }
  }

  const redex = Match.matchf({
    App: (f, a) =>
      f.match({
        Lam: (p, b) => Maybe.Just(new Redex(a, p, b)),
        default: (u) => Maybe.Nope,
      }),
    default: (u) => Maybe.Nope,
  });
  return { Redex: Redex, redex: redex };
})();
