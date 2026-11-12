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

  /* ---- 3D logo: sparks where the cursor (or a finger) touches it ---- */
  var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  [].forEach.call(doc.querySelectorAll('.mark3d'), function (mark) {
    var layer = doc.createElement('div');
    layer.className = 'mark3d__sparks';
    layer.setAttribute('aria-hidden', 'true');
    var glint = doc.createElement('span');
    glint.className = 'mark3d__glint';
    layer.appendChild(glint);
    mark.appendChild(layer);

    var live = 0, last = 0;
    var onLogo = function (e) { return e.target && e.target.closest && !!e.target.closest('.mark3d__body'); };
    var place = function (e) {
      var r = mark.getBoundingClientRect();
      return { x: e.clientX - r.left, y: e.clientY - r.top };
    };
    var spark = function (p, power) {
      if (live > 90 || !layer.animate) return;
      var el = doc.createElement('span');
      var tone = Math.random();
      el.className = 'mark3d__spark' + (tone < 0.35 ? ' mark3d__spark--light' : tone < 0.8 ? ' mark3d__spark--deep' : '');
      var size = 12 + Math.random() * 20;
      var angle = Math.random() * Math.PI * 2;
      var dist = (26 + Math.random() * 58) * power;
      var dx = Math.cos(angle) * dist, dy = Math.sin(angle) * dist - 10;
      var jx = (Math.random() - 0.5) * 16, jy = (Math.random() - 0.5) * 16;
      el.style.width = el.style.height = size + 'px';
      el.style.left = (p.x + jx - size / 2) + 'px';
      el.style.top = (p.y + jy - size / 2) + 'px';
      layer.appendChild(el);
      live++;
      var spin = (Math.random() - 0.5) * 220;
      var anim = el.animate([
        { transform: 'translate3d(0,0,0) scale(0) rotate(0deg)', opacity: 0 },
        { transform: 'translate3d(' + dx * 0.45 + 'px,' + dy * 0.45 + 'px,0) scale(1) rotate(' + spin * 0.5 + 'deg)', opacity: 1, offset: 0.25 },
        { transform: 'translate3d(' + dx * 0.85 + 'px,' + (dy * 0.85 + 6) + 'px,0) scale(0.9) rotate(' + spin * 0.85 + 'deg)', opacity: 1, offset: 0.7 },
        { transform: 'translate3d(' + dx + 'px,' + (dy + 14) + 'px,0) scale(0) rotate(' + spin + 'deg)', opacity: 0 }
      ], { duration: 700 + Math.random() * 600, easing: 'cubic-bezier(0.22, 0.61, 0.36, 1)' });
      anim.onfinish = anim.oncancel = function () { el.remove(); live--; };
    };

    mark.addEventListener('pointermove', function (e) {
      if (!onLogo(e)) { glint.style.opacity = '0'; return; }
      var p = place(e);
      glint.style.opacity = '1';
      glint.style.transform = 'translate3d(' + (p.x - 45) + 'px,' + (p.y - 45) + 'px,0)';
      if (reduceMotion) return;
      var now = Date.now();
      if (now - last < 30) return;
      last = now;
      spark(p, 1); spark(p, 1); spark(p, 1);
    });
    mark.addEventListener('pointerdown', function (e) {
      if (reduceMotion || !onLogo(e)) return;
      var p = place(e);
      for (var i = 0; i < 14; i++) spark(p, 1.7);
    });
    mark.addEventListener('pointerleave', function () { glint.style.opacity = '0'; });
  });

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
