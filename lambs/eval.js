/* globals
  Match
  Maybe
  Exp
  Redex
  Path
*/

const Eval = (() => {
  class Reduce {
    #from;
    #to;
    constructor(from, to) {
      this.#from = from;
      this.#to = to;
    }
    match(cases) {
      return Match.match("Reduce", this, [this.#from, this.#to], cases);
    }
  }

  class Rename {
    #fromVar;
    #from;
    #toVar;
    #to;
    constructor(fromVar, from, toVar, to) {
      this.#fromVar = fromVar;
      this.#from = from;
      this.#toVar = toVar;
      this.#to = to;
    }
    match(cases) {
      return Match.match(
        "Rename",
        this,
        [this.#fromVar, this.#from, this.#toVar, this.#to],
        cases
      );
    }

  }

  class Normal {
    #exp;
    constructor(exp) {
      this.#exp = exp;
    }
    match(cases) {
      return Match.match("Normal", this, [this.#exp], cases);
    }
  }

  const allIds = Match.matchf({
    Var: (s) => new Set([s]),
    Lam: (p, b) => new Set([p, ...allIds(b)]),
    App: (f, a) => new Set([...allIds(f), ...allIds(a)]),
  });

  const uniqueId = (s, used) => {
    const idNum = /^([a-zA-Z0-9]*?)([0-9]+)$/.exec(s);
    var id;
    var num;
    if (idNum) {
      id = idNum[1];
      num = parseInt(idNum[2]);
    } else {
      id = s;
      num = 1;
    }

    while (true) {
      num = num + 1;
      const res = id + num;
      if (!used.has(res)) {
        return res;
      }
    }
  };

  const renameStuff = (foundRedex, foundConflict, from) => {
    const newParam = uniqueId(foundConflict.value.parameter, allIds(from));
    const renamed = new Exp.Lam(
      newParam,
      new Redex.Redex(
        new Exp.Var(newParam),
        foundConflict.value.parameter,
        foundConflict.value.body
      ).subst()
    );
    return new Rename(
      foundConflict.value.parameter,
      from,
      newParam,
      foundRedex.path.assemble(
        new Exp.App(
          new Exp.Lam(
            foundRedex.value.parameter,
            foundConflict.path.assemble(renamed)
          ),
          foundRedex.value.argument
        )
      )
    );
  };

  const step = (exp) => {
    const x = Path.findExp(Redex.redex, exp);
    return x.either(
      (foundRedex) => {
        return foundRedex.value.findConflict().either(
          (foundConflict) => renameStuff(foundRedex, foundConflict, exp),
          () =>
            new Reduce(exp, foundRedex.path.assemble(foundRedex.value.subst()))
        );
      },
      () => new Normal(exp)
    );
  };
  return {
    step: step,
  };
})();
