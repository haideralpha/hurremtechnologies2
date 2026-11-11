/* Hurrem Technologies — shared behaviour for every page (vanilla JS) */
(function () {
  'use strict';
  var doc = document;

  /* ---- Header: soft backdrop once the page has scrolled ---- */
  var header = doc.getElementById('site-header');
  if (header) {
    var onScroll = function () { header.classList.toggle('scrolled', window.scrollY > 20); };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }

  /* ---- Mobile menu ---- */
  var menuBtn = doc.getElementById('menuBtn');
  var mobileMenu = doc.getElementById('mobileMenu');
  if (menuBtn && mobileMenu) {
    var setMenu = function (open) {
      mobileMenu.classList.toggle('open', open);
      menuBtn.classList.toggle('open', open);
      header.classList.toggle('menu-open', open);
      menuBtn.setAttribute('aria-expanded', String(open));
    };
    menuBtn.addEventListener('click', function () { setMenu(!mobileMenu.classList.contains('open')); });
    [].forEach.call(mobileMenu.querySelectorAll('a'), function (a) {
      a.addEventListener('click', function () { setMenu(false); });
    });
    doc.addEventListener('keydown', function (e) { if (e.key === 'Escape') setMenu(false); });
  }

  /* ---- Fade-up reveal on scroll ---- */
  var targets = doc.querySelectorAll('.reveal,.reveal-left,.reveal-right,.reveal-scale,.stagger');
  if ('IntersectionObserver' in window) {
    var revealObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('visible');
        revealObserver.unobserve(entry.target);
      });
    }, { threshold: 0.08, rootMargin: '0px 0px -40px 0px' });
    [].forEach.call(targets, function (el) { revealObserver.observe(el); });

    /* pause aurora and logo animation while off screen */
    var motionObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        var state = entry.isIntersecting ? 'running' : 'paused';
        var nodes = entry.target.matches('.mark3d')
          ? [entry.target].concat([].slice.call(entry.target.querySelectorAll('.mark3d__body, .mark3d__shadow')))
          : entry.target.querySelectorAll('.ribbon');
        [].forEach.call(nodes, function (el) { el.style.animationPlayState = state; });
      });
    }, { threshold: 0 });
    [].forEach.call(doc.querySelectorAll('.aurora, .mark3d'), function (el) { motionObserver.observe(el); });
  } else {
    [].forEach.call(targets, function (el) { el.classList.add('visible'); });
  }

  /* ---- FAQ accordion ---- */
  var faqItems = [].slice.call(doc.querySelectorAll('.faq-item'));
  if (faqItems.length) {
    var closeAll = function () {
      faqItems.forEach(function (item) {
        item.classList.remove('open');
        item.querySelector('.faq-a').style.maxHeight = '0px';
        item.querySelector('.faq-q').setAttribute('aria-expanded', 'false');
      });
    };
    faqItems.forEach(function (item) {
      var btn = item.querySelector('.faq-q');
      var answer = item.querySelector('.faq-a');
      btn.addEventListener('click', function () {
        var wasOpen = item.classList.contains('open');
        closeAll();
        if (!wasOpen) {
          item.classList.add('open');
          answer.style.maxHeight = answer.scrollHeight + 'px';
          btn.setAttribute('aria-expanded', 'true');
        }
      });
    });
    var sizeOpen = function () {
      faqItems.forEach(function (item) {
        if (item.classList.contains('open')) {
          var answer = item.querySelector('.faq-a');
          answer.style.maxHeight = answer.scrollHeight + 'px';
        }
      });
    };
    window.addEventListener('load', sizeOpen);
    window.addEventListener('resize', sizeOpen);
  }

  /* ---- Selects: show the placeholder option in the quiet style ---- */
  [].forEach.call(doc.querySelectorAll('select.field'), function (sel) {
    var sync = function () { sel.classList.toggle('is-empty', sel.value === ''); };
    sel.addEventListener('change', sync);
    sync();
  });

  /* ---- Contact form (Formspree, same endpoint as before) ---- */
  var form = doc.getElementById('contactForm');
  if (form) {
    var submitBtn = doc.getElementById('submitBtn');
    var successMsg = doc.getElementById('successMsg');
    var idleLabel = submitBtn.innerHTML;
    var errorMsg = doc.createElement('p');
    errorMsg.className = 'form-error';
    errorMsg.setAttribute('role', 'alert');
    form.appendChild(errorMsg);

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      submitBtn.disabled = true;
      submitBtn.textContent = 'Sending…';
      errorMsg.classList.remove('show');
      var fail = function () {
        submitBtn.disabled = false;
        submitBtn.innerHTML = idleLabel;
        errorMsg.textContent = 'There was an error. Please try again or contact us via WhatsApp.';
        errorMsg.classList.add('show');
      };
      fetch(form.action, { method: 'POST', body: new FormData(form), headers: { Accept: 'application/json' } })
        .then(function (response) {
          if (!response.ok) { fail(); return; }
          form.style.display = 'none';
          successMsg.classList.add('show');
        })
        .catch(fail);
    });
  }
})();
