/* Hurrem Technologies — requirements assistant (vanilla JS, no dependencies)
   A guided assistant that asks a visitor about their needs, shows a summary,
   and sends it to the team through the site's Formspree form.            */
(function () {
  'use strict';

  var ENDPOINT = 'https://formspree.io/f/xwpbepoa';   // same form as the contact page
  var TEAM_EMAIL = 'info@hurremtechnologies.com';
  var WHATSAPP = 'https://wa.me/19177182737';
  var STORE_KEY = 'hurrem-assistant-v1';
  var doc = document;
  var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------------- Conversation script ---------------- */
  var SERVICE_DETAIL = {
    'AI Automation': 'Which tasks take up the most time in your business right now? For example lead follow-up, scheduling, data entry or reporting.',
    'Remote Workforce': 'Which roles do you need, and roughly how many people?',
    'Reputation Management': 'Where do your reviews live today (Google, Yelp, Facebook), and what is your main concern?',
    'Not sure yet': 'No problem. Tell me a little about your business and what is slowing you down.'
  };

  var STEPS = [
    { key: 'name', label: 'Name',
      ask: function () { return 'Hello. I can note down what you need and pass it to our team, who reply within 24 hours. To begin, what is your name?'; },
      placeholder: 'Your name', required: true },
    { key: 'service', label: 'Interested in',
      ask: function (a) { return 'Good to meet you, ' + firstName(a.name) + '. What can we help you with?'; },
      chips: ['AI Automation', 'Remote Workforce', 'Reputation Management', 'Not sure yet'],
      placeholder: 'Choose one or type your own', required: true },
    { key: 'industry', label: 'Industry',
      ask: function () { return 'Which industry are you in?'; },
      chips: ['Education', 'Healthcare', 'Real Estate', 'Mining & Natural Resources', 'Construction & Home Services', 'Professional Services', 'Other'],
      placeholder: 'Choose one or type your own', required: true },
    { key: 'details', label: 'What they need',
      ask: function (a) { return SERVICE_DETAIL[a.service] || 'Tell me a little about what you need.'; },
      placeholder: 'Type your answer', required: true, long: true },
    { key: 'tools', label: 'Current tools',
      ask: function () { return 'Which tools do you use today? For example your CRM, email, calendar or spreadsheets.'; },
      chips: ['Skip'], placeholder: 'Type your tools, or skip' },
    { key: 'size', label: 'Company size',
      ask: function () { return 'How large is your team?'; },
      chips: ['Just me', '2 to 10', '11 to 50', '51 to 200', 'More than 200'],
      placeholder: 'Choose one or type your own', required: true },
    { key: 'timeline', label: 'Timeline',
      ask: function () { return 'When would you like to get started?'; },
      chips: ['As soon as possible', 'Within a month', 'In 1 to 3 months', 'Just exploring'],
      placeholder: 'Choose one or type your own', required: true },
    { key: 'email', label: 'Email',
      ask: function () { return 'What is the best email address for our team to reply to?'; },
      placeholder: 'name@company.com', required: true, type: 'email',
      validate: function (v) { return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v) ? '' : 'That does not look like an email address. Could you check it?'; } },
    { key: 'phone', label: 'Phone / WhatsApp',
      ask: function () { return 'Would you like to leave a phone or WhatsApp number as well?'; },
      chips: ['Skip'], placeholder: 'Number, or skip', type: 'tel' },
    { key: 'notes', label: 'Anything else',
      ask: function () { return 'Is there anything else our team should know?'; },
      chips: ['No, that is everything'], placeholder: 'Type a note, or finish', long: true }
  ];

  function firstName(n) { return String(n || '').trim().split(/\s+/)[0] || 'there'; }
  function isSkip(v) { return /^(skip|no, that is everything)$/i.test(v); }

  /* ---------------- State (kept for the browser session) ---------------- */
  var state = { step: 0, answers: {}, log: [], phase: 'asking', open: false };
  function save() { try { sessionStorage.setItem(STORE_KEY, JSON.stringify(state)); } catch (e) {} }
  function load() {
    try {
      var s = JSON.parse(sessionStorage.getItem(STORE_KEY) || 'null');
      if (s && typeof s.step === 'number' && s.answers && Array.isArray(s.log)) state = s;
    } catch (e) {}
  }
  function clearStore() { try { sessionStorage.removeItem(STORE_KEY); } catch (e) {} }

  /* ---------------- Markup ---------------- */
  var SPARK = '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M12 0C12.6 7.5 16.5 11.4 24 12C16.5 12.6 12.6 16.5 12 24C11.4 16.5 7.5 12.6 0 12C7.5 11.4 11.4 7.5 12 0Z"/></svg>';
  var root = doc.createElement('div');
  root.className = 'assistant';
  root.innerHTML =
    '<button type="button" class="assistant__launcher" aria-expanded="false" aria-controls="assistantPanel">' +
      '<span class="assistant__launcher-icon">' + SPARK + '</span>' +
      '<span class="assistant__launcher-text">Tell us what you need</span>' +
    '</button>' +
    '<section class="assistant__panel" id="assistantPanel" role="dialog" aria-label="Hurrem assistant" hidden>' +
      '<header class="assistant__head">' +
        '<div><p class="assistant__title">Hurrem Assistant</p><p class="assistant__sub">Guided questions &middot; sent to our team</p></div>' +
        '<button type="button" class="assistant__close" aria-label="Close assistant">' +
          '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" aria-hidden="true"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>' +
        '</button>' +
      '</header>' +
      '<div class="assistant__progress" aria-hidden="true"><span></span></div>' +
      '<div class="assistant__log" role="log" aria-live="polite" tabindex="0"></div>' +
      '<div class="assistant__chips"></div>' +
      '<form class="assistant__form" novalidate>' +
        '<label class="assistant__sr" for="assistantInput">Your answer</label>' +
        '<textarea id="assistantInput" class="assistant__input" rows="1" autocomplete="off"></textarea>' +
        '<input type="text" name="_gotcha" class="assistant__sr" tabindex="-1" autocomplete="off" aria-hidden="true">' +
        '<button type="submit" class="assistant__send" aria-label="Send answer">&rarr;</button>' +
      '</form>' +
    '</section>';
  doc.body.appendChild(root);

  var launcher = root.querySelector('.assistant__launcher');
  var panel = root.querySelector('.assistant__panel');
  var closeBtn = root.querySelector('.assistant__close');
  var logEl = root.querySelector('.assistant__log');
  var chipsEl = root.querySelector('.assistant__chips');
  var form = root.querySelector('.assistant__form');
  var input = root.querySelector('.assistant__input');
  var gotcha = root.querySelector('input[name="_gotcha"]');
  var bar = root.querySelector('.assistant__progress span');

  /* ---------------- Rendering ---------------- */
  function bubble(who, text, record) {
    var el = doc.createElement('div');
    el.className = 'assistant__msg assistant__msg--' + who;
    el.textContent = text;
    logEl.appendChild(el);
    logEl.scrollTop = logEl.scrollHeight;
    if (record !== false) { state.log.push([who, text]); save(); }
    return el;
  }

  var pending = null;
  function botSay(text, then) {
    if (reduceMotion) { bubble('bot', text); if (then) then(); return; }
    var typing = doc.createElement('div');
    typing.className = 'assistant__msg assistant__msg--bot assistant__typing';
    typing.innerHTML = '<span></span><span></span><span></span>';
    logEl.appendChild(typing);
    logEl.scrollTop = logEl.scrollHeight;
    pending = setTimeout(function () {
      pending = null;
      typing.remove();
      bubble('bot', text);
      if (then) then();
    }, 550);
  }

  function setChips(list, handler) {
    chipsEl.innerHTML = '';
    (list || []).forEach(function (label) {
      var b = doc.createElement('button');
      b.type = 'button';
      b.className = 'assistant__chip';
      b.textContent = label;
      b.addEventListener('click', function () { handler(label); });
      chipsEl.appendChild(b);
    });
  }

  function setInput(step) {
    form.hidden = !step;
    if (!step) return;
    input.value = '';
    input.placeholder = step.placeholder || 'Type your answer';
    input.setAttribute('inputmode', step.type === 'email' ? 'email' : step.type === 'tel' ? 'tel' : 'text');
    input.style.height = '';
  }

  function progress() {
    var done = state.phase === 'asking' ? state.step : STEPS.length;
    bar.style.transform = 'scaleX(' + (done / STEPS.length) + ')';
  }

  /* ---------------- Flow ---------------- */
  function askCurrent(silent) {
    var step = STEPS[state.step];
    progress();
    var ready = function () {
      setChips(step.chips, answer);
      setInput(step);
      if (state.open && window.innerWidth > 700) input.focus();
    };
    if (silent) ready(); else { setChips([]); botSay(step.ask(state.answers), ready); }
  }

  function answer(raw) {
    if (pending || state.phase !== 'asking') return;
    var step = STEPS[state.step];
    var value = String(raw || '').trim().slice(0, 1500);
    if (!value) {
      if (step.required) { input.focus(); return; }
      value = 'Skip';
    }
    bubble('user', value);
    if (isSkip(value)) {
      if (step.required) { botSay('I do need this one to pass your request on. ' + step.ask(state.answers)); return; }
      delete state.answers[step.key];
    } else {
      var problem = step.validate ? step.validate(value) : '';
      if (problem) { input.value = ''; botSay(problem); return; }
      state.answers[step.key] = value;
    }
    state.step += 1;
    save();
    if (state.step < STEPS.length) askCurrent(); else showSummary();
  }

  function summaryLines() {
    return STEPS.filter(function (s) { return state.answers[s.key]; })
      .map(function (s) { return [s.label, state.answers[s.key]]; });
  }

  function showSummary(silent) {
    state.phase = 'review'; save(); progress();
    setInput(null);
    var render = function () {
      var card = doc.createElement('div');
      card.className = 'assistant__summary';
      var dl = doc.createElement('dl');
      summaryLines().forEach(function (pair) {
        var dt = doc.createElement('dt'); dt.textContent = pair[0];
        var dd = doc.createElement('dd'); dd.textContent = pair[1];
        dl.appendChild(dt); dl.appendChild(dd);
      });
      card.appendChild(dl);
      var note = doc.createElement('p');
      note.className = 'assistant__note';
      note.appendChild(doc.createTextNode('By sending, you agree to our '));
      var pp = doc.createElement('a'); pp.href = '/privacy-policy'; pp.textContent = 'Privacy Policy';
      note.appendChild(pp); note.appendChild(doc.createTextNode('.'));
      card.appendChild(note);
      logEl.appendChild(card);
      logEl.scrollTop = logEl.scrollHeight;
      setChips(['Send to the team', 'Start over'], function (label) {
        if (label === 'Start over') restart(); else send();
      });
    };
    if (silent) render();
    else { setChips([]); botSay('Thank you, ' + firstName(state.answers.name) + '. Here is what I will send to our team. Shall I send it?', render); }
  }

  function mailtoHref() {
    var body = summaryLines().map(function (p) { return p[0] + ': ' + p[1]; }).join('\n');
    return 'mailto:' + TEAM_EMAIL + '?subject=' + encodeURIComponent('Website enquiry from ' + (state.answers.name || 'a visitor')) +
      '&body=' + encodeURIComponent(body);
  }

  function send() {
    if (state.phase !== 'review') return;
    if (gotcha.value) { finish(); return; }           // spam trap
    state.phase = 'sending';
    setChips([]);
    var note = bubble('bot', 'Sending…', false);
    var a = state.answers;
    var payload = {
      _subject: 'Website assistant enquiry: ' + (a.name || 'visitor') + (a.service ? ' (' + a.service + ')' : ''),
      source: 'Website assistant',
      page: location.pathname,
      name: a.name || '', email: a.email || '', phone: a.phone || '',
      interested_in: a.service || '', industry: a.industry || '',
      requirements: a.details || '', current_tools: a.tools || '',
      company_size: a.size || '', timeline: a.timeline || '', notes: a.notes || '',
      message: summaryLines().map(function (p) { return p[0] + ': ' + p[1]; }).join('\n')
    };
    fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(payload)
    }).then(function (res) {
      note.remove();
      if (res.ok) finish(); else fail();
    }).catch(function () { note.remove(); fail(); });
  }

  function finish() {
    state.phase = 'done'; save(); progress();
    bubble('bot', 'Sent. Our team will reply to ' + (state.answers.email || 'you') + ' within 24 hours. Thank you, ' + firstName(state.answers.name) + '.');
    setChips(['Start a new request'], restart);
  }

  function fail() {
    state.phase = 'review'; save();
    var el = bubble('bot', 'I could not send that just now. You can try again, or reach us directly: ', false);
    var mail = doc.createElement('a'); mail.href = mailtoHref(); mail.textContent = 'email us';
    var wa = doc.createElement('a'); wa.href = WHATSAPP; wa.target = '_blank'; wa.rel = 'noopener'; wa.textContent = 'WhatsApp';
    el.appendChild(mail); el.appendChild(doc.createTextNode(' or ')); el.appendChild(wa); el.appendChild(doc.createTextNode('.'));
    setChips(['Try again', 'Start over'], function (label) { if (label === 'Start over') restart(); else send(); });
  }

  function restart() {
    if (pending) { clearTimeout(pending); pending = null; }
    state = { step: 0, answers: {}, log: [], phase: 'asking', open: true };
    clearStore();
    logEl.innerHTML = '';
    askCurrent();
  }

  /* ---------------- Open / close ---------------- */
  var started = false;
  function start() {
    if (started) return;
    started = true;
    if (state.log.length) {                     // restore an earlier conversation
      state.log.forEach(function (m) { bubble(m[0], m[1], false); });
      if (state.phase === 'asking') askCurrent(true);
      else if (state.phase === 'done') { progress(); setInput(null); setChips(['Start a new request'], restart); }
      else { state.phase = 'review'; showSummary(true); }
    } else askCurrent();
  }

  function setOpen(open) {
    state.open = open; save();
    panel.hidden = !open;
    root.classList.toggle('is-open', open);
    launcher.setAttribute('aria-expanded', String(open));
    if (open) { start(); logEl.scrollTop = logEl.scrollHeight; if (!form.hidden && window.innerWidth > 700) input.focus(); }
    else launcher.focus();
  }

  launcher.addEventListener('click', function () { setOpen(panel.hidden); });
  closeBtn.addEventListener('click', function () { setOpen(false); });
  doc.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !panel.hidden) setOpen(false); });

  form.addEventListener('submit', function (e) { e.preventDefault(); answer(input.value); });
  input.addEventListener('keydown', function (e) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); answer(input.value); }
  });
  input.addEventListener('input', function () {
    input.style.height = 'auto';
    input.style.height = Math.min(input.scrollHeight, 120) + 'px';
  });

  load();
  if (state.open) { state.open = false; setOpenQuiet(); }
  function setOpenQuiet() {                     // reopen after a page change without stealing focus
    state.open = true; panel.hidden = false; root.classList.add('is-open');
    launcher.setAttribute('aria-expanded', 'true'); start();
  }
})();
