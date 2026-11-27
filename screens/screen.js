import { db, ref, onValue } from './firebase.js';

const root = document.querySelector('#screen');
const backgrounds = {
  'Midnight blue': '#18345a',
  'Soft sky': '#6f91ad',
  'Warm light': '#a77a62',
  'Fresh green': '#47766b',
  Violet: '#67577d',
};

let screenData = { slides: [], playing: true, notification: { enabled: false, text: '' } };
let currentSlide = 0;
let playlistSignature = '';
let advanceTimer = null;
let renderVersion = 0;
let youtubePlayer = null;
let youtubeApiPromise = null;

function text(value, maxLength = 500) {
  return String(value ?? '').slice(0, maxLength);
}

function validHttpsUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' ? url.href : '';
  } catch {
    return '';
  }
}

function setBackground(slide) {
  root.style.backgroundColor = backgrounds[slide?.background] || backgrounds['Midnight blue'];
  const imageUrl = validHttpsUrl(slide?.backgroundUrl);
  root.style.backgroundImage = imageUrl ? `url("${imageUrl}")` : 'none';
}

function makeCopy(slide) {
  const copy = document.createElement('div');
  copy.className = 'screen-copy';

  const eyebrow = document.createElement('div');
  eyebrow.className = 'eyebrow';
  eyebrow.textContent = text(slide.eyebrow || 'Innovate', 35);

  const heading = document.createElement('h1');
  heading.textContent = text(slide.title, 75);

  const description = document.createElement('p');
  description.textContent = text(slide.description, 260);

  copy.append(eyebrow, heading, description);
  return copy;
}

function getYouTubeId(slide) {
  if (slide.videoId) return text(slide.videoId, 20);
  try {
    const url = new URL(slide.youtubeUrl);
    if (url.hostname === 'youtu.be') return url.pathname.slice(1).split('/')[0];
    if (url.hostname.endsWith('youtube.com')) {
      return url.searchParams.get('v') || url.pathname.split('/').filter(Boolean).pop() || '';
    }
  } catch {
    // Invalid or missing URL; render a helpful message in the media area.
  }
  return '';
}

function loadYouTubeApi() {
  if (window.YT?.Player) return Promise.resolve(window.YT);
  if (youtubeApiPromise) return youtubeApiPromise;

  youtubeApiPromise = new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      youtubeApiPromise = null;
      reject(new Error('YouTube player API timed out'));
    }, 15000);
    const previousReady = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      if (typeof previousReady === 'function') previousReady();
      clearTimeout(timeout);
      resolve(window.YT);
    };
    let script = document.querySelector('script[src="https://www.youtube.com/iframe_api"]');
    if (!script) {
      script = document.createElement('script');
      script.src = 'https://www.youtube.com/iframe_api';
      script.onerror = () => {
        clearTimeout(timeout);
        youtubeApiPromise = null;
        reject(new Error('Unable to load YouTube player API'));
      };
      document.head.append(script);
    }
  });
  return youtubeApiPromise;
}

function playYouTubeUntilEnd(stage, slide, videoId, version) {
  const shell = document.createElement('div');
  shell.className = 'yt';
  const mount = document.createElement('div');
  mount.className = 'yt-mount';
  shell.append(mount);
  stage.append(shell);

  scheduleAdvance(slide);

  loadYouTubeApi().then((YT) => {
    if (version !== renderVersion) return;
    youtubePlayer = new YT.Player(mount, {
      width: '100%',
      height: '100%',
      videoId,
      playerVars: { autoplay: 1, controls: 0, mute: 1, playsinline: 1, rel: 0 },
      events: {
        onReady(event) {
          if (version !== renderVersion) {
            event.target.destroy();
            return;
          }
          event.target.mute();
          event.target.playVideo();
        },
        onStateChange(event) {
          if (event.data === YT.PlayerState.PLAYING) {
            clearTimeout(advanceTimer);
            advanceTimer = null;
          } else if (event.data === YT.PlayerState.ENDED && version === renderVersion) {
            clearTimeout(advanceTimer);
            advanceSlide();
          }
        },
        onError() {
          if (version === renderVersion && !advanceTimer) scheduleAdvance(slide);
        },
      },
    });
  }).catch(() => {
    if (version === renderVersion && !advanceTimer) scheduleAdvance(slide);
  });
}

function scheduleAdvance(slide) {
  clearTimeout(advanceTimer);
  if (screenData.playing === false || screenData.slides.length < 2) return;
  const seconds = Math.max(5, Math.min(300, Number(slide.duration) || 12));
  advanceTimer = setTimeout(advanceSlide, seconds * 1000);
}

function advanceSlide() {
  if (screenData.playing === false || screenData.slides.length < 2) return;
  currentSlide = (currentSlide + 1) % screenData.slides.length;
  render();
}

function showMediaError(stage, slide) {
  stage.textContent = 'This media could not be played. Moving to the next slide.';
  scheduleAdvance(slide);
}

function render() {
  renderVersion += 1;
  clearTimeout(advanceTimer);
  if (youtubePlayer) {
    try { youtubePlayer.destroy(); } catch { /* Player may already be detached. */ }
    youtubePlayer = null;
  }
  const slides = screenData.slides;
  root.replaceChildren();

  if (!slides.length) {
    root.classList.remove('solo', 'media-only', 'fullscreen-media');
    setBackground(null);
    const empty = document.createElement('section');
    empty.className = 'screen-empty';
    const heading = document.createElement('h1');
    heading.textContent = 'Welcome to Innovate';
    const description = document.createElement('p');
    description.textContent = 'Your screen is ready. New announcements and slides will appear here automatically.';
    empty.append(heading, description);
    root.append(empty);
  } else {
    currentSlide = ((currentSlide % slides.length) + slides.length) % slides.length;
    const slide = slides[currentSlide] || {};
    const supportsMediaOptions = ['image', 'video', 'youtube'].includes(slide.type);
    const fullscreen = supportsMediaOptions && slide.fullscreen === true;
    const showText = !supportsMediaOptions || (slide.showText !== false && !fullscreen);
    root.classList.toggle('solo', supportsMediaOptions);
    root.classList.toggle('media-only', !showText);
    root.classList.toggle('fullscreen-media', fullscreen);
    setBackground(slide);

    const layout = document.createElement('section');
    layout.className = 'screen-layout';
    const stage = document.createElement('div');
    stage.className = 'media-stage';
    if (showText) layout.append(makeCopy(slide));
    layout.append(stage);
    root.append(layout);

    if (slide.type === 'image') {
      const imageUrl = validHttpsUrl(slide.url);
      if (!imageUrl) {
        showMediaError(stage, slide);
      } else {
        const image = document.createElement('img');
        image.src = imageUrl;
        image.alt = text(slide.title || 'Innovate slide');
        image.addEventListener('error', () => showMediaError(stage, slide), { once: true });
        stage.append(image);
        scheduleAdvance(slide);
      }
    } else if (slide.type === 'video') {
      const videoUrl = validHttpsUrl(slide.url);
      if (!videoUrl) {
        showMediaError(stage, slide);
      } else {
        const video = document.createElement('video');
        video.src = videoUrl;
        video.autoplay = true;
        video.muted = true;
        video.playsInline = true;
        video.preload = 'auto';
        video.addEventListener('ended', advanceSlide, { once: true });
        video.addEventListener('error', () => showMediaError(stage, slide), { once: true });
        stage.append(video);
        const playback = video.play();
        if (playback?.catch) playback.catch(() => scheduleAdvance(slide));
      }
    } else if (slide.type === 'youtube') {
      const videoId = getYouTubeId(slide);
      if (!videoId) {
        showMediaError(stage, slide);
      } else if (slide.youtubeAdvance === 'ended') {
        playYouTubeUntilEnd(stage, slide, videoId, renderVersion);
      } else {
        const frame = document.createElement('iframe');
        frame.src = `https://www.youtube-nocookie.com/embed/${encodeURIComponent(videoId)}?autoplay=1&mute=1&controls=0&rel=0&playsinline=1`;
        frame.title = text(slide.title || 'YouTube video');
        frame.allow = 'autoplay; encrypted-media; picture-in-picture';
        frame.allowFullscreen = true;
        stage.append(frame);
        scheduleAdvance(slide);
      }
    } else if (slide.type === 'collage') {
      const images = Array.isArray(slide.images) ? slide.images : [];
      const collage = document.createElement('div');
      collage.className = `collage tiles-${Math.min(images.length, 4)} layout-${slide.layout || 'grid'}`;
      images.slice(0, 8).forEach((item) => {
        const imageUrl = validHttpsUrl(item.url);
        if (!imageUrl) return;
        const tile = document.createElement('figure');
        tile.className = 'collage-tile';
        const image = document.createElement('img');
        image.src = imageUrl;
        image.alt = text(item.caption || '');
        tile.append(image);
        if (item.caption) {
          const caption = document.createElement('figcaption');
          caption.textContent = text(item.caption, 80);
          tile.append(caption);
        }
        collage.append(tile);
      });
      if (!collage.childElementCount) {
        showMediaError(stage, slide);
      } else {
        stage.append(collage);
        scheduleAdvance(slide);
      }
    } else {
      showMediaError(stage, slide);
    }
  }

  const notice = screenData.notification || {};
  if (notice.enabled && notice.text) {
    const banner = document.createElement('aside');
    banner.className = 'notification-banner';
    const label = document.createElement('span');
    label.className = 'notification-label';
    label.textContent = 'Notice';
    const message = document.createElement('span');
    message.textContent = text(notice.text, 120);
    banner.append(label, message);
    root.append(banner);
  }
}

onValue(ref(db, 'screen'), (snapshot) => {
  const incoming = snapshot.val() || {};
  const slides = Array.isArray(incoming.slides) ? incoming.slides : [];
  const nextSignature = JSON.stringify(slides);

  if (nextSignature !== playlistSignature) {
    playlistSignature = nextSignature;
    const active = Number(incoming.active);
    currentSlide = Number.isInteger(active) && active >= 0 ? active : 0;
  }

  screenData = {
    ...incoming,
    slides,
    playing: incoming.playing !== false,
    notification: incoming.notification || { enabled: false, text: '' },
  };
  render();
}, (error) => {
  console.error('Unable to load screen content:', error);
  root.replaceChildren();
  const errorView = document.createElement('section');
  errorView.className = 'screen-empty';
  const heading = document.createElement('h1');
  heading.textContent = 'Unable to connect';
  const message = document.createElement('p');
  message.textContent = 'Please check the display network connection. This screen will reconnect automatically.';
  errorView.append(heading, message);
  root.append(errorView);
});

document.addEventListener('visibilitychange', () => {
  if (!document.hidden && screenData.slides.length) render();
});
