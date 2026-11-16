import { existsSync, readdirSync, readFileSync } from "node:fs";
import { mkdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const load = (name) => JSON.parse(readFileSync(path.join(root, "content", name), "utf8"));

const site = load("site.json");
const ui = load("ui.json");
const pages = load("pages.json");
const projects = load("projects.json");
const images = load("images.json");

const imageById = new Map(images.map((image) => [image.id, image]));
const projectById = new Map(projects.map((project) => [project.id, project]));

function mediaIndex() {
  const file = path.join(root, "public", "media", "index.json");
  if (!existsSync(file)) return {};
  return JSON.parse(readFileSync(file, "utf8"));
}

const esc = (value) =>
  String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");

const BASE_PATH = "/georgegogolashvili";

function sitePath(urlPath = "/") {
  if (/^(?:[a-z][a-z0-9+.-]*:|\/\/)/i.test(urlPath)) return urlPath;
  const normalized = urlPath.startsWith("/") ? urlPath : `/${urlPath}`;
  if (normalized === BASE_PATH || normalized.startsWith(`${BASE_PATH}/`)) return normalized;
  return normalized === "/" ? `${BASE_PATH}/` : `${BASE_PATH}${normalized}`;
}

const hrefPath = (lang, slug = "") => sitePath(slug ? `/${lang}/${slug}/` : `/${lang}/`);

const absolute = (urlPath) => {
  const path = sitePath(urlPath);
  const configured = (site.siteUrl || "").replace(/\/$/, "");
  if (!configured) return path;
  if (configured.endsWith(BASE_PATH)) return `${configured}${path.slice(BASE_PATH.length)}`;
  return `${configured}${path}`;
};

const paras = (list = []) => list.map((paragraph) => `<p>${esc(paragraph)}</p>`).join("\n");

function videoFrame(item, lang) {
  if (!item?.youtube) return "";
  const text = item[lang];
  const title = `${text.outlet} — ${text.title}`;
  const start = Number.isInteger(item.start) ? `?start=${item.start}` : "";
  const src = `https://www.youtube-nocookie.com/embed/${encodeURIComponent(item.youtube)}${start}`;
  return `<figure class="video">
    <iframe src="${src}" title="${esc(title)}" loading="lazy" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>
    <figcaption>${esc(title)}</figcaption>
  </figure>`;
}

function fonts(lang) {
  if (lang === "ka") {
    return "https://fonts.googleapis.com/css2?family=Noto+Sans+Georgian:wght@400;500;600&family=Noto+Serif+Georgian:wght@500;600&display=swap";
  }
  if (lang === "en") {
    return "https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,500;0,600;1,500&family=Noto+Sans:ital,wght@0,400;0,500;0,600;1,400&display=swap";
  }
  return "https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,500;0,600&family=Noto+Sans+Georgian:wght@400;500&family=Noto+Sans:wght@400;500&family=Noto+Serif+Georgian:wght@500;600&display=swap";
}

function figure(id, lang, media, { eager = false } = {}) {
  const image = imageById.get(id);
  if (!image?.publish) return "";
  const derived = media[image.filename];
  if (!derived) {
    console.warn(`No web image for ${image.filename}`);
    return "";
  }
  const alt = image.alt[lang] || "";
  const caption = image.caption[lang] || "";
  const srcset = derived.srcset.map((item) => `${sitePath(encodeURI(item.src))} ${item.width}w`).join(", ");
  const label = `${ui.enlarge[lang]}. ${alt}`;
  return `<figure data-full="${esc(sitePath(encodeURI(derived.full)))}" data-alt="${esc(alt)}" data-caption="${esc(caption)}">
  <div class="frame">
    <button type="button" aria-label="${esc(label)}">
      <img vite-ignore src="${esc(sitePath(encodeURI(derived.src)))}" srcset="${esc(srcset)}" sizes="(min-width: 900px) 72vw, 100vw" width="${derived.width}" height="${derived.height}" alt="${esc(alt)}" loading="${eager ? "eager" : "lazy"}" decoding="async"${eager ? ' fetchpriority="high"' : ""}>
    </button>
  </div>
  <figcaption>${esc(caption)}</figcaption>
</figure>`;
}

function header(lang, slug) {
  const home = hrefPath(lang);
  const name = lang === "ka" ? "გია გოგოლაშვილი" : "George Klapsa Gogolashvili";
  const links = ui.nav
    .map((item) => {
      const current = item.slug === slug ? ' aria-current="page"' : "";
      return `<li><a href="${hrefPath(lang, item.slug)}"${current}>${esc(item[lang])}</a></li>`;
    })
    .join("");
  return `<a class="skip" href="#content">${esc(ui.skip[lang])}</a>
<header class="site-header">
  <div class="mast">
    <a class="brand" href="${home}">${esc(name)}</a>
    <button class="nav-toggle" type="button" aria-expanded="false" aria-controls="site-nav" data-open-label="${esc(ui.menu[lang])}" data-close-label="${esc(ui.closeMenu[lang])}">${esc(ui.menu[lang])}</button>
    <nav class="langs" aria-label="${esc(ui.language[lang])}">
      <a href="${hrefPath("ka", slug)}" hreflang="ka" lang="ka"${lang === "ka" ? ' aria-current="true"' : ""}>GE</a>
      <span aria-hidden="true">/</span>
      <a href="${hrefPath("en", slug)}" hreflang="en" lang="en"${lang === "en" ? ' aria-current="true"' : ""}>EN</a>
    </nav>
  </div>
  <nav id="site-nav" class="site-nav" aria-label="${lang === "ka" ? "მთავარი ნავიგაცია" : "Primary"}">
    <ul>${links}</ul>
  </nav>
</header>`;
}

function directContact(lang) {
  return `<dl class="direct">
  <div><dt>${esc(ui.phone[lang])}</dt><dd><a href="${esc(site.phoneHref)}">${esc(site.phone)}</a></dd></div>
  <div><dt>${esc(ui.form.email[lang])}</dt><dd><a href="mailto:${esc(site.email)}">${esc(site.email)}</a></dd></div>
</dl>`;
}

function footer(lang) {
  const name = lang === "ka" ? "გია გოგოლაშვილი" : "George Klapsa Gogolashvili";
  const role = lang === "ka" ? "მხატვარი-მონუმენტალისტი" : "Monumental Artist";
  return `<footer class="site-footer">
  <div class="wrap">
    <p>${esc(name)}<br>${esc(role)}</p>
    ${directContact(lang)}
    <p>© ${new Date().getFullYear()}</p>
  </div>
</footer>`;
}

function lightbox(lang) {
  return `<dialog id="lightbox" aria-label="${esc(ui.dialog[lang])}">
  <div class="lightbox-layout">
    <div class="lightbox-bar">
      <button type="button" data-lightbox-close>${esc(ui.close[lang])}</button>
    </div>
    <div class="lightbox-stage"><img alt=""></div>
    <p id="lightbox-caption"></p>
    <div class="lightbox-controls">
      <button type="button" data-lightbox-prev>${esc(ui.prev[lang])}</button>
      <button type="button" data-lightbox-next>${esc(ui.next[lang])}</button>
    </div>
  </div>
</dialog>`;
}

function layout({ lang, slug, title, description, body, imagePath, jsonLd }) {
  const pagePath = hrefPath(lang, slug);
  const other = lang === "ka" ? "en" : "ka";
  const canonical = absolute(pagePath);
  const image = imagePath ? absolute(encodeURI(imagePath)) : "";
  return `<!DOCTYPE html>
<html lang="${lang}">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${esc(title)}</title>
  <meta name="description" content="${esc(description)}">
  <link rel="canonical" href="${esc(canonical)}" vite-ignore>
  <link rel="alternate" hreflang="ka" href="${esc(absolute(hrefPath("ka", slug)))}" vite-ignore>
  <link rel="alternate" hreflang="en" href="${esc(absolute(hrefPath("en", slug)))}" vite-ignore>
  <link rel="alternate" hreflang="x-default" href="${esc(absolute("/"))}" vite-ignore>
  <meta property="og:title" content="${esc(title)}">
  <meta property="og:description" content="${esc(description)}">
  <meta property="og:type" content="website">
  <meta property="og:url" content="${esc(canonical)}">
  <meta property="og:locale" content="${lang === "ka" ? "ka_GE" : "en_US"}">
  <meta property="og:locale:alternate" content="${other === "ka" ? "ka_GE" : "en_US"}">
  ${image ? `<meta property="og:image" content="${esc(image)}" vite-ignore>` : ""}
  <meta name="twitter:card" content="${image ? "summary_large_image" : "summary"}">
  <meta name="theme-color" content="#14213D">
  <link rel="icon" href="${sitePath("/favicon.svg")}" type="image/svg+xml">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link rel="stylesheet" href="${fonts(lang)}">
  <link rel="stylesheet" href="/src/styles/main.css">
  ${jsonLd ? `<script type="application/ld+json">${JSON.stringify(jsonLd).replaceAll("<", "\\u003c")}</script>` : ""}
</head>
<body>
  ${header(lang, slug)}
  ${body}
  ${footer(lang)}
  ${lightbox(lang)}
  <script type="module" src="/src/js/site.js"></script>
</body>
</html>`;
}

function homePage(lang, media) {
  const copy = pages.home[lang];
  const seo = pages.home.seo[lang];
  const hero = figure(site.heroImage, lang, media, { eager: true });
  const heroImage = imageById.get(site.heroImage);
  const selected = site.selected
    .map((item) => {
      const project = projectById.get(item.id);
      if (!project) return "";
      return `<article class="carousel-slide">
        ${figure(item.image, lang, media)}
        <div class="work-copy">
          <h3><a href="${hrefPath(lang, `works/${project.id}`)}">${esc(project.title[lang])}</a></h3>
          ${project.location[lang] ? `<p>${esc(project.location[lang])}</p>` : ""}
          <p>${esc(project.paragraphs[lang][0])}</p>
          <a class="link-line" href="${hrefPath(lang, `works/${project.id}`)}">${esc(ui.viewWork[lang])}</a>
        </div>
      </article>`;
    })
    .filter(Boolean);
  const dots = site.selected
    .map((item, index) => {
      const project = projectById.get(item.id);
      if (!project) return "";
      return `<button type="button" data-carousel-dot="${index}" aria-label="${esc(project.title[lang])}"${index === 0 ? ' aria-current="true"' : ""}></button>`;
    })
    .join("");
  const areas = copy.areas
    .map((area) => `<article><h3>${esc(area.title)}</h3><p>${esc(area.text)}</p></article>`)
    .join("\n");
  const featured = projectById.get(site.featuredProject);
  const person = {
    "@context": "https://schema.org",
    "@type": "Person",
    name: "George Klapsa Gogolashvili",
    alternateName: "გია გოგოლაშვილი",
    jobTitle: lang === "ka" ? "მხატვარი-მონუმენტალისტი" : "Monumental Artist",
    nationality: "Georgian",
    knowsLanguage: ["ka", "en"],
    telephone: site.phone,
    email: site.email,
  };
  if (site.siteUrl) person.url = absolute(hrefPath(lang));

  const body = `<main id="content" tabindex="-1" data-gallery>
  <section class="hero">
    <div class="wrap hero-copy">
      <p class="eyebrow">${esc(copy.eyebrow)}</p>
      <h1>${esc(copy.title)}</h1>
      <p class="lede">${esc(copy.subtitle)}</p>
    </div>
    <div class="wrap hero-plate">${hero}</div>
    <div class="wrap hero-copy hero-after">
      <div class="prose">${paras(copy.intro)}</div>
      <div class="actions">
        <a href="${hrefPath(lang, "works")}">${esc(ui.explore[lang])}</a>
        <a href="${hrefPath(lang, "about")}">${esc(ui.about[lang])}</a>
        <a href="${hrefPath(lang, "contact")}">${esc(ui.contactCta[lang])}</a>
      </div>
    </div>
  </section>
  <section class="selected-works">
    <div class="wrap">
      <div class="carousel-head">
        <div>
          <p class="kicker">${esc(ui.selectedLabel[lang])}</p>
          <h2>${esc(copy.featuredHeading)}</h2>
          <p class="narrow">${esc(copy.featuredIntro)}</p>
        </div>
        <div class="carousel-controls">
          <button type="button" data-carousel-prev>${esc(ui.prev[lang])}</button>
          <p class="carousel-count" data-carousel-count>1 / ${selected.length}</p>
          <button type="button" data-carousel-next>${esc(ui.next[lang])}</button>
        </div>
      </div>
      <div class="carousel" data-carousel tabindex="0" aria-label="${esc(ui.selectedLabel[lang])}">
        <div class="carousel-track">${selected.join("\n")}</div>
      </div>
      <div class="carousel-dots">${dots}</div>
    </div>
  </section>
  <div class="band">
    <section class="wrap split">
      <div>
        <p class="kicker">${esc(ui.about[lang])}</p>
        <h2>${esc(copy.aboutHeading)}</h2>
        <p>${esc(copy.aboutTeaser)}</p>
        <a class="link-line" href="${hrefPath(lang, "about")}">${esc(ui.about[lang])}</a>
      </div>
      ${figure("img-portrait-stair", lang, media)}
    </section>
  </div>
  <section class="section wrap">
    <h2>${esc(ui.practiceLabel[lang])}</h2>
    <div class="areas">${areas}</div>
  </section>
  <section class="section wrap split">
    <div>
      <p class="kicker">${esc(ui.featuredLabel[lang])}</p>
      <h2>${esc(featured.title[lang])}</h2>
      <p>${esc(featured.paragraphs[lang][0])}</p>
      <p>${esc(featured.paragraphs[lang][1])}</p>
      <a class="link-line" href="${hrefPath(lang, `works/${featured.id}`)}">${esc(ui.viewWork[lang])}</a>
    </div>
    ${figure("img-arch-blue", lang, media)}
  </section>
  <section class="section wrap closing">
    <div>
      <p class="lede">${esc(copy.closing)}</p>
      <a class="link-line" href="${hrefPath(lang, "contact")}">${esc(ui.contactCta[lang])}</a>
    </div>
    ${videoFrame(pages.press.find((item) => item.youtube), lang)}
  </section>
</main>`;

  return layout({
    lang,
    slug: "",
    title: seo.title,
    description: seo.description,
    body,
    imagePath: media[heroImage?.filename]?.full,
    jsonLd: person,
  });
}

function aboutPage(lang, media) {
  const copy = pages.about[lang];
  const seo = pages.about.seo[lang];
  const sections = copy.sections
    .map((section, index) => {
      const heading = section.heading ? `<h2>${esc(section.heading)}</h2>` : "";
      const portrait = index === 0 ? figure("img-portrait-stair", lang, media, { eager: true }) : "";
      const studio = index === copy.sections.length - 1 ? figure("img-portrait-studio", lang, media) : "";
      return `<section class="section wrap stack"><div class="stack-copy">${heading}<div class="narrow">${paras(section.paragraphs)}</div></div>${portrait}${studio}</section>`;
    })
    .join("\n");
  const timeline = pages.timeline.entries
    .map(
      (entry) => `<li><time datetime="${esc(entry.year.slice(0, 4))}">${esc(entry.year)}</time><span>${esc(entry[lang])}</span></li>`,
    )
    .join("");
  const press = pages.press
    .map((item) => {
      const text = item[lang];
      return `<li><a href="${esc(item.url)}" target="_blank" rel="noopener noreferrer"><strong>${esc(text.outlet)}</strong><br>${esc(text.title)} <span class="sr-only">${esc(ui.newTab[lang])}</span></a></li>`;
    })
    .join("");
  const sources = pages.sources[lang].map((item) => `<li>${esc(item)}</li>`).join("");
  const body = `<main id="content" tabindex="-1" data-gallery>
  <header class="wrap">
    <p class="eyebrow">${esc(copy.eyebrow)}</p>
    <h1>${esc(copy.title)}</h1>
  </header>
  ${sections}
  <section class="section wrap">
    <h2>${esc(ui.timeline[lang])}</h2>
    <ol class="timeline">${timeline}</ol>
    <p class="note">${esc(pages.timeline.note[lang])}</p>
  </section>
  <section class="section wrap">
    <h2>${esc(ui.press[lang])}</h2>
    ${pages.press.map((item) => videoFrame(item, lang)).join("\n")}
    <ul class="press-list">${press}</ul>
    ${figure("img-certificate", lang, media)}
  </section>
  <section class="section wrap">
    <h2>${esc(ui.sources[lang])}</h2>
    <ul>${sources}</ul>
  </section>
</main>`;
  return layout({
    lang,
    slug: "about",
    title: seo.title,
    description: seo.description,
    body,
    imagePath: media[imageById.get("img-portrait-stair")?.filename]?.full,
  });
}

function worksPage(lang, media) {
  const copy = pages.works[lang];
  const seo = pages.works.seo[lang];
  const list = projects
    .map((project, index) => {
      return `<article class="work-row">
        ${figure(project.images[0], lang, media, { eager: index === 0 })}
        <div class="work-copy">
          <h2><a href="${hrefPath(lang, `works/${project.id}`)}">${esc(project.title[lang])}</a></h2>
          ${project.location[lang] ? `<p>${esc(project.location[lang])}</p>` : ""}
          <p>${esc(project.paragraphs[lang][0])}</p>
          <a class="link-line" href="${hrefPath(lang, `works/${project.id}`)}">${esc(ui.viewWork[lang])}</a>
        </div>
      </article>`;
    })
    .join("\n");
  const body = `<main id="content" tabindex="-1" data-gallery>
  <header class="wrap narrow">
    <p class="eyebrow">${esc(copy.eyebrow)}</p>
    <h1>${esc(copy.title)}</h1>
    <div class="prose">${paras(copy.intro)}</div>
  </header>
  <div class="section wrap work-list">${list}</div>
</main>`;
  return layout({
    lang,
    slug: "works",
    title: seo.title,
    description: seo.description,
    body,
    imagePath: media[imageById.get(projects[0]?.images[0])?.filename]?.full,
  });
}

function projectPage(project, lang, media) {
  const facts = [
    ["location", ui.location[lang], project.location[lang]],
    ["discipline", ui.discipline[lang], project.discipline[lang]],
    ["dates", ui.dates[lang], project.dates[lang]],
  ].filter((item) => item[2]);
  const meta = `<dl class="meta">${facts
    .map(([key, label, value]) => `<div><dt>${esc(label)}</dt><dd>${esc(value)}</dd></div>`)
    .join("")}</dl>`;
  const [primaryImage, ...detailImages] = project.images;
  const gallery = [
    figure(primaryImage, lang, media, { eager: true }),
    `<div class="stack-copy narrow prose">${paras(project.paragraphs[lang])}</div>`,
    ...detailImages.map((id) => figure(id, lang, media)),
  ].join("\n");
  const related = `<ul class="related">${project.related
    .map((id) => {
      const item = projectById.get(id);
      if (!item) return "";
      return `<li><a href="${hrefPath(lang, `works/${item.id}`)}">${esc(item.title[lang])}</a></li>`;
    })
    .join("")}</ul>`;
  const artwork = {
    "@context": "https://schema.org",
    "@type": "VisualArtwork",
    name: project.title.en,
    alternateName: project.title.ka,
    artform: "Monumental painting",
    artist: { "@type": "Person", name: "George Klapsa Gogolashvili" },
  };
  if (project.location.en) artwork.contentLocation = project.location.en;
  const body = `<main id="content" tabindex="-1" data-gallery>
  <header class="wrap">
    <p class="kicker"><a href="${hrefPath(lang, "works")}">${esc(ui.nav.find((item) => item.slug === "works")[lang])}</a></p>
    <h1>${esc(project.title[lang])}</h1>
    ${meta}
  </header>
  <div class="section wrap stack">
    ${gallery}
  </div>
  <section class="section wrap">
    <h2>${esc(ui.related[lang])}</h2>
    ${related}
    <a class="link-line" href="${hrefPath(lang, "works")}">${esc(ui.allWorks[lang])}</a>
  </section>
</main>`;
  return layout({
    lang,
    slug: `works/${project.id}`,
    title: project.seo[lang].title,
    description: project.seo[lang].description,
    body,
    imagePath: media[imageById.get(project.images[0])?.filename]?.full,
    jsonLd: artwork,
  });
}

function approachPage(lang, media) {
  const copy = pages.approach[lang];
  const seo = pages.approach.seo[lang];
  const sections = copy.sections
    .map((section) => {
      const image = section.image ? figure(section.image, lang, media) : "";
      return `<section class="section stack"><div class="stack-copy"><h2>${esc(section.heading)}</h2><div class="narrow">${paras(section.paragraphs)}</div></div>${image}</section>`;
    })
    .join("\n");
  const body = `<main id="content" tabindex="-1" data-gallery>
  <header class="wrap narrow">
    <p class="eyebrow">${esc(copy.eyebrow)}</p>
    <h1>${esc(copy.title)}</h1>
    <div class="prose">${paras(copy.intro)}</div>
  </header>
  <div class="wrap">${sections}</div>
</main>`;
  return layout({
    lang,
    slug: "approach",
    title: seo.title,
    description: seo.description,
    body,
    imagePath: media[imageById.get("img-nat-drawing")?.filename]?.full,
  });
}

function contactPage(lang) {
  const copy = pages.contact[lang];
  const seo = pages.contact.seo[lang];
  const form = ui.form;
  const body = `<main id="content" tabindex="-1">
  <header class="wrap narrow">
    <p class="eyebrow">${esc(copy.eyebrow)}</p>
    <h1>${esc(copy.title)}</h1>
    <div class="prose">${paras(copy.intro)}</div>
    ${directContact(lang)}
    <form class="inquiry" aria-describedby="form-note">
      <fieldset disabled>
        <legend class="sr-only">${esc(copy.title)}</legend>
        <label>${esc(form.name[lang])}<input name="name" type="text" autocomplete="name"></label>
        <label>${esc(form.email[lang])}<input name="email" type="email" autocomplete="email" inputmode="email"></label>
        <label>${esc(form.subject[lang])}<input name="subject" type="text"></label>
        <label>${esc(form.message[lang])}<textarea name="message"></textarea></label>
        <button type="submit">${esc(form.submit[lang])}</button>
      </fieldset>
      <p id="form-note" class="form-note">${esc(form.note[lang])}</p>
    </form>
  </header>
</main>`;
  return layout({
    lang,
    slug: "contact",
    title: seo.title,
    description: seo.description,
    body,
  });
}

function gatePage() {
  return `<!DOCTYPE html>
<html lang="en" data-gate="true">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>George Klapsa Gogolashvili</title>
  <meta name="description" content="George Klapsa Gogolashvili, monumental artist. გია გოგოლაშვილი, მხატვარი-მონუმენტალისტი.">
  <link rel="canonical" href="${esc(absolute("/"))}" vite-ignore>
  <link rel="alternate" hreflang="ka" href="${esc(absolute("/ka/"))}" vite-ignore>
  <link rel="alternate" hreflang="en" href="${esc(absolute("/en/"))}" vite-ignore>
  <link rel="alternate" hreflang="x-default" href="${esc(absolute("/"))}" vite-ignore>
  <meta name="theme-color" content="#14213D">
  <link rel="icon" href="${sitePath("/favicon.svg")}" type="image/svg+xml">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link rel="stylesheet" href="${fonts("both")}">
  <link rel="stylesheet" href="/src/styles/main.css">
  <script>
    try {
      var chosen = localStorage.getItem("gkg-lang");
      if (chosen === "ka" || chosen === "en") location.replace(${JSON.stringify(sitePath("/"))} + chosen + "/");
    } catch (error) {}
  </script>
</head>
<body>
  <main class="gate" id="content">
    <div class="gate-inner">
      <p class="eyebrow" lang="en">Monumental Artist</p>
      <h1 lang="ka">გია გოგოლაშვილი</h1>
      <p class="lede" lang="en">George Klapsa Gogolashvili</p>
      <p lang="ka">ქართული მხატვრული ტრადიცია თანამედროვე მონუმენტურ ხელოვნებაში</p>
      <nav class="gate-links" aria-label="Language">
        <a href="${hrefPath("ka")}" lang="ka" hreflang="ka">GE</a>
        <a href="${hrefPath("en")}" lang="en" hreflang="en">EN</a>
      </nav>
    </div>
  </main>
</body>
</html>`;
}

function csvCell(value) {
  return `"${String(value ?? "").replaceAll('"', '""')}"`;
}

async function writeManifest() {
  const known = new Set(images.map((image) => image.filename));
  const photosDir = path.join(root, "photos");
  const extras = existsSync(photosDir) ? readdirSync(photosDir).filter((name) => !known.has(name)) : [];
  const rows = [
    ["id", "filename", "project_id", "category", "usage", "rights_status", "publish", "credit", "caption_ka", "caption_en", "alt_ka", "alt_en", "note"],
  ];
  for (const image of images) {
    rows.push([
      image.id,
      image.filename,
      image.projectId,
      image.category,
      image.usage,
      image.rightsStatus,
      image.publish,
      image.credit,
      image.caption?.ka,
      image.caption?.en,
      image.alt?.ka,
      image.alt?.en,
      image.note || "",
    ]);
  }
  for (const filename of extras) {
    rows.push([
      "",
      filename,
      "",
      path.extname(filename).toLowerCase(),
      "withheld",
      "withheld",
      false,
      "",
      "",
      "",
      "",
      "",
      "Present in photos/ and not selected for publication.",
    ]);
  }
  const csv = rows.map((row) => row.map(csvCell).join(",")).join("\n");
  await writeFile(path.join(root, "content", "image-manifest.csv"), `${csv}\n`, "utf8");
}

async function writeSitemap(slugs) {
  const urls = slugs.flatMap((slug) =>
    ["ka", "en"].map((lang) => {
      const loc = absolute(hrefPath(lang, slug));
      return `  <url>
    <loc>${esc(loc)}</loc>
    <xhtml:link rel="alternate" hreflang="ka" href="${esc(absolute(hrefPath("ka", slug)))}"/>
    <xhtml:link rel="alternate" hreflang="en" href="${esc(absolute(hrefPath("en", slug)))}"/>
    <xhtml:link rel="alternate" hreflang="x-default" href="${esc(absolute("/"))}"/>
  </url>`;
    }),
  );
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">
${urls.join("\n")}
</urlset>
`;
  await mkdir(path.join(root, "public"), { recursive: true });
  await writeFile(path.join(root, "public", "sitemap.xml"), xml, "utf8");
  const sitemapLine = `Sitemap: ${absolute("/sitemap.xml")}\n`;
  await writeFile(path.join(root, "public", "robots.txt"), `User-agent: *\nAllow: /\n\n${sitemapLine}`, "utf8");
}

let generating = false;

export async function generate() {
  if (generating) return;
  generating = true;
  try {
    const media = mediaIndex();
    const slugs = ["", "about", "works", "approach", "contact", ...projects.map((project) => `works/${project.id}`)];
    await rm(path.join(root, "ka"), { recursive: true, force: true });
    await rm(path.join(root, "en"), { recursive: true, force: true });

    const files = [
      ["index.html", gatePage()],
      ["ka/index.html", homePage("ka", media)],
      ["en/index.html", homePage("en", media)],
      ["ka/about/index.html", aboutPage("ka", media)],
      ["en/about/index.html", aboutPage("en", media)],
      ["ka/works/index.html", worksPage("ka", media)],
      ["en/works/index.html", worksPage("en", media)],
      ["ka/approach/index.html", approachPage("ka", media)],
      ["en/approach/index.html", approachPage("en", media)],
      ["ka/contact/index.html", contactPage("ka")],
      ["en/contact/index.html", contactPage("en")],
    ];

    for (const project of projects) {
      files.push([`ka/works/${project.id}/index.html`, projectPage(project, "ka", media)]);
      files.push([`en/works/${project.id}/index.html`, projectPage(project, "en", media)]);
    }

    for (const [relative, html] of files) {
      const destination = path.join(root, relative);
      await mkdir(path.dirname(destination), { recursive: true });
      await writeFile(destination, html, "utf8");
    }

    await writeManifest();
    await writeSitemap(slugs);
    console.log(`Generated ${files.length} pages.`);
  } finally {
    generating = false;
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await generate();
}
