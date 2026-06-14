(function () {
  "use strict";

  const heroLines = [
    {
      kicker: "Tucked away",
      title: "A gated Miami hideaway",
      body: "Set on a quiet 0.85 acre lot in Miller Drive Estates, close to the city but wrapped in privacy."
    },
    {
      kicker: "The setting",
      title: "Wake up above the water",
      body: "The pool terrace, summer kitchen and open lounge areas make long Miami afternoons feel effortless."
    },
    {
      kicker: "Inside",
      title: "Light pours through every room",
      body: "Single-story living, soaring ceilings and white stone floors create a calm, gallery-like home."
    },
    {
      kicker: "The heart of the house",
      title: "Open kitchen, open garden",
      body: "A chef-ready kitchen anchors the open plan, with direct flow to the outdoor kitchen and pool deck."
    }
  ];

  const heroCopy = document.querySelector(".rotating-copy");
  const heroKicker = document.querySelector("[data-hero-kicker]");
  const heroTitle = document.querySelector("[data-hero-title]");
  const heroBody = document.querySelector("[data-hero-body]");

  if (heroCopy && heroKicker && heroTitle && heroBody) {
    let lineIndex = 0;

    window.setInterval(function () {
      lineIndex = (lineIndex + 1) % heroLines.length;
      const nextLine = heroLines[lineIndex];

      heroCopy.classList.add("is-changing");

      window.setTimeout(function () {
        heroKicker.textContent = nextLine.kicker;
        heroTitle.textContent = nextLine.title;
        heroBody.textContent = nextLine.body;
        heroCopy.classList.remove("is-changing");
      }, 260);
    }, 3500);
  }

  const revealItems = document.querySelectorAll(
    ".listing-head, .photo-grid, .host, .feature-list > div, .details section, .booking, .review-grid article"
  );

  if ("IntersectionObserver" in window) {
    const observer = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12 }
    );

    revealItems.forEach(function (item) {
      item.classList.add("reveal");
      observer.observe(item);
    });
  } else {
    revealItems.forEach(function (item) {
      item.classList.add("is-visible");
    });
  }

  const reserveButton = document.querySelector(".booking button");
  if (reserveButton) {
    reserveButton.addEventListener("click", function () {
      reserveButton.textContent = "Request received";
      reserveButton.disabled = true;

      window.setTimeout(function () {
        reserveButton.textContent = "Request to reserve";
        reserveButton.disabled = false;
      }, 2200);
    });
  }
})();
