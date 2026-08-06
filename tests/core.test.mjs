import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { contentIdForSlug, watchUrl } from '../content-catalog.js';
import { normalizeProgress, progressKey } from '../playback-progress-utils.js';
import { normalizeEpisodeSources } from '../video-sources.js';

const manifest = JSON.parse(await fs.readFile(new URL('../episodes.json', import.meta.url), 'utf8'));
const catalogue = JSON.parse(await fs.readFile(new URL('../content-catalog.json', import.meta.url), 'utf8'));

test('catalogue IDs are stable and mapped titles remain unique', () => {
  const ids = catalogue.contents.map(item => item.contentId);
  assert.equal(new Set(ids).size, ids.length);
  assert.equal(contentIdForSlug('solo-leveling'), '151807');
  assert.match(contentIdForSlug('new-local-title'), /^local-new-local-title$/);
});

test('watch routes preserve the slug and clamp invalid episodes', () => {
  assert.equal(watchUrl('solo-leveling', 3), 'watch?slug=solo-leveling&episode=3');
  assert.equal(watchUrl('solo-leveling', 0), 'watch?slug=solo-leveling&episode=1');
  assert.equal(watchUrl('night world', 2), 'watch?slug=night+world&episode=2');
});

test('every catalogue record has a manifest entry', () => {
  for (const item of catalogue.contents) {
    assert.ok(manifest.anime[item.slug], `missing manifest entry for ${item.slug}`);
  }
});

test('manifest episode numbers are ordered and source URLs remain nullable', () => {
  for (const [slug, entry] of Object.entries(manifest.anime)) {
    for (const episode of entry.episodes || []) {
      assert.ok(Number.isInteger(episode.episodeNumber), `${slug} has an invalid episode number`);
      assert.ok(episode.videoUrl === null || typeof episode.videoUrl === 'string');
    }
  }
  const episodes = manifest.anime['solo-leveling'].episodes;
  assert.deepEqual(episodes.map(item => item.episodeNumber), [1, 2, 3, 4, 5]);
});

test('source normalization supports legacy and provider-neutral sources', () => {
  const sources = normalizeEpisodeSources({
    videoUrl: 'https://cdn.example/episode.mp4',
    server: 'Primary',
    sources: [
      { url: 'https://cdn.example/episode.m3u8', quality: '1080p' },
      { url: 'https://cdn.example/episode.mp4' }
    ]
  });
  assert.equal(sources.length, 2);
  assert.equal(sources[0].server, 'Primary');
  assert.equal(sources[1].type, 'application/x-mpegURL');
});

test('progress normalization calculates percent and completion consistently', () => {
  const record = normalizeProgress({
    contentId: '151807', slug: 'solo-leveling', title: 'Solo Leveling',
    episodeNumber: 1, position: 540, duration: 600
  });
  assert.equal(record.percent, 90);
  assert.equal(record.completed, true);
  assert.equal(progressKey('151807', 1), '151807_ep_1');
});