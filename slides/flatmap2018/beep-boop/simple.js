
function handleKey(event) {
  sendBeop(keyToBeop(event.keyCode));
}

document.addEventListener('keydown', handleKey);
