/**
 * Utility functions for video URLs (VOE, Doodstream/Doobstream, Streamtape, Ok.ru, YouTube, etc.)
 */

/**
 * Identify provider and get normalized info from a URL string or iframe embed HTML.
 */
export function parseVideoUrl(input) {
  if (!input || typeof input !== 'string') {
    return { provider: 'unknown', id: null, rawUrl: '', embedUrl: '' };
  }

  let url = input.trim();

  // If input is an iframe string or HTML code, extract the src or href URL
  const iframeSrcMatch = url.match(/src=["']([^"']+)["']/i);
  if (iframeSrcMatch) {
    url = iframeSrcMatch[1];
  } else {
    const hrefMatch = url.match(/href=["']([^"']+)["']/i);
    if (hrefMatch && !url.match(/^https?:\/\//i)) {
      url = hrefMatch[1];
    }
  }

  // 1. VOE variants (voe.sx, voecdn, etc.)
  const voeMatch = url.match(/(?:https?:\/\/)?(?:www\.)?(voe\.sx|voecdn\.com|voe-sx\.com|launchreed\.com)\/(?:e\/)?([a-zA-Z0-9]+)/i);
  if (voeMatch && !['cache', 'embed', 'api'].includes(voeMatch[2])) {
    const domain = voeMatch[1];
    const id = voeMatch[2];
    return {
      provider: 'voe',
      domain,
      id,
      rawUrl: url,
      embedUrl: `https://${domain}/e/${id}`
    };
  }

  // 2. Doodstream / Doobstream / ds2play / dood variants
  // e.g. doodstream.com, doobstream.com, dood.re, dood.to, dood.so, dood.la, ds2play.com, d0000d.com
  const doodMatch = url.match(/(?:https?:\/\/)?(?:www\.)?([a-zA-Z0-9.-]*(?:dood|doob|ds2play|d0000d|d000d)[a-zA-Z0-9.-]*)\/(?:d|e)\/([a-zA-Z0-9]+)/i);
  if (doodMatch) {
    const domain = doodMatch[1];
    const id = doodMatch[2];
    return {
      provider: 'doodstream',
      domain,
      id,
      rawUrl: url,
      embedUrl: `https://${domain}/e/${id}`
    };
  }

  // 3. Filemoon variants (filemoon.sx, filemoon.to, fmoonembed.com, etc.)
  const fmMatch = url.match(/(?:https?:\/\/)?(?:www\.)?([a-zA-Z0-9.-]*(?:filemoon|fmoonembed|fmoon)[a-zA-Z0-9.-]*)\/(?:d|e|v|download)\/([a-zA-Z0-9_-]+)/i);
  if (fmMatch) {
    const domain = fmMatch[1];
    const id = fmMatch[2];
    return {
      provider: 'filemoon',
      domain,
      id,
      rawUrl: url,
      embedUrl: `https://${domain}/e/${id}`
    };
  }

  // 4. Streamtape
  const stMatch = url.match(/(?:https?:\/\/)?(?:www\.)?([a-zA-Z0-9.-]*streamtape[a-zA-Z0-9.-]*)\/(?:v|e)\/([a-zA-Z0-9]+)/i);
  if (stMatch) {
    const domain = stMatch[1];
    const id = stMatch[2];
    return {
      provider: 'streamtape',
      domain,
      id,
      rawUrl: url,
      embedUrl: `https://${domain}/e/${id}`
    };
  }

  // 5. Vidguard / Vguard / VGembed variants
  const vgMatch = url.match(/(?:https?:\/\/)?(?:www\.)?([a-zA-Z0-9.-]*(?:vidguard|vguard|vgembed|vidnest|vidspeed)[a-zA-Z0-9.-]*)\/(?:d|e|v)\/([a-zA-Z0-9_-]+)/i);
  if (vgMatch) {
    const domain = vgMatch[1];
    const id = vgMatch[2];
    return {
      provider: 'vidguard',
      domain,
      id,
      rawUrl: url,
      embedUrl: `https://${domain}/e/${id}`
    };
  }

  // 6. Lulustream variants
  const luluMatch = url.match(/(?:https?:\/\/)?(?:www\.)?([a-zA-Z0-9.-]*(?:lulustream|luluembed)[a-zA-Z0-9.-]*)\/(?:d|e|v)\/([a-zA-Z0-9_-]+)/i);
  if (luluMatch) {
    const domain = luluMatch[1];
    const id = luluMatch[2];
    return {
      provider: 'lulustream',
      domain,
      id,
      rawUrl: url,
      embedUrl: `https://${domain}/e/${id}`
    };
  }

  // 7. Mixdrop variants
  const mdMatch = url.match(/(?:https?:\/\/)?(?:www\.)?([a-zA-Z0-9.-]*(?:mixdrop|mdrop)[a-zA-Z0-9.-]*)\/(?:f|e)\/([a-zA-Z0-9_-]+)/i);
  if (mdMatch) {
    const domain = mdMatch[1];
    const id = mdMatch[2];
    return {
      provider: 'mixdrop',
      domain,
      id,
      rawUrl: url,
      embedUrl: `https://${domain}/e/${id}`
    };
  }

  // 4. Ok.ru
  const okMatch = url.match(/(?:https?:\/\/)?(?:www\.)?ok\.ru\/(?:video|videoembed)\/(\d+)/i);
  if (okMatch) {
    const id = okMatch[1];
    return {
      provider: 'okru',
      domain: 'ok.ru',
      id,
      rawUrl: url,
      embedUrl: `https://ok.ru/videoembed/${id}`
    };
  }

  // 5. YouTube
  const ytMatch = url.match(/(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]+)/i);
  if (ytMatch) {
    const id = ytMatch[1];
    return {
      provider: 'youtube',
      domain: 'youtube.com',
      id,
      rawUrl: url,
      embedUrl: `https://www.youtube.com/embed/${id}`
    };
  }

  // Fallback / Unknown
  return {
    provider: 'unknown',
    domain: null,
    id: null,
    rawUrl: url,
    embedUrl: url
  };
}

/**
 * Convert any video URL to an embeddable iframe URL (`/e/` format etc.)
 */
export function toEmbedUrl(url) {
  if (!url) return '';
  const parsed = parseVideoUrl(url);
  return parsed.embedUrl || url;
}

/**
 * Get video thumbnail URL from video URL where possible.
 */
export function getVideoThumbnail(url) {
  if (!url) return null;
  const parsed = parseVideoUrl(url);
  
  if (parsed.provider === 'voe' && parsed.id) {
    return `https://voe.sx/cache/${parsed.id}_storyboard_L1.jpg`;
  }
  
  if (parsed.provider === 'youtube' && parsed.id) {
    return `https://img.youtube.com/vi/${parsed.id}/hqdefault.jpg`;
  }

  return null;
}

/**
 * Get display provider name
 */
export function getVideoProviderName(url) {
  const parsed = parseVideoUrl(url);
  switch (parsed.provider) {
    case 'voe': return 'VOE.sx';
    case 'doodstream': return 'Doodstream / Doobstream';
    case 'filemoon': return 'Filemoon';
    case 'streamtape': return 'Streamtape';
    case 'vidguard': return 'Vidguard';
    case 'lulustream': return 'Lulustream';
    case 'mixdrop': return 'Mixdrop';
    case 'okru': return 'OK.ru';
    case 'youtube': return 'YouTube';
    default: return 'Link Trực Tiếp / Khác';
  }
}

/**
 * Extract URL and thumbnail from pasted text (supports VOE & Doodstream HTML export code)
 */
export function extractVideoInfoFromPaste(pastedText) {
  if (!pastedText) return { videoUrl: null, thumbnail: null };

  let videoUrl = null;
  let thumbnail = null;

  // Check VOE HTML + Thumbnail code: <a href="https://voe.sx/ID"><img src="https://voe.sx/cache/ID_storyboard_L1.jpg"/></a>
  const voeHrefMatch = pastedText.match(/href=["']([^"']*voe\.sx[^"']*)["']/i);
  const voeImgMatch = pastedText.match(/src=["']([^"']*voe\.sx\/cache\/[^"']*)["']/i);
  if (voeHrefMatch && voeImgMatch) {
    return { videoUrl: voeHrefMatch[1], thumbnail: voeImgMatch[1] };
  }

  // Check iframe src inside pasted text
  const iframeSrcMatch = pastedText.match(/src=["'](https?:\/\/[^"']+)["']/i);
  if (iframeSrcMatch) {
    videoUrl = iframeSrcMatch[1];
  } else if (pastedText.trim().match(/^https?:\/\/[^\s]+$/i)) {
    videoUrl = pastedText.trim();
  } else {
    const anyLinkMatch = pastedText.match(/(https?:\/\/[^\s"'<>]+)/i);
    if (anyLinkMatch) {
      videoUrl = anyLinkMatch[1];
    }
  }

  // Try extracting image if present
  if (!thumbnail) {
    const anyImgMatch = pastedText.match(/src=["'](https?:\/\/[^"']+(?:\.jpg|\.jpeg|\.png|\.webp)[^"']*)["']/i);
    if (anyImgMatch) {
      thumbnail = anyImgMatch[1];
    } else {
      thumbnail = getVideoThumbnail(videoUrl);
    }
  }

  return { videoUrl, thumbnail };
}
