var audioContext = false;

function osc() {
  var oscillator = audioContext.createOscillator();
  var amp = audioContext.createGain();
  oscillator.connect(amp);
  amp.connect(audioContext.destination);
  amp.gain.setValueAtTime(0, audioContext.currentTime);
  oscillator.type = 'sawtooth';
  oscillator.frequency.setValueAtTime(440, audioContext.currentTime);
  oscillator.start();
  return {
    osc: oscillator,
    amp: amp
  };
}

function note(duration, things) {
  return {duration: duration, things: things}
}

function makeNote(freq, vol) {
  var dur = 0;
  for (var i = 0; i < vol.length; i++) {
    dur = dur + vol[i].time;
  }
  dur = dur * 0.5;

  const o = osc();
  const f = o.osc.frequency;
  f.setValueAtTime(freq[freq.length - 1].val, audioContext.currentTime);
  const g = o.amp.gain;

  return note(dur, [{ dial: f, vts: freq }, { dial: g, vts: vol }]);
}

function makeNotes(freqer, vol, freqs) {
  return freqs.map(f => makeNote(freqer(f), vol));
}

function freqer(freq) {
  return [{val: freq, time: 0}];
}

const vol = [
  { val: 0.13, time: 0.03 },
  { val: 0.1, time: 0.02 },
  { val: 0.1, time: 0.05 },
  { val: 0, time: 0.1 }];



function applyValTime(thing, start) {
  var total = 0;
  var t = start;
  const vts = thing.vts;
  const dial = thing.dial;
  for (var i = 0; i < vts.length; i++) {
    const vt = vts[i];
    dial.setTargetAtTime(vt.val, t, vt.time);
    t = t + vt.time;
  }
}

function playNote(n, start) {
  const things = n.things;
  for (var i = 0; i < things.length; i++) {
    applyValTime(things[i], start);
  }
}

function playNotes(ns, start) {
  var total = 0;
  var t = start;
  for (var i = 0; i < ns.length; i++) {
    const n = ns[i];
    playNote(n, t);
    const dur = n.duration;
    t = t + dur;
    total = total + dur;
  }
  return total;
}

function startAudio() {
  audioContext = new AudioContext();
  notes = makeNotes(freqer, vol, [440, 493.88, 523.25, 587.33, 800, 250]);
}

function noisySendBeop(x) {

  if (audioContext === false) {
    startAudio();
  }
  if (x !== "nvm") {
    playNote(notes[x], audioContext.currentTime);
    app.ports.beopIn.send(beops[x]);
  }
}

var doBeop = noisySendBeop;

function playBeops(bps) {
  return playNotes(bps.map(x => notes[stringToBeop(x)]), audioContext.currentTime);
}
