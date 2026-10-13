const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)");

// Footer year
document.getElementById("year").textContent = new Date().getFullYear();

// ---------------------------------------------------------
// Mobile menu
// ---------------------------------------------------------
const toggle = document.querySelector(".nav-toggle");
const menu = document.getElementById("nav-menu");

function setMenu(open) {
  menu.classList.toggle("open", open);
  toggle.setAttribute("aria-expanded", String(open));
  toggle.setAttribute("aria-label", open ? "Close menu" : "Open menu");
}

toggle.addEventListener("click", () => setMenu(!menu.classList.contains("open")));

// Close the mobile menu after tapping a link, or on Escape
menu.querySelectorAll("a").forEach((link) => link.addEventListener("click", () => setMenu(false)));

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && menu.classList.contains("open")) {
    setMenu(false);
    toggle.focus();
  }
});

// ---------------------------------------------------------
// Header: solid background once the page has scrolled
// ---------------------------------------------------------
const header = document.querySelector(".site-header");
const sentinel = document.querySelector(".top-sentinel");

if (sentinel && "IntersectionObserver" in window) {
  new IntersectionObserver(([entry]) => {
    header.classList.toggle("is-scrolled", !entry.isIntersecting);
  }).observe(sentinel);
}

// ---------------------------------------------------------
// Scroll reveal: items that enter together cascade in order
// ---------------------------------------------------------
const revealEls = document.querySelectorAll("[data-reveal]");

if ("IntersectionObserver" in window) {
  const revealObserver = new IntersectionObserver(
    (entries) => {
      let step = 0;
      entries
        .filter((entry) => entry.isIntersecting)
        .forEach((entry) => {
          entry.target.style.setProperty("--i", Math.min(step++, 6));
          entry.target.classList.add("is-in");
          revealObserver.unobserve(entry.target);
        });
    },
    { threshold: 0.12, rootMargin: "0px 0px -8% 0px" }
  );

  revealEls.forEach((el) => revealObserver.observe(el));
} else {
  revealEls.forEach((el) => el.classList.add("is-in"));
}

// ---------------------------------------------------------
// Highlight the nav link for the section in view (home page)
// ---------------------------------------------------------
const sectionLinks = new Map();
menu.querySelectorAll('a[href^="#"]').forEach((link) => {
  const section = document.querySelector(link.getAttribute("href"));
  if (section) sectionLinks.set(section, link);
});

if (sectionLinks.size && "IntersectionObserver" in window) {
  const navObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        sectionLinks.forEach((link) => link.classList.remove("is-active"));
        sectionLinks.get(entry.target)?.classList.add("is-active");
      });
    },
    { rootMargin: "-45% 0px -50% 0px" }
  );

  sectionLinks.forEach((_, section) => navObserver.observe(section));

  // Clear the highlight when back at the hero
  const hero = document.querySelector(".hero");
  if (hero) {
    new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) sectionLinks.forEach((link) => link.classList.remove("is-active"));
      },
      { rootMargin: "-45% 0px -50% 0px" }
    ).observe(hero);
  }
}

// ---------------------------------------------------------
// Spotlight cards: border glow follows the cursor
// ---------------------------------------------------------
if (finePointer.matches) {
  document.querySelectorAll(".spot").forEach((card) => {
    card.addEventListener("pointermove", (event) => {
      const rect = card.getBoundingClientRect();
      card.style.setProperty("--mx", `${event.clientX - rect.left}px`);
      card.style.setProperty("--my", `${event.clientY - rect.top}px`);
    });
  });
}

// ---------------------------------------------------------
// Hero oscilloscope: a live signal trace with a sweeping head
// ---------------------------------------------------------
const scope = document.querySelector(".scope");

if (scope && scope.getContext) {
  const ctx = scope.getContext("2d");
  const accent = "87, 224, 166";
  let width = 0;
  let height = 0;
  let frame = 0;
  let running = false;
  let visible = true;
  let start = performance.now();

  const signal = (x, t, phase = 0) => {
    const u = (x / width) * Math.PI * 2;
    const envelope = 0.75 + 0.25 * Math.sin(u * 0.5 + t * 0.35 + phase);
    return (
      envelope *
      (0.58 * Math.sin(u * 2.2 + t * 1.1 + phase) +
        0.26 * Math.sin(u * 5.3 - t * 0.7) +
        0.12 * Math.sin(u * 11.7 + t * 2.1 + phase))
    );
  };

  function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    width = scope.clientWidth;
    height = scope.clientHeight;
    scope.width = Math.round(width * dpr);
    scope.height = Math.round(height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    if (!running) draw(reduceMotion.matches ? 2 : (performance.now() - start) / 1000);
  }

  function tracePath(t, amp, mid, phase) {
    ctx.beginPath();
    for (let x = 0; x <= width; x += 3) {
      const y = mid + signal(x, t, phase) * amp;
      x === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    }
  }

  function draw(t) {
    ctx.clearRect(0, 0, width, height);
    const mid = height * 0.55;
    const amp = height * 0.3;

    // Secondary channel, faint
    tracePath(t * 0.8, amp * 0.55, mid + amp * 0.18, 2.1);
    ctx.strokeStyle = `rgba(${accent}, 0.08)`;
    ctx.lineWidth = 1;
    ctx.stroke();

    // Main channel
    tracePath(t, amp, mid, 0);
    ctx.strokeStyle = `rgba(${accent}, 0.2)`;
    ctx.lineWidth = 1.25;
    ctx.stroke();

    if (reduceMotion.matches) return;

    // Sweep: a brighter segment that runs left to right, like phosphor persistence
    const period = 4.8;
    const head = ((t % period) / period) * (width * 1.25) - width * 0.05;
    const tail = head - width * 0.28;
    const gradient = ctx.createLinearGradient(tail, 0, head, 0);
    gradient.addColorStop(0, `rgba(${accent}, 0)`);
    gradient.addColorStop(1, `rgba(${accent}, 0.85)`);

    ctx.save();
    ctx.beginPath();
    ctx.rect(Math.max(tail, 0), 0, Math.max(head - Math.max(tail, 0), 0), height);
    ctx.clip();
    tracePath(t, amp, mid, 0);
    ctx.strokeStyle = gradient;
    ctx.lineWidth = 1.75;
    ctx.stroke();
    ctx.restore();

    if (head > 0 && head < width) {
      ctx.beginPath();
      ctx.arc(head, mid + signal(head, t, 0) * amp, 2.5, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${accent}, 1)`;
      ctx.fill();
    }
  }

  function loop(now) {
    draw((now - start) / 1000);
    frame = requestAnimationFrame(loop);
  }

  function play() {
    if (running || reduceMotion.matches || !visible || document.hidden) return;
    running = true;
    frame = requestAnimationFrame(loop);
  }

  function pause() {
    running = false;
    cancelAnimationFrame(frame);
  }

  new ResizeObserver(resize).observe(scope);

  if ("IntersectionObserver" in window) {
    new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      visible ? play() : pause();
    }).observe(scope);
  }

  document.addEventListener("visibilitychange", () => (document.hidden ? pause() : play()));

  reduceMotion.addEventListener("change", () => {
    pause();
    resize();
    play();
  });

  play();
}

// ---------------------------------------------------------
// Contact form: submit without leaving the page (Formspree)
// ---------------------------------------------------------
const form = document.querySelector(".contact-form");
const status = form?.querySelector(".form-status");

form?.addEventListener("submit", async (event) => {
  event.preventDefault();

  const button = form.querySelector("button");
  button.disabled = true;
  status.className = "form-status";
  status.textContent = "Sending…";

  try {
    const response = await fetch(form.action, {
      method: "POST",
      body: new FormData(form),
      headers: { Accept: "application/json" },
    });

    if (!response.ok) throw new Error();
    form.reset();
    status.className = "form-status success";
    status.textContent = "Thanks. Your message has been sent.";
  } catch {
    status.className = "form-status error";
    status.textContent = "Something went wrong. Please reach out on LinkedIn instead.";
  } finally {
    button.disabled = false;
  }
});
