/* Aeline motion layer.
   Uses GSAP + ScrollTrigger when the CDN is available, with a local
   IntersectionObserver fallback so public pages stay readable offline. */
(function () {
  'use strict';

  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var hasGsap = !reduce && window.gsap && window.ScrollTrigger;

  if (hasGsap) window.gsap.registerPlugin(window.ScrollTrigger);

  function splitWords(el) {
    if (el.getAttribute('data-split-ready') === 'true') return;
    var nodes = Array.prototype.slice.call(el.childNodes);
    var frag = document.createDocumentFragment();
    var i = 0;

    function wrap(child) {
      var outer = document.createElement('span');
      var inner = document.createElement('span');
      outer.className = 'rw';
      inner.className = 'rw-i';
      inner.style.transitionDelay = (i * 0.05) + 's';
      inner.appendChild(child);
      outer.appendChild(inner);
      frag.appendChild(outer);
      i++;
    }

    nodes.forEach(function (node) {
      if (node.nodeType === 3) {
        node.textContent.split(/(\s+)/).forEach(function (part) {
          if (!part) return;
          if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(part)); return; }
          wrap(document.createTextNode(part));
        });
      } else if (node.nodeType === 1 && node.tagName === 'BR') {
        frag.appendChild(node);
      } else if (node.nodeType === 1) {
        wrap(node);
      }
    });

    el.innerHTML = '';
    el.appendChild(frag);
    el.setAttribute('data-split-ready', 'true');
  }

  var splits = Array.prototype.slice.call(document.querySelectorAll('[data-split]'));
  if (!reduce) splits.forEach(splitWords);

  document.querySelectorAll('[data-stagger]').forEach(function (group) {
    Array.prototype.slice.call(group.children).forEach(function (child, index) {
      if (!child.hasAttribute('data-reveal')) child.setAttribute('data-reveal', '');
      child.style.transitionDelay = (index * 0.08) + 's';
    });
  });

  function revealAll() {
    document.querySelectorAll('[data-reveal]').forEach(function (el) { el.classList.add('is-in'); });
    splits.forEach(function (el) { el.classList.add('split-in'); });
  }

  // Anything already in the first screen must animate immediately — pages like
  // the no-scroll home triptych never fire a ScrollTrigger, which would leave
  // split headings stuck off-screen (invisible). In-view = play now, rest = on scroll.
  var vh = window.innerHeight || document.documentElement.clientHeight || 0;
  function inViewNow(el) {
    var r = el.getBoundingClientRect();
    return r.top < vh * 0.95 && r.bottom > 0;
  }

  if (reduce) {
    revealAll();
  } else if (hasGsap) {
    splits.forEach(function (el) {
      var words = el.querySelectorAll('.rw-i');
      var opts = {
        yPercent: 0, duration: 0.95, ease: 'power3.out', stagger: 0.045,
        onStart: function () { el.classList.add('split-in'); },
      };
      if (!inViewNow(el)) opts.scrollTrigger = { trigger: el, start: 'top 86%', once: true };
      window.gsap.fromTo(words, { yPercent: 115 }, opts);
    });

    document.querySelectorAll('[data-reveal]').forEach(function (el) {
      var opts = {
        autoAlpha: 1, y: 0, duration: 0.75, ease: 'power3.out',
        onStart: function () { el.classList.add('is-in'); },
      };
      if (!inViewNow(el)) opts.scrollTrigger = { trigger: el, start: 'top 88%', once: true };
      window.gsap.fromTo(el, { autoAlpha: 0, y: 30 }, opts);
    });
  } else if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        if (entry.target.hasAttribute('data-split')) entry.target.classList.add('split-in');
        else entry.target.classList.add('is-in');
        io.unobserve(entry.target);
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.12 });
    document.querySelectorAll('[data-reveal]').forEach(function (el) { io.observe(el); });
    splits.forEach(function (el) { io.observe(el); });
  } else {
    revealAll();
  }

  if (!reduce && !matchMedia('(hover: none)').matches) {
    document.querySelectorAll('[data-magnetic]').forEach(function (el) {
      var strength = 0.3;
      el.addEventListener('mousemove', function (ev) {
        var r = el.getBoundingClientRect();
        var x = ev.clientX - (r.left + r.width / 2);
        var y = ev.clientY - (r.top + r.height / 2);
        el.style.transform = 'translate(' + (x * strength) + 'px,' + (y * strength) + 'px)';
      });
      el.addEventListener('mouseleave', function () { el.style.transform = ''; });
    });
  }

  var nav = document.querySelector('.nav');
  if (nav) {
    var onScroll = function () { nav.classList.toggle('scrolled', window.scrollY > 24); };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
  }

  // ── Perf: only let autoplay videos play while on screen ─────────────
  //   Decoding several full-screen loops at once is the main source of
  //   scroll lag on phones. Pause any autoplay video that scrolls out of
  //   view and resume it when it comes back.
  var autoVids = document.querySelectorAll('video[autoplay]');
  if (autoVids.length && 'IntersectionObserver' in window) {
    var vio = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        var v = entry.target;
        if (entry.isIntersecting) { var p = v.play(); if (p && p.catch) p.catch(function () {}); }
        else if (!v.paused) { v.pause(); }
      });
    }, { rootMargin: '120px' });
    autoVids.forEach(function (v) { vio.observe(v); });
  }

  // ── Count-up numbers (stats + prices) when scrolled into view ───────
  function countUp(el) {
    var raw = el.getAttribute('data-cu') || el.textContent;
    el.setAttribute('data-cu', raw);
    var m = raw.match(/(\D*)(\d[\d.,]*)(.*)/);
    if (!m) return;
    var pre = m[1], suf = m[3];
    var target = parseFloat(m[2].replace(/[.,]/g, ''));
    if (!isFinite(target)) return;
    var dur = 1100, t0 = null;
    function step(ts) {
      if (!t0) t0 = ts;
      var p = Math.min((ts - t0) / dur, 1);
      var val = Math.round(target * (1 - Math.pow(1 - p, 3)));
      el.textContent = pre + val + suf;
      if (p < 1) requestAnimationFrame(step);
      else el.textContent = raw;
    }
    requestAnimationFrame(step);
  }
  var nums = document.querySelectorAll('.stat-card .big, .plan-price');
  if (nums.length && 'IntersectionObserver' in window && !reduce) {
    var nio = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) { if (e.isIntersecting) { countUp(e.target); nio.unobserve(e.target); } });
    }, { threshold: 0.4 });
    nums.forEach(function (n) { nio.observe(n); });
  }

  // ── 3D tilt on cards toward the cursor (desktop) ────────────────────
  if (!reduce && !matchMedia('(hover: none)').matches) {
    document.querySelectorAll('.card, .plan').forEach(function (card) {
      card.addEventListener('mousemove', function (e) {
        var r = card.getBoundingClientRect();
        var rx = ((e.clientY - r.top) / r.height - 0.5) * -7;
        var ry = ((e.clientX - r.left) / r.width - 0.5) * 7;
        card.style.transform = 'perspective(900px) rotateX(' + rx.toFixed(2) + 'deg) rotateY(' + ry.toFixed(2) + 'deg) translateY(-6px)';
      });
      card.addEventListener('mouseleave', function () { card.style.transform = ''; });
    });
  }

  // ── Rotating words for the animated hero ([data-rotate] > .w) ───────
  document.querySelectorAll('[data-rotate]').forEach(function (rot) {
    var words = rot.querySelectorAll('.w');
    if (!words.length) return;
    words[0].classList.add('is-active');
    if (reduce || words.length < 2) return;
    var idx = 0;
    setInterval(function () {
      var prev = idx;
      idx = (idx + 1) % words.length;
      words[prev].classList.remove('is-active');
      words[prev].classList.add('is-prev');
      words[idx].classList.remove('is-prev');
      words[idx].classList.add('is-active');
      setTimeout(function () { words[prev].classList.remove('is-prev'); }, 650);
    }, 2200);
  });

  // ── Scroll progress bar ─────────────────────────────────────────────
  var bar = document.querySelector('.scroll-progress');
  if (bar) {
    var onProg = function () {
      var h = document.documentElement;
      var max = (h.scrollHeight - h.clientHeight) || 1;
      bar.style.width = (Math.min(h.scrollTop / max, 1) * 100) + '%';
    };
    onProg();
    window.addEventListener('scroll', onProg, { passive: true });
  }
})();
