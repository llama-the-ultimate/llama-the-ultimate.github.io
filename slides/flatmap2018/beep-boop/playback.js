
function playThenNext(bps) {
  const t = playBeops(bps);
  setTimeout(() => sendBeop(next), (t * 1000) + 250);
}

app.ports.beopOut.subscribe(playThenNext);
