/* globals
  Match
*/

const Unparse = (() => {
  const pstring = (s) => `(${s})`;

  const argstring = Match.matchf({
    Var: (n) => `${n}`,
    BadVar: (n) => `?${n}`,
    Missing: () => "_",
    default: (x) => pstring(unparse(x)),
  });

  const fstring = (x) =>
    x.match({ Lam: (p, b) => pstring(unparse(x)), default: (u) => unparse(x) });

  const unparse = Match.matchf({
    BadVar: (n) => `?${n}`,
    Missing: () => "_",
    Bad: (x) => `${x}`,
    Var: (x) => `${x}`,
    Lam: (p, b) => `λ${p}.${unparse(b)}`,
    App: (f, a) => `${fstring(f)} ${argstring(a)}`,
  });

  return { unparse: unparse };
})();
