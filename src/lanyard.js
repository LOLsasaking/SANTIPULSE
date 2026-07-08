(function () {
  'use strict';

  var root = document.querySelector('[data-lanyard]');
  if (!root) return;

  var card = root.querySelector('[data-lanyard-card]');
  var paths = root.querySelectorAll('[data-lanyard-path]');
  if (!card || !paths.length) return;

  var target = { x: 0, y: 0 };
  var current = { x: 0, y: 0 };
  var dragging = false;
  var activePointer = null;

  function clamp(v, min, max) {
    return Math.max(min, Math.min(max, v));
  }

  function setTargetFromEvent(event) {
    var rect = root.getBoundingClientRect();
    var cx = rect.left + rect.width / 2;
    var cy = rect.top + 360;
    target.x = clamp(event.clientX - cx, -96, 96);
    target.y = clamp(event.clientY - cy, -92, 112);
  }

  function updateCord() {
    var endX = 210 + current.x * 0.58;
    var endY = 276 + current.y * 0.42;
    var sway = current.x * 0.36;
    var d = [
      'M210 44',
      'C' + (206 + sway * 0.15).toFixed(1) + ' 106 ' + (198 + sway * 0.4).toFixed(1) + ' 145 ' + (190 + sway).toFixed(1) + ' 186',
      'C' + (182 + sway).toFixed(1) + ' 228 ' + (188 + sway * 0.35).toFixed(1) + ' 252 ' + endX.toFixed(1) + ' ' + endY.toFixed(1)
    ].join(' ');
    paths.forEach(function (path) { path.setAttribute('d', d); });
  }

  function render() {
    current.x += (target.x - current.x) * (dragging ? 0.28 : 0.09);
    current.y += (target.y - current.y) * (dragging ? 0.28 : 0.09);
    card.style.setProperty('--card-x', current.x.toFixed(2));
    card.style.setProperty('--card-y', current.y.toFixed(2));
    card.style.setProperty('--tilt-x', clamp(-current.y * 0.045, -8, 8).toFixed(2));
    card.style.setProperty('--tilt-y', clamp(current.x * 0.055, -10, 10).toFixed(2));
    updateCord();
    requestAnimationFrame(render);
  }

  card.addEventListener('pointerdown', function (event) {
    dragging = true;
    activePointer = event.pointerId;
    card.setPointerCapture(activePointer);
    setTargetFromEvent(event);
  });

  card.addEventListener('pointermove', function (event) {
    if (!dragging || event.pointerId !== activePointer) return;
    setTargetFromEvent(event);
  });

  function release() {
    dragging = false;
    activePointer = null;
    target.x = 0;
    target.y = 0;
  }

  card.addEventListener('pointerup', release);
  card.addEventListener('pointercancel', release);
  card.addEventListener('lostpointercapture', release);

  root.addEventListener('pointermove', function (event) {
    if (dragging) return;
    var rect = root.getBoundingClientRect();
    var x = (event.clientX - (rect.left + rect.width / 2)) / 8;
    var y = (event.clientY - (rect.top + rect.height / 2)) / 10;
    target.x = clamp(x, -34, 34);
    target.y = clamp(y, -28, 28);
  });

  root.addEventListener('pointerleave', function () {
    if (dragging) return;
    target.x = 0;
    target.y = 0;
  });

  updateCord();
  requestAnimationFrame(render);
})();
