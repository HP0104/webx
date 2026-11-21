import { extractVideoInfoFromPaste } from './videoUtils.js';

/**
 * Normalize a stored video document for Admin / Uploader edit forms without dropping series data.
 */
export function buildEditableVideoData(video, fallbackUploader = null) {
  const safeEpisodes = Array.isArray(video?.episodes)
    ? video.episodes.map((ep, idx) => ({
        ...ep,
        episodeNumber: ep?.episodeNumber || idx + 1,
        title: ep?.title || `Tập ${idx + 1}`,
        videoUrl: ep?.videoUrl || ''
      }))
    : [];
  const isSeries = Boolean(video?.isSeries && safeEpisodes.length > 0) || Boolean(video?.isSeries);

  return {
    title: video?.title || '',
    videoUrl: video?.videoUrl || video?.streamtapeUrl || '',
    thumbnail: video?.thumbnail || '',
    category: video?.category || 'vam',
    description: video?.description || '',
    tags: Array.isArray(video?.tags) ? video.tags.join(', ') : (video?.tags || ''),
    views: video?.views || 0,
    isSeries,
    episodes: safeEpisodes,
    totalEpisodes: isSeries ? (video?.totalEpisodes || safeEpisodes.length) : 1,
    uploaderId: video?.uploaderId ?? fallbackUploader?.id ?? null,
    uploaderName: video?.uploaderName ?? fallbackUploader?.username ?? null
  };
}

/**
 * Parse newline-delimited batch episode input (`Title | URL` or raw `URL`).
 * Rejects text lines that contain neither a pipe-delimited URL nor a valid URL.
 */
export function parseSeriesBatchText(batchText, existingCount = 0, idFactory = null) {
  if (!batchText || typeof batchText !== 'string' || !batchText.trim()) {
    return { episodes: [], invalidLines: [] };
  }

  const lines = batchText.split('\n').map((l) => l.trim()).filter(Boolean);
  const episodes = [];
  const invalidLines = [];
  const makeId = typeof idFactory === 'function'
    ? idFactory
    : (num) => `ep_${Date.now()}_${num}`;

  lines.forEach((line) => {
    let epTitle = '';
    let rawSource = line;

    if (line.includes('|')) {
      const parts = line.split('|');
      epTitle = parts[0].trim();
      rawSource = parts.slice(1).join('|').trim();
    } else {
      const m = line.match(/^(?:Tập|Tap|Ep|Episode|Chương|Part)\s*(\d+)[\s:.-]*(.*)$/i);
      const hasUrl = /https?:\/\/|<iframe/i.test(line);
      if (m && !hasUrl) {
        invalidLines.push(line);
        return;
      }
    }

    const { videoUrl: extractedUrl } = extractVideoInfoFromPaste(rawSource);
    const resolvedUrl = (extractedUrl || rawSource || '').trim();
    const isPlayableInput = /^https?:\/\//i.test(resolvedUrl) || /^<iframe\b/i.test(resolvedUrl);

    if (!isPlayableInput) {
      invalidLines.push(line);
      return;
    }

    const epNum = existingCount + episodes.length + 1;
    episodes.push({
      id: makeId(epNum),
      episodeNumber: epNum,
      title: epTitle || `Tập ${epNum}`,
      videoUrl: resolvedUrl
    });
  });

  return { episodes, invalidLines };
}

/**
 * Only auto-fetch thumbnail on URL blur if no manual thumbnail is currently set.
 */
export function shouldAutoFetchThumbnailOnBlur(currentThumbnail) {
  return !(typeof currentThumbnail === 'string' && currentThumbnail.trim().length > 0);
}
