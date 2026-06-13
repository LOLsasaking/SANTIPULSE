/* 3D globe for /nosotros/ — Florida + Tenerife markers with an arc between
   them. Uses globe.gl (Three.js) loaded from the allow-listed jsdelivr CDN.
   Degrades to nothing if the library or WebGL is unavailable. */
(function () {
  'use strict';
  var el = document.getElementById('globe3d');
  if (!el || typeof window.Globe !== 'function') return;

  var markers = [
    { lat: 27.6648, lng: -81.5158, label: 'Florida' },
    { lat: 28.2916, lng: -16.6291, label: 'Tenerife' },
  ];
  var arcs = [{ startLat: 27.6648, startLng: -81.5158, endLat: 28.2916, endLng: -16.6291 }];

  var globe;
  try {
    globe = window.Globe()(el)
      .width(el.clientWidth || 600)
      .height(el.clientHeight || 480)
      .backgroundColor('rgba(0,0,0,0)')
      .globeImageUrl('https://cdn.jsdelivr.net/npm/three-globe/example/img/earth-dark.jpg')
      .atmosphereColor('#4da6ff')
      .atmosphereAltitude(0.18)
      .pointsData(markers).pointLat('lat').pointLng('lng')
      .pointColor(function () { return '#E23B4E'; })
      .pointAltitude(0.05).pointRadius(0.75)
      .labelsData(markers).labelLat('lat').labelLng('lng').labelText('label')
      .labelSize(1.6).labelColor(function () { return '#ffffff'; })
      .labelDotRadius(0.6).labelResolution(2)
      .arcsData(arcs).arcColor(function () { return '#4da6ff'; })
      .arcStroke(0.5).arcAltitude(0.28)
      .arcDashLength(0.5).arcDashGap(0.25).arcDashAnimateTime(2200);
  } catch (e) { return; }

  var c = globe.controls();
  if (c) { c.autoRotate = true; c.autoRotateSpeed = 0.6; c.enableZoom = false; }
  globe.pointOfView({ lat: 30, lng: -48, altitude: 2.2 });

  window.addEventListener('resize', function () {
    globe.width(el.clientWidth).height(el.clientHeight);
  });
})();
