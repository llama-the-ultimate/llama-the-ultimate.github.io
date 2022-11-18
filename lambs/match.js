const Match = (() => {
  const match = (tag, value, args, cases) => {
    if (cases.hasOwnProperty(tag)) {
      return cases[tag](...args);
    } else if (cases.hasOwnProperty("default")) {
      return cases["default"](value);
    } else {
      throw {
        message: "match failed",
        tag: tag,
        value: value,
        cases: cases,
      };
    }
  };
  const matchf = (cases) => (x) => x.match(cases);

  return {
    match: match,
    matchf: matchf,
  };
})();
