// Travel globe on the experience page. Reads window.PLACES from places.js.
// The place list renders right away; the 3D globe loads only when the section nears the screen.
(() => {
  const section = document.getElementById("travel");
  if (!section) return;

  const GLOBE_JS = "https://cdn.jsdelivr.net/npm/globe.gl@2.46.2/dist/globe.gl.min.js";
  const TOPO_JS = "https://cdn.jsdelivr.net/npm/topojson-client@3.1.0/dist/topojson-client.min.js";
  const WORLD = "https://cdn.jsdelivr.net/npm/world-atlas@2.0.2/countries-110m.json";
  const ACCENT = "#57e0a6";
  // world-atlas uses a few long-form country names
  const ATLAS_NAMES = { "United States": "United States of America" };

  const places = Array.isArray(window.PLACES) ? window.PLACES : [];
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const mount = section.querySelector(".globe");
  const card = section.querySelector(".place-card");
  const tr = (key, fallback) => (window.I18N ? window.I18N.t(key, fallback) : fallback);
  let focusPlace = null; // set once the globe is ready
  const zoomIn = section.querySelector("[data-zoom='in']");
  const zoomOut = section.querySelector("[data-zoom='out']");
  const list = section.querySelector(".place-list");

  // ---------- Stats and list (works without WebGL) ----------
  const countries = [...new Set(places.map((p) => p.country))];
  section.querySelector("[data-stat='cities']").textContent = places.length;
  section.querySelector("[data-stat='countries']").textContent = countries.length;

  list.innerHTML = "";
  countries.forEach((country) => {
    const group = document.createElement("li");
    const heading = document.createElement("p");
    heading.className = "place-country";
    heading.textContent = country;
    const cities = document.createElement("ul");
    places
      .filter((p) => p.country === country)
      .forEach((p) => {
        const item = document.createElement("li");
        item.className = `place place--${p.type === "trip" ? "trip" : "home"}`;
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "place-btn";
        btn.textContent = p.name;
        btn.addEventListener("click", () => {
          mount.scrollIntoView({ behavior: reduceMotion.matches ? "auto" : "smooth", block: "center" });
          if (focusPlace) focusPlace(p);
          else showCard(p);
        });
        item.appendChild(btn);
        cities.appendChild(item);
      });
    group.append(heading, cities);
    list.appendChild(group);
  });

  // ---------- Place card (photo, name, note) ----------
  function showCard(p) {
    if (!card) return;
    const img = card.querySelector("img");
    if (p.photo) {
      img.src = p.photo;
      img.alt = p.name;
      img.hidden = false;
    } else {
      img.removeAttribute("src");
      img.hidden = true;
    }
    card.querySelector(".place-card-name").textContent = p.name;
    card.querySelector(".place-card-meta").textContent = `${p.country} · ${
      p.type === "trip" ? tr("travel.trip", "Vacations") : tr("travel.home", "Lived, studied, or worked")
    }`;
    const note = card.querySelector(".place-card-note");
    note.textContent = p.note || "";
    note.hidden = !p.note;
    card.hidden = false;
    requestAnimationFrame(() => card.classList.add("is-open"));
  }

  function hideCard() {
    if (!card || card.hidden) return;
    card.classList.remove("is-open");
    setTimeout(() => (card.hidden = true), 200);
  }

  card?.querySelector(".place-card-close").addEventListener("click", hideCard);
  document.addEventListener("keydown", (e) => e.key === "Escape" && hideCard());

  if (!mount || !places.length) return;

  // ---------- Globe ----------
  const loadScript = (src) =>
    new Promise((resolve, reject) => {
      const s = document.createElement("script");
      s.src = src;
      s.onload = resolve;
      s.onerror = reject;
      document.head.appendChild(s);
    });

  function labelElement(place) {
    const el = document.createElement("div");
    el.dataset.rank = places.indexOf(place);
    el.className = `globe-label${place.side === "left" ? " globe-label--left" : ""}`;
    const text = document.createElement("span");
    text.textContent = place.name;
    el.appendChild(text);
    return el;
  }

  async function init() {
    await Promise.all([loadScript(GLOBE_JS), loadScript(TOPO_JS)]);
    const world = await fetch(WORLD).then((r) => r.json());
    // Drop sliver polygons (fewer than 3 distinct points); the map data has one in
    // North Korea and the hex-dot renderer throws on it.
    const solid = (ring) => new Set(ring.map((pt) => pt.join())).size >= 3;
    const shapes = window.topojson.feature(world, world.objects.countries).features.map((f) =>
      f.geometry.type === "MultiPolygon"
        ? { ...f, geometry: { ...f.geometry, coordinates: f.geometry.coordinates.filter((poly) => solid(poly[0])) } }
        : f
    );
    const visited = new Set(countries.map((c) => ATLAS_NAMES[c] || c));

    const home = places.find((p) => p.type === "home") || places[0];
    // Arcs connect the places you lived or worked; trips are pins only, to keep the globe readable
    const arcs = places
      .filter((p) => p !== home && p.type === "home")
      .map((p) => ({ startLat: home.lat, startLng: home.lng, endLat: p.lat, endLng: p.lng }));

    const still = reduceMotion.matches;
    const globe = window.Globe({ animateIn: !still })(mount)
      .backgroundColor("rgba(0,0,0,0)")
      .showAtmosphere(true)
      .atmosphereColor(ACCENT)
      .atmosphereAltitude(0.16)
      // Continents drawn as a dot matrix; countries you've been to light up
      .hexPolygonsData(shapes)
      .hexPolygonResolution(3)
      .hexPolygonMargin(0.4)
      .hexPolygonUseDots(true)
      .hexPolygonColor((f) => (visited.has(f.properties.name) ? "rgba(87,224,166,0.75)" : "rgba(230,235,239,0.16)"))
      // Pins, pulsing rings, and arcs from home
      .pointsData(places)
      .pointLat("lat")
      .pointLng("lng")
      .pointColor(() => ACCENT)
      .pointAltitude(0.012)
      .pointRadius((p) => (p.type === "trip" ? 0.3 : 0.45))
      .pointLabel((p) => p.name)
      .ringsData(still ? [] : places.filter((p) => p.type === "home"))
      .ringLat("lat")
      .ringLng("lng")
      .ringColor(() => (t) => `rgba(87,224,166,${0.8 * (1 - t)})`)
      .ringMaxRadius(3)
      .ringPropagationSpeed(1.6)
      .ringRepeatPeriod(1800)
      .arcsData(arcs)
      .arcColor(() => ["rgba(87,224,166,0.15)", "rgba(87,224,166,0.9)"])
      .arcStroke(0.35)
      .arcDashLength(0.45)
      .arcDashGap(0.25)
      .arcDashAnimateTime(still ? 0 : 2800)
      // Labels as real HTML so they stay crisp and match the site's type
      .htmlElementsData(places)
      .htmlLat("lat")
      .htmlLng("lng")
      .htmlAltitude(0.015)
      .htmlElement(labelElement);

    if (typeof globe.htmlElementVisibilityModifier === "function") {
      globe.htmlElementVisibilityModifier((el, isVisible) => {
        el.classList.toggle("is-back", !isVisible);
      });
    }

    const material = globe.globeMaterial();
    material.color.set("#0c1311");
    if (material.emissive) material.emissive.set("#050b08");
    material.shininess = 4;

    const controls = globe.controls();
    controls.enableZoom = false; // keep page scrolling free
    controls.autoRotate = !still;
    controls.autoRotateSpeed = 0.45;
    mount.addEventListener("pointerdown", () => (controls.autoRotate = false), { once: true });



    // Start over East Asia, where most places are; the slow spin brings North America around
    let altitude = 2.1;
    globe.pointOfView({ lat: 30, lng: 125, altitude }, 0);

    const zoom = (factor) => {
      altitude = Math.min(2.8, Math.max(0.7, altitude * factor));
      controls.autoRotate = false;
      globe.pointOfView({ altitude }, 600);
    };
    zoomIn?.addEventListener("click", () => zoom(0.6));
    zoomOut?.addEventListener("click", () => zoom(1 / 0.6));

    // Click a pin (or a name in the list) to fly there and open its card
    focusPlace = (p) => {
      controls.autoRotate = false;
      altitude = Math.min(altitude, 1.3);
      globe.pointOfView({ lat: p.lat, lng: p.lng, altitude }, still ? 0 : 1000);
      showCard(p);
    };
    globe.onPointClick((p) => focusPlace(p));
    globe.pointsMerge(false);

    // Hide labels that overlap a more important one; they reappear as you zoom in
    function declutter() {
      const taken = [];
      [...mount.querySelectorAll(".globe-label")]
        .sort((a, b) => a.dataset.rank - b.dataset.rank)
        .forEach((el) => {
          if (el.classList.contains("is-back")) return;
          const r = el.firstChild.getBoundingClientRect();
          const hit = taken.some((t) => r.left < t.right + 4 && r.right > t.left - 4 && r.top < t.bottom + 2 && r.bottom > t.top - 2);
          el.classList.toggle("is-crowded", hit);
          if (!hit) taken.push(r);
        });
    }
    let declutterTimer = 0;
    const startDeclutter = () => {
      if (!declutterTimer) declutterTimer = setInterval(declutter, 200);
    };
    const stopDeclutter = () => {
      clearInterval(declutterTimer);
      declutterTimer = 0;
    };

    const fit = () => globe.width(mount.clientWidth).height(mount.clientHeight);
    new ResizeObserver(fit).observe(mount);
    fit();

    // Pause rendering while the globe is off screen
    new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        globe.resumeAnimation();
        startDeclutter();
      } else {
        globe.pauseAnimation();
        stopDeclutter();
      }
    }).observe(mount);

    mount.classList.add("is-ready");
  }

  const starter = new IntersectionObserver(
    ([entry]) => {
      if (!entry.isIntersecting) return;
      starter.disconnect();
      init().catch(() => mount.classList.add("is-failed"));
    },
    { rootMargin: "400px 0px" }
  );
  starter.observe(section);
})();
