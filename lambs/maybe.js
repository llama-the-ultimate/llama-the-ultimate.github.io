/* globals
  Match
  */

const Maybe = (() => {
  class Just {
    #value;
    constructor(value) {
      this.#value = value;
    }
    match(cases) {
      return Match.match("Just", this, [this.#value], cases);
    }
    get value() {
      return this.#value;
    }
    isEmpty() {
      return false;
    }
    map(f) {
      return new Just(f(this.value));
    }
    flatMap(f) {
      return f(this.value);
    }
    forEach(f) {
      f(this.value);
    }
    or(other) {
      return this.value;
    }
    either(f, g) {
      return f(this.#value);
    }
  }
  

  class Nope {
    constructor() {}
    match(cases) {
      return Match.match("Nope", this, [], cases);
    }
    isEmpty() {
      return true;
    }
    map(f) {
      return this;
    }
    flatMap(f) {
      return this;
    }
    forEach(f) {}
    or(other) {
      return other();
    }
    either(f, g) {
      return g();
    }
  }
  return {
    Just: (x) => new Just(x),
    Nope: new Nope()
  };
})();
