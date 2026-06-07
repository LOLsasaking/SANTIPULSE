/* Home triptych: play each panel's video only while that panel is hovered.
   Lazy-loads the mp4 on first hover (data-src), pauses + resets on leave.
   CSP-safe (no inline JS). The panel-1/2/3.jpg posters stay as the resting bg. */
(function () {
  'use strict';

  var panels = document.querySelectorAll('.stage .panel');
  panels.forEach(function (panel) {
    var v = panel.querySelector('.panel-video');
    if (!v) return;

    function play() {
      if (!v.src && v.dataset.src) v.src = v.dataset.src;
      var p = v.play();
      if (p && p.catch) p.catch(function () {});
    }
    function stop() {
      try { v.pause(); v.currentTime = 0; } catch (e) {}
    }

    panel.addEventListener('mouseenter', play);
    panel.addEventListener('mouseleave', stop);
    // Keyboard focus (tab) also previews the panel.
    panel.addEventListener('focus', play, true);
    panel.addEventListener('blur', stop, true);
  });
})();
