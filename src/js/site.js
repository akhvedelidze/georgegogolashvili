const lang = document.documentElement.lang;
if (lang === "ka" || lang === "en") {
  try {
    localStorage.setItem("gkg-lang", lang);
  } catch {
    /* storage may be unavailable */
  }
}

const toggle = document.querySelector(".nav-toggle");
const nav = document.querySelector("#site-nav");

if (toggle && nav) {
  const openLabel = toggle.dataset.openLabel || toggle.textContent;
  const closeLabel = toggle.dataset.closeLabel || openLabel;

  toggle.addEventListener("click", () => {
    const open = nav.classList.toggle("is-open");
    toggle.setAttribute("aria-expanded", String(open));
    toggle.textContent = open ? closeLabel : openLabel;
  });

  nav.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", () => {
      nav.classList.remove("is-open");
      toggle.setAttribute("aria-expanded", "false");
      toggle.textContent = openLabel;
    });
  });
}

const gallery = document.querySelector("[data-gallery]");
const dialog = document.querySelector("#lightbox");

if (gallery && dialog) {
  const figures = [...gallery.querySelectorAll("figure[data-full]")];
  if (!figures.length) {
    /* Page has no published photographs. */
  } else {
  const image = dialog.querySelector("img");
  const caption = dialog.querySelector("#lightbox-caption");
  const prev = dialog.querySelector("[data-lightbox-prev]");
  const next = dialog.querySelector("[data-lightbox-next]");
  const close = dialog.querySelector("[data-lightbox-close]");
  let index = 0;
  let lastTrigger = null;

  const show = (nextIndex) => {
    index = (nextIndex + figures.length) % figures.length;
    const figure = figures[index];
    image.src = figure.dataset.full;
    image.alt = figure.dataset.alt || "";
    caption.textContent = figure.dataset.caption || "";
    prev.disabled = figures.length < 2;
    next.disabled = figures.length < 2;
  };

  figures.forEach((figure, figureIndex) => {
    const button = figure.querySelector("button");
    if (!button) return;
    button.addEventListener("click", () => {
      lastTrigger = button;
      show(figureIndex);
      dialog.showModal();
    });
  });

  prev?.addEventListener("click", () => show(index - 1));
  next?.addEventListener("click", () => show(index + 1));
  close?.addEventListener("click", () => dialog.close());

  dialog.addEventListener("click", (event) => {
    if (event.target === dialog) dialog.close();
  });

  dialog.addEventListener("close", () => {
    image.removeAttribute("src");
    image.alt = "";
    lastTrigger?.focus();
  });

  dialog.addEventListener("keydown", (event) => {
    if (event.key === "ArrowLeft") {
      event.preventDefault();
      show(index - 1);
    }
    if (event.key === "ArrowRight") {
      event.preventDefault();
      show(index + 1);
    }
  });
  }
}

const carousel = document.querySelector("[data-carousel]");

if (carousel) {
  const track = carousel.querySelector(".carousel-track");
  const slides = [...carousel.querySelectorAll(".carousel-slide")];
  const prev = document.querySelector("[data-carousel-prev]");
  const next = document.querySelector("[data-carousel-next]");
  const dots = [...document.querySelectorAll("[data-carousel-dot]")];
  const count = document.querySelector("[data-carousel-count]");
  let index = 0;

  const go = (nextIndex) => {
    if (!slides.length) return;
    index = (nextIndex + slides.length) % slides.length;
    track.style.transform = `translateX(${-index * carousel.clientWidth}px)`;
    slides.forEach((slide, slideIndex) => {
      const current = slideIndex === index;
      slide.toggleAttribute("inert", !current);
      slide.setAttribute("aria-hidden", String(!current));
    });
    dots.forEach((dot, dotIndex) => {
      if (dotIndex === index) dot.setAttribute("aria-current", "true");
      else dot.removeAttribute("aria-current");
    });
    if (count) count.textContent = `${index + 1} / ${slides.length}`;
  };

  prev?.addEventListener("click", () => go(index - 1));
  next?.addEventListener("click", () => go(index + 1));
  dots.forEach((dot) => {
    dot.addEventListener("click", () => go(Number(dot.dataset.carouselDot)));
  });

  carousel.addEventListener("keydown", (event) => {
    if (event.key === "ArrowLeft") {
      event.preventDefault();
      go(index - 1);
    }
    if (event.key === "ArrowRight") {
      event.preventDefault();
      go(index + 1);
    }
  });

  window.addEventListener("resize", () => go(index));
  go(0);
}
