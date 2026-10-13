// Language switcher. English lives in the HTML; other languages load from lang/<code>.json on demand.
// Elements marked data-i18n="key" get their content swapped; data-i18n-aria="key" swaps aria-label.
(() => {
  const LANGS = {
    en: { short: "EN", html: "en" },
    fr: { short: "FR", html: "fr" },
    es: { short: "ES", html: "es" },
    de: { short: "DE", html: "de" },
    pt: { short: "PT", html: "pt" },
    zh: { short: "简", html: "zh-Hans", font: "Noto+Sans+SC:wght@400;500;700" },
    zht: { short: "繁", html: "zh-Hant", font: "Noto+Sans+TC:wght@400;500;700" },
    ja: { short: "日本", html: "ja", font: "Noto+Sans+JP:wght@400;500;700" },
    ko: { short: "한국", html: "ko", font: "Noto+Sans+KR:wght@400;500;700" },
    hi: { short: "हिं", html: "hi", font: "Noto+Sans+Devanagari:wght@400;500;600;700" },
    pa: { short: "ਪੰ", html: "pa", font: "Noto+Sans+Gurmukhi:wght@400;500;600;700" },
    tl: { short: "TL", html: "tl" },
    vi: { short: "VI", html: "vi" },
    fa: { short: "فا", html: "fa", dir: "rtl", font: "Noto+Sans+Arabic:wght@400;500;600;700" },
    ar: { short: "ع", html: "ar", dir: "rtl", font: "Noto+Sans+Arabic:wght@400;500;600;700" },
  };

  const root = document.documentElement;
  const cache = {};
  const originals = new Map();
  let dict = null;
  let current = "en";

  const t = (key, fallback) => (dict && dict[key]) || fallback;

  function capture() {
    document.querySelectorAll("[data-i18n]").forEach((el) => {
      if (!originals.has(el)) originals.set(el, { html: el.innerHTML });
    });
    document.querySelectorAll("[data-i18n-aria]").forEach((el) => {
      const saved = originals.get(el) || {};
      if (saved.aria === undefined) originals.set(el, { ...saved, aria: el.getAttribute("aria-label") });
    });
  }

  function apply() {
    document.querySelectorAll("[data-i18n]").forEach((el) => {
      const value = dict && dict[el.dataset.i18n];
      el.innerHTML = value != null ? value : originals.get(el).html;
    });
    document.querySelectorAll("[data-i18n-aria]").forEach((el) => {
      const value = dict && dict[el.dataset.i18nAria];
      el.setAttribute("aria-label", value != null ? value : originals.get(el).aria);
    });
  }

  function load(code) {
    if (code === "en") return Promise.resolve(null);
    if (!cache[code]) {
      cache[code] = fetch(`lang/${code}.json`).then((r) => {
        if (!r.ok) throw new Error(`Missing lang/${code}.json`);
        return r.json();
      });
    }
    return cache[code];
  }

  function loadFont(code) {
    const family = LANGS[code].font;
    const id = `font-${family?.split(":")[0]}`;
    if (!family || document.getElementById(id)) return;
    const link = document.createElement("link");
    link.id = id;
    link.rel = "stylesheet";
    link.href = `https://fonts.googleapis.com/css2?family=${family}&display=swap`;
    document.head.appendChild(link);
  }

  async function set(code, { save = true, animate = true } = {}) {
    if (!LANGS[code]) code = "en";
    let next;
    try {
      next = await load(code);
    } catch (error) {
      root.classList.remove("i18n-pending");
      return;
    }

    capture();
    loadFont(code);
    dict = next;
    current = code;
    apply();

    root.lang = LANGS[code].html;
    root.dir = LANGS[code].dir || "ltr";
    root.classList.remove("i18n-pending");
    document.querySelectorAll(".lang-current").forEach((el) => (el.textContent = LANGS[code].short));
    document.querySelectorAll("[data-lang]").forEach((btn) => {
      btn.setAttribute("aria-current", btn.dataset.lang === code ? "true" : "false");
    });

    if (save) {
      try {
        localStorage.setItem("lang", code);
      } catch (e) {}
    }

    // Quick crossfade so the swap reads as a deliberate change, not a flicker
    if (animate && document.body.animate) {
      document.querySelector("main")?.animate([{ opacity: 0.35 }, { opacity: 1 }], { duration: 260, easing: "ease-out" });
    }

    document.dispatchEvent(new CustomEvent("langchange", { detail: { lang: code } }));
  }

  // ---------- Switcher menu ----------
  const wrap = document.querySelector(".lang");
  const button = wrap?.querySelector(".lang-btn");
  const menu = wrap?.querySelector(".lang-menu");

  function setOpen(open) {
    wrap.classList.toggle("open", open);
    button.setAttribute("aria-expanded", String(open));
  }

  if (wrap) {
    button.addEventListener("click", (event) => {
      event.stopPropagation();
      setOpen(!wrap.classList.contains("open"));
    });

    menu.addEventListener("click", (event) => {
      const choice = event.target.closest("[data-lang]");
      if (!choice) return;
      set(choice.dataset.lang);
      setOpen(false);
      button.focus();
    });

    document.addEventListener("click", (event) => {
      if (!wrap.contains(event.target)) setOpen(false);
    });

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && wrap.classList.contains("open")) {
        setOpen(false);
        button.focus();
      }
    });
  }

  window.I18N = { t, set, get current() { return current; } };

  // Restore the visitor's saved choice
  let saved = null;
  try {
    saved = localStorage.getItem("lang");
  } catch (e) {}
  if (saved && saved !== "en" && LANGS[saved]) {
    set(saved, { save: false, animate: false });
  } else {
    document.querySelectorAll('[data-lang="en"]').forEach((btn) => btn.setAttribute("aria-current", "true"));
  }
})();
