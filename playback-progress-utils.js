export const PROGRESS_STORAGE_KEY = 'hag_playback_progress_v1';

export function progressKey(contentId, episodeNumber) {
  return `${String(contentId).replace(/[^a-zA-Z0-9_-]/g, '-')}_ep_${Number(episodeNumber)}`;
}

export function normalizeProgress(record) {
  const duration = Math.max(0, Number(record.duration) || 0);
  const position = Math.max(0, Number(record.position) || 0);
  const percent = duration
    ? Math.min(100, Math.round((position / duration) * 100))
    : Math.max(0, Number(record.percent) || 0);
  return {
    contentId: String(record.contentId),
    slug: String(record.slug),
    title: String(record.title || record.slug),
    episodeNumber: Number(record.episodeNumber) || 1,
    position,
    duration,
    percent,
    completed: Boolean(record.completed || percent >= 90),
    img: record.img || null,
    url: record.url || null,
    updatedAt: record.updatedAt || new Date().toISOString()
  };
}