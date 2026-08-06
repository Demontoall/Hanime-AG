// Provider-neutral source adapter. Future licensed sources only change data.
const HLS_RE = /\.m3u8(?:$|[?#])/i;
let hlsLoader;

export function normalizeEpisodeSources(episode) {
  const sources = Array.isArray(episode?.sources) ? episode.sources : [];
  const legacy = episode?.videoUrl ? [{ url: episode.videoUrl, type: episode.type, server: episode.server, quality: episode.quality }] : [];
  const all = [...legacy, ...sources].filter(source => source && (source.url || source.videoUrl));
  const seen = new Set();
  return all.map(source => ({
    url: source.url || source.videoUrl,
    type: source.type || (HLS_RE.test(source.url || source.videoUrl) ? 'application/x-mpegURL' : 'video/mp4'),
    server: source.server || 'Default server',
    quality: source.quality || 'Auto',
    subtitles: source.subtitles || episode.subtitles || []
  })).filter(source => {
    if (seen.has(source.url)) return false;
    seen.add(source.url);
    return true;
  });
}

function loadHlsLibrary() {
  if (window.Hls) return Promise.resolve(window.Hls);
  if (hlsLoader) return hlsLoader;
  hlsLoader = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/hls.js@1.5.17/dist/hls.min.js';
    script.onload = () => window.Hls ? resolve(window.Hls) : reject(new Error('HLS library unavailable'));
    script.onerror = () => reject(new Error('HLS library failed to load'));
    document.head.appendChild(script);
  });
  return hlsLoader;
}

export function clearTextTracks(video) {
  video.querySelectorAll('track[data-hag-subtitle]').forEach(track => track.remove());
}

export function attachTextTracks(video, subtitles = []) {
  clearTextTracks(video);
  subtitles.forEach((subtitle, index) => {
    if (!subtitle?.url) return;
    const track = document.createElement('track');
    track.dataset.hagSubtitle = 'true';
    track.kind = 'subtitles';
    track.src = subtitle.url;
    track.label = subtitle.label || subtitle.language || `Subtitle ${index + 1}`;
    track.srclang = subtitle.languageCode || subtitle.srclang || 'en';
    track.default = Boolean(subtitle.default);
    video.appendChild(track);
  });
}

export async function mountVideoSource(video, source) {
  let hls = null;
  video.removeAttribute('src');
  clearTextTracks(video);
  attachTextTracks(video, source.subtitles);

  if (HLS_RE.test(source.url) && !video.canPlayType('application/vnd.apple.mpegurl')) {
    const Hls = await loadHlsLibrary();
    if (!Hls.isSupported()) throw new Error('HLS playback is not supported in this browser');
    hls = new Hls({ enableWorker: true });
    hls.loadSource(source.url);
    hls.attachMedia(video);
  } else {
    video.src = source.url;
  }
  return () => {
    hls?.destroy();
    video.pause();
    video.removeAttribute('src');
    clearTextTracks(video);
  };
}