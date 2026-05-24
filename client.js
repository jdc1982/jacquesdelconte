/* ============================================================
   JACQUES DEL CONTE — client page engine
   ============================================================ */

const playSVG = `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>`;
const pauseSVG = `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>`;
const muteSVG = `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M16.5 12A4.5 4.5 0 0014 7.97v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51A8.796 8.796 0 0021 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06A8.99 8.99 0 0017.73 19l1.73 1.73 1.27-1.27L4.27 3zM12 4L9.91 6.09 12 8.18V4z"/></svg>`;
const unmuteSVG = `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3A4.5 4.5 0 0014 7.97v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77 0-4.28-2.99-7.86-7-8.77z"/></svg>`;
const fsSVG = `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z"/></svg>`;
const rw15SVG = `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M11.99 5V1l-5 5 5 5V7c3.31 0 6 2.69 6 6s-2.69 6-6 6-6-2.69-6-6h-2c0 4.42 3.58 8 8 8s8-3.58 8-8-3.58-8-8-8z"/><text x="7.5" y="15.5" font-size="5.5" font-family="sans-serif" font-weight="700" fill="currentColor">15</text></svg>`;
const ff15SVG = `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12.01 5V1l5 5-5 5V7c-3.31 0-6 2.69-6 6s2.69 6 6 6 6-2.69 6-6h2c0 4.42-3.58 8-8 8s-8-3.58-8-8 3.58-8 8-8z"/><text x="7.5" y="15.5" font-size="5.5" font-family="sans-serif" font-weight="700" fill="currentColor">15</text></svg>`;

/* ── Vimeo player API bridge ──────────────────────────────── */
function vimeoPost(iframe, method, value) {
  const msg = JSON.stringify({ method, value });
  iframe.contentWindow.postMessage(msg, '*');
}

/* ── Build a custom control bar ──────────────────────────── */
/*
  Layout: floating pill that appears on hover (desktop) or tap (mobile)
  Centred horizontally, sits ~18px from bottom of the container.
  Buttons: ⏪15  ▶/⏸  ⏩15  ⛶  🔇/🔊
  On mobile: mute button is always-visible small icon top-right of shell.
*/
function buildControls(shell, isMobileCtx) {
  // remove any existing controls
  shell.querySelectorAll('.jdc-ctrl,.jdc-mute-btn').forEach(el => el.remove());

  const ctrl = document.createElement('div');
  ctrl.className = 'jdc-ctrl';
  ctrl.innerHTML = `
    <button class="jdc-btn" data-action="rw" title="−15s">${rw15SVG}</button>
    <button class="jdc-btn jdc-play" data-action="play" title="Play/Pause">${pauseSVG}</button>
    <button class="jdc-btn" data-action="ff" title="+15s">${ff15SVG}</button>
    <button class="jdc-btn" data-action="fs" title="Fullscreen">${fsSVG}</button>
    <button class="jdc-btn jdc-mute" data-action="mute" title="Mute/Unmute">${unmuteSVG}</button>
  `;

  shell.appendChild(ctrl);

  // track state
  let playing = true;
  let muted = false;

  function getIframe() { return shell.querySelector('iframe'); }

  ctrl.addEventListener('click', e => {
    e.stopPropagation();
    const btn = e.target.closest('[data-action]');
    if (!btn) return;
    const iframe = getIframe();
    if (!iframe) return;

    switch (btn.dataset.action) {
      case 'play':
        if (playing) {
          vimeoPost(iframe, 'pause');
          btn.innerHTML = playSVG;
        } else {
          vimeoPost(iframe, 'play');
          btn.innerHTML = pauseSVG;
        }
        playing = !playing;
        break;
      case 'rw':
        vimeoPost(iframe, 'getCurrentTime');
        shell._pendingSeek = -15;
        break;
      case 'ff':
        vimeoPost(iframe, 'getCurrentTime');
        shell._pendingSeek = 15;
        break;
      case 'fs':
        if (iframe.requestFullscreen) iframe.requestFullscreen();
        else if (iframe.webkitRequestFullscreen) iframe.webkitRequestFullscreen();
        break;
      case 'mute':
        muted = !muted;
        vimeoPost(iframe, 'setVolume', muted ? 0 : 1);
        btn.innerHTML = muted ? muteSVG : unmuteSVG;
        break;
    }
  });

  // listen for getCurrentTime reply to seek
  window.addEventListener('message', e => {
    try {
      const data = typeof e.data === 'string' ? JSON.parse(e.data) : e.data;
      if (data.method === 'getCurrentTime' && shell._pendingSeek !== undefined) {
        const newTime = Math.max(0, (data.value || 0) + shell._pendingSeek);
        vimeoPost(getIframe(), 'setCurrentTime', newTime);
        delete shell._pendingSeek;
      }
    } catch {}
  });
}

/* ── Shell HTML ───────────────────────────────────────────── */
function filmShell(f) {
  const ps = f.poster ? `style="background-image:url('${f.poster}');background-size:cover;background-position:center"` : '';
  const pc = f.poster ? 'poster' : 'poster empty';
  return `<div class="video-shell" data-provider="${f.provider}" data-id="${f.id}" data-label="${f.label||''}">
    <div class="${pc}" ${ps}></div>
    <div class="play-hint"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg></div>
  </div>`;
}

function creditsHTML(rows) {
  return '<div class="credit-row">' + rows.map((c, i) =>
    `<span class="credit ${i===0?'lead':''}"><span class="role">${c[0]}</span><span class="name">${c[1]}</span></span>`
  ).join('') + '</div>';
}

/* ── Video load helpers ───────────────────────────────────── */
function makeIframeSrc(provider, id, autoplay, muted) {
  const mut = muted ? 1 : 0;
  const auto = autoplay ? 1 : 0;
  if (provider === 'vimeo') {
    return `https://player.vimeo.com/video/${id}?autoplay=${auto}&muted=${mut}&autopause=0&controls=0&title=0&byline=0&portrait=0&loop=0`;
  }
  return `https://www.youtube.com/embed/${id}?autoplay=${auto}&mute=${mut}&rel=0&controls=0`;
}

function injectIframe(shell, autoplay, withSound) {
  const { provider, id } = shell.dataset;
  if (!id || id === 'VIDEO_ID') return;
  const muted = !withSound;
  const src = makeIframeSrc(provider, id, autoplay, muted);
  const iframe = document.createElement('iframe');
  iframe.src = src;
  iframe.allow = 'autoplay; fullscreen; picture-in-picture';
  iframe.allowFullscreen = true;
  // clear poster/hint, inject iframe
  shell.innerHTML = '';
  shell.appendChild(iframe);
  shell.style.cursor = 'default';
  buildControls(shell, window.innerWidth <= 768);
}

function teardownShell(shell, film) {
  if (!shell.querySelector('iframe')) return;
  const ps = film && film.poster ? `style="background-image:url('${film.poster}');background-size:cover;background-position:center"` : '';
  const pc = film && film.poster ? 'poster' : 'poster empty';
  shell.innerHTML = `<div class="${pc}" ${ps}></div><div class="play-hint"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg></div>`;
  shell.style.cursor = 'pointer';
}

function teardownAllInSlide(slideEl, project) {
  if (!project) return;
  const allFilms = [...(project.heroFilm ? [project.heroFilm] : []), ...project.films];
  slideEl.querySelectorAll('.video-shell').forEach((s, i) => teardownShell(s, allFilms[i]));
}

/* ── DESKTOP render ───────────────────────────────────────── */
function renderDesktop(projects, indexLabel) {
  const el = document.getElementById('projects');
  el.innerHTML = projects.map(p => {
    let films = '';
    if (p.heroFilm) films += `<div class="films single">${filmShell(p.heroFilm)}</div>`;
    films += `<div class="films ${p.layout}">${p.films.map(filmShell).join('')}</div>`;
    return `<section class="project" id="${p.id}">
      <div class="wrap">
        <div class="p-head reveal">
          <h2 class="p-title">${p.title}</h2>
          <div class="credits">${creditsHTML(p.credits)}</div>
        </div>
        <div class="reveal">${films}</div>
      </div>
    </section>`;
  }).join('');

  document.getElementById('indexList').innerHTML = projects.map(p =>
    `<li><a href="#${p.id}">${p.title.replace(/<[^>]+>/g,'').replace(/[""]/g,'')}</a></li>`
  ).join('');
  if (indexLabel) {
    const lbl = document.querySelector('.index .label');
    if (lbl) lbl.textContent = indexLabel;
  }

  // Desktop: click to load with sound, autoplay on
  el.addEventListener('click', e => {
    const shell = e.target.closest('.video-shell');
    if (!shell || shell.querySelector('iframe')) return;
    injectIframe(shell, true, true);
  });

  const io = new IntersectionObserver(entries => {
    entries.forEach(en => { if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); }});
  }, { threshold: 0.08, rootMargin: '0px 0px -5% 0px' });
  document.querySelectorAll('.reveal').forEach(el => io.observe(el));
}

/* ── MOBILE render ────────────────────────────────────────── */
function renderMobile(projects) {
  const wrap = document.getElementById('mStory');
  const progressEl = document.getElementById('mProgress');
  const hint = document.getElementById('mNavHint');

  progressEl.innerHTML = projects.map((_, i) => `<div class="m-seg" id="seg-${i}"></div>`).join('');

  wrap.innerHTML = projects.map((p, pi) => {
    const allFilms = [...(p.heroFilm ? [p.heroFilm] : []), ...p.films];
    const n = allFilms.length;
    const unitsHTML = allFilms.map((f, fi) =>
      `<div class="m-video-unit" data-pi="${pi}" data-fi="${fi}">${filmShell(f)}</div>`
    ).join('');
    return `<div class="m-slide" data-idx="${pi}">
      <div class="m-slide-info">
        <div class="m-title">${p.title}</div>
        ${creditsHTML(p.credits)}
      </div>
      <div class="m-video-units" id="vunits-${pi}" style="--unit-count:${n}">
        ${unitsHTML}
      </div>
    </div>`;
  }).join('');

  // vertical snap + autoplay with sound
  projects.forEach((p, pi) => {
    const container = document.getElementById(`vunits-${pi}`);
    if (!container) return;
    const allFilms = [...(p.heroFilm ? [p.heroFilm] : []), ...p.films];

    const vertObs = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        const fi = +entry.target.dataset.fi;
        const shell = entry.target.querySelector('.video-shell');
        if (!shell) return;
        if (entry.isIntersecting && entry.intersectionRatio >= 0.5) {
          injectIframe(shell, true, true); // autoplay WITH sound on mobile
        } else {
          teardownShell(shell, allFilms[fi]);
        }
      });
    }, { root: container, threshold: 0.5 });

    container.querySelectorAll('.m-video-unit').forEach(u => vertObs.observe(u));
  });

  // horizontal progress + teardown
  function updateProgress(idx) {
    document.querySelectorAll('.m-seg').forEach((s, i) => {
      s.classList.toggle('done', i < idx);
      s.classList.toggle('active', i === idx);
    });
    if (idx > 0) hint.classList.add('hidden');
  }
  updateProgress(0);

  const enterObs = new IntersectionObserver(entries => {
    entries.forEach(e => { if (e.isIntersecting) updateProgress(+e.target.dataset.idx); });
  }, { root: wrap, threshold: 0.5 });

  const leaveObs = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (!e.isIntersecting) teardownAllInSlide(e.target, projects[+e.target.dataset.idx]);
    });
  }, { root: wrap, threshold: 0 });

  wrap.querySelectorAll('.m-slide').forEach(s => { enterObs.observe(s); leaveObs.observe(s); });
  setTimeout(() => hint.classList.add('hidden'), 4000);
}

/* ── INIT ─────────────────────────────────────────────────── */
function initClientPage(projects, indexLabel) {
  document.getElementById('year').textContent = new Date().getFullYear();
  renderDesktop(projects, indexLabel);
  if (window.innerWidth <= 768) renderMobile(projects);
  let lastMobile = window.innerWidth <= 768;
  window.addEventListener('resize', () => {
    const now = window.innerWidth <= 768;
    if (now !== lastMobile) { lastMobile = now; if (now) renderMobile(projects); }
  });
}