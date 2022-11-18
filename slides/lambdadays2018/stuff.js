
const bound = (i, b) => Math.min(b - 1, Math.max(0, i));

const nameFrom = elem => {
  const name = elem.getAttribute("id");
  if (name) {
    return name;
  }
  return "";
}

const slides = Array.from(document.getElementsByClassName("slide"));

const forSlides = document.getElementById("for-slides");

var current = false;

const setSlide = x => {
  current = bound(x, slides.length);
  currentSlide = slides[current];
  forSlides.innerHTML = currentSlide.outerHTML;
};

const sliide = x => {
  if (current !== false) {
    setSlide(current + x);
  }
}

const slideDict = {};
const dictSlide = {};
for (var i = 0; i < slides.length; i++) {
  const name = nameFrom(slides[i]);
  if (name !== "") {
    slideDict[name] = i;
    dictSlide[i] = name;
  }
}

const makeLinks = () => {
  const slidelinks = Array.from(document.getElementsByClassName("slidelink"));
  slidelinks.forEach(x => {
    x.classList.add('slidelinkjs');
    x.onclick = () => setSlide(slideDict[x.getAttribute("slidename")]);
  });
};

makeLinks();

const allTheStuff = forSlides.innerHTML;
var showTime = false;

document.addEventListener('keydown', function(event) {
    if (event.keyCode === 65) {
        sliide(-1);
    } else if (event.keyCode === 68) {
        sliide(+1);
    } else if (event.keyCode === 27) {
      if (current !== false) {
        forSlides.innerHTML = allTheStuff;
        makeLinks();
        const name = dictSlide[current];
        current = false;
        document.getElementById(name).scrollIntoView(true);
      }
    } else if (event.keyCode === 84) {
      showTime = !showTime;
    }
});


(() => {
    const timeString = (i) => (i < 10) ? "0" + i : "" + i;

    const startTime = () => {
        const today = new Date(),
              h = timeString(today.getHours()),
              m = timeString(today.getMinutes()),
              elem = document.getElementById('clock');
        if (elem) {
          document.getElementById('clock').innerHTML = showTime ? h + ":" + m : "";
        }
        setTimeout(function () {
          startTime();
        }, 500);
    }
    startTime();
})();
