/* ============================================================
   MEMORIES JOURNEY — script.js
   ============================================================ */

'use strict';

/* ─── STATE ─────────────────────────────────────────────── */
let currentPage     = 'cover';
let isTransitioning = false;

/* ─── AUDIO STATE ───────────────────────────────────────── */
let audioPlaying    = false;
let waContext       = null;
let waMasterGain    = null;
let waMelodyTimeout = null;
let waMelodyIndex   = 0;

/* ─── YT STATE (bonus kalau ada internet) ───────────────── */
let ytPlayer        = null;
let ytReady         = false;
let useYT           = false; // hanya true kalau YT berhasil load

const PAGE_ORDER = ['cover', 'page1', 'page2', 'page3', 'finalPage'];

const MUSIC_TRACKS = [
  { id: 'BDFjhIm5xHE', title: 'River Flows In You'    },
  { id: 'jfKfPfyJRdk', title: 'Lofi Chill Piano'       },
  { id: 'hHW1oY26kxQ', title: 'Sad & Beautiful Piano' },
];
let currentTrackIndex = 0;

/* ─── INIT ──────────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {
  spawnParticles();
  spawnSplashParticles();
  initStars();
  initFloatingPhotos();
  showPage('cover', false);
});

/* ─── SPLASH SCREEN ─────────────────────────────────────── */
function enterSite() {
  // Klik ini = user gesture → audio langsung boleh jalan
  startAudio();

  const splash = document.getElementById('splashScreen');
  splash.classList.add('hide');
  setTimeout(() => { splash.style.display = 'none'; }, 900);
}

function spawnSplashParticles() {
  const container = document.getElementById('splashParticles');
  if (!container) return;
  const colors = ['rgba(249,197,197,0.7)','rgba(212,175,55,0.35)',
                  'rgba(232,160,160,0.5)','rgba(255,255,255,0.6)'];
  for (let i = 0; i < 20; i++) {
    const p = document.createElement('div');
    p.className = 'splash-particle';
    p.style.cssText = `
      width:${rand(4,10)}px; height:${rand(4,10)}px;
      left:${rand(0,100)}%;
      background:${colors[i % colors.length]};
      animation-duration:${rand(10,20)}s;
      animation-delay:-${rand(0,15)}s;
    `;
    container.appendChild(p);
  }
}

/* ─── YOUTUBE (opsional, kalau ada internet) ─────────────── */
window.onYouTubeIframeAPIReady = function () {
  // Kalau file:// skip saja, langsung Web Audio
  if (window.location.protocol === 'file:') return;

  try {
    ytPlayer = new YT.Player('ytPlayer', {
      height: '1', width: '1',
      videoId: MUSIC_TRACKS[0].id,
      playerVars: {
        autoplay:0, controls:0, disablekb:1,
        fs:0, iv_load_policy:3, modestbranding:1,
        rel:0, loop:1, playlist:MUSIC_TRACKS[0].id, playsinline:1,
      },
      events: {
        onReady(e)       { ytReady = true; useYT = true;
                           e.target.setVolume(65);
                           if (audioPlaying) e.target.playVideo(); },
        onStateChange(e) { if (e.data === 0) ytPlayer.playVideo(); },
        onError()        { useYT = false; if (audioPlaying) startWebAudio(); },
      },
    });
  } catch(err) { /* silently ignore */ }
};

/* ─── AUDIO API ─────────────────────────────────────────── */
function startAudio() {
  if (audioPlaying) return;

  if (useYT && ytReady && ytPlayer) {
    ytPlayer.playVideo();
    audioPlaying = true;
    updateMusicUI(true);
  } else {
    startWebAudio();
  }
}

function stopAudio() {
  if (!audioPlaying) return;
  audioPlaying = false;

  if (useYT && ytReady && ytPlayer) {
    ytPlayer.pauseVideo();
  }
  stopWebAudio();
  updateMusicUI(false);
}

function toggleAudio() {
  if (audioPlaying) stopAudio(); else startAudio();
}

/* ─── WEB AUDIO ENGINE ──────────────────────────────────── */
const WA_SCALE  = [261.63,293.66,329.63,392.00,440.00,
                   523.25,587.33,659.25,783.99,880.00];
const WA_MELODY = [
  [5,.6],[4,.4],[3,.6],[1,.8],
  [5,.5],[6,.5],[5,.8],[3,.5],
  [4,.6],[2,.4],[1,.6],[0,1.0],
  [3,.5],[4,.5],[5,.6],[6,1.0],
  [5,.4],[4,.4],[3,.6],[2,.4],
  [1,.8],[0,.5],[1,.5],[3,1.2],
];

function startWebAudio() {
  try {
    if (!waContext) {
      waContext = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (waContext.state === 'suspended') waContext.resume();

    if (!waMasterGain) {
      waMasterGain = waContext.createGain();
      waMasterGain.gain.value = 0.48;
      waMasterGain.connect(waContext.destination);
    }

    audioPlaying  = true;
    waMelodyIndex = 0;
    updateMusicUI(true);
    updateTrackLabel('Piano Memories ✦');
    clearTimeout(waMelodyTimeout);
    scheduleNote();
  } catch(e) {
    console.warn('WebAudio error:', e);
  }
}

function stopWebAudio() {
  clearTimeout(waMelodyTimeout);
  waMelodyTimeout = null;
}

function scheduleNote() {
  if (!audioPlaying || !waContext) return;
  const [ni, beat] = WA_MELODY[waMelodyIndex % WA_MELODY.length];
  waMelodyIndex++;
  playNote(WA_SCALE[ni], beat * .88, .10);
  if (waMelodyIndex % 4 === 0) playNote(WA_SCALE[Math.max(0,ni-2)] / 2, beat * 1.1, .045);
  waMelodyTimeout = setTimeout(scheduleNote, beat * 440);
}

function playNote(freq, dur, vol) {
  if (!waContext || !waMasterGain) return;
  const t   = waContext.currentTime;
  const osc = waContext.createOscillator();
  const g   = waContext.createGain();
  const f   = waContext.createBiquadFilter();
  const del = waContext.createDelay(.8);
  const dg  = waContext.createGain();

  osc.type = 'triangle';
  osc.frequency.setValueAtTime(freq, t);
  osc.detune.setValueAtTime(rand(-4,4), t);

  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(vol, t + .02);
  g.gain.linearRampToValueAtTime(vol * .5, t + .09);
  g.gain.linearRampToValueAtTime(0, t + dur * .94);

  f.type = 'lowpass';
  f.frequency.value = 2400;

  del.delayTime.value = .26;
  dg.gain.value       = .14;

  osc.connect(g);
  g.connect(f);
  f.connect(waMasterGain);
  f.connect(del);
  del.connect(dg);
  dg.connect(waMasterGain);

  osc.start(t);
  osc.stop(t + dur + .1);
}

/* ─── MUSIC UI ───────────────────────────────────────────── */
function updateMusicUI(playing) {
  const vinyl    = document.getElementById('musicVinyl');
  const status   = document.getElementById('musicStatus');
  const playIcon = document.getElementById('musicPlayIcon');
  if (!vinyl) return;
  if (playing) {
    vinyl.classList.add('spinning');
    if (status)   { status.textContent = '♪ now playing'; status.classList.add('playing'); }
    if (playIcon)   playIcon.textContent = '❚❚';
  } else {
    vinyl.classList.remove('spinning');
    if (status)   { status.textContent = 'click to play ♪'; status.classList.remove('playing'); }
    if (playIcon)   playIcon.textContent = '▶';
  }
}

function updateTrackLabel(title) {
  const lbl = document.getElementById('musicTitleLabel');
  if (lbl) lbl.textContent = title;
}

/* ─── PAGE NAVIGATION ───────────────────────────────────── */
function openAlbum() {
  if (isTransitioning) return;
  isTransitioning = true;
  const wrapper = document.getElementById('bookWrapper');
  wrapper.classList.add('album-opening');
  setTimeout(() => {
    wrapper.classList.remove('album-opening');
    pageTurnThenShow('page1');
  }, 700);
}

function goToPage(targetId, letterMsg) {
  if (isTransitioning) return;
  isTransitioning = true;
  showLetterOverlay(letterMsg, () => pageTurnThenShow(targetId));
}

function replayAlbum() {
  if (isTransitioning) return;
  isTransitioning = true;
  const wrapper = document.getElementById('bookWrapper');
  wrapper.classList.add('album-closing');
  resetFinalPage();
  setTimeout(() => {
    wrapper.classList.remove('album-closing');
    showPage('cover', true);
    isTransitioning = false;
  }, 700);
}

function showPage(id, animate) {
  document.querySelectorAll('.page').forEach(p => {
    p.classList.remove('active','entering','leaving');
  });
  const target = document.getElementById(id);
  if (!target) return;
  target.classList.add('active');
  if (animate) target.classList.add('entering');
  currentPage = id;
  if (id === 'finalPage') {
    setTimeout(startShootingStars, 600);
    setTimeout(activateFloatingPhotos, 800);
  }
}

function pageTurnThenShow(targetId) {
  const effect = document.getElementById('pageTurnEffect');
  effect.classList.add('turning');
  setTimeout(() => {
    showPage(targetId, true);
    effect.classList.remove('turning');
    isTransitioning = false;   // ← RESET di sini, selalu
  }, 700);
}

/* ─── LETTER TRANSITION ─────────────────────────────────── */
function showLetterOverlay(message, callback) {
  const overlay  = document.getElementById('letterOverlay');
  const body     = document.querySelector('#letterEnvelope .envelope-body');
  const text     = document.getElementById('envelopeText');

  body.classList.remove('flap-open','paper-revealed');
  text.textContent = message;
  overlay.classList.add('show');

  // 600ms  → amplop muncul, flap mulai terbuka
  // 1400ms → kertas surat naik & teks muncul
  // 5200ms → mulai fade out (teks bisa dibaca ~3.5 detik)
  // +700ms → overlay hilang, pindah halaman
  setTimeout(() => body.classList.add('flap-open'),      600);
  setTimeout(() => body.classList.add('paper-revealed'), 1400);
  setTimeout(() => {
    overlay.style.transition = 'opacity .7s ease';
    overlay.style.opacity    = '0';
    setTimeout(() => {
      overlay.classList.remove('show');
      overlay.style.opacity = overlay.style.transition = '';
      body.classList.remove('flap-open','paper-revealed');
      if (callback) callback();
    }, 700);
  }, 5200);
}

/* ─── FINAL PAGE ─────────────────────────────────────────── */
function openLetter() {
  const ec  = document.getElementById('envelopeContainer');
  const env = document.getElementById('bigEnvelope');
  const lc  = document.getElementById('letterContent');
  const btn = document.getElementById('openLetterBtn');

  btn.style.pointerEvents = 'none';
  env.classList.add('open');
  spawnLightBurst();

  document.querySelectorAll('.letter-paragraph').forEach(p => {
    p.style.opacity = '0';
    p.style.transform = 'translateY(12px)';
  });

  setTimeout(() => ec.classList.add('hidden'), 700);
  setTimeout(() => {
    lc.classList.add('visible');
    setTimeout(revealLetterParagraphs, 200);
  }, 1000);
}

function revealLetterParagraphs() {
  document.querySelectorAll('.letter-paragraph').forEach((p, i) => {
    p.style.transition = `opacity .65s ${i*.22}s ease, transform .65s ${i*.22}s ease`;
    requestAnimationFrame(() => requestAnimationFrame(() => {
      p.style.opacity = '1';
      p.style.transform = 'translateY(0)';
    }));
  });
}

function spawnLightBurst() {
  const b = document.createElement('div');
  b.className = 'light-burst';
  document.body.appendChild(b);
  requestAnimationFrame(() => b.classList.add('burst'));
  setTimeout(() => b.remove(), 1300);
}

function resetFinalPage() {
  document.getElementById('envelopeContainer').classList.remove('hidden');
  document.getElementById('bigEnvelope').classList.remove('open');
  document.getElementById('letterContent').classList.remove('visible');
  document.getElementById('openLetterBtn').style.pointerEvents = '';
  document.querySelectorAll('.letter-paragraph').forEach(p => {
    p.style.opacity = p.style.transform = p.style.transition = '';
  });
  stopShootingStars();
  deactivateFloatingPhotos();
}

/* ─── PARTICLES ─────────────────────────────────────────── */
function spawnParticles() {
  const c = document.getElementById('particles');
  const colors = ['rgba(249,197,197,.7)','rgba(212,175,55,.4)',
                  'rgba(232,160,160,.6)','rgba(255,255,255,.5)','rgba(245,230,211,.6)'];
  for (let i = 0; i < 28; i++) {
    const p = document.createElement('div');
    p.className = 'particle';
    p.style.cssText = `
      width:${rand(4,10)}px; height:${rand(4,10)}px;
      left:${rand(0,100)}%;
      background:${colors[i%colors.length]};
      animation-duration:${rand(12,24)}s;
      animation-delay:-${rand(0,18)}s;
    `;
    c.appendChild(p);
  }
}

/* ─── STARS ─────────────────────────────────────────────── */
function initStars() {
  const bg = document.getElementById('starsBg');
  if (!bg) return;
  for (let i = 0; i < 180; i++) {
    const s = document.createElement('div');
    s.className = 'star-dot';
    const sz = rand(1,3.5);
    s.style.cssText = `
      width:${sz}px; height:${sz}px;
      top:${rand(0,100)}%; left:${rand(0,100)}%;
      animation-duration:${rand(2,6)}s;
      animation-delay:${rand(0,5)}s;
    `;
    bg.appendChild(s);
  }
}

/* ─── SHOOTING STARS ────────────────────────────────────── */
let shootingStarInterval = null;

function startShootingStars() {
  if (shootingStarInterval) return;
  spawnShootingStar();
  shootingStarInterval = setInterval(() => {
    if (currentPage === 'finalPage') spawnShootingStar();
  }, 2000);
}

function stopShootingStars() {
  clearInterval(shootingStarInterval);
  shootingStarInterval = null;
  document.querySelectorAll('.shooting-star').forEach(s => s.remove());
}

function spawnShootingStar() {
  const c = document.getElementById('shootingStars');
  if (!c) return;
  const s   = document.createElement('div');
  s.className = 'shooting-star';
  const dur = rand(.6, 1.2);
  const hue = rand(40,60);
  s.style.cssText = `
    top:${rand(5,50)}%; left:${rand(30,90)}%;
    height:2px;
    background:hsl(${hue},100%,80%);
    animation-duration:${dur}s;
    box-shadow:0 0 6px 1px hsl(${hue},100%,90%);
  `;
  c.appendChild(s);
  setTimeout(() => s.remove(), dur * 1000 + 200);
}

/* ─── FLOATING PHOTOS ───────────────────────────────────── */
const FLOAT_SRCS = [
  'photos/memory1.jpeg',
  'photos/memory2.jpeg',
  'photos/memory3.jpg',
  'photos/memory1.jpeg',
  'photos/memory2.jpeg',
  'photos/memory3.jpg',
];
const FALLBACK_COLORS = ['#FFE0E0','#FFE8CC','#E8F4FF','#F0E8FF','#FFF0E0','#E8F0FF'];

function initFloatingPhotos() {
  const c = document.getElementById('floatingPhotos');
  if (!c) return;
  FLOAT_SRCS.forEach((src, i) => {
    const item = document.createElement('div');
    item.className = 'floating-photo-item';
    const img = document.createElement('img');
    img.src   = src;
    img.alt   = 'memory';
    img.className = 'floating-photo-img';
    img.onerror = function () {
      this.style.display = 'none';
      this.parentElement.style.background = FALLBACK_COLORS[i % FALLBACK_COLORS.length];
    };
    const rot = rand(-18,18);
    item.style.cssText = `
      --rot:${rot}deg;
      top:${rand(3,88)}%; left:${rand(1,88)}%;
      transform:rotate(${rot}deg);
      animation-duration:${rand(6,12)}s;
      animation-delay:-${rand(0,8)}s;
      opacity:0;
    `;
    item.appendChild(img);
    c.appendChild(item);
  });
}

function activateFloatingPhotos() {
  document.querySelectorAll('.floating-photo-item').forEach((item, i) => {
    setTimeout(() => {
      item.style.transition = 'opacity 1.2s ease';
      item.style.opacity    = String(rand(.30,.65));
    }, i * 220);
  });
}

function deactivateFloatingPhotos() {
  document.querySelectorAll('.floating-photo-item').forEach(item => {
    item.style.transition = 'opacity .5s ease';
    item.style.opacity    = '0';
  });
}

/* ─── POLAROID PARALLAX ─────────────────────────────────── */
document.addEventListener('mousemove', e => {
  if (currentPage !== 'cover') return;
  const dx = (e.clientX - window.innerWidth  / 2) / (window.innerWidth  / 2);
  const dy = (e.clientY - window.innerHeight / 2) / (window.innerHeight / 2);
  const rots = [-8,1,7], xs = [-90,0,90];
  document.querySelectorAll('.polaroid').forEach((p, i) => {
    p.style.transition = 'transform .4s ease';
    p.style.transform  = `rotate(${rots[i]+dx*2}deg) translateX(${xs[i]+dx*5*(i-1)*.5}px) translateY(${dy*3}px)`;
  });
});

/* ─── KEYBOARD ──────────────────────────────────────────── */
document.addEventListener('keydown', e => {
  const idx  = PAGE_ORDER.indexOf(currentPage);
  const msgs = ['',
    'Terima kasih sudah menjadi bagian dari cerita ini.',
    'Ada kenangan yang tidak perlu sempurna untuk menjadi berharga.',
    'Kalau kenangan bisa bicara, mungkin mereka juga ingin dikunjungi lagi.',
  ];
  if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
    e.preventDefault();
    if (currentPage === 'cover') { openAlbum(); return; }
    if (idx > 0 && idx < PAGE_ORDER.length - 1) goToPage(PAGE_ORDER[idx+1], msgs[idx]||'');
  }
  if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
    e.preventDefault();
    if (currentPage === 'finalPage') { replayAlbum(); return; }
    if (idx > 0) pageTurnThenShow(PAGE_ORDER[idx-1]);
  }
  if (e.key === 'm' || e.key === 'M') toggleAudio();
});

/* ─── TOUCH SWIPE ───────────────────────────────────────── */
let tx = 0, ty = 0;
document.addEventListener('touchstart', e => { tx = e.touches[0].clientX; ty = e.touches[0].clientY; }, {passive:true});
document.addEventListener('touchend',   e => {
  const dx = tx - e.changedTouches[0].clientX;
  const dy = ty - e.changedTouches[0].clientY;
  if (Math.abs(dx) < 50 || Math.abs(dx) < Math.abs(dy)) return;
  const idx  = PAGE_ORDER.indexOf(currentPage);
  const msgs = ['',
    'Terima kasih sudah menjadi bagian dari cerita ini.',
    'Ada kenangan yang tidak perlu sempurna untuk menjadi berharga.',
    'Kalau kenangan bisa bicara, mungkin mereka juga ingin dikunjungi lagi.',
  ];
  if (dx > 0) {
    if (currentPage === 'cover') { openAlbum(); return; }
    if (idx > 0 && idx < PAGE_ORDER.length-1) goToPage(PAGE_ORDER[idx+1], msgs[idx]||'');
  } else {
    if (idx > 0 && currentPage !== 'finalPage') pageTurnThenShow(PAGE_ORDER[idx-1]);
  }
}, {passive:true});

/* ─── UTILITY ───────────────────────────────────────────── */
function rand(min, max) { return Math.random() * (max - min) + min; }
