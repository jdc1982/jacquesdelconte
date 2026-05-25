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

/* ── Controls ─────────────────────────────────────────────── */
function buildControls(shell, startMuted) {
  shell.querySelectorAll('.jdc-ctrl').forEach(el => el.remove());
  const ctrl = document.createElement('div');
  ctrl.className = 'jdc-ctrl';
  ctrl.innerHTML = `
    <button class="jdc-btn" data-action="rw">${rw15SVG}</button>
    <button class="jdc-btn jdc-play" data-action="play">${pauseSVG}</button>
    <button class="jdc-btn" data-action="ff">${ff15SVG}</button>
    <button class="jdc-btn" data-action="fs">${fsSVG}</button>
    <button class="jdc-btn jdc-mute" data-action="mute">${startMuted ? muteSVG : unmuteSVG}</button>`;
  shell.appendChild(ctrl);
  let playing = true, muted = !!startMuted;
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
        if (iframe.requestFullscreen) iframe.requestFullscreen();
        else if (iframe.webkitRequestFullscreen) iframe.webkitRequestFullscreen(); break;
      case 'mute':
        muted=!muted; vimeoPost(iframe,'setVolume',muted?0:1);
        btn.innerHTML = muted ? muteSVG : unmuteSVG; break;
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

function creditsHTML(rows) {
  return '<div class="credit-row">' + rows.map((c,i) =>
    `<span class="credit ${i===0?'lead':''}"><span class="role">${c[0]}</span><span class="name">${c[1]}</span></span>`
  ).join('') + '</div>';
}

/* ── Inject / teardown ────────────────────────────────────── */
function injectIframe(shell, muted) {
  if (shell.querySelector('iframe')) return;
  const { provider, id } = shell.dataset;
  if (!id || id==='VIDEO_ID') return;
  const src = provider==='vimeo'
    ? `https://player.vimeo.com/video/${id}?autoplay=1&muted=${muted?1:0}&autopause=0&controls=0&title=0&byline=0&portrait=0&loop=0`
    : `https://www.youtube.com/embed/${id}?autoplay=1&mute=${muted?1:0}&rel=0&controls=0`;
  const iframe = document.createElement('iframe');
  iframe.src = src;
  iframe.allow = 'autoplay; fullscreen; picture-in-picture';
  iframe.allowFullscreen = true;
  shell.innerHTML = '';
  shell.appendChild(iframe);
  shell.style.cursor = 'default';
  buildControls(shell, muted);
}

function teardownShell(shell) {
  const iframe = shell.querySelector('iframe'); if (!iframe) return;
  iframe.src = '';
  const url = shell.dataset.thumbUrl || '';
  const ps  = url ? `style="background-image:url('${url}');background-size:cover;background-position:center"` : '';
  const pc  = url ? 'poster' : 'poster empty';
  shell.innerHTML = `<div class="${pc}" ${ps}></div><div class="play-hint"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg></div>`;
  shell.style.cursor = 'pointer';
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
    shells.forEach((s, i) => { if (i !== idx) teardownShell(s); });
    injectIframe(shells[idx], true);
    updateDots(idx);
    updateArrows(idx);
  }

  // drag-to-scroll
  let isDragging = false, startX = 0, startScroll = 0;
  scroller.addEventListener('mousedown', e => {
    isDragging = true; startX = e.pageX; startScroll = scroller.scrollLeft;
    scroller.style.userSelect = 'none';
  });
  window.addEventListener('mousemove', e => {
    if (!isDragging) return;
    scroller.scrollLeft = startScroll - (e.pageX - startX);
  });
  window.addEventListener('mouseup', () => { isDragging = false; scroller.style.userSelect = ''; });

  scroller.addEventListener('scroll', () => {
    shells.forEach(teardownShell);
    clearTimeout(scrollTimer);
    scrollTimer = setTimeout(() => {
      activeIdx = Math.round(scroller.scrollLeft / slotWidth());
      activateSlot(activeIdx);
    }, 150);
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

  // autoplay when entering viewport
  const viewObs = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) { activateSlot(activeIdx); viewObs.unobserve(entry.target); }
    });
  }, { threshold: 0.5 });
  viewObs.observe(scroller);

  // teardown when leaving viewport
  const leaveObs = new IntersectionObserver(entries => {
    entries.forEach(entry => { if (!entry.isIntersecting) shells.forEach(teardownShell); });
  }, { threshold: 0 });
  leaveObs.observe(scroller);

  // init arrow state
  updateArrows(0);
}

/* ── DESKTOP render ───────────────────────────────────────── */
function renderDesktop(projects, indexLabel) {
  const el = document.getElementById('projects');

  el.innerHTML = projects.map(p => {
    const allFilms = [...(p.heroFilm ? [p.heroFilm] : []), ...p.films];
    const isMulti  = allFilms.length > 1;

    let filmsHTML = '';
    if (isMulti) {
      // horizontal scroller — one slot per film
      const slots = allFilms.map(f =>
        `<div class="hslot">${filmShell(f)}</div>`
      ).join('');
      const dotBtns = allFilms.map((_,i) =>
        `<button class="hscroll-dot${i===0?' active':''}" aria-label="Film ${i+1}"></button>`
      ).join('');
      const arrowSVGL = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"/></svg>`;
      const arrowSVGR = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>`;
      filmsHTML = `
        <div class="hscroll-wrap">
          <div class="hscroll-arrow left hidden">${arrowSVGL}</div>
          <div class="films-hscroll" id="hscroll-${p.id}">${slots}</div>
          <div class="hscroll-arrow right">${arrowSVGR}</div>
          <div class="hscroll-dots">${dotBtns}</div>
        </div>`;
    } else {
      // single film — plain shell, full width
      filmsHTML = `<div class="films single">${filmShell(allFilms[0])}</div>`;
    }

    return `<section class="project" id="${p.id}">
      <div class="wrap">
        <div class="p-head reveal">
          <h2 class="p-title">${p.title}</h2>
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

  // Init horizontal scrollers
  projects.forEach(p => {
    const allFilms = [...(p.heroFilm ? [p.heroFilm] : []), ...p.films];
    if (allFilms.length <= 1) return;
    const scroller = document.getElementById(`hscroll-${p.id}`);
    if (!scroller) return;
    const shells = [...scroller.querySelectorAll('.video-shell')];
    initHScroller(scroller, shells);
  });

  // Single-film desktop autoplay via IntersectionObserver
  el.querySelectorAll('.films.single .video-shell').forEach(shell => {
    const obs = new IntersectionObserver(entries => {
      entries.forEach(e => {
        if (e.isIntersecting && e.intersectionRatio >= 0.5) injectIframe(shell, true);
        else teardownShell(shell);
      });
    }, { threshold: 0.5 });
    obs.observe(shell);
  });

  loadAllThumbnails();

  const revealObs = new IntersectionObserver(entries => {
    entries.forEach(en => { if(en.isIntersecting){ en.target.classList.add('in'); revealObs.unobserve(en.target); }});
  }, {threshold:0.08, rootMargin:'0px 0px -5% 0px'});
  document.querySelectorAll('.reveal').forEach(el => revealObs.observe(el));
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
      <div class="m-slide-info"><div class="m-title">${p.title}</div>${creditsHTML(p.credits)}</div>
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