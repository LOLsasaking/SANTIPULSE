/* Lightweight, CSP-safe animation engine (no GSAP/CDN needed).
   Drives the Aeline-style motion on the landing pages:
   - [data-split]     : heading words rise from a mask, staggered
   - [data-reveal]    : fade + slide up when scrolled into view
   - [data-stagger]   : auto-reveals its direct children in sequence
   - [data-magnetic]  : element subtly follows the cursor
   - .nav             : morphs (shrinks + opaque) once scrolled
   All transforms/opacity only -> hardware-accelerated. Honors reduced-motion. */
(function () {
  'use strict';
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ── Split headings into word masks ──────────────────────────────
  function splitWords(el) {
    var nodes = Array.prototype.slice.call(el.childNodes);
    var frag = document.createDocumentFragment();
    var i = 0;
    function wrap(child) {
      var outer = document.createElement('span'); outer.className = 'rw';
      var inner = document.createElement('span'); inner.className = 'rw-i';
      inner.style.transitionDelay = (i * 0.05) + 's';
      inner.appendChild(child);
      outer.appendChild(inner);
      frag.appendChild(outer);
      i++;
    }
    nodes.forEach(function (node) {
      if (node.nodeType === 3) {
        var parts = node.textContent.split(/(\s+)/);
        parts.forEach(function (p) {
          if (p === '') return;
          if (/^\s+$/.test(p)) { frag.appendChild(document.createTextNode(p)); return; }
          wrap(document.createTextNode(p));
        });
      } else if (node.nodeType === 1) {
        wrap(node);
      }
    });
    el.innerHTML = '';
    el.appendChild(frag);
  }

  var splits = document.querySelectorAll('[data-split]');
  if (!reduce) splits.forEach(splitWords);

  // ── Auto-mark staggered children as reveal targets ──────────────
  document.querySelectorAll('[data-stagger]').forEach(function (group) {
    var kids = group.children, d = 0;
    for (var k = 0; k < kids.length; k++) {
      if (!kids[k].hasAttribute('data-reveal')) kids[k].setAttribute('data-reveal', '');
      kids[k].style.transitionDelay = (d * 0.08) + 's';
      d++;
    }
  });

  // ── IntersectionObserver: reveal + split-in ─────────────────────
  if (reduce || !('IntersectionObserver' in window)) {
    document.querySelectorAll('[data-reveal]').forEach(function (el) { el.classList.add('is-in'); });
    splits.forEach(function (el) { el.classList.add('split-in'); });
  } else {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        if (e.target.hasAttribute('data-split')) e.target.classList.add('split-in');
        else e.target.classList.add('is-in');
        io.unobserve(e.target);
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.12 });
    document.querySelectorAll('[data-reveal]').forEach(function (el) { io.observe(el); });
    splits.forEach(function (el) { io.observe(el); });
  }

  // ── Magnetic micro-interaction ──────────────────────────────────
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

  // ── Navbar morph on scroll ──────────────────────────────────────
  var nav = document.querySelector('.nav');
  if (nav) {
    var onScroll = function () { nav.classList.toggle('scrolled', window.scrollY > 24); };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
  }
})();
