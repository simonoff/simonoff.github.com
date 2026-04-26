// Vanilla JS — cookie banner + GA gate + smooth scroll. No dependencies.
(function () {
  'use strict';

  function initSmoothScroll() {
    document.addEventListener('click', function (e) {
      var a = e.target.closest && e.target.closest('a[href^="#"]');
      if (!a) return;
      var href = a.getAttribute('href');
      if (href.length < 2) return;
      var t = document.querySelector(href);
      if (!t) return;
      e.preventDefault();
      t.scrollIntoView({ behavior: 'smooth', block: 'start' });
      history.replaceState(null, '', href);
    });
  }

  initSmoothScroll();
})();
