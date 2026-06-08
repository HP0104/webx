import { searchGames, generateGameContentWithGemini } from '../services/gameInfo';

const ADULT_KEYWORDS = [
  '18+', 'adult', 'nsfw', 'hentai', 'eroge', 'sex', 'slut', 'porn', 'uncensored', 'nude'
];

const PREFERRED_GEMINI_MODELS = [
  'gemini-2.5-flash',
  'gemini-2.5-flash-lite',
  'gemini-2.0-flash',
  'gemini-2.0-flash-lite',
  'gemini-1.5-flash'
];

const cleanText = (text = '') => String(text)
  .replace(/&nbsp;/gi, ' ')
  .replace(/&amp;/gi, '&')
  .replace(/&quot;/gi, '"')
  .replace(/&#39;/gi, "'")
  .replace(/<[^>]*>/g, ' ')
  .replace(/\s+/g, ' ')
  .trim();

const MONTH_MAP = {
  jan: '01',
  january: '01',
  feb: '02',
  february: '02',
  mar: '03',
  march: '03',
  apr: '04',
  april: '04',
  may: '05',
  jun: '06',
  june: '06',
  jul: '07',
  july: '07',
  aug: '08',
  august: '08',
  sep: '09',
  sept: '09',
  september: '09',
  oct: '10',
  october: '10',
  nov: '11',
  november: '11',
  dec: '12',
  december: '12'
};

const normalizeReleaseDate = (dateText = '') => {
  const raw = cleanText(dateText).split('|')[0].trim();
  if (!raw) return '';

  const isoMatch = raw.match(/\b(\d{4})[-/](\d{1,2})[-/](\d{1,2})\b/);
  if (isoMatch) {
    return `${isoMatch[1]}-${isoMatch[2].padStart(2, '0')}-${isoMatch[3].padStart(2, '0')}`;
  }

  const dayMonthYear = raw.match(/\b(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})\b/);
  if (dayMonthYear) {
    const month = MONTH_MAP[dayMonthYear[2].toLowerCase()];
    if (month) return `${dayMonthYear[3]}-${month}-${dayMonthYear[1].padStart(2, '0')}`;
  }

  const monthDayYear = raw.match(/\b([A-Za-z]+)\s+(\d{1,2}),?\s+(\d{4})\b/);
  if (monthDayYear) {
    const month = MONTH_MAP[monthDayYear[1].toLowerCase()];
    if (month) return `${monthDayYear[3]}-${month}-${monthDayYear[2].padStart(2, '0')}`;
  }

  return '';
};

const translateSystemRequirements = (text = '') => cleanText(text)
  .replace(/\bMinimum\b/gi, 'Tối thiểu')
  .replace(/\bRecommended\b/gi, 'Đề nghị')
  .replace(/\bOS\b/gi, 'Hệ điều hành')
  .replace(/\bProcessor\b/gi, 'Bộ xử lý')
  .replace(/\bMemory\b/gi, 'Bộ nhớ')
  .replace(/\bGraphics\b/gi, 'Card đồ họa')
  .replace(/\bDirectX\b/gi, 'DirectX')
  .replace(/\bStorage\b/gi, 'Lưu trữ')
  .replace(/\bSound Card\b/gi, 'Card âm thanh')
  .replace(/\bAdditional Notes\b/gi, 'Ghi chú thêm')
  .replace(/\s*:\s*/g, ': ');

const normalizeSearchText = (text = '') => cleanText(text)
  .toLowerCase()
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .replace(/[^a-z0-9]+/g, ' ')
  .trim();

const getGameNameTokens = (gameName) => normalizeSearchText(gameName)
  .split(' ')
  .filter(token => token.length > 1 && !['the', 'game', 'vn'].includes(token));

const hasGameNameMatch = (gameName, text) => {
  const normalizedName = normalizeSearchText(gameName);
  const haystack = normalizeSearchText(text);
  const tokens = getGameNameTokens(gameName);

  if (!normalizedName || !haystack) return false;
  if (haystack.includes(normalizedName)) return true;
  if (tokens.length <= 1) return tokens.length === 1 && haystack.includes(tokens[0]);

  return tokens.every(token => haystack.includes(token));
};

const shouldUseCorsProxy = (url = '') => /store\.steampowered\.com\/api\//i.test(url);

const CORS_PROXIES = [
  (url) => `https://corsproxy.io/?${encodeURIComponent(url)}`,
  (url) => `https://thingproxy.freeboard.io/fetch/${url}`,
  (url) => `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
  (url) => `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(url)}`
];

const getJson = async (url) => {
  let directError = null;

  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (response.ok) return response.json();
    directError = new Error(`Không đọc được nguồn (${response.status})`);
  } catch (error) {
    directError = error;
  }

  if (shouldUseCorsProxy(url)) {
    for (const proxyFn of CORS_PROXIES) {
      try {
        const response = await fetch(proxyFn(url), { signal: AbortSignal.timeout(10000) });
        if (response.ok) return response.json();
      } catch {
        continue;
      }
    }
    throw new Error('Không đọc được nguồn Steam qua các proxy. Vui lòng thử lại sau.');
  }

  throw directError || new Error('Không đọc được nguồn.');
};

const getOptionalJson = async (url) => {
  try {
    return await getJson(url);
  } catch (error) {
    console.warn('Optional game source warning:', error.message);
    return null;
  }
};

const getSteamPriceValue = (priceData) => {
  if (!priceData) return 0;
  if (typeof priceData.final === 'number') return Math.round(priceData.final / 100);
  if (typeof priceData.initial === 'number') return Math.round(priceData.initial / 100);
  return 0;
};

const getSteamAppIdFromUrl = (url = '') => {
  const match = String(url).match(/(?:store\.steampowered\.com|steamcommunity\.com)\/(?:agecheck\/)?app\/(\d+)/i) ||
    String(url).match(/steam:\/\/(?:store|run)\/(\d{3,})/i) ||
    String(url).match(/\bapp[/: ]+(\d{3,})\b/i) ||
    String(url).match(/\bsteam(?:\s+)?id[/: ]+(\d{3,})\b/i);
  return match?.[1] || '';
};

const getSteamAppDetails = async (appId) => {
  const urls = [
    `https://store.steampowered.com/api/appdetails?appids=${appId}&l=english&cc=us`,
    `https://store.steampowered.com/api/appdetails?appids=${appId}&l=english&cc=us&filters=basic,genres,categories,release_date,developers,price_overview,pc_requirements,screenshots`
  ];

  for (const url of urls) {
    const data = await getOptionalJson(url);
    const app = data?.[appId];
    if (app?.success !== false && app?.data) return app.data;
  }

  return null;
};

const getSteamAssetUrls = (appId) => {
  if (!appId) return [];
  return [
    `https://cdn.akamai.steamstatic.com/steam/apps/${appId}/header.jpg`,
    `https://cdn.akamai.steamstatic.com/steam/apps/${appId}/capsule_616x353.jpg`,
    `https://cdn.akamai.steamstatic.com/steam/apps/${appId}/library_600x900_2x.jpg`
  ];
};

const uniqueUrls = (urls = []) => [...new Set(urls.filter(Boolean))];

const extractJsonObject = (text = '') => {
  const cleaned = String(text).replace(/```json/gi, '').replace(/```/g, '').trim();

  try {
    return JSON.parse(cleaned);
  } catch {
    const start = cleaned.indexOf('{');
    const end = cleaned.lastIndexOf('}');
    if (start === -1 || end === -1 || end <= start) {
      throw new Error('Gemini không trả về JSON hợp lệ.');
    }

    return JSON.parse(cleaned.slice(start, end + 1));
  }
};

const getGeminiErrorMessage = (data, fallback = 'Gemini API trả về lỗi.') => {
  const error = data?.error;
  if (!error) return fallback;
  if (typeof error === 'string') return error;
  if (error.message) return error.message;
  try {
    return JSON.stringify(error);
  } catch {
    return fallback;
  }
};

const getGeminiText = (data) => {
  if (data?.error) {
    throw new Error(getGeminiErrorMessage(data));
  }

  const candidate = data?.candidates?.[0];
  if (!candidate) {
    const blockReason = data?.promptFeedback?.blockReason;
    throw new Error(blockReason
      ? `Gemini đã chặn yêu cầu (${blockReason}).`
      : 'Gemini không trả về nội dung nào.');
  }

  if (candidate.finishReason && !['STOP', 'MAX_TOKENS'].includes(candidate.finishReason)) {
    throw new Error(`Gemini dừng phản hồi vì ${candidate.finishReason}.`);
  }

  const text = candidate.content?.parts
    ?.map(part => part.text)
    .filter(Boolean)
    .join('\n')
    .trim();

  if (!text) {
    throw new Error('Gemini trả về phản hồi rỗng.');
  }

  return text;
};

const getAvailableGeminiModels = async (apiKey) => {
  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
    const data = await response.json().catch(() => ({}));

    if (!response.ok || data?.error) {
      throw new Error(getGeminiErrorMessage(data, `Không đọc được danh sách model Gemini (${response.status}).`));
    }

    const availableModels = (data.models || [])
      .filter(model => model.supportedGenerationMethods?.includes('generateContent'))
      .map(model => model.name?.replace(/^models\//, ''))
      .filter(Boolean);

    const preferred = PREFERRED_GEMINI_MODELS.filter(model => availableModels.includes(model));
    const fallback = availableModels.filter(model =>
      model.includes('gemini') &&
      !preferred.includes(model)
    );

    return [...preferred, ...fallback];
  } catch (error) {
    console.warn('Gemini model list warning:', error.message);
    return PREFERRED_GEMINI_MODELS;
  }
};

const isLikelyDirectImageUrl = (url = '') => {
  const value = cleanText(url);
  if (!/^https?:\/\//i.test(value)) return false;
  if (/\.(svg|ico)(\?|#|$)/i.test(value)) return false;
  if (/(avatar|profile|logo|favicon|icon|sprite|placeholder|blank|loading|spinner|default|transparent)/i.test(value)) return false;
  return true;
};

const canLoadImage = (url, timeoutMs = 2500) => new Promise(resolve => {
  if (!isLikelyDirectImageUrl(url)) {
    resolve(false);
    return;
  }

  const image = new Image();
  let done = false;

  const finish = (result) => {
    if (done) return;
    done = true;
    image.onload = null;
    image.onerror = null;
    resolve(result);
  };

  const timer = window.setTimeout(() => finish(false), timeoutMs);

  image.onload = () => {
    window.clearTimeout(timer);
    finish(image.naturalWidth >= 120 && image.naturalHeight >= 80);
  };

  image.onerror = () => {
    window.clearTimeout(timer);
    finish(false);
  };

  image.src = url;
});

const getVerifiedImageUrls = async (urls = [], limit = 8) => {
  const candidates = uniqueUrls(urls.map(cleanText).filter(Boolean));
  const results = await Promise.all(candidates.map(async url => ({
    url,
    ok: await canLoadImage(url)
  })));

  return results
    .filter(result => result.ok)
    .map(result => result.url)
    .slice(0, limit);
};

const getDefaultSystemRequirements = (tags = []) => {
  const hasPc = tags.some(tag => /pc|windows|steam/i.test(tag));
  if (!hasPc) return '';

  return 'Hệ điều hành: Windows 10 trở lên; Bộ xử lý: Intel hoặc AMD; Bộ nhớ: 4 GB RAM; Card đồ họa: tương thích DirectX; Lưu trữ: cần dung lượng trống theo bản game.';
};

const buildVietnameseGameSummary = ({ gameName, tags = [], text = '', developer = '', releaseDate = '', price = 0 }) => {
  const normalizedText = normalizeSearchText(text);
  const tagText = tags.length ? tags.slice(0, 4).join(', ') : 'PC';
  const intro = `${gameName} là trò chơi ${tagText}.`;
  const traits = [];

  if (/\bvisual novel\b/.test(normalizedText)) traits.push('thuộc phong cách visual novel');
  if (/\badult|18|nsfw|erotic\b/.test(normalizedText)) traits.push('có nội dung dành cho người lớn');
  if (/\bsurvival|survive\b/.test(normalizedText)) traits.push('có yếu tố sinh tồn');
  if (/\bpuzzle\b/.test(normalizedText)) traits.push('có các màn giải đố');
  if (/\bexploration|explore\b/.test(normalizedText)) traits.push('cho phép khám phá bản đồ và cốt truyện');
  if (/\bchoice|choices|decision\b/.test(normalizedText)) traits.push('có nhiều lựa chọn ảnh hưởng diễn biến');
  if (/\bjungle\b/.test(normalizedText)) traits.push('lấy bối cảnh rừng hoang dã');

  const detailSentence = traits.length
    ? `Game ${traits.slice(0, 4).join(', ')}.`
    : 'Game có lối chơi và nội dung được tổng hợp từ các nguồn công khai.';

  const metaParts = [
    developer ? `Nhà phát triển: ${developer}.` : '',
    releaseDate ? `Ngày phát hành: ${releaseDate}.` : '',
    price > 0 ? `Giá tham khảo: ${price.toLocaleString('vi-VN')} VND.` : ''
  ].filter(Boolean);

  return [intro, detailSentence, ...metaParts].join(' ').trim();
};

const getSteamInfo = async (gameName) => {
  const searchData = await getOptionalJson(
    `https://store.steampowered.com/api/storesearch/?term=${encodeURIComponent(gameName)}&l=english&cc=us`
  );
  const app = (searchData?.items || []).find(item => hasGameNameMatch(gameName, item.name || ''));
  if (!app?.id) return null;
  const steamAssets = getSteamAssetUrls(app.id);

  const searchFallback = {
    appId: app.id.toString(),
    title: app.name || gameName,
    image: app.tiny_image || steamAssets[0] || '',
    description: `${app.name || gameName} hiện có trên Steam.`,
    developer: '',
    releaseDate: '',
    price: getSteamPriceValue(app.price),
    tags: [
      app.platforms?.windows ? 'PC' : '',
      app.platforms?.mac ? 'Mac' : '',
      app.platforms?.linux ? 'Linux' : ''
    ].filter(Boolean),
    systemRequirements: '',
    screenshots: steamAssets.slice(0, 3),
    source: `https://store.steampowered.com/app/${app.id}`
  };

  const details = await getSteamAppDetails(app.id);
  if (!details) return searchFallback;
  if (!hasGameNameMatch(gameName, `${details?.name || ''} ${app.name || ''}`)) return searchFallback;

  const minimumRequirements = details?.pc_requirements?.minimum || '';
  const recommendedRequirements = details?.pc_requirements?.recommended || '';
  const systemRequirements = translateSystemRequirements([
    minimumRequirements,
    recommendedRequirements
  ].filter(Boolean).join(' '));

  return {
    appId: app.id.toString(),
    title: details?.name || app.name || gameName,
    image: details?.header_image || app.tiny_image || steamAssets[0] || '',
    description: cleanText(details?.short_description || ''),
    developer: Array.isArray(details?.developers) ? details.developers.join(', ') : '',
    releaseDate: normalizeReleaseDate(details?.release_date?.date || ''),
    price: getSteamPriceValue(details?.price_overview || app.price),
    tags: [
      ...(details?.genres || []).map(item => item.description),
      ...(details?.categories || []).map(item => item.description)
    ].filter(Boolean),
    systemRequirements,
    screenshots: uniqueUrls([
      ...(details?.screenshots || []).map(item => item.path_full).filter(Boolean),
      ...steamAssets
    ]).slice(0, 6),
    source: `https://store.steampowered.com/app/${app.id}`
  };
};

const getSteamInfoByAppId = async (appId, gameName) => {
  if (!appId) return null;

  const steamAssets = getSteamAssetUrls(appId);
  const details = await getSteamAppDetails(appId);
  const shouldCheckName = gameName && !getSteamAppIdFromUrl(gameName) && !/^\d+$/.test(gameName.trim());
  if (!details || (shouldCheckName && !hasGameNameMatch(gameName, details.name || ''))) return null;

  const minimumRequirements = details?.pc_requirements?.minimum || '';
  const recommendedRequirements = details?.pc_requirements?.recommended || '';
  const systemRequirements = translateSystemRequirements([
    minimumRequirements,
    recommendedRequirements
  ].filter(Boolean).join(' '));

  return {
    appId: appId.toString(),
    title: details?.name || gameName,
    image: details?.header_image || steamAssets[0] || '',
    description: cleanText(details?.short_description || ''),
    developer: Array.isArray(details?.developers) ? details.developers.join(', ') : '',
    releaseDate: normalizeReleaseDate(details?.release_date?.date || ''),
    price: getSteamPriceValue(details?.price_overview),
    tags: [
      ...(details?.genres || []).map(item => item.description),
      ...(details?.categories || []).map(item => item.description)
    ].filter(Boolean),
    systemRequirements,
    screenshots: uniqueUrls([
      ...(details?.screenshots || []).map(item => item.path_full).filter(Boolean),
      ...steamAssets
    ]).slice(0, 6),
    source: `https://store.steampowered.com/app/${appId}`
  };
};

const hasAdultSignal = (gameName, info) => {
  const text = [
    gameName,
    info.description,
    info.developer,
    ...(info.tags || [])
  ].join(' ').toLowerCase();

  return ADULT_KEYWORDS.some(keyword => text.includes(keyword));
};

const translateSteamGameInfoWithGemini = async (apiKey, steamInfo) => {
  const models = await getAvailableGeminiModels(apiKey);
  if (!models.length) {
    throw new Error('API key này không có model Gemini nào hỗ trợ generateContent.');
  }

  const prompt = `Bạn chỉ được dùng dữ liệu Steam bên dưới để dịch/tóm tắt. Không tự tìm web, không thêm chi tiết không có trong dữ liệu Steam.
Trả lời hoàn toàn bằng tiếng Việt, trừ tên riêng.
Mục tiêu:
- description: mô tả tiếng Việt tự nhiên 3-5 câu, đúng theo mô tả Steam.
- systemRequirements: dịch cấu hình hệ thống sang tiếng Việt, giữ thông số kỹ thuật.
- tags: giữ thể loại/nền tảng ngắn gọn, có thể giữ tên thể loại tiếng Anh quen thuộc như Visual Novel, RPG.
Chỉ trả về JSON object hợp lệ:
{
  "description": "string",
  "systemRequirements": "string",
  "tags": ["PC"]
}

Dữ liệu Steam:
${JSON.stringify({
    title: steamInfo.title,
    developer: steamInfo.developer,
    releaseDate: steamInfo.releaseDate,
    price: steamInfo.price,
    tags: steamInfo.tags,
    description: steamInfo.description,
    systemRequirements: steamInfo.systemRequirements
  }, null, 2)}`;

  let lastError = null;

  for (const model of models) {
    try {
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.15,
            response_mime_type: 'application/json'
          }
        })
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok || data?.error) {
        throw new Error(getGeminiErrorMessage(data, `Gemini trả về lỗi ${response.status}.`));
      }

      return extractJsonObject(getGeminiText(data));
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError || new Error('Không thể dịch dữ liệu Steam bằng Gemini.');
};

const generateCommunityGameInfoWithGemini = async (apiKey, gameName, existingInfo) => {
  const models = await getAvailableGeminiModels(apiKey);
  if (!models.length) {
    throw new Error('API key này không có model Gemini nào hỗ trợ generateContent.');
  }

  const prompt = `Bạn là một chuyên gia về cơ sở dữ liệu game, đặc biệt là game indie, game trên itch.io, F95Zone, Patreon và các cộng đồng game lớn khác.
Hãy tìm kiếm trong tri thức của bạn hoặc thực hiện tìm kiếm thông tin về game có tên "${gameName}".
If đây là game 18+ (Adult game, Visual Novel, RPG Maker,...), hãy tìm thông tin tương ứng trên F95Zone, itch.io, Patreon hoặc các trang lớn.

Hãy dịch tất cả thông tin mô tả và yêu cầu hệ thống sang tiếng Việt và trả về định dạng JSON hợp lệ có cấu trúc chính xác như sau:
{
  "title": "Tên chuẩn của game",
  "developer": "Tên nhà phát triển game",
  "releaseDate": "Ngày phát hành của game (Định dạng YYYY-MM-DD)",
  "price": 0, // Giá game bằng USD (nếu là game miễn phí/Patreon/F95 thì để 0)
  "description": "Mô tả chi tiết bằng tiếng Việt (3-5 câu), tóm tắt cốt truyện và lối chơi hấp dẫn.",
  "systemRequirements": "Cấu hình PC tối thiểu và đề nghị bằng tiếng Việt (đầy đủ CPU, GPU, RAM, ổ cứng trống)",
  "tags": ["PC", "18+", "Visual Novel", "RPG"], // Mảng các thể loại/nhãn tiếng Việt hoặc tiếng Anh phổ biến
  "image": "Đề xuất link ảnh bìa/header của game này (link ảnh online thực tế từ F95Zone/itch.io/RAWG/Patreon nếu biết, nếu không hãy để trống)",
  "screenshots": [] // Mảng các link ảnh chụp màn hình thực tế (nếu biết, nếu không hãy để mảng rỗng)
}

Thông tin bổ sung có sẵn (nếu có):
${JSON.stringify({
    title: existingInfo.title,
    releaseDate: existingInfo.releaseDate,
    image: existingInfo.image,
    screenshots: existingInfo.screenshots,
    tags: existingInfo.tags
  }, null, 2)}
`;

  let lastError = null;
  for (const model of models) {
    try {
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.3,
            response_mime_type: 'application/json'
          }
        })
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || data?.error) {
        throw new Error(getGeminiErrorMessage(data, `Gemini trả về lỗi ${response.status}.`));
      }
      return extractJsonObject(getGeminiText(data));
    } catch (error) {
      console.warn(`Fallback generation failed with model ${model}:`, error.message);
      lastError = error;
    }
  }
  throw lastError || new Error('Không thể sinh thông tin game từ nguồn cộng đồng bằng Gemini.');
};

export const searchSteamThenTranslateGameInfo = async (apiKey, input) => {
  let steamInfo = null;
  let isFromSteam = true;

  const query = cleanText(input);
  const appId = getSteamAppIdFromUrl(query) || (/^\d+$/.test(query) ? query : '');

  // 1. Thử tìm trên Steam trước
  try {
    steamInfo = appId
      ? await getSteamInfoByAppId(appId, '')
      : await getSteamInfo(query);
  } catch (err) {
    console.warn('Steam search failed, will try community fallbacks:', err.message);
  }

  // 2. Nếu không có trên Steam, thử tìm trên RAWG Database
  if (!steamInfo) {
    isFromSteam = false;
    console.log('Trying RAWG database fallback for:', query);
    try {
      const rawgResults = await searchGames(query, 5);
      if (rawgResults && rawgResults.length > 0) {
        const rawgGame = rawgResults[0];
        const screenshots = (rawgGame.short_screenshots || []).map(s => s.image).filter(Boolean);
        const tags = (rawgGame.genres || []).map(g => g.name);
        
        steamInfo = {
          appId: `rawg-${rawgGame.id}`,
          title: rawgGame.name,
          image: rawgGame.background_image || '',
          description: '',
          developer: '',
          releaseDate: rawgGame.released || '',
          price: 0,
          tags: [...tags, 'PC'],
          systemRequirements: '',
          screenshots: screenshots,
          source: `https://rawg.io/games/${rawgGame.slug}`
        };
      }
    } catch (rawgError) {
      console.warn('RAWG database search failed:', rawgError.message);
    }
  }

  // 3. Nếu vẫn không tìm thấy ở đâu, dựng khung thông tin ảo để Gemini tự điền
  if (!steamInfo) {
    isFromSteam = false;
    steamInfo = {
      appId: `community-${Date.now()}`,
      title: input,
      image: '',
      description: '',
      developer: '',
      releaseDate: '',
      price: 0,
      tags: ['PC', '18+', 'F95Zone'],
      systemRequirements: '',
      screenshots: [],
      source: 'https://f95zone.to'
    };
  }

  const tags = [...new Set([...(steamInfo.tags || []), 'PC'])];
  let translated = {};

  try {
    if (isFromSteam) {
      translated = await translateSteamGameInfoWithGemini(apiKey, {
        ...steamInfo,
        tags
      });
    } else {
      translated = await generateCommunityGameInfoWithGemini(apiKey, input, {
        ...steamInfo,
        tags
      });
    }
  } catch (error) {
    console.warn('Gemini game info translation/generation failed:', error.message);
  }

  const translatedTags = Array.isArray(translated.tags)
    ? translated.tags.map(cleanText).filter(Boolean)
    : tags;
  const finalTags = [...new Set([...(translatedTags.length ? translatedTags : tags), 'PC'])];
  
  const releaseDate = normalizeReleaseDate(translated.releaseDate || steamInfo.releaseDate);
  
  const fallbackDescription = buildVietnameseGameSummary({
    gameName: translated.title || steamInfo.title,
    tags: finalTags,
    text: translated.description || steamInfo.description,
    developer: translated.developer || steamInfo.developer,
    releaseDate,
    price: translated.price || steamInfo.price || 0
  });

  const allImages = [
    translated.image,
    steamInfo.image,
    ...(translated.screenshots || []),
    ...(steamInfo.screenshots || [])
  ].filter(Boolean);

  const verifiedImages = await getVerifiedImageUrls(allImages, 8);

  const finalSource = translated.source || steamInfo.source || `https://f95zone.to/search?q=${encodeURIComponent(input)}`;

  return {
    ...steamInfo,
    title: translated.title || steamInfo.title,
    developer: translated.developer || steamInfo.developer || 'N/A',
    image: verifiedImages[0] || steamInfo.image || '',
    screenshots: verifiedImages.length > 1 ? verifiedImages.slice(1) : (steamInfo.screenshots || []),
    description: cleanText(translated.description || fallbackDescription),
    systemRequirements: cleanText(translated.systemRequirements || steamInfo.systemRequirements || getDefaultSystemRequirements(finalTags)),
    releaseDate,
    tags: finalTags,
    price: translated.price || steamInfo.price || 0,
    rating: 5.0,
    downloads: Math.floor(Math.random() * 500) + 15,
    is18Plus: hasAdultSignal(input, {
      title: translated.title || steamInfo.title,
      description: translated.description || steamInfo.description,
      developer: translated.developer || steamInfo.developer,
      tags: finalTags
    }) || !isFromSteam,
    sources: [finalSource].filter(Boolean)
  };
};
