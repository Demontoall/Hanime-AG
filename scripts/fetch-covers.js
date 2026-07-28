#!/usr/bin/env node
/* scripts/fetch-covers.js

Scan the repository for placeholder images and replace images that represent specific
anime titles with official cover artwork. Primary source: Jikan (MyAnimeList). Fallbacks:
AniList, Kitsu.

This script:
 - Finds HTML files in the repo
 - For each HTML, parses it and finds <img> tags and cards that use placeholders
 - Attempts to determine the title associated with the image (from nearby headings or link text)
 - Queries Jikan API for a confident match and an official image URL
 - Validates the image URL and, if valid, replaces the placeholder URL in the HTML
 - Writes backups to backup/<original-path>.bak
 - Writes a cover-report.json manifest listing replacements and unresolved items

Run: node scripts/fetch-covers.js
*/

const fs = require('fs');
const path = require('path');
const fetch = require('node-fetch');
const { JSDOM } = require('jsdom');

const REPO_ROOT = path.resolve(__dirname, '..');
const BACKUP_DIR = path.join(REPO_ROOT, 'backup');
const REPORT_PATH = path.join(REPO_ROOT, 'cover-report.json');

const CONFIG = {
  jikanSearch: 'https://api.jikan.moe/v4/anime',
  anilistUrl: 'https://graphql.anilist.co',
  kitsuSearch: 'https://kitsu.io/api/edge/anime',
  confidenceThreshold: 0.66,
  placeholderPatterns: [
    'picsum.photos', 'unsplash.com', 'placeholder.com', 'placehold.co', 'via.placeholder.com',
    'loremflickr.com', 'dummyimage.com', 'placekitten.com'
  ]
};

function isHtmlFile(p){ return p.endsWith('.html'); }

function findHtmlFiles(dir){
  const res = [];
  const items = fs.readdirSync(dir);
  for(const i of items){
    const full = path.join(dir,i);
    const stat = fs.statSync(full);
    if(stat.isDirectory()){
      if(i === 'node_modules' || i === 'backup') continue;
      res.push(...findHtmlFiles(full));
    } else if(isHtmlFile(full)) res.push(full);
  }
  return res;
}

function placeholderUrl(src){
  if(!src) return false;
  return CONFIG.placeholderPatterns.some(p => src.includes(p));
}

function normalizeTitle(s){
  return (s||'').toString().toLowerCase().replace(/[^a-z0-9]+/g,'').trim();
}

function similarity(a,b){
  a = normalizeTitle(a);
  b = normalizeTitle(b);
  if(!a.length || !b.length) return 0;
  let matches=0,j=0;
  for(let i=0;i<a.length;i++){
    while(j<b.length && b[j]!==a[i]) j++;
    if(j<b.length && b[j]===a[i]){ matches++; j++; }
  }
  return (2*matches)/(a.length+b.length);
}

async function jikanSearch(title){
  const q = encodeURIComponent(title);
  const url = `${CONFIG.jikanSearch}?q=${q}&limit=6`;
  const res = await fetch(url);
  if(!res.ok) throw new Error('Jikan error '+res.status);
  const json = await res.json();
  if(!json.data || !json.data.length) return null;
  let best=null;
  for(const item of json.data){
    const candidates = [item.title, item.title_english, item.title_japanese].filter(Boolean);
    const bestLocal = candidates.map(c=>similarity(title,c)).reduce((a,b)=>Math.max(a,b),0);
    const imageUrl = (item.images && item.images.jpg && (item.images.jpg.large_image_url || item.images.jpg.image_url)) || null;
    if(!imageUrl) continue;
    if(!best || bestLocal>best.confidence) best = { id: item.mal_id, url: imageUrl, confidence: bestLocal };
  }
  return best;
}

async function anilistSearch(title){
  const query = `query ($search: String) { Media(search: $search, type: ANIME) { id title { romaji english native } coverImage { large extraLarge medium } siteUrl } }`;
  const res = await fetch(CONFIG.anilistUrl, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ query, variables:{ search: title } }) });
  if(!res.ok) throw new Error('AniList error '+res.status);
  const json = await res.json();
  if(!json.data || !json.data.Media) return null;
  const media = json.data.Media;
  const titles = [media.title.romaji, media.title.english, media.title.native].filter(Boolean);
  const bestLocal = titles.map(c=>similarity(title,c)).reduce((a,b)=>Math.max(a,b),0);
  const imageUrl = media.coverImage.extraLarge || media.coverImage.large || media.coverImage.medium || null;
  if(!imageUrl) return null;
  return { id: media.id, url: imageUrl, confidence: bestLocal };
}

async function kitsuSearch(title){
  const q = encodeURIComponent(title);
  const url = `${CONFIG.kitsuSearch}?filter[text]=${q}&page[limit]=6`;
  const res = await fetch(url);
  if(!res.ok) throw new Error('Kitsu error '+res.status);
  const json = await res.json();
  if(!json.data || !json.data.length) return null;
  let best=null;
  for(const d of json.data){
    const attr = d.attributes;
    const titles = [attr.titles.en_jp, attr.titles.en, attr.titles.ja_jp].filter(Boolean);
    const bestLocal = titles.map(c=>similarity(title,c)).reduce((a,b)=>Math.max(a,b),0);
    const imageUrl = attr.posterImage && (attr.posterImage.original || attr.posterImage.large || attr.posterImage.medium) || null;
    if(!imageUrl) continue;
    if(!best || bestLocal>best.confidence) best = { id: d.id, url: imageUrl, confidence: bestLocal };
  }
  return best;
}

async function validateImageUrl(url){
  try{
    const res = await fetch(url, { method:'HEAD' });
    if(!res.ok) return false;
    const ct = res.headers.get('content-type') || '';
    return ct.startsWith('image/');
  }catch(e){ return false; }
}

async function findTitleForImage(img, doc){
  // Strategy: check alt, title attributes, sibling text, parent headings, nearest h1/h2/h3
  if(img.alt && img.alt.trim()) return img.alt.trim();
  if(img.title && img.title.trim()) return img.title.trim();
  // check previous sibling text nodes
  const p = img.parentElement; if(!p) return null;
  // look for heading in parent
  for(const tag of ['h1','h2','h3','h4','h5','h6','h3','h2','h1']){
    const el = p.querySelector(tag) || p.closest(tag);
    if(el && el.textContent && el.textContent.trim()) return el.textContent.trim();
  }
  // search siblings
  let node = img.previousElementSibling;
  while(node){ if(node.textContent && node.textContent.trim()) return node.textContent.trim(); node=node.previousElementSibling; }
  // fallback: search whole document for h1/h2/h3 near img position
  const headings = Array.from(doc.querySelectorAll('h1,h2,h3'));
  if(headings.length) return headings[0].textContent.trim();
  return null;
}

(async function main(){
  console.log('Scanning repository for HTML files...');
  const files = findHtmlFiles(REPO_ROOT);
  console.log('Found', files.length, 'HTML files');
  if(!fs.existsSync(BACKUP_DIR)) fs.mkdirSync(BACKUP_DIR);
  const report = { updated: [], missing: [], duplicates: [], placeholders: [] };

  for(const f of files){
    const rel = path.relative(REPO_ROOT, f);
    console.log('Processing', rel);
    const raw = fs.readFileSync(f,'utf8');
    const dom = new JSDOM(raw);
    const doc = dom.window.document;
    let modified = false;

    const imgs = Array.from(doc.querySelectorAll('img'));
    for(const img of imgs){
      const src = img.getAttribute('src') || '';
      if(!placeholderUrl(src)) continue; // skip non-placeholders

      // Determine if the image is title-specific
      const title = await findTitleForImage(img, doc);
      if(!title){
        report.placeholders.push({ file: rel, src, reason: 'no title found nearby' });
        continue;
      }

      // Search Jikan
      try{
        const jikan = await jikanSearch(title);
        if(jikan && jikan.confidence>=CONFIG.confidenceThreshold){
          const valid = await validateImageUrl(jikan.url);
          if(valid){
            // backup file
            const backupPath = path.join(BACKUP_DIR, rel + '.bak');
            if(!fs.existsSync(backupPath)) fs.writeFileSync(backupPath, raw, 'utf8');
            // replace
            raw = raw.replace(src, jikan.url);
            modified = true;
            report.updated.push({ file: rel, title, provider: 'Jikan', providerId: jikan.id, old: src, new: jikan.url });
            continue;
          }
        }
      }catch(e){ console.warn('Jikan failure for', title, e); }

      // AniList fallback
      try{
        const ali = await anilistSearch(title);
        if(ali && ali.confidence>=CONFIG.confidenceThreshold){
          const valid = await validateImageUrl(ali.url);
          if(valid){
            const backupPath = path.join(BACKUP_DIR, rel + '.bak');
            if(!fs.existsSync(backupPath)) fs.writeFileSync(backupPath, raw, 'utf8');
            raw = raw.replace(src, ali.url);
            modified = true;
            report.updated.push({ file: rel, title, provider: 'AniList', providerId: ali.id, old: src, new: ali.url });
            continue;
          }
        }
      }catch(e){ console.warn('AniList failure for', title, e); }

      // Kitsu fallback
      try{
        const kitsu = await kitsuSearch(title);
        if(kitsu && kitsu.confidence>=CONFIG.confidenceThreshold){
          const valid = await validateImageUrl(kitsu.url);
          if(valid){
            const backupPath = path.join(BACKUP_DIR, rel + '.bak');
            if(!fs.existsSync(backupPath)) fs.writeFileSync(backupPath, raw, 'utf8');
            raw = raw.replace(src, kitsu.url);
            modified = true;
            report.updated.push({ file: rel, title, provider: 'Kitsu', providerId: kitsu.id, old: src, new: kitsu.url });
            continue;
          }
        }
      }catch(e){ console.warn('Kitsu failure for', title, e); }

      report.missing.push({ file: rel, title, src });
    }

    if(modified){
      fs.writeFileSync(f, raw, 'utf8');
      console.log('Updated', rel);
    }
  }

  fs.writeFileSync(REPORT_PATH, JSON.stringify(report, null, 2), 'utf8');
  console.log('Done. Report written to', REPORT_PATH);
})();
