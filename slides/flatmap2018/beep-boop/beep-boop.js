// beep boop

const beops = ["beep", "boop", "bap", "pling", "undo", "next"]
const beep = 0;
const boop = 1;
const bap = 2;
const pling = 3;
const undo = 4;
const next = 5;

function keyToBeop(keyCode) {
  return keyCode === 65 ? beep
       : keyCode === 83 ? boop
       : keyCode === 68 ? bap
       : keyCode === 70 ? pling
       : keyCode === 8 ? undo
       : keyCode === 32 ? next
       : "nvm";
}

function stringToBeop(s) {
  return notenum = s === "beep" ? beep
                 : s === "boop" ? boop
                 : s === "bap" ? bap
                 : s === "pling" ? pling
                 : s === "undo" ? undo
                 : s === "next" ? next
                 : "nvm";
}

function sendBeop(x) {
  if (x !== "nvm") {
    app.ports.beopIn.send(beops[x]);
  }
}

var doBeop = sendBeop;

function handleKey(event) {
  doBeop(keyToBeop(event.keyCode));
  // uncomment for speech recognition support
  //maybeSpeechThing(event.keyCode);
}

document.addEventListener('keydown', handleKey);


// midi stuff

var midi = null;
var input = null;

function onMIDISuccess(midiAccess) {
  midi = midiAccess;
  midi.onstatechange = e => ports = refreshMidiPorts();
  refreshMidiPorts();
}

function onMIDIFailure(msg) {
  console.log("Failed to get MIDI access - " + msg);
}

function midiKeyToBeop(keyCode) {
  return keyCode === 0x30 ? beep
       : keyCode === 0x32 ? boop
       : keyCode === 0x34 ? bap
       : keyCode === 0x35 ? pling
       : keyCode === 0x48 ? undo
       : keyCode === 0x46 ? next
       : "nvm";
}

function onMIDIMessage( event ) {
  if (event.data[0] === 0x90) {
      doBeop(midiKeyToBeop(event.data[1]));
  }
}

navigator.requestMIDIAccess().then(onMIDISuccess, onMIDIFailure);

function midiStuff(inputId) {
  input = midi.inputs.get(inputId);
  input.onmidimessage = onMIDIMessage;
}

function portDataFrom(x) {
  return {
    id: x.id,
    type: x.type,
    manufacturer: x.manufacturer,
    name: x.name,
    version: x.version
  }
}

function midiList() {
  var res = [];
  for (var entry of midi.inputs) {
    var x = entry[1];
    if (x.state === "connected") {
      res.push(portDataFrom(x));
    }
  }
  return res;
}

function refreshMidiPorts() {
  midiPorts = midiList();
  var div = document.createElement("div");
  var first = true;
  for (var i = 0; i < midiPorts.length; i++) {
    if (first) {
      first = false;
    } else {
      var sep = document.createElement("span");
      sep.innerText = " | ";
      div.appendChild(sep);
    }
    var s = document.createElement("span");
    var p = midiPorts[i];
    s.innerText = p.name;
    s.style.cursor = "pointer";
    s.style.textDecoration = "underline";
    s.onclick = (x => e => midiStuff(x))(p.id);
    div.appendChild(s);
  }
  document.getElementById("midi-status").innerText = "";
  document.getElementById("midi-status").appendChild(div);
}


// voice recog stuff

var SpeechRecognition = SpeechRecognition || webkitSpeechRecognition;
var SpeechGrammarList = SpeechGrammarList || webkitSpeechGrammarList;
var SpeechRecognitionEvent = SpeechRecognitionEvent || webkitSpeechRecognitionEvent;

var grammar = '#JSGF V1.0; grammar gbeep; public <sound> = sheep | dog | wolf | cat | snake | beep | boop ;';

function recog() {
  var r = new SpeechRecognition();
  var speechRecognitionList = new SpeechGrammarList();
  speechRecognitionList.addFromString(grammar, 1);
  r.grammars = speechRecognitionList;
  r.continuous = true;
  r.lang = 'en-US';
  r.interimResults = false;
  r.maxAlternatives = 3;
  return r;
}

var recognition = recog();

function isAnimal(s) {
  return [ "sheep", "dog", "wolf", "cat", "snake" ].includes(s);
}

function transcriptToWords(t) {
  var ts = t.split(" ").map(s => s.trim().toLowerCase());
  var tsx = [];

  for (var i = 0; i < ts.length; i++) {
    if (ts[i] === "sheepdog") {
      tsx.push("sheep");
      tsx.push("dog");
    } else {
      tsx.push(ts[i]);
    }
  }

  for (i = 0; i < tsx.length; i++) {
    var part = tsx[i];
    if (!isAnimal(part)) {
      return false;
    }
  }

  return tsx;
}

function resultToWords(result) {
  for (var i = 0; i < result.length; i++) {
    const t = result[i].transcript.trim();
    const words = transcriptToWords(t);
    if (words !== false) {
      return words;
    }
  }
  return [];
}


function animalToBeop(animal) {
  var b = animal === "sheep" ? beep
        : animal === "dog" ? boop
        : animal === "wolf" ? bap
        : animal === "cat" ? pling
        : animal === "snake" ? undo
        : "nvm";
  return b;
}

recognition.onresult = function(event) {
  var lastIndex = event.results.length - 1;
  var lastResult = event.results[lastIndex];

  var words = resultToWords(lastResult);

  for (var i = 0; i < words.length; i++) {
    doBeop(animalToBeop(words[i]));
  }
}


var recogStatus = 0;

recognition.onstart = function() {
  recogStatus = 1;
  document.getElementById('voice-status').innerText = "Listening...";
}

recognition.onend = function() {
  if (recogStatus === 1) {
    recogStatus = 0;
    document.getElementById('voice-status').innerText = "";
  }
}

recognition.onerror = function(event) {
  recogStatus = -1;
  document.getElementById('voice-status').innerText = "Can't listen: " + event.error;
}

function maybeSpeechThing(keyCode) {
  if (keyCode == 74) {
    recognition.start();
  }
  else if (keyCode == 75) {
    recognition.stop();
  }
}
