/* globals
Maybe
  Parse
  Unparse
  Redex
  Eval
*/

const Repl = (() => {
  class Repl {
    #defs;
    #next;
    constructor() {
      this.#defs = [];
      this.#next = Maybe.Nope;
    }
    execute(str) {
      const addDef = (def) => {
        for (let i = 0; i < this.#defs.length; i++) {
          if (def.name === this.#defs[i].name) {
            this.#defs[i] = res;
            return;
          }
        }
        this.#defs.push(res);
      };

      this.#next = Maybe.Nope;

      const res = Parse.parse(str);
      return res.match({
        Expression: (x) => this.eval(x),
        Define: (name, exp) => {
          addDef(res);
          return `\n${name} is defined :)`;
        },

        Undefine: (name) => {
          for (let i = 0; i < this.#defs.length; i++) {
            if (s === defs[i][0]) {
              defs.splice(i, 1);
              i--;
            }
          }
          return `\n${name} is undefined :|`;
        },
        ParseError: (msg, i) =>
          `\n${new Array(i + 1).join(" ")}^\noh no: ${msg}`,
      });
    }
    eval(exp) {
      return Eval.step(exp).match({
        Normal: (exp) => {
          this.#next = Maybe.Nope;
          return `\n${Unparse.unparse(exp)}`;
        },
        Reduce: (a, b) => {
          this.#next = Maybe.Just(b);
          return `\n${Unparse.unparse(b)}`;
        },
        Rename: (oldV, oldExp, v, exp) => {
          this.#next = Maybe.Just(exp);
          return ` | [${v}/${oldV}]\n${Unparse.unparse(exp)}`;
        },
      });
    }
    next() {
      return this.#next.map((x) => this.eval(x));
    }

    replaceDefs(str) {
      return Parse.parse(str).match({
        Expression: (x) => {
          let res = x;
          for (let i = this.#defs.length - 1; i >= 0; i--) {
            const d = this.#defs[i];
            res = new Redex.Redex(d.expression, d.name, res).subst();
          }
          return `\n${Unparse.unparse(res)}`;
        },
        ParseError: (msg, i) => `\n ${new Array(i).join(" ")}^\noh no: ${msg}`,
        default: (u) => "\nplox replacestuff on normal expressions only?",
      });
    }
  }


  return {
    Repl: Repl,
  };
})();
