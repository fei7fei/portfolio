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
        item.textContent = p.name;
        cities.appendChild(item);
      });
    group.append(heading, cities);
    list.appendChild(group);
  });

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
    const arcs = places
      .filter((p) => p !== home)
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
      .pointRadius((p) => (p.type === "trip" ? 0.32 : 0.45))
      .ringsData(still ? [] : places)
      .ringLat("lat")
      .ringLng("lng")
      .ringColor(() => (t) => `rgba(87,224,166,${0.8 * (1 - t)})`)
      .ringMaxRadius(3)
      .ringPropagationSpeed(1.6)
      .ringRepeatPeriod(1800)
      .arcsData(arcs)
      .arcColor(() => ["rgba(87,224,166,0.15)", "rgba(87,224,166,0.9)"])
      .arcStroke(0.45)
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
        el.style.opacity = isVisible ? "1" : "0";
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

    globe.pointOfView({ lat: 38, lng: -40, altitude: 2.3 }, 0);

    const fit = () => globe.width(mount.clientWidth).height(mount.clientHeight);
    new ResizeObserver(fit).observe(mount);
    fit();

    // Pause rendering while the globe is off screen
    new IntersectionObserver(([entry]) => {
      entry.isIntersecting ? globe.resumeAnimation() : globe.pauseAnimation();
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
