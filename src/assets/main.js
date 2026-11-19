(function () {
  "use strict";

  const $ = (selector, scope) => (scope || document).querySelector(selector);
  const $$ = (selector, scope) => Array.from((scope || document).querySelectorAll(selector));
  const html = document.documentElement;
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------- language ---------- */
  function setLang(lang, persist) {
    html.dataset.lang = lang;
    html.lang = lang === "zh" ? "zh-CN" : "en";
    $$(".lang-btn").forEach((button) => {
      const on = button.dataset.lang === lang;
      button.classList.toggle("is-on", on);
      button.setAttribute("aria-pressed", on ? "true" : "false");
    });
    const input = $("#pubSearch");
    if (input) input.placeholder = input.dataset[lang === "zh" ? "phZh" : "phEn"];
    document.title = lang === "zh" ? html.dataset.titleZh : html.dataset.titleEn;
    if (persist) {
      try {
        localStorage.setItem("lb-lang", lang);
      } catch (error) {
        /* storage may be unavailable — language still applies for this page */
      }
    }
  }

  $$(".lang-btn").forEach((button) => {
    button.addEventListener("click", () => setLang(button.dataset.lang, true));
  });

  let stored = null;
  try {
    stored = localStorage.getItem("lb-lang");
  } catch (error) {
    stored = null;
  }
  const params = new URLSearchParams(location.search);
  const wanted = params.get("lang");
  setLang(wanted === "en" || (!wanted && stored === "en") ? "en" : "zh", false);

  /* ---------- header / scrollspy ---------- */
  const head = $("#siteHead");
  const navLinks = $$(".site-nav a");
  const isHome = location.pathname === "/" || location.pathname === "/index.html";
  const sections = isHome
    ? navLinks
        .map((link) => {
          const url = new URL(link.getAttribute("href"), location.href);
          return url.hash ? document.querySelector(url.hash) : null;
        })
        .filter(Boolean)
    : [];

  let ticking = false;
  function onScroll() {
    if (head) head.classList.toggle("is-scrolled", window.scrollY > 20);
    if (sections.length) {
      let active = "";
      const y = window.scrollY + 140;
      sections.forEach((section) => {
        if (section.offsetTop <= y) active = "#" + section.id;
      });
      navLinks.forEach((link) => {
        const url = new URL(link.getAttribute("href"), location.href);
        // Links such as 简介 point to another page (no hash) and must keep
        // whatever active state the template gave them.
        if (!url.hash) return;
        link.classList.toggle("is-active", url.hash === active);
      });
    }
    ticking = false;
  }
  window.addEventListener(
    "scroll",
    () => {
      if (!ticking) {
        ticking = true;
        requestAnimationFrame(onScroll);
      }
    },
    { passive: true }
  );
  onScroll();

  /* ---------- reveal ---------- */
  const revealEls = $$(".reveal");
  if (reduceMotion || !("IntersectionObserver" in window)) {
    revealEls.forEach((el) => el.classList.add("in"));
  } else {
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("in");
            io.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -8% 0px" }
    );
    revealEls.forEach((el) => io.observe(el));
  }

  /* ---------- generative field (home hero only) ---------- */
  (function field() {
    const canvas = $("#field");
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    let w = 0,
      h = 0,
      dpr = 1,
      parts = [],
      t = 0,
      raf = null,
      visible = true,
      bg = null;
    const mouse = { x: -9999, y: -9999 };

    function angle(x, y) {
      return (
        Math.sin(x * 0.0042 + t) * 1.7 +
        Math.cos(y * 0.0056 - t * 0.8) * 1.5 +
        Math.sin((x + y) * 0.0022 + t * 0.5) * 1.1
      );
    }

    function makeBackdrop() {
      bg = document.createElement("canvas");
      bg.width = Math.max(1, Math.round(w * dpr));
      bg.height = Math.max(1, Math.round(h * dpr));
      const c = bg.getContext("2d");
      c.setTransform(dpr, 0, 0, dpr, 0, 0);
      c.lineWidth = 0.8;
      const n = Math.max(100, Math.floor(w / 8));
      for (let i = 0; i < n; i += 1) {
        let x = Math.random() * w;
        let y = Math.random() * h;
        c.beginPath();
        c.moveTo(x, y);
        for (let k = 0; k < 52; k += 1) {
          const a = angle(x, y);
          x += Math.cos(a) * 7;
          y += Math.sin(a) * 7;
          c.lineTo(x, y);
        }
        c.strokeStyle = i % 19 === 0 ? "rgba(196,64,42,.22)" : "rgba(22,21,19,.085)";
        c.stroke();
      }
    }

    function size() {
      const rect = canvas.getBoundingClientRect();
      dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      w = rect.width;
      h = rect.height;
      canvas.width = Math.max(1, Math.round(w * dpr));
      canvas.height = Math.max(1, Math.round(h * dpr));
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      seed();
      makeBackdrop();
      if (reduceMotion) drawStatic();
    }

    function seed() {
      const n = Math.min(420, Math.max(140, Math.floor((w * h) / 3000)));
      parts = Array.from({ length: n }, () => ({
        x: Math.random() * w,
        y: Math.random() * h,
        s: 0.35 + Math.random() * 0.85,
        red: Math.random() < 0.06
      }));
    }

    function drawStatic() {
      ctx.clearRect(0, 0, w, h);
      if (bg) ctx.drawImage(bg, 0, 0, w, h);
      ctx.lineWidth = 0.8;
      for (let i = 0; i < parts.length; i += 1) {
        const p = parts[i];
        let x = p.x;
        let y = p.y;
        ctx.beginPath();
        ctx.moveTo(x, y);
        for (let k = 0; k < 4; k += 1) {
          const a = angle(x, y);
          x += Math.cos(a) * 9;
          y += Math.sin(a) * 9;
          ctx.lineTo(x, y);
        }
        ctx.strokeStyle = p.red ? "rgba(196,64,42,.42)" : "rgba(22,21,19,.14)";
        ctx.stroke();
      }
    }

    function frame() {
      ctx.clearRect(0, 0, w, h);
      if (bg) ctx.drawImage(bg, 0, 0, w, h);
      ctx.lineWidth = 0.75;
      for (let i = 0; i < parts.length; i += 1) {
        const p = parts[i];
        let a = angle(p.x, p.y);
        const dx = p.x - mouse.x;
        const dy = p.y - mouse.y;
        if (dx * dx + dy * dy < 24000) a += Math.atan2(dy, dx) * 0.45;
        const nx = p.x + Math.cos(a) * 1.6 * p.s;
        const ny = p.y + Math.sin(a) * 1.6 * p.s;
        ctx.beginPath();
        ctx.moveTo(p.x, p.y);
        ctx.lineTo(nx, ny);
        ctx.strokeStyle = p.red ? "rgba(196,64,42,.55)" : "rgba(22,21,19,.20)";
        ctx.stroke();
        p.x = nx;
        p.y = ny;
        if (p.x < -4) p.x = w + 4;
        else if (p.x > w + 4) p.x = -4;
        if (p.y < -4) p.y = h + 4;
        else if (p.y > h + 4) p.y = -4;
      }
      t += 0.0014;
      raf = requestAnimationFrame(frame);
    }

    function start() {
      if (!raf && !reduceMotion) raf = requestAnimationFrame(frame);
    }
    function stop() {
      if (raf) {
        cancelAnimationFrame(raf);
        raf = null;
      }
    }

    let resizeTimer = null;
    window.addEventListener("resize", () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(size, 180);
    });
    canvas.addEventListener("pointermove", (event) => {
      const rect = canvas.getBoundingClientRect();
      mouse.x = event.clientX - rect.left;
      mouse.y = event.clientY - rect.top;
    });
    canvas.addEventListener("pointerleave", () => {
      mouse.x = -9999;
      mouse.y = -9999;
    });
    if ("IntersectionObserver" in window) {
      new IntersectionObserver(
        (entries) => {
          visible = entries[0].isIntersecting;
          if (visible) start();
          else stop();
        },
        { threshold: 0 }
      ).observe(canvas);
    }
    document.addEventListener("visibilitychange", () => {
      if (document.hidden) stop();
      else if (visible) start();
    });
    size();
    if (!reduceMotion) start();
  })();

  /* ---------- works filter ---------- */
  const grid = $("#worksGrid");
  const state = { filter: "all", pubType: "all", query: "" };

  if (grid) {
    $$("[data-filter]").forEach((button) => {
      button.addEventListener("click", () => {
        state.filter = button.dataset.filter;
        $$("[data-filter]").forEach((b) => b.classList.toggle("is-active", b === button));
        $$(".work", grid).forEach((card) => {
          card.classList.toggle(
            "is-hidden",
            state.filter !== "all" && card.dataset.cat !== state.filter
          );
        });
      });
    });
  }

  /* ---------- publications search / filter ---------- */
  const pubList = $("#pubList");
  const pubCount = $("#pubCount");
  const pubSearch = $("#pubSearch");
  const pubItems = pubList ? Array.from(pubList.querySelectorAll(".pub")) : [];
  const pubEmpty = $("#pubEmpty");
  const pubTotal = pubItems.length;

  function renderPubs() {
    if (!pubList) return;
    const query = state.query.trim().toLowerCase();
    let shown = 0;
    pubItems.forEach((item) => {
      const typeOk = state.pubType === "all" || item.dataset.type === state.pubType;
      const textOk = !query || item.dataset.search.indexOf(query) > -1;
      const visibleItem = typeOk && textOk;
      item.classList.toggle("is-hidden", !visibleItem);
      if (visibleItem) shown += 1;
    });
    if (pubEmpty) pubEmpty.hidden = shown > 0;
    if (pubCount) {
      pubCount.innerHTML =
        '<span class="lang-zh">显示 ' +
        shown +
        " / " +
        pubTotal +
        " 条</span>" +
        '<span class="lang-en">Showing ' +
        shown +
        " of " +
        pubTotal +
        "</span>";
    }
  }

  if (pubSearch) {
    let timer = null;
    pubSearch.addEventListener("input", () => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        state.query = pubSearch.value;
        renderPubs();
      }, 110);
    });
  }

  $$("[data-pubtype]").forEach((button) => {
    button.addEventListener("click", () => {
      state.pubType = button.dataset.pubtype;
      $$("[data-pubtype]").forEach((b) => b.classList.toggle("is-active", b === button));
      renderPubs();
    });
  });
  renderPubs();

  /* ---------- project gallery ---------- */
  const galleryMain = $("#galleryMain");
  if (galleryMain) {
    const thumbs = $$("#galleryThumbs button");
    thumbs.forEach((button, index) => {
      button.addEventListener("click", () => {
        galleryMain.src = button.dataset.src;
        const baseAlt = (galleryMain.alt || "").replace(/\s—\s\d+$/, "");
        galleryMain.alt = baseAlt + " — " + (index + 1);
        thumbs.forEach((b) => b.classList.toggle("is-on", b === button));
      });
    });

    document.addEventListener("keydown", (event) => {
      if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
      if (event.target.closest("input, textarea")) return;
      const link =
        event.key === "ArrowLeft"
          ? $('.dlg-nav a[aria-label="Previous project"]')
          : $('.dlg-nav a[aria-label="Next project"]');
      if (link) location.href = link.href;
    });
  }

  /* ---------- legacy deep link: /?work=slug ---------- */
  if (isHome && params.get("work")) {
    location.replace("/projects/" + encodeURIComponent(params.get("work")) + "/");
  }
})();
