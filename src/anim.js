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

  if (reduce) {
    revealAll();
  } else if (hasGsap) {
    splits.forEach(function (el) {
      var words = el.querySelectorAll('.rw-i');
      window.gsap.fromTo(words, { yPercent: 115 }, {
        yPercent: 0,
        duration: 0.95,
        ease: 'power3.out',
        stagger: 0.045,
        scrollTrigger: { trigger: el, start: 'top 86%', once: true },
        onStart: function () { el.classList.add('split-in'); },
      });
    });

    document.querySelectorAll('[data-reveal]').forEach(function (el) {
      window.gsap.fromTo(el, { autoAlpha: 0, y: 30 }, {
        autoAlpha: 1,
        y: 0,
        duration: 0.75,
        ease: 'power3.out',
        scrollTrigger: { trigger: el, start: 'top 88%', once: true },
        onStart: function () { el.classList.add('is-in'); },
      });
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
})();
