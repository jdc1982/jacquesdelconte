/* ============================================================
   JACQUES DEL CONTE — client page engine
   ============================================================ */

const playSVG   = `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>`;
const pauseSVG  = `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>`;
const muteSVG   = `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M16.5 12A4.5 4.5 0 0014 7.97v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51A8.796 8.796 0 0021 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06A8.99 8.99 0 0017.73 19l1.73 1.73 1.27-1.27L4.27 3zM12 4L9.91 6.09 12 8.18V4z"/></svg>`;
const unmuteSVG = `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3A4.5 4.5 0 0014 7.97v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77 0-4.28-2.99-7.86-7-8.77z"/></svg>`;
const fsSVG     = `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z"/></svg>`;
const rw15SVG   = `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M11.99 5V1l-5 5 5 5V7c3.31 0 6 2.69 6 6s-2.69 6-6 6-6-2.69-6-6h-2c0 4.42 3.58 8 8 8s8-3.58 8-8-3.58-8-8-8z"/><text x="7.5" y="15.5" font-size="5.5" font-family="sans-serif" font-weight="700" fill="currentColor">15</text></svg>`;
const ff15SVG   = `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12.01 5V1l5 5-5 5V7c-3.31 0-6 2.69-6 6s2.69 6 6 6 6-2.69 6-6h2c0 4.42-3.58 8-8 8s-8-3.58-8-8 3.58-8 8-8z"/><text x="7.5" y="15.5" font-size="5.5" font-family="sans-serif" font-weight="700" fill="currentColor">15</text></svg>`;

/* ── Thumbnails ───────────────────────────────────────────── */
async function loadAllThumbnails() {
  const shells = document.querySelectorAll('.video-shell');
  await Promise.allSettled([...shells].map(async shell => {
    const { provider, id } = shell.dataset;
    if (!id || id === 'VIDEO_ID') return;
    let url = '';
    if (provider === 'youtube') {
      url = `https://img.youtube.com/vi/${id}/maxresdefault.jpg`;
    } else {
      try {
        const res  = await fetch(`https://vimeo.com/api/v2/video/${id}.json`);
        const data = await res.json();
        url = data[0].thumbnail_large || data[0].thumbnail_medium || '';
      } catch {}
    }
    if (!url) return;
    shell.dataset.thumbUrl = url;
    const p = shell.querySelector('.poster,.poster.empty');
    if (p) {
      p.style.cssText = `background-image:url('${url}');background-size:cover;background-position:center`;
      p.className = 'poster';
    }
  }));
}

/* ── Vimeo bridge ─────────────────────────────────────────── */
function vimeoPost(iframe, method, value) {
  if (!iframe) return;
  iframe.contentWindow.postMessage(JSON.stringify({ method, value }), '*');
}

/* ── Fullscreen ───────────────────────────────────────────── */
const closeSVG = `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>`;

function enterPseudoFs(shell) {
  shell.classList.add('jdc-fs');
  document.body.classList.add('jdc-fs-lock');
  if (!shell.querySelector('.jdc-fs-exit')) {
    const x = document.createElement('button');
    x.className = 'jdc-fs-exit';
    x.innerHTML = closeSVG;
    x.addEventListener('click', ev => { ev.stopPropagation(); exitPseudoFs(shell); });
    shell.appendChild(x);
  }
}
function exitPseudoFs(shell) {
  shell.classList.remove('jdc-fs');
  document.body.classList.remove('jdc-fs-lock');
  const x = shell.querySelector('.jdc-fs-exit');
  if (x) x.remove();
}
function toggleFullscreen(shell) {
  const nativeFsEl = document.fullscreenElement || document.webkitFullscreenElement;
  if (nativeFsEl) { (document.exitFullscreen || document.webkitExitFullscreen).call(document); return; }
  if (shell.classList.contains('jdc-fs')) { exitPseudoFs(shell); return; }

  const iframe = shell.querySelector('iframe');

  // 1) Native element fullscreen — works on desktop, Android, iPadOS.
  const req = shell.requestFullscreen || shell.webkitRequestFullscreen;
  if (req) {
    try {
      const r = req.call(shell);
      if (r && typeof r.catch === 'function') r.catch(() => vimeoOrPseudoFs(shell, iframe));
      return;
    } catch (_) { /* fall through */ }
  }
  // 2) iOS: ask the Vimeo player for true (native video) fullscreen, else pseudo.
  vimeoOrPseudoFs(shell, iframe);
}

function vimeoOrPseudoFs(shell, iframe) {
  if (window.Vimeo && iframe && shell.dataset.provider === 'vimeo') {
    try {
      const p = warmVimeo(shell, iframe) || (shell._vp = new window.Vimeo.Player(iframe));
      // Request fullscreen as soon as the player is ready. If it was warmed up
      // at inject time, ready() resolves immediately and we stay within the tap.
      Promise.resolve(p.ready())
        .then(() => p.requestFullscreen())
        .catch(() => enterPseudoFs(shell));
      return;
    } catch (_) { /* fall through */ }
  }
  enterPseudoFs(shell);
}

/* ── Controls ─────────────────────────────────────────────── */
function buildControls(shell, startMuted) {
  const isMobile = wantMobile();
  // On mobile attach controls to the unit (parent of shell) so they sit below the video
  const ctrlTarget = isMobile && shell.closest('.m-video-unit') ? shell.closest('.m-video-unit') : shell;
  ctrlTarget.querySelectorAll('.jdc-ctrl').forEach(el => el.remove());
  const ctrl = document.createElement('div');
  ctrl.className = 'jdc-ctrl';
  ctrl.innerHTML = `
    <button class="jdc-btn" data-action="rw">${rw15SVG}</button>
    <button class="jdc-btn jdc-play" data-action="play">${pauseSVG}</button>
    <button class="jdc-btn" data-action="ff">${ff15SVG}</button>
    <button class="jdc-btn" data-action="fs">${fsSVG}</button>
    <button class="jdc-btn jdc-mute" data-action="mute">${startMuted ? muteSVG : unmuteSVG}</button>`;
  ctrlTarget.appendChild(ctrl);
  shell._muted = !!startMuted;
  let playing = true;
  ctrl.addEventListener('click', e => {
    e.stopPropagation();
    const btn = e.target.closest('[data-action]'); if (!btn) return;
    const iframe = shell.querySelector('iframe'); if (!iframe) return;
    switch (btn.dataset.action) {
      case 'play':
        playing ? vimeoPost(iframe,'pause') : vimeoPost(iframe,'play');
        playing = !playing; btn.innerHTML = playing ? pauseSVG : playSVG; break;
      case 'rw': shell._seek=-15; vimeoPost(iframe,'getCurrentTime'); break;
      case 'ff': shell._seek= 15; vimeoPost(iframe,'getCurrentTime'); break;
      case 'fs':
        toggleFullscreen(shell);
        break;
      case 'mute':
        setShellAudio(shell, shell._muted);  // currently muted → unmute (and vice-versa)
        break;
    }
  });
  window.addEventListener('message', e => {
    try {
      const d = typeof e.data==='string'?JSON.parse(e.data):e.data;
      if (d.method==='getCurrentTime' && shell._seek!==undefined) {
        vimeoPost(shell.querySelector('iframe'),'setCurrentTime',Math.max(0,(d.value||0)+shell._seek));
        delete shell._seek;
      }
    } catch {}
  });
}

/* ── Shell HTML ───────────────────────────────────────────── */
function filmShell(f) {
  return `<div class="video-shell" data-provider="${f.provider}" data-id="${f.id}" data-label="${f.label||''}">
    <div class="poster empty"></div>
    <div class="play-hint"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg></div>
  </div>`;
}

function featuringHTML(rows) {
  const f = rows.find(c => c[0].toLowerCase() === 'featuring');
  return f ? `<div class="p-featuring">Featuring ${f[1]}</div>` : '';
}
function creditsHTML(rows) {
  // Featuring is rendered separately via featuringHTML — exclude it here
  const filtered = rows.filter(c => c[0].toLowerCase() !== 'featuring');
  return '<div class="credit-row">' + filtered.map((c,i) =>
    `<span class="credit ${i===0?'lead':''}"><span class="role">${c[0]}</span><span class="name">${c[1]}</span></span>`
  ).join('') + '</div>';
}

/* ── Inject / teardown ────────────────────────────────────── */
// ── One video at a time ──────────────────────────────────────
let _activeShell = null;
// Browsers block audio autoplay until the user interacts with the page.
// We start every video muted (reliable autoplay), then unmute the active
// video on desktop as soon as the user has clicked/tapped/typed anywhere.
let _userHasActivated = false;
let _audioUnlockSetup = false;

// ── SPA lifecycle: collect cleanup so we can re-init between projects ──
// Each window/document listener and IntersectionObserver registers an
// undo here; destroyClientPage() runs them all before the next init.
let _pageTeardown = [];
function onTeardown(fn) { _pageTeardown.push(fn); }
function destroyClientPage() {
  _pageTeardown.forEach(fn => { try { fn(); } catch (_) {} });
  _pageTeardown = [];
  if (_activeShell) { try { teardownShell(_activeShell); } catch (_) {} }
  _activeShell = null;
  document.documentElement.classList.remove('want-mobile');
}

// Decide whether a newly-injected video should start muted. If the user has
// already interacted (sticky activation) and we're on desktop, start UNMUTED so
// the video autoplays with sound directly — far more reliable than autoplaying
// muted and trying to lift the muted flag after playback begins.
function shouldStartMuted() {
  return !(_userHasActivated && !wantMobile());
}

// Called from a genuine user gesture (e.g. the SPA tile/pager click). Records
// activation so videos injected afterwards start unmuted, and unmutes whatever
// is currently active. Safe to call repeatedly.
function markUserActivated() {
  _userHasActivated = true;
  if (_activeShell && !wantMobile()) setShellAudio(_activeShell, true);
}

function setupAudioUnlock() {
  if (_audioUnlockSetup) return;
  _audioUnlockSetup = true;
  const opts = { passive: true, capture: true };
  const events = ['pointerdown', 'keydown', 'touchstart'];
  const onAct = () => {
    if (_userHasActivated) return;
    _userHasActivated = true;
    events.forEach(ev => document.removeEventListener(ev, onAct, opts));
    if (_activeShell && !wantMobile()) setShellAudio(_activeShell, true);
  };
  events.forEach(ev => document.addEventListener(ev, onAct, opts));
}

function setShellAudio(shell, on) {
  if (!shell) return;
  shell._muted = !on;
  // Vimeo: the video autoplays with muted=1. The reliable unmute is
  // setMuted(false) THEN setVolume(1) (chained), per the SDK docs. Known SDK
  // bug: setMuted can pause an autoplaying video (esp. Safari), so we call
  // play() right after to keep it running.
  if (shell._vp) {
    shell._vp.setMuted(!on)
      .then(() => shell._vp.setVolume(on ? 1 : 0))
      .then(() => { if (on) return shell._vp.play(); })
      .then(() => { if (window._jdcAudioDebug) console.log('[audio] set', on?'UNMUTED':'muted', 'ok'); })
      .catch((e) => { if (window._jdcAudioDebug) console.log('[audio] FAILED', on?'unmute':'mute', e && e.name, e && e.message); });
  } else {
    const iframe = shell.querySelector('iframe');
    if (iframe) {
      vimeoPost(iframe, 'setMuted', !on);
      vimeoPost(iframe, 'setVolume', on ? 1 : 0);
      if (on) vimeoPost(iframe, 'play');
    }
  }
  const btn = shell.querySelector('.jdc-mute');
  if (btn) btn.innerHTML = on ? unmuteSVG : muteSVG;
}

function injectIframe(shell, muted, primary = true) {
  if (!shell) return;
  if (shell.querySelector('iframe')) return;
  const { provider, id } = shell.dataset;
  if (!id || id==='VIDEO_ID') return;

  // "Primary" = the one cross-section single-playback slot. Tearing down the
  // previous primary stops a video when you scroll from one section to another.
  // Carousel neighbours are injected as non-primary (preload) so they don't
  // evict each other — the carousel manages its own teardown.
  if (primary) {
    if (_activeShell && _activeShell !== shell) teardownShell(_activeShell);
    _activeShell = shell;
  }

  // YouTube enforces a stricter autoplay policy than Vimeo and will refuse to
  // autoplay unmuted even with activation, leaving a play button. Keep YT muted
  // at load; only Vimeo honours the unmuted-start path.
  if (provider !== 'vimeo') muted = true;

  const src = provider==='vimeo'
    ? `https://player.vimeo.com/video/${id}?autoplay=1&muted=${muted?1:0}&autopause=0&controls=0&title=0&byline=0&portrait=0&loop=1&playsinline=1&transparent=0&quality=auto`
    : `https://www.youtube.com/embed/${id}?autoplay=1&mute=${muted?1:0}&loop=1&controls=0&playlist=${id}&rel=0&playsinline=1&enablejsapi=1`;
  const iframe = document.createElement('iframe');
  iframe.src = src;
  iframe.allow = 'autoplay; fullscreen; picture-in-picture';
  iframe.allowFullscreen = true;
  shell.innerHTML = '';
  shell.appendChild(iframe);
  shell.style.cursor = 'default';
  buildControls(shell, muted);
  // Reveal the iframe only once it's actually playing (see warmVimeo). Safety
  // net: reveal anyway after 2.5s so a missed event never leaves it hidden.
  clearTimeout(shell._revealTimer);
  shell._revealTimer = setTimeout(() => shell.classList.add('is-playing'), 2500);
  // Warm up the Vimeo player now so its ready-handshake is done before the
  // user taps fullscreen (otherwise the first tap rejects → fills window only).
  if (provider === 'vimeo') warmVimeo(shell, iframe);
  else iframe.addEventListener('load', () => shell.classList.add('is-playing'), { once: true });
}

// Create/cache the Vimeo player and kick off its ready handshake.
function warmVimeo(shell, iframe) {
  if (shell._vp) return shell._vp;
  const make = () => {
    if (!window.Vimeo || shell._vp) return;
    try {
      shell._vp = new window.Vimeo.Player(iframe);
      shell._vp.ready().catch(()=>{});
      // Reveal once real frames are rendering (cleaner than showing the
      // player immediately and watching it flash a still then go black).
      const reveal = () => {
        shell.classList.add('is-playing');
        clearTimeout(shell._revealTimer);
        // Auto-unmute the active video ONCE on desktop after activation.
        // timeupdate fires continuously, so without this guard every tick would
        // re-unmute and the user could never manually re-mute.
        if (!shell._autoUnmuted && shell === _activeShell && !wantMobile() && _userHasActivated) {
          shell._autoUnmuted = true;
          setShellAudio(shell, true);
        }
      };
      shell._vp.on('timeupdate', reveal);
      shell._vp.on('playing', reveal);
    } catch (_) {}
  };
  if (window.Vimeo) make();
  else {
    const sdk = document.getElementById('vimeo-sdk');
    if (sdk) sdk.addEventListener('load', make, { once: true });
  }
  return shell._vp;
}

function teardownShell(shell) {
  const iframe = shell.querySelector('iframe'); if (!iframe) return;
  clearTimeout(shell._revealTimer);
  shell.classList.remove('is-playing');
  shell._autoUnmuted = false;
  if (shell._vp) { try { shell._vp.pause && shell._vp.pause(); shell._vp.unload && shell._vp.unload(); } catch (_) {} shell._vp = null; }
  iframe.src = '';
  const url = shell.dataset.thumbUrl || '';
  const ps  = url ? `style="background-image:url('${url}');background-size:cover;background-position:center"` : '';
  const pc  = url ? 'poster' : 'poster empty';
  shell.innerHTML = `<div class="${pc}" ${ps}></div><div class="play-hint"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg></div>`;
  shell.style.cursor = 'pointer';
  if (_activeShell === shell) _activeShell = null;
}

function teardownAllInSlide(slideEl) {
  slideEl.querySelectorAll('.video-shell').forEach(teardownShell);
}

/* ── Desktop horizontal scroller for multi-film projects ─── */
function initHScroller(scroller, shells) {
  const wrap     = scroller.closest('.hscroll-wrap');
  const dots     = wrap ? wrap.querySelector('.hscroll-dots') : null;
  const arrowL   = wrap ? wrap.querySelector('.hscroll-arrow.left')  : null;
  const arrowR   = wrap ? wrap.querySelector('.hscroll-arrow.right') : null;
  const slotWidth = () => scroller.clientWidth;
  let activeIdx  = 0;
  let scrollTimer = null;
  const total    = shells.length;

  function updateArrows(idx) {
    if (arrowL) arrowL.classList.toggle('hidden', idx === 0);
    if (arrowR) arrowR.classList.toggle('hidden', idx >= total - 1);
  }

  function updateDots(idx) {
    if (!dots) return;
    dots.querySelectorAll('.hscroll-dot').forEach((d,i) => d.classList.toggle('active', i===idx));
  }

  function goTo(idx) {
    scroller.scrollTo({ left: idx * slotWidth(), behavior: 'smooth' });
  }

  function activateSlot(idx) {
    const keep = new Set([idx-1, idx, idx+1].filter(i => i >= 0 && i < total));
    // Unload only slots that are no longer adjacent.
    shells.forEach((s, i) => { if (!keep.has(i)) teardownShell(s); });
    // Inject active + neighbours (all non-primary so they don't evict each other).
    keep.forEach(i => injectIframe(shells[i], true, false));
    _activeShell = shells[idx];           // mark active for cross-section logic
    // Active plays from the start; neighbours sit pre-buffered and paused.
    keep.forEach(i => {
      const s = shells[i];
      const apply = () => { try {
        if (i === idx) {
          s._vp.setCurrentTime(0).catch(()=>{});
          s._vp.play().catch(()=>{});
          if (!shouldStartMuted()) setShellAudio(s, true);  // desktop + activated → sound
        } else { s._vp.pause().catch(()=>{}); }
      } catch(_){} };
      if (s._vp) s._vp.ready().then(apply).catch(()=>{});
      else setTimeout(() => { if (s._vp) s._vp.ready().then(apply).catch(()=>{}); }, 400);
    });
    updateDots(idx);
    updateArrows(idx);
  }

  // drag-to-scroll
  let isDragging = false, startX = 0, startScroll = 0;
  scroller.addEventListener('mousedown', e => {
    isDragging = true; startX = e.pageX; startScroll = scroller.scrollLeft;
    scroller.style.userSelect = 'none';
  });
  const onMove = e => {
    if (!isDragging) return;
    scroller.scrollLeft = startScroll - (e.pageX - startX);
  };
  const onUp = () => { isDragging = false; scroller.style.userSelect = ''; };
  window.addEventListener('mousemove', onMove);
  window.addEventListener('mouseup', onUp);
  onTeardown(() => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); });

  scroller.addEventListener('scroll', () => {
    // Don't tear down on every tick — neighbours are pre-buffered, so just
    // settle on the new index and let activateSlot manage what stays loaded.
    clearTimeout(scrollTimer);
    scrollTimer = setTimeout(() => {
      activeIdx = Math.round(scroller.scrollLeft / slotWidth());
      activateSlot(activeIdx);
    }, 120);
  }, { passive: true });

  // arrow clicks
  if (arrowL) arrowL.addEventListener('click', () => goTo(Math.max(0, activeIdx - 1)));
  if (arrowR) arrowR.addEventListener('click', () => goTo(Math.min(total - 1, activeIdx + 1)));

  // dot clicks
  if (dots) {
    dots.querySelectorAll('.hscroll-dot').forEach((dot, i) => {
      dot.addEventListener('click', () => goTo(i));
    });
  }

  // autoplay when entering viewport (re-activates the current slot on re-entry)
  const viewObs = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) activateSlot(activeIdx);
    });
  }, { threshold: 0.5 });
  viewObs.observe(scroller);
  onTeardown(() => viewObs.disconnect());

  // teardown when leaving viewport
  const leaveObs = new IntersectionObserver(entries => {
    entries.forEach(entry => { if (!entry.isIntersecting) shells.forEach(teardownShell); });
  }, { threshold: 0 });
  leaveObs.observe(scroller);
  onTeardown(() => leaveObs.disconnect());

  // init arrow state
  updateArrows(0);
}

/* ── DESKTOP render ───────────────────────────────────────── */
function renderDesktop(projects, indexLabel) {
  const el = document.getElementById('projects');

  el.innerHTML = projects.map(p => {
    const arrowSVGL = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"/></svg>`;
    const arrowSVGR = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>`;

    function hscrollerHTML(films, id) {
      const slots = films.map(f => `<div class="hslot">${filmShell(f)}</div>`).join('');
      const dots  = films.map((_,i) => `<button class="hscroll-dot${i===0?' active':''}" aria-label="Film ${i+1}"></button>`).join('');
      return `<div class="hscroll-wrap">
        <div class="hscroll-arrow left hidden">${arrowSVGL}</div>
        <div class="films-hscroll" id="hscroll-${id}">${slots}</div>
        <div class="hscroll-arrow right">${arrowSVGR}</div>
        <div class="hscroll-dots">${dots}</div>
      </div>`;
    }

    let filmsHTML = '';

    if (p.heroFilm && p.films.length > 0) {
      // Hero film standalone full-width, sub-films in scroller below
      filmsHTML  = `<div class="films single">${filmShell(p.heroFilm)}</div>`;
      filmsHTML += `<div style="margin-top:clamp(140px,20vh,240px)">` + hscrollerHTML(p.films, p.id) + `</div>`;
    } else if (p.heroFilm) {
      // Hero only, no sub-films
      filmsHTML = `<div class="films single">${filmShell(p.heroFilm)}</div>`;
    } else if (p.films.length > 1) {
      // Multiple films, no hero — horizontal scroller
      filmsHTML = hscrollerHTML(p.films, p.id);
    } else {
      // Single film
      filmsHTML = `<div class="films single">${filmShell(p.films[0])}</div>`;
    }

    return `<section class="project" id="${p.id}">
      <div class="wrap">
        <div class="p-head reveal">
          <h2 class="p-title">${p.title}</h2>
          ${featuringHTML(p.credits)}
          <div class="credits">${creditsHTML(p.credits)}</div>
        </div>
        <div class="reveal">${filmsHTML}</div>
      </div>
    </section>`;
  }).join('');

  document.getElementById('indexList').innerHTML = projects.map(p =>
    `<li><a href="#${p.id}">${p.title.replace(/<[^>]+>/g,'').replace(/[""]/g,'')}</a></li>`
  ).join('');
  if (indexLabel) { const l=document.querySelector('.index .label'); if(l) l.textContent=indexLabel; }

  // Init horizontal scrollers (sub-films only, not heroFilm)
  projects.forEach(p => {
    const scroller = document.getElementById(`hscroll-${p.id}`);
    if (!scroller) return;
    const shells = [...scroller.querySelectorAll('.video-shell')];
    if (shells.length < 1) return;
    initHScroller(scroller, shells);
  });

  // Desktop: scroll-based single-video autoplay.
  // Carousel (.films-hscroll) shells are managed by initHScroller — exclude them
  // here so the two systems don't tear down / inject the same nodes against each other.
  const allShells = [...el.querySelectorAll('.video-shell')].filter(s => !s.closest('.films-hscroll'));

  let _obsTimer = null;
  // Single/hero videos play one-at-a-time (injecting a new primary tears down
  // the previous). So we must NOT preload the next one early via rootMargin —
  // that would evict the video you're still watching. Instead: no lookahead
  // margin, a modest gate so it loads as it becomes the dominant video in view,
  // and teardown the instant a video leaves the real viewport (stops audio).
  const singleObs = new IntersectionObserver(entries => {
    let best = null, bestRatio = 0;
    entries.forEach(e => {
      if (e.isIntersecting && e.intersectionRatio > bestRatio) {
        bestRatio = e.intersectionRatio; best = e.target;
      }
      if (!e.isIntersecting) teardownShell(e.target);
    });
    if (best && bestRatio >= 0.5) {
      clearTimeout(_obsTimer);
      _obsTimer = setTimeout(() => {
        if (!best.querySelector('iframe')) injectIframe(best, shouldStartMuted());
      }, 80);
    }
  }, { threshold: [0, 0.25, 0.5, 0.75, 1.0] });

  allShells.forEach(s => singleObs.observe(s));
  onTeardown(() => singleObs.disconnect());

  loadAllThumbnails();

  const revealObs = new IntersectionObserver(entries => {
    entries.forEach(en => { if(en.isIntersecting){ en.target.classList.add('in'); revealObs.unobserve(en.target); }});
  }, {threshold:0.08, rootMargin:'0px 0px -5% 0px'});
  document.querySelectorAll('.reveal').forEach(el => revealObs.observe(el));
  onTeardown(() => revealObs.disconnect());
}

/* ── MOBILE render ────────────────────────────────────────── */
function renderMobile(projects) {
  const wrap       = document.getElementById('mStory');
  const progressEl = document.getElementById('mProgress');
  const hint       = document.getElementById('mNavHint');

  progressEl.innerHTML = projects.map((_,i) => `<div class="m-seg" id="seg-${i}"></div>`).join('');

  wrap.innerHTML = projects.map((p, pi) => {
    const allFilms = [...(p.heroFilm?[p.heroFilm]:[]),...p.films];
    const n = allFilms.length;
    const units = allFilms.map((f,fi) =>
      `<div class="m-video-unit" data-pi="${pi}" data-fi="${fi}">${filmShell(f)}</div>`
    ).join('');
    return `<div class="m-slide" data-idx="${pi}">
      <div class="m-slide-info"><div class="m-title">${p.title}</div>${featuringHTML(p.credits).replace('p-featuring','m-featuring')}${creditsHTML(p.credits)}</div>
      <div class="m-video-units" id="vunits-${pi}" style="--unit-count:${n}">${units}</div>
    </div>`;
  }).join('');

  loadAllThumbnails();

  function getActiveUnit(container) {
    const units  = [...container.querySelectorAll('.m-video-unit')];
    const scroll = container.scrollTop;
    const height = container.clientHeight;
    return units.find(u => {
      const top = u.offsetTop, bot = top + u.offsetHeight;
      return top <= scroll + height*0.6 && bot >= scroll + height*0.4;
    }) || units[0];
  }

  function activateUnit(container, unit) {
    if (!unit) return;
    container.querySelectorAll('.video-shell').forEach(s => {
      if (s !== unit.querySelector('.video-shell')) teardownShell(s);
    });
    const shell = unit.querySelector('.video-shell');
    if (shell) injectIframe(shell, true);
  }

  projects.forEach((_, pi) => {
    const container = document.getElementById(`vunits-${pi}`);
    if (!container) return;
    let vTimer = null;
    container.addEventListener('scroll', () => {
      container.querySelectorAll('.video-shell').forEach(teardownShell);
      clearTimeout(vTimer);
      vTimer = setTimeout(() => activateUnit(container, getActiveUnit(container)), 120);
    }, { passive: true });
  });

  let activeIdx = 0;
  let hTimer = null;

  function updateProgress(idx) {
    document.querySelectorAll('.m-seg').forEach((s,i) => {
      s.classList.toggle('done', i<idx); s.classList.toggle('active', i===idx);
    });
    if (idx > 0) hint.classList.add('hidden');
  }

  function activateSlide(idx) {
    wrap.querySelectorAll('.m-slide').forEach((slide, i) => {
      if (i !== idx) teardownAllInSlide(slide);
    });
    const container = document.getElementById(`vunits-${idx}`);
    if (!container) return;
    activateUnit(container, container.querySelector('.m-video-unit'));
    updateProgress(idx);
  }

  wrap.addEventListener('scroll', () => {
    const newIdx = Math.round(wrap.scrollLeft / window.innerWidth);
    wrap.querySelectorAll('.m-slide').forEach((slide, i) => {
      if (i !== newIdx) teardownAllInSlide(slide);
    });
    clearTimeout(hTimer);
    hTimer = setTimeout(() => {
      const settled = Math.round(wrap.scrollLeft / window.innerWidth);
      if (settled !== activeIdx) { activeIdx = settled; activateSlide(activeIdx); }
    }, 120);
  }, { passive: true });

  updateProgress(0);
  setTimeout(() => activateSlide(0), 300);
  setTimeout(() => hint.classList.add('hidden'), 4000);
}

/* ── INIT ─────────────────────────────────────────────────── */
// A phone in landscape is wider than 768px but very short — treat that as mobile too.
function wantMobile() {
  return window.matchMedia('(max-width:768px)').matches ||
         window.matchMedia('(orientation:landscape) and (max-height:540px)').matches;
}

// Load the Vimeo Player SDK so we can request TRUE native fullscreen on iOS,
// where the browser can't fullscreen a cross-origin iframe directly.
function loadVimeoSDK() {
  if (window.Vimeo || document.getElementById('vimeo-sdk')) return;
  const s = document.createElement('script');
  s.id = 'vimeo-sdk';
  s.src = 'https://player.vimeo.com/api/player.js';
  s.async = true;
  document.head.appendChild(s);
}

function initClientPage(projects, indexLabel) {
  document.getElementById('year').textContent = new Date().getFullYear();
  loadVimeoSDK();
  setupAudioUnlock();
  renderDesktop(projects, indexLabel);
  let mobileBuilt = false;
  function syncMode() {
    const m = wantMobile();
    document.documentElement.classList.toggle('want-mobile', m);
    if (m && !mobileBuilt) { renderMobile(projects); mobileBuilt = true; }
  }
  syncMode();
  const onOrient = () => setTimeout(syncMode, 100);
  window.addEventListener('resize', syncMode);
  window.addEventListener('orientationchange', onOrient);
  onTeardown(() => {
    window.removeEventListener('resize', syncMode);
    window.removeEventListener('orientationchange', onOrient);
  });
}