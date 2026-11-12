/* Hurrem Technologies — "Hurrem Spark"
   Tap the logo -> 60-second quiz -> shareable score card -> spin the wheel for a
   discount on Hurrem service fees. Vanilla JS, no dependencies.

   TO CHANGE THE PRIZES: edit PRIZES below. `chance` values must add up to 100.
   The same odds are printed under the wheel, so keep them truthful.            */
(function () {
  'use strict';

  var PRIZES = [
    { off: 10,  chance: 50 },
    { off: 15,  chance: 30 },
    { off: 25,  chance: 15 },
    { off: 50,  chance: 4 },
    { off: 100, chance: 1 }
  ];
  var WHEEL = [10, 15, 10, 25, 10, 15, 50, 100];      // slices, clockwise from the top
  var VALID_DAYS = 14;
  var APPLIES_TO = 'your first month of Hurrem Technologies service fees';
  var EXCLUDES = 'third-party costs such as domains, email accounts or AI subscriptions';

  var ENDPOINT = 'https://formspree.io/f/xwpbepoa';
  var TEAM_EMAIL = 'info@hurremtechnologies.com';
  var SHARE_URL = 'https://www.hurremtechnologies.com/#spark';
  var STORE_KEY = 'hurrem-spark-v1';
  var LOGO_PATH = 'M509.3 94.2 L331.6 273.2 L432.1 373.4 L470.3 333.7 L411.0 274.0 L510.0 174.4 L824.3 490.5 L725.2 590.1 L638.5 502.8 L702.9 436.5 L562.7 296.4 L298.5 562.3 L437.7 703.6 L502.7 639.5 L589.5 726.8 L490.4 826.4 L176.2 510.2 L275.2 410.6 L334.6 470.3 L374.0 431.8 L274.5 330.7 L96.6 508.5 L491.2 906.5 L668.9 727.5 L500.7 558.3 L434.8 623.7 L377.7 566.5 L566.9 376.1 L623.8 433.5 L557.8 500.9 L726.2 670.3 L903.9 492.5Z';
  var AUTOMATABLE = 0.5;   // rough share of repetitive task time assumed automatable

  var INDUSTRIES = ['Education', 'Healthcare', 'Real Estate', 'Mining & Natural Resources', 'Construction & Home Services', 'Professional Services', 'Other'];
  var SIZES = ['Just me', '2 to 10', '11 to 50', '51 to 200', 'More than 200'];
  var TASKS = ['Lead follow-up', 'Scheduling', 'Data entry', 'Reporting', 'Email & inbox', 'Customer questions', 'Reviews & reputation', 'Invoicing & admin'];

  var doc = document;
  var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var state = { answers: null, result: null };
  var saved = null;
  try { saved = JSON.parse(localStorage.getItem(STORE_KEY) || 'null'); } catch (e) {}

  function el(tag, cls, text) { var n = doc.createElement(tag); if (cls) n.className = cls; if (text != null) n.textContent = text; return n; }
  function firstName(n) { return String(n || '').trim().split(/\s+/)[0] || 'Your'; }
  function fmtDate(ms) { return new Date(ms).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }); }
  function rand() {
    try { var a = new Uint32Array(1); crypto.getRandomValues(a); return a[0] / 4294967296; } catch (e) { return Math.random(); }
  }

  /* ---------------- Modal shell ---------------- */
  var overlay = el('div', 'spark');
  overlay.hidden = true;
  overlay.innerHTML =
    '<div class="spark__dialog" role="dialog" aria-modal="true" aria-labelledby="sparkTitle">' +
      '<button type="button" class="spark__close" aria-label="Close">' +
        '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" aria-hidden="true"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>' +
      '</button>' +
      '<div class="spark__steps" aria-hidden="true"><span></span><span></span><span></span></div>' +
      '<div class="spark__body"></div>' +
    '</div>';
  doc.body.appendChild(overlay);
  var dialog = overlay.querySelector('.spark__dialog');
  var body = overlay.querySelector('.spark__body');
  var stepDots = overlay.querySelectorAll('.spark__steps span');
  var lastFocus = null;

  function setStep(n) { [].forEach.call(stepDots, function (d, i) { d.classList.toggle('is-on', i <= n); }); }
  function open() {
    if (!overlay.hidden) return;
    lastFocus = doc.activeElement;
    overlay.hidden = false;
    doc.documentElement.classList.add('spark-open');
    if (saved && saved.code) { state.answers = saved.answers; state.result = saved; showPrize(true); }
    else if (state.answers) showCard();
    else showQuiz();
  }
  function close() {
    overlay.hidden = true;
    doc.documentElement.classList.remove('spark-open');
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  }
  overlay.addEventListener('click', function (e) { if (e.target === overlay) close(); });
  overlay.querySelector('.spark__close').addEventListener('click', close);
  doc.addEventListener('keydown', function (e) {
    if (overlay.hidden) return;
    if (e.key === 'Escape') { close(); return; }
    if (e.key === 'Tab') {                         // keep focus inside the dialog
      var f = dialog.querySelectorAll('button, a[href], input, select, textarea');
      f = [].filter.call(f, function (n) { return !n.disabled && n.offsetParent !== null; });
      if (!f.length) return;
      if (e.shiftKey && doc.activeElement === f[0]) { e.preventDefault(); f[f.length - 1].focus(); }
      else if (!e.shiftKey && doc.activeElement === f[f.length - 1]) { e.preventDefault(); f[0].focus(); }
    }
  });
  function render(nodes, focusSel) {
    body.innerHTML = '';
    nodes.forEach(function (n) { body.appendChild(n); });
    dialog.scrollTop = 0;
    var f = focusSel && body.querySelector(focusSel);
    if (f && window.innerWidth > 700) f.focus(); else dialog.querySelector('.spark__close').focus();
  }

  /* ---------------- Step 1: quiz ---------------- */
  function chipGroup(name, options, multi) {
    var wrap = el('div', 'spark__chips');
    wrap.setAttribute('role', 'group');
    options.forEach(function (label) {
      var b = el('button', 'spark__chip', label);
      b.type = 'button';
      b.setAttribute('aria-pressed', 'false');
      b.addEventListener('click', function () {
        if (!multi) [].forEach.call(wrap.children, function (c) { c.setAttribute('aria-pressed', 'false'); });
        b.setAttribute('aria-pressed', multi && b.getAttribute('aria-pressed') === 'true' ? 'false' : 'true');
      });
      wrap.appendChild(b);
    });
    wrap.value = function () {
      var v = [].filter.call(wrap.children, function (c) { return c.getAttribute('aria-pressed') === 'true'; }).map(function (c) { return c.textContent; });
      return multi ? v : (v[0] || '');
    };
    return wrap;
  }
  function field(labelText, control) {
    var f = el('div', 'spark__field');
    f.appendChild(el('p', 'spark__label', labelText));
    f.appendChild(control);
    return f;
  }

  function showQuiz() {
    setStep(0);
    var head = el('div');
    head.appendChild(el('p', 'spark__eyebrow', 'Hurrem Spark'));
    var h = el('h2', 'spark__title', 'How many hours could you win back?'); h.id = 'sparkTitle';
    head.appendChild(h);
    head.appendChild(el('p', 'spark__lede', 'Answer five quick questions, get your score card, then spin the wheel for up to 100% off your first month.'));

    var form = el('form', 'spark__form'); form.noValidate = true;
    var name = el('input', 'spark__input'); name.type = 'text'; name.autocomplete = 'name'; name.placeholder = 'Your name'; name.setAttribute('aria-label', 'Your name');
    var email = el('input', 'spark__input'); email.type = 'email'; email.autocomplete = 'email'; email.placeholder = 'name@company.com'; email.setAttribute('aria-label', 'Work email');
    var industry = chipGroup('industry', INDUSTRIES, false);
    var size = chipGroup('size', SIZES, false);
    var tasks = chipGroup('tasks', TASKS, true);
    var hoursWrap = el('div', 'spark__range');
    var hours = el('input'); hours.type = 'range'; hours.min = '2'; hours.max = '80'; hours.step = '1'; hours.value = '15'; hours.setAttribute('aria-label', 'Hours a week spent on these tasks');
    var out = el('output', 'spark__range-out', '15 hours a week');
    hours.addEventListener('input', function () { out.textContent = hours.value + (hours.value === '80' ? '+' : '') + ' hours a week'; });
    hoursWrap.appendChild(hours); hoursWrap.appendChild(out);
    var gotcha = el('input', 'assistant__sr'); gotcha.type = 'text'; gotcha.tabIndex = -1; gotcha.autocomplete = 'off'; gotcha.setAttribute('aria-hidden', 'true');
    var error = el('p', 'spark__error'); error.setAttribute('role', 'alert');
    var go = el('button', 'btn btn-primary spark__go', 'See my score →'); go.type = 'submit';

    var row = el('div', 'spark__row');
    row.appendChild(field('Your name', name)); row.appendChild(field('Work email', email));
    form.appendChild(row);
    form.appendChild(field('Your industry', industry));
    form.appendChild(field('Team size', size));
    form.appendChild(field('Which tasks eat your week? Pick any', tasks));
    form.appendChild(field('Hours your team spends on them each week', hoursWrap));
    form.appendChild(gotcha); form.appendChild(error); form.appendChild(go);
    form.appendChild(el('p', 'spark__fine', 'We use your answers to prepare your score and to contact you about it. See our Privacy Policy.'));

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var a = { name: name.value.trim(), email: email.value.trim(), industry: industry.value(), size: size.value(), tasks: tasks.value(), hours: Number(hours.value), bot: !!gotcha.value };
      var missing = !a.name ? 'your name' : !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(a.email) ? 'a valid email address' : !a.industry ? 'your industry' : !a.size ? 'your team size' : !a.tasks.length ? 'at least one task' : '';
      if (missing) { error.textContent = 'Please add ' + missing + '.'; return; }
      a.saved = Math.max(1, Math.round(a.hours * AUTOMATABLE));
      state.answers = a;
      showCard();
    });
    render([head, form], '.spark__input');
  }

  /* ---------------- Step 2: score card ---------------- */
  function drawCard(a) {
    var c = doc.createElement('canvas'); c.width = 1200; c.height = 630;
    var g = c.getContext('2d');
    g.fillStyle = '#EEF4F2'; g.fillRect(0, 0, 1200, 630);
    [[980, 140, 520, 'rgba(92,255,180,0.55)'], [1080, 520, 420, 'rgba(31,209,138,0.35)'], [140, 600, 380, 'rgba(92,255,180,0.3)']].forEach(function (b) {
      var r = g.createRadialGradient(b[0], b[1], 0, b[0], b[1], b[2]);
      r.addColorStop(0, b[3]); r.addColorStop(1, 'rgba(238,244,242,0)');
      g.fillStyle = r; g.fillRect(0, 0, 1200, 630);
    });
    // logo mark
    try {
      var p = new Path2D(LOGO_PATH);
      g.save(); g.translate(820, 150); g.scale(0.34, 0.34);
      var lg = g.createLinearGradient(100, 500, 900, 500);
      lg.addColorStop(0, '#5CFFB4'); lg.addColorStop(0.5, '#1FD18A'); lg.addColorStop(1, '#0B6B4A');
      g.shadowColor = 'rgba(11,107,74,0.35)'; g.shadowBlur = 60; g.shadowOffsetY = 30;
      g.fillStyle = lg; g.fill(p); g.restore();
    } catch (e) {}
    var font = '"Google Sans", Roboto, Arial, sans-serif';
    g.fillStyle = 'rgba(5,7,13,0.65)'; g.font = '500 22px ' + font;
    g.fillText('H U R R E M   T E C H N O L O G I E S', 72, 92);
    g.fillStyle = '#05070D'; g.font = '500 40px ' + font;
    g.fillText(firstName(a.name) + '’s team could win back', 72, 220);
    g.fillStyle = '#0B6B4A'; g.font = '500 150px ' + font;
    var big = '~' + a.saved; g.fillText(big, 64, 370);
    var w = g.measureText(big).width;
    g.fillStyle = '#05070D'; g.font = '500 46px ' + font;
    g.fillText('hours a week', 64 + w + 22, 370);
    g.fillStyle = 'rgba(5,7,13,0.65)'; g.font = '400 26px ' + font;
    g.fillText('Automate first: ' + a.tasks.slice(0, 3).join('  ·  '), 72, 452);
    g.fillStyle = 'rgba(5,7,13,0.55)'; g.font = '400 22px ' + font;
    g.fillText('An estimate from the Hurrem Spark quiz. Take yours at hurremtechnologies.com', 72, 560);
    return c;
  }

  function showCard() {
    setStep(1);
    var a = state.answers;
    var head = el('div');
    head.appendChild(el('p', 'spark__eyebrow', 'Your score'));
    var h = el('h2', 'spark__title'); h.id = 'sparkTitle';
    h.appendChild(doc.createTextNode(firstName(a.name) + ', your team could win back about '));
    h.appendChild(el('span', 'spark__accent', a.saved + ' hours a week'));
    h.appendChild(doc.createTextNode('.'));
    head.appendChild(h);
    head.appendChild(el('p', 'spark__lede', 'A rough estimate: it assumes about half of the ' + a.hours + ' hours you spend on these tasks can be automated. We will confirm the real figure on a call.'));

    var canvas = drawCard(a);
    canvas.className = 'spark__card';
    canvas.setAttribute('role', 'img');
    canvas.setAttribute('aria-label', 'Score card: ' + firstName(a.name) + '’s team could win back about ' + a.saved + ' hours a week. Automate first: ' + a.tasks.slice(0, 3).join(', ') + '.');
    var redraw = function () { var c2 = drawCard(a); canvas.getContext('2d').drawImage(c2, 0, 0); };
    if (doc.fonts && doc.fonts.ready) doc.fonts.ready.then(redraw);

    var text = 'My team could win back about ' + a.saved + ' hours a week with automation. Find out yours:';
    var share = el('div', 'spark__share');
    var mk = function (label, href) { var l = el('a', 'spark__sharebtn', label); l.href = href; l.target = '_blank'; l.rel = 'noopener'; return l; };
    share.appendChild(mk('LinkedIn', 'https://www.linkedin.com/sharing/share-offsite/?url=' + encodeURIComponent(SHARE_URL)));
    share.appendChild(mk('WhatsApp', 'https://wa.me/?text=' + encodeURIComponent(text + ' ' + SHARE_URL)));
    share.appendChild(mk('X', 'https://twitter.com/intent/tweet?text=' + encodeURIComponent(text) + '&url=' + encodeURIComponent(SHARE_URL)));
    var dl = el('button', 'spark__sharebtn', 'Download image'); dl.type = 'button';
    dl.addEventListener('click', function () {
      var l = doc.createElement('a'); l.download = 'hurrem-spark-score.png'; l.href = canvas.toDataURL('image/png'); l.click();
    });
    share.appendChild(dl);
    var copy = el('button', 'spark__sharebtn', 'Copy link'); copy.type = 'button';
    copy.addEventListener('click', function () {
      var done = function () { copy.textContent = 'Copied'; setTimeout(function () { copy.textContent = 'Copy link'; }, 1800); };
      if (navigator.clipboard) navigator.clipboard.writeText(SHARE_URL).then(done, function () {});
    });
    share.appendChild(copy);

    var go = el('button', 'btn btn-primary spark__go', 'Spin the wheel →'); go.type = 'button';
    go.addEventListener('click', showWheel);
    render([head, canvas, el('p', 'spark__label', 'Share your score'), share, go], '.spark__go');
  }

  /* ---------------- Step 3: wheel ---------------- */
  function wheelSvg() {
    var NS = 'http://www.w3.org/2000/svg';
    var svg = doc.createElementNS(NS, 'svg');
    svg.setAttribute('viewBox', '-105 -105 210 210'); svg.setAttribute('class', 'spark__wheel-svg'); svg.setAttribute('aria-hidden', 'true');
    var n = WHEEL.length, step = 360 / n;
    var fills = { 10: '#F7FAF9', 15: '#D3F5E4', 25: '#5CFFB4', 50: '#1FD18A', 100: '#0B6B4A' };
    WHEEL.forEach(function (off, i) {
      var a0 = (i * step - 90) * Math.PI / 180, a1 = ((i + 1) * step - 90) * Math.PI / 180;
      var p = doc.createElementNS(NS, 'path');
      p.setAttribute('d', 'M0 0 L' + (100 * Math.cos(a0)).toFixed(2) + ' ' + (100 * Math.sin(a0)).toFixed(2) + ' A100 100 0 0 1 ' + (100 * Math.cos(a1)).toFixed(2) + ' ' + (100 * Math.sin(a1)).toFixed(2) + ' Z');
      p.setAttribute('fill', fills[off]); p.setAttribute('stroke', 'rgba(5,7,13,0.25)'); p.setAttribute('stroke-width', '0.6');
      svg.appendChild(p);
      var mid = i * step + step / 2;
      var t = doc.createElementNS(NS, 'text');
      t.setAttribute('transform', 'rotate(' + mid + ') translate(0 -66)');
      t.setAttribute('text-anchor', 'middle'); t.setAttribute('dominant-baseline', 'middle');
      t.setAttribute('font-size', off === 100 ? '15' : '14'); t.setAttribute('font-weight', '500');
      t.setAttribute('fill', off === 100 ? '#FFFFFF' : '#05070D');
      t.textContent = off + '%';
      svg.appendChild(t);
    });
    var hub = doc.createElementNS(NS, 'circle'); hub.setAttribute('r', '13'); hub.setAttribute('fill', '#05070D'); svg.appendChild(hub);
    var ring = doc.createElementNS(NS, 'circle'); ring.setAttribute('r', '100'); ring.setAttribute('fill', 'none'); ring.setAttribute('stroke', '#05070D'); ring.setAttribute('stroke-width', '1.5'); svg.appendChild(ring);
    return svg;
  }

  function pickPrize() {
    var r = rand() * 100, acc = 0;
    for (var i = 0; i < PRIZES.length; i++) { acc += PRIZES[i].chance; if (r < acc) return PRIZES[i].off; }
    return PRIZES[0].off;
  }

  function showWheel() {
    setStep(2);
    var head = el('div');
    head.appendChild(el('p', 'spark__eyebrow', 'Spin to win'));
    var h = el('h2', 'spark__title', 'One spin. Up to 100% off your first month.'); h.id = 'sparkTitle';
    head.appendChild(h);

    var stage = el('div', 'spark__stage');
    stage.appendChild(el('span', 'spark__pointer'));
    var wheel = el('div', 'spark__wheel'); wheel.appendChild(wheelSvg()); stage.appendChild(wheel);

    var odds = el('p', 'spark__fine', 'Chances per spin: ' + PRIZES.map(function (p) { return p.off + '% off, ' + p.chance + ' in 100'; }).join(' · ') + '.');
    var terms = el('p', 'spark__fine', 'The discount applies to ' + APPLIES_TO + ' only. It does not cover ' + EXCLUDES + '. One spin per business. Valid for ' + VALID_DAYS + ' days.');
    var go = el('button', 'btn btn-primary spark__go', 'Spin'); go.type = 'button';

    go.addEventListener('click', function () {
      go.disabled = true;
      var off = pickPrize();
      var slots = []; WHEEL.forEach(function (v, i) { if (v === off) slots.push(i); });
      var idx = slots[Math.floor(rand() * slots.length)];
      var step = 360 / WHEEL.length;
      var jitter = (rand() - 0.5) * (step * 0.6);
      var turn = 360 * 6 + (360 - (idx * step + step / 2)) + jitter;
      var code = 'HT' + off + '-' + Math.floor(rand() * 0xFFFFFF).toString(36).toUpperCase().padStart(5, '0').slice(0, 5);
      var result = { off: off, code: code, expires: Date.now() + VALID_DAYS * 86400000, answers: state.answers };
      var done = function () { state.result = result; saved = result; try { localStorage.setItem(STORE_KEY, JSON.stringify(result)); } catch (e) {} showPrize(false); };
      if (reduceMotion) { wheel.style.transform = 'rotate(' + (turn % 360) + 'deg)'; setTimeout(done, 400); return; }
      wheel.style.transition = 'transform 5.2s cubic-bezier(0.12, 0.72, 0.08, 1)';
      wheel.style.transform = 'rotate(' + turn + 'deg)';
      setTimeout(done, 5700);
    });
    render([head, stage, go, odds, terms], '.spark__go');
  }

  /* ---------------- Step 4: prize ---------------- */
  function summary(a, r) {
    return 'Name: ' + a.name + '\nEmail: ' + a.email + '\nIndustry: ' + a.industry + '\nTeam size: ' + a.size +
      '\nTasks: ' + a.tasks.join(', ') + '\nHours a week on them: ' + a.hours + '\nEstimated hours saved: ' + a.saved +
      '\nPrize: ' + r.off + '% off first month\nCode: ' + r.code + '\nValid until: ' + fmtDate(r.expires);
  }

  function showPrize(returning) {
    setStep(2);
    var a = state.answers, r = state.result;
    var expired = Date.now() > r.expires;
    var head = el('div');
    head.appendChild(el('p', 'spark__eyebrow', returning ? 'Your prize' : 'You won'));
    var h = el('h2', 'spark__title'); h.id = 'sparkTitle';
    h.appendChild(el('span', 'spark__accent', r.off + '% off'));
    h.appendChild(doc.createTextNode(' your first month.'));
    head.appendChild(h);

    var box = el('div', 'spark__prize');
    box.appendChild(el('p', 'spark__label', 'Your code'));
    box.appendChild(el('p', 'spark__code', r.code));
    box.appendChild(el('p', 'spark__fine', expired ? 'This code expired on ' + fmtDate(r.expires) + '.' : 'Valid until ' + fmtDate(r.expires) + '. Quote it when you book your call.'));
    var status = el('p', 'spark__status'); status.setAttribute('role', 'status');
    var terms = el('p', 'spark__fine', 'Applies to ' + APPLIES_TO + ' only, not to ' + EXCLUDES + '. One per business, not exchangeable for cash, and confirmed by our team against your quiz details when you book.');

    var actions = el('div', 'spark__actions');
    var book = el('a', 'btn btn-primary', 'Book my call →'); book.href = '/contact';
    var wa = el('a', 'btn btn-ghost', 'Claim on WhatsApp'); wa.target = '_blank'; wa.rel = 'noopener';
    wa.href = 'https://wa.me/19177182737?text=' + encodeURIComponent('Hello, I won ' + r.off + '% off on Hurrem Spark. My code is ' + r.code + '.');
    actions.appendChild(book); actions.appendChild(wa);

    render([head, box, status, actions, terms], '.btn');
    if (!returning && !reduceMotion) confetti();

    if (returning || r.sent || a.bot) return;
    status.textContent = 'Registering your prize with our team…';
    fetch(ENDPOINT, {
      method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({
        _subject: 'Hurrem Spark: ' + a.name + ' won ' + r.off + '% off (' + r.code + ')',
        source: 'Hurrem Spark wheel', name: a.name, email: a.email, industry: a.industry, company_size: a.size,
        tasks: a.tasks.join(', '), hours_per_week: a.hours, estimated_hours_saved: a.saved,
        prize: r.off + '% off first month of service fees', code: r.code, valid_until: fmtDate(r.expires),
        message: summary(a, r)
      })
    }).then(function (res) {
      if (!res.ok) throw new Error('send failed');
      r.sent = true; try { localStorage.setItem(STORE_KEY, JSON.stringify(r)); } catch (e) {}
      status.textContent = 'Your prize is registered. We have your details and will be in touch.';
    }).catch(function () {
      status.textContent = 'We could not register your prize automatically. Please send us your code: ';
      var m = el('a', null, 'email it to us'); m.href = 'mailto:' + TEAM_EMAIL + '?subject=' + encodeURIComponent('Hurrem Spark prize ' + r.code) + '&body=' + encodeURIComponent(summary(a, r));
      status.appendChild(m); status.appendChild(doc.createTextNode('.'));
    });
  }

  function confetti() {
    if (!dialog.animate) return;
    var layer = el('div', 'spark__confetti'); dialog.appendChild(layer);
    for (var i = 0; i < 46; i++) {
      var s = el('span', 'mark3d__spark' + (i % 3 === 0 ? ' mark3d__spark--deep' : i % 3 === 1 ? '' : ' mark3d__spark--mid'));
      var size = 10 + Math.random() * 18;
      s.style.width = s.style.height = size + 'px';
      s.style.left = (10 + Math.random() * 80) + '%'; s.style.top = '-5%';
      layer.appendChild(s);
      var dx = (Math.random() - 0.5) * 160, dy = 380 + Math.random() * 380;
      s.animate([
        { transform: 'translate3d(0,0,0) rotate(0deg) scale(0.4)', opacity: 0 },
        { transform: 'translate3d(' + dx * 0.3 + 'px,' + dy * 0.3 + 'px,0) rotate(120deg) scale(1)', opacity: 1, offset: 0.2 },
        { transform: 'translate3d(' + dx + 'px,' + dy + 'px,0) rotate(420deg) scale(0.6)', opacity: 0 }
      ], { duration: 1600 + Math.random() * 1400, delay: Math.random() * 500, easing: 'cubic-bezier(0.22, 0.61, 0.36, 1)', fill: 'both' });
    }
    setTimeout(function () { layer.remove(); }, 3800);
  }

  /* ---------------- Triggers ---------------- */
  [].forEach.call(doc.querySelectorAll('.mark3d'), function (mark) {
    mark.addEventListener('click', function (e) {
      if (e.target && e.target.closest && e.target.closest('.mark3d__body')) setTimeout(open, 320);
    });
    if (mark.classList.contains('mark3d--sm')) return;
    var hint = el('button', 'spark__hint'); hint.type = 'button';
    hint.innerHTML = '<span class="spark__hint-dot" aria-hidden="true"></span>Tap the logo. Spin for up to 100% off.';
    hint.addEventListener('click', open);
    mark.parentNode.appendChild(hint);
  });
  [].forEach.call(doc.querySelectorAll('[data-spark-open]'), function (b) { b.addEventListener('click', function (e) { e.preventDefault(); open(); }); });
  if (location.hash === '#spark') setTimeout(open, 600);
  window.addEventListener('hashchange', function () { if (location.hash === '#spark') open(); });
})();
