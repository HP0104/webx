import { useState, useEffect } from 'react';
import { Plus, Upload, X } from 'lucide-react';
import { useAppContext } from '../App';
import { db } from '../firebase';
import { collection, query, onSnapshot, doc, updateDoc } from 'firebase/firestore';

const ADULT_KEYWORDS = [
  '18+', 'adult', 'nsfw', 'hentai', 'eroge', 'sex', 'slut', 'porn', 'uncensored', 'nude'
];

const TAVILY_API_KEY_STORAGE_KEY = 'web18p_tavily_api_key';
const TAVILY_MAX_QUERY_LENGTH = 400;

const TRUSTED_GAME_DOMAINS = [
  'store.steampowered.com',
  'f95zone.to',
  'vndb.org',
  'itch.io',
  'dlsite.com',
  'gog.com',
  'epicgames.com',
  'mobygames.com',
  'igdb.com',
  'giantbomb.com',
  'gamejolt.com',
  'nutaku.net',
  'jastusa.com',
  'kaguragames.com',
  'patreon.com',
  'subscribestar.adult'
];

const DOMAIN_PRIORITY = [
  'store.steampowered.com',
  'f95zone.to',
  'vndb.org',
  'itch.io',
  'dlsite.com',
  'gog.com',
  'epicgames.com',
  'mobygames.com',
  'igdb.com'
];

const cleanText = (text = '') => String(text)
  .replace(/&nbsp;/gi, ' ')
  .replace(/&amp;/gi, '&')
  .replace(/&quot;/gi, '"')
  .replace(/&#39;/gi, "'")
  .replace(/<[^>]*>/g, ' ')
  .replace(/\s+/g, ' ')
  .trim();

const truncateText = (text = '', maxLength = TAVILY_MAX_QUERY_LENGTH) => {
  if (text.length <= maxLength) return text;
  return `${text.slice(0, Math.max(0, maxLength - 3)).trim()}...`;
};

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

const getHostname = (url = '') => {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return '';
  }
};

const getDomainPriority = (url) => {
  const hostname = getHostname(url);
  const index = DOMAIN_PRIORITY.findIndex(domain => hostname === domain || hostname.endsWith(`.${domain}`));
  return index === -1 ? DOMAIN_PRIORITY.length + 1 : index;
};

const hasTrustedDomain = (url) => {
  const hostname = getHostname(url);
  return TRUSTED_GAME_DOMAINS.some(domain => hostname === domain || hostname.endsWith(`.${domain}`));
};

const hasGameNameMatch = (gameName, text) => {
  const normalizedName = normalizeSearchText(gameName);
  const haystack = normalizeSearchText(text);
  const tokens = getGameNameTokens(gameName);

  if (!normalizedName || !haystack) return false;
  if (haystack.includes(normalizedName)) return true;
  if (tokens.length <= 1) return tokens.length === 1 && haystack.includes(tokens[0]);

  return tokens.every(token => haystack.includes(token));
};

const getTrustedGameResults = (results, gameName) => results
  .filter(result => {
    const searchableText = `${result.title || ''} ${result.url || ''} ${result.content || ''} ${result.raw_content || ''}`;
    return hasTrustedDomain(result.url) && hasGameNameMatch(gameName, searchableText);
  })
  .sort((a, b) => {
    const domainDiff = getDomainPriority(a.url) - getDomainPriority(b.url);
    if (domainDiff !== 0) return domainDiff;
    return (b.score || 0) - (a.score || 0);
  });

const getRelevantGameResults = (results, gameName) => results
  .filter(result => {
    const searchableText = `${result.title || ''} ${result.url || ''} ${result.content || ''} ${result.raw_content || ''}`;
    return hasGameNameMatch(gameName, searchableText);
  })
  .sort((a, b) => {
    const trustedDiff = Number(hasTrustedDomain(b.url)) - Number(hasTrustedDomain(a.url));
    if (trustedDiff !== 0) return trustedDiff;

    const domainDiff = getDomainPriority(a.url) - getDomainPriority(b.url);
    if (domainDiff !== 0) return domainDiff;

    return (b.score || 0) - (a.score || 0);
  });

const getTavilyErrorMessage = (data, status) => {
  const errorValue = data?.detail || data?.error || data?.message;
  if (!errorValue) return `Tavily trả về lỗi ${status}`;
  if (typeof errorValue === 'string') return errorValue;
  if (Array.isArray(errorValue)) {
    return errorValue
      .map(item => item?.msg || item?.message || JSON.stringify(item))
      .join('; ');
  }
  return JSON.stringify(errorValue);
};

const shouldRetryTavilyWithoutDomainParam = (message) => /include_domains|domain|extra|schema|validation|field/i.test(message);

const buildTavilyQuery = (gameName) => {
  const safeGameName = cleanText(gameName).replace(/"/g, '').slice(0, 140).trim();
  const shortQuery = `"${safeGameName}" game. Tra loi tieng Viet: mo ta ngan, nha phat trien, ngay phat hanh, gia, nen tang, the loai, cau hinh toi thieu, link chinh thuc.`;

  return truncateText(shortQuery, TAVILY_MAX_QUERY_LENGTH);
};

const fetchTavilySearch = async (apiKey, gameName, useDomainParam = true) => {
  const body = {
    query: buildTavilyQuery(gameName),
    topic: 'general',
    search_depth: 'advanced',
    include_answer: true,
    include_images: false,
    max_results: 10
  };

  if (useDomainParam) {
    body.include_domains = TRUSTED_GAME_DOMAINS;
  }

  const response = await fetch('https://api.tavily.com/search', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify(body)
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const message = getTavilyErrorMessage(data, response.status);
    if (useDomainParam && shouldRetryTavilyWithoutDomainParam(message)) {
      return fetchTavilySearch(apiKey, gameName, false);
    }
    throw new Error(message);
  }

  return data;
};

const getJson = async (url) => {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Không đọc được nguồn (${response.status})`);
  }
  return response.json();
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
  const match = String(url).match(/store\.steampowered\.com\/app\/(\d+)/i);
  return match?.[1] || '';
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

const translateTextToVietnamese = (text = '') => {
  const normalized = cleanText(text);
  if (!normalized) return '';
  if (hasVietnameseText(normalized)) return normalized;

  return normalized
    .replace(/\bThis game\b/gi, 'Trò chơi này')
    .replace(/\bThis title\b/gi, 'Tựa game này')
    .replace(/\bis an adult visual novel\b/gi, 'là một visual novel dành cho người lớn')
    .replace(/\bis an adult\b/gi, 'là một trò chơi dành cho người lớn')
    .replace(/\bis a visual novel\b/gi, 'là một visual novel')
    .replace(/\bis a game\b/gi, 'là một trò chơi')
    .replace(/\bset in\b/gi, 'lấy bối cảnh tại')
    .replace(/\bfeatures\b/gi, 'có')
    .replace(/\bfeaturing\b/gi, 'bao gồm')
    .replace(/\bincludes\b/gi, 'bao gồm')
    .replace(/\bwith\b/gi, 'với')
    .replace(/\band\b/gi, 'và')
    .replace(/\bfor women\b/gi, 'dành cho nữ')
    .replace(/\baudio series\b/gi, 'chuỗi nội dung âm thanh')
    .replace(/\berotic content\b/gi, 'nội dung gợi cảm')
    .replace(/\bexplicit scenes\b/gi, 'cảnh nhạy cảm')
    .replace(/\bpriced at\b/gi, 'có giá')
    .replace(/\bdeveloper\b/gi, 'nhà phát triển')
    .replace(/\brelease date\b/gi, 'ngày phát hành')
    .replace(/\bplatforms?\b/gi, 'nền tảng')
    .replace(/\bsystem requirements\b/gi, 'cấu hình hệ thống')
    .replace(/\bminimum requirements\b/gi, 'cấu hình tối thiểu')
    .replace(/\bavailable on Steam\b/gi, 'có trên Steam')
    .replace(/\bWindows 10 or above\b/gi, 'Windows 10 trở lên')
    .replace(/\bIntel or AMD\b/gi, 'Intel hoặc AMD')
    .replace(/\bDirect X compatible\b/gi, 'tương thích DirectX')
    .replace(/\bGB RAM\b/gi, 'GB RAM')
    .replace(/\s+/g, ' ')
    .trim();
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

  const detailData = await getOptionalJson(
    `https://store.steampowered.com/api/appdetails?appids=${app.id}&l=english&cc=us`
  );
  const details = detailData?.[app.id]?.data;
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

const hasAdultSignal = (gameName, info) => {
  const text = [
    gameName,
    info.description,
    info.developer,
    ...(info.tags || [])
  ].join(' ').toLowerCase();

  return ADULT_KEYWORDS.some(keyword => text.includes(keyword));
};

const findInText = (text, patterns) => {
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match?.[1]) return cleanText(match[1]).replace(/[.;,]$/, '');
  }
  return '';
};

const normalizeDeveloperName = (text = '') => cleanText(text)
  .replace(/\b(with a )?release date.*$/i, '')
  .replace(/\bpriced at.*$/i, '')
  .replace(/\bngày phát hành.*$/i, '')
  .trim();

const getGameTagsFromText = (text) => {
  const tags = [
    ['VN', /\b(vietnamese|tiếng việt|việt hóa|việt nam)\b/i],
    ['Android', /\b(android|apk|mobile)\b/i],
    ['PC', /\b(pc|windows|steam)\b/i],
    ['Visual Novel', /\bvisual novel\b/i],
    ['RPG', /\brpg\b/i],
    ['Adventure', /\badventure\b/i],
    ['Simulation', /\bsimulation\b/i],
    ['Action', /\baction\b/i],
    ['Indie', /\bindie\b/i]
  ];

  return tags.filter(([, pattern]) => pattern.test(text)).map(([tag]) => tag);
};

const hasVietnameseText = (text = '') => /[ăâđêôơưáàảãạấầẩẫậắằẳẵặéèẻẽẹếềểễệíìỉĩịóòỏõọốồổỗộớờởỡợúùủũụứừửữựýỳỷỹỵ]/i.test(text);

const getVietnameseDescription = ({ gameName, tags, text, developer, releaseDate, price }) => {
  return buildVietnameseGameSummary({
    gameName,
    tags,
    text,
    developer,
    releaseDate,
    price
  });
};

const searchTavilyGameInfo = async (apiKey, gameName) => {
  const data = await fetchTavilySearch(apiKey, gameName);

  const rawResults = Array.isArray(data.results) ? data.results : [];
  const trustedResults = getTrustedGameResults(rawResults, gameName);
  const results = trustedResults.length > 0 ? trustedResults : getRelevantGameResults(rawResults, gameName);
  const text = cleanText([
    data.answer,
    ...results.map(result => `${result.title || ''}. ${result.content || result.raw_content || ''}`)
  ].join(' '));
  const steamInfo = await getSteamInfo(gameName);
  const hasAnswerMatch = hasGameNameMatch(gameName, `${data.answer || ''} ${text}`);
  if (results.length === 0 && !steamInfo && !hasAnswerMatch) {
    throw new Error('Không tìm thấy thông tin khớp tên game trên Tavily, Steam hoặc các nguồn web liên quan.');
  }

  const steamAppIdFromResults = trustedResults
    .map(result => getSteamAppIdFromUrl(result.url))
    .find(Boolean);
  const steamAssetsFromResults = steamInfo ? getSteamAssetUrls(steamInfo.appId || steamAppIdFromResults) : [];
  const images = steamInfo ? uniqueUrls([
    steamInfo.image,
    ...steamAssetsFromResults
  ]) : [];
  const screenshots = steamInfo ? uniqueUrls([
    ...(steamInfo.screenshots || []),
    ...steamAssetsFromResults
  ]).slice(0, 6) : [];
  const developer = normalizeDeveloperName(steamInfo?.developer || findInText(text, [
    /(?:developer|developed by)\s*(?:is|was|:)?\s*([^.;,\n]+)/i,
    /(?:nhà phát triển|phát triển bởi)\s*(?:là|:)?\s*([^.;,\n]+)/i
  ]));
  const releaseDate = steamInfo?.releaseDate || findInText(text, [
    /(?:release date|released on|released)\s*(?:is|was|:)?\s*([^.;,\n]+)/i,
    /(?:ngày phát hành|phát hành)\s*(?:là|:)?\s*([^.;,\n]+)/i
  ]);
  const tags = [...new Set([...(steamInfo?.tags || []), ...getGameTagsFromText(text), 'PC'])];
  const translatedRequirements = translateTextToVietnamese(findInText(text, [
    /(?:cấu hình hệ thống|system requirements|minimum requirements)\s*(?:là|:)?\s*([^]+?)(?:\s*(?:link nguồn|source|developer|nhà phát triển|release date|ngày phát hành)|$)/i
  ]));

  const merged = {
    title: steamInfo?.title || gameName,
    price: steamInfo?.price ?? 0,
    image: images[0] || '',
    description: getVietnameseDescription({
      gameName,
      tags,
      text,
      developer,
      releaseDate: normalizeReleaseDate(releaseDate),
      price: steamInfo?.price ?? 0
    }),
    developer,
    releaseDate: normalizeReleaseDate(releaseDate),
    systemRequirements: steamInfo?.systemRequirements || translateSystemRequirements(translatedRequirements),
    screenshots,
    rating: 5.0,
    downloads: Math.floor(Math.random() * 500) + 15,
    tags
  };

  return {
    ...merged,
    is18Plus: hasAdultSignal(gameName, merged),
    sources: [...results.map(result => result.url), steamInfo?.source].filter(Boolean)
  };
};

function Admin() {
  const { games, addGameToStore, deleteGameFromStore, updateGameInStore, revenue } = useAppContext();
  const [users, setUsers] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [editingGameId, setEditingGameId] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [tavilyApiKey, setTavilyApiKey] = useState(() => localStorage.getItem(TAVILY_API_KEY_STORAGE_KEY) || '');
  const [currentUpdateVersion, setCurrentUpdateVersion] = useState('');
  const [currentUpdateLog, setCurrentUpdateLog] = useState('');
  const [editingUserId, setEditingUserId] = useState(null);
  const [balanceAmount, setBalanceAmount] = useState('');
  
  const [newGame, setNewGame] = useState({
    title: '',
    price: 0,
    image: '',
    tags: '',
    description: '',
    developer: '',
    releaseDate: '',
    systemRequirements: '',
    screenshots: [], // managed as array
    downloadUrl: '',
    rating: 5.0,
    downloads: 0,
    isNew: false,
    isPopular: false,
    isTopRated: false,
    is18Vn: false,
    is18Uncensored: false,
    is18Pc: false,
    is18Android: false,
    updateHistory: [],
    updatedAt: null,
    views: 0
  });

  const [manualScreenshotUrl, setManualScreenshotUrl] = useState('');

  useEffect(() => {
    if (tavilyApiKey.trim()) {
      localStorage.setItem(TAVILY_API_KEY_STORAGE_KEY, tavilyApiKey.trim());
    } else {
      localStorage.removeItem(TAVILY_API_KEY_STORAGE_KEY);
    }
  }, [tavilyApiKey]);

  // Theo dõi danh sách người dùng từ Firestore theo thời gian thực
  useEffect(() => {
    const q = query(collection(db, 'users'));
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const usersList = [];
      querySnapshot.forEach((doc) => {
        usersList.push({ id: doc.id, ...doc.data() });
      });
      setUsers(usersList);
    });
    return () => unsubscribe();
  }, []);

  const handleAddBalance = async (userId, currentBalance) => {
    try {
      const userRef = doc(db, 'users', userId);
      await updateDoc(userRef, {
        balance: (currentBalance || 0) + 500000
      });
    } catch (error) {
      alert('Lỗi nạp tiền: ' + error.message);
    }
  };

  const handleUpdateBalance = async (userId, currentBalance, type) => {
    if (!balanceAmount || isNaN(balanceAmount) || Number(balanceAmount) <= 0) {
      alert('Vui lòng nhập số tiền hợp lệ!');
      return;
    }
    
    try {
      const amount = Number(balanceAmount);
      const newBalance = type === 'add' ? (currentBalance || 0) + amount : (currentBalance || 0) - amount;
      
      if (newBalance < 0) {
        alert('Số dư không được phép âm!');
        return;
      }
      
      const userRef = doc(db, 'users', userId);
      await updateDoc(userRef, {
        balance: newBalance
      });
      
      setEditingUserId(null);
      setBalanceAmount('');
      alert('Cập nhật tiền thành công!');
    } catch (error) {
      alert('Lỗi cập nhật tiền: ' + error.message);
    }
  };

  const handleSearchAI = async () => {
    const gameName = searchQuery.trim();
    if (!gameName) return alert('Vui lòng nhập Tên Game để tìm kiếm!');
    if (!tavilyApiKey.trim()) return alert('Vui lòng nhập Tavily API Key để tìm kiếm!');
    
    setIsSearching(true);

    try {
      const webData = await searchTavilyGameInfo(tavilyApiKey.trim(), gameName);

      if (!webData.description && !webData.image && webData.tags.length <= 1) {
        throw new Error('Tavily chưa tìm thấy dữ liệu rõ ràng. Bạn thử tên game đầy đủ hơn hoặc nhập thủ công nhé.');
      }

      setNewGame(prev => ({
        ...prev,
        title: webData.title || gameName,
        price: webData.price || 0,
        image: webData.image || '',
        tags: Array.isArray(webData.tags) ? webData.tags.join(', ') : '',
        description: webData.description || '',
        developer: webData.developer || '',
        releaseDate: webData.releaseDate || '',
        systemRequirements: webData.systemRequirements || '',
        screenshots: Array.isArray(webData.screenshots) ? webData.screenshots : [],
        rating: webData.rating || 5.0,
        downloads: webData.downloads || Math.floor(Math.random() * 500) + 15,
        isNew: true,
        isPopular: true,
        isTopRated: true,
        is18Vn: webData.is18Plus,
        is18Uncensored: webData.is18Plus,
        is18Pc: true,
        is18Android: webData.is18Plus
      }));
      alert(`Thành công! Tavily đã tìm thấy thông tin${webData.sources.length ? ` (${webData.sources.length} nguồn)` : ''}.`);
    } catch (error) {
      alert('Lỗi Tavily: ' + error.message);
    } finally {
      setIsSearching(false);
    }
  };

  const handleEditClick = (game) => {
    setEditingGameId(game.id);
    setNewGame({
      title: game.title,
      price: game.price,
      image: game.image,
      tags: Array.isArray(game.tags) ? game.tags.join(', ') : game.tags,
      description: game.description,
      developer: game.developer,
      releaseDate: game.releaseDate || '',
      systemRequirements: game.systemRequirements || '',
      screenshots: Array.isArray(game.screenshots) ? game.screenshots : [],
      downloadUrl: game.downloadUrl || '',
      rating: game.rating || 5.0,
      downloads: game.downloads || 0,
      isNew: game.isNew || false,
      isPopular: game.isPopular || false,
      isTopRated: game.isTopRated || false,
      is18Vn: game.is18Vn || false,
      is18Uncensored: game.is18Uncensored || false,
      is18Pc: game.is18Pc || false,
      is18Android: game.is18Android || false,
      updateHistory: game.updateHistory || [],
      updatedAt: game.updatedAt || null,
      views: game.views || 0
    });
    setCurrentUpdateVersion('');
    setCurrentUpdateLog('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleScreenshotFilesUpload = (e) => {
    const files = Array.from(e.target.files);
    files.forEach(file => {
      if (file.size > 2 * 1024 * 1024) {
        alert("Kích thước file ảnh không được vượt quá 2MB!");
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setNewGame(prev => ({
          ...prev,
          screenshots: [...prev.screenshots, reader.result]
        }));
      };
      reader.readAsDataURL(file);
    });
  };

  const handleAddManualScreenshot = (e) => {
    e.preventDefault();
    if (!manualScreenshotUrl.trim()) return;
    setNewGame(prev => ({
      ...prev,
      screenshots: [...prev.screenshots, manualScreenshotUrl.trim()]
    }));
    setManualScreenshotUrl('');
  };

  const handleRemoveScreenshot = (idxToRemove) => {
    setNewGame(prev => ({
      ...prev,
      screenshots: prev.screenshots.filter((_, idx) => idx !== idxToRemove)
    }));
  };

  const handleAddGame = (e) => {
    e.preventDefault();
    const is18Plus = newGame.is18Vn || newGame.is18Uncensored || newGame.is18Pc || newGame.is18Android;
    
    // Xử lý tạo/nối thêm Nhật ký cập nhật
    let updatedHistory = [...(newGame.updateHistory || [])];
    let gameUpdatedAt = newGame.updatedAt || new Date().toISOString();

    if (currentUpdateVersion.trim() && currentUpdateLog.trim()) {
      const newLogEntry = {
        version: currentUpdateVersion.trim(),
        date: new Date().toLocaleDateString('vi-VN', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric'
        }),
        content: currentUpdateLog.trim()
      };
      // Thêm lên đầu mảng để bản mới nhất đứng trước
      updatedHistory = [newLogEntry, ...updatedHistory];
      gameUpdatedAt = new Date().toISOString();
    }

    const gameData = {
      ...newGame,
      price: Number(newGame.price),
      rating: Number(newGame.rating) || 5.0,
      downloads: Number(newGame.downloads) || 0,
      is18Plus,
      tags: typeof newGame.tags === 'string' ? newGame.tags.split(',').map(t => t.trim()).filter(Boolean) : newGame.tags,
      screenshots: Array.isArray(newGame.screenshots) ? newGame.screenshots : [],
      updateHistory: updatedHistory,
      updatedAt: gameUpdatedAt,
      views: newGame.views || 0
    };

    if (editingGameId) {
      updateGameInStore(editingGameId, gameData);
      alert('Cập nhật thành công!');
      setEditingGameId(null);
    } else {
      addGameToStore(gameData);
      alert('Thêm game thành công!');
    }
    setNewGame({
      title: '',
      price: 0,
      image: '',
      tags: '',
      description: '',
      developer: '',
      releaseDate: '',
      systemRequirements: '',
      screenshots: [],
      downloadUrl: '',
      rating: 5.0,
      downloads: 0,
      isNew: false,
      isPopular: false,
      isTopRated: false,
      is18Vn: false,
      is18Uncensored: false,
      is18Pc: false,
      is18Android: false,
      updateHistory: [],
      updatedAt: null,
      views: 0
    });
    setCurrentUpdateVersion('');
    setCurrentUpdateLog('');
  };

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      <h1 style={{ color: 'var(--color-text-light)', borderBottom: '1px solid var(--color-border)', paddingBottom: '1rem' }}>
        Bảng điều khiển Quản trị
      </h1>

      {/* Thống kê */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.5rem' }}>
        <div className="card" style={{ borderLeft: '4px solid var(--color-accent)' }}>
          <div style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>Tổng Tài khoản</div>
          <div style={{ fontSize: '1.5rem', color: 'var(--color-text-light)', fontWeight: 'bold' }}>{users.length}</div>
        </div>
        <div className="card" style={{ borderLeft: '4px solid var(--color-success)' }}>
          <div style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>Doanh thu</div>
          <div style={{ fontSize: '1.5rem', color: '#f8b319', fontWeight: 'bold' }}>{revenue.toLocaleString('vi-VN')} VNĐ</div>
        </div>
        <div className="card" style={{ borderLeft: '4px solid #f8b319' }}>
          <div style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>Số lượng Game</div>
          <div style={{ fontSize: '1.5rem', color: 'var(--color-text-light)', fontWeight: 'bold' }}>{games.length}</div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
        {/* Danh sách User */}
        <div className="card">
          <h2 style={{ color: 'var(--color-text-light)', marginBottom: '1.5rem', fontSize: '1.2rem' }}>Quản lý Người dùng</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {users.map(u => (
              <div key={u.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem', backgroundColor: 'var(--color-bg-main)', borderRadius: '4px', flexWrap: 'wrap', gap: '0.8rem' }}>
                <div style={{ flex: 1, minWidth: '150px' }}>
                  <div style={{ color: 'var(--color-text-light)', fontWeight: 'bold' }}>{u.username} {u.role === 'admin' && '⭐'}</div>
                  <div style={{ color: 'var(--color-text-muted)', fontSize: '0.8rem' }}>{u.email}</div>
                  <div style={{ color: 'var(--color-success)', fontSize: '0.9rem' }}>{(u.balance || 0).toLocaleString('vi-VN')} VNĐ</div>
                </div>
                {u.role !== 'admin' && (
                  <div style={{ display: 'flex', gap: '0.3rem', alignItems: 'center' }}>
                    {editingUserId === u.id ? (
                      <>
                        <input
                          type="number"
                          className="input-field"
                          placeholder="Số tiền"
                          value={balanceAmount}
                          onChange={e => setBalanceAmount(e.target.value)}
                          style={{ fontSize: '0.75rem', padding: '0.2rem 0.4rem', width: '70px', margin: 0 }}
                        />
                        <button
                          onClick={() => handleUpdateBalance(u.id, u.balance, 'add')}
                          className="btn btn-success"
                          style={{ fontSize: '0.7rem', padding: '0.2rem 0.5rem', backgroundColor: 'var(--color-success)', color: 'white' }}
                        >
                          Cộng
                        </button>
                        <button
                          onClick={() => handleUpdateBalance(u.id, u.balance, 'subtract')}
                          className="btn btn-outline"
                          style={{ fontSize: '0.7rem', padding: '0.2rem 0.5rem', color: '#ff4d4f' }}
                        >
                          Trừ
                        </button>
                        <button
                          onClick={() => {
                            setEditingUserId(null);
                            setBalanceAmount('');
                          }}
                          className="btn btn-outline"
                          style={{ fontSize: '0.7rem', padding: '0.2rem 0.4rem' }}
                        >
                          ✕
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          onClick={() => {
                            setEditingUserId(u.id);
                            setBalanceAmount('');
                          }}
                          className="btn btn-outline"
                          style={{ fontSize: '0.7rem', padding: '0.2rem 0.5rem' }}
                        >
                          ±
                        </button>
                        <button
                          onClick={() => handleAddBalance(u.id, u.balance)}
                          className="btn btn-outline"
                          style={{ fontSize: '0.75rem', padding: '0.2rem 0.4rem' }}
                        >
                          +500k
                        </button>
                      </>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Thêm/Sửa Game */}
        <div className="card">
          <h2 style={{ color: 'var(--color-text-light)', marginBottom: '1.5rem', fontSize: '1.2rem' }}>
            {editingGameId ? 'Chỉnh sửa Game' : 'Thêm Game Mới'}
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem', marginBottom: '1.5rem', padding: '1rem', backgroundColor: 'rgba(255, 255, 255, 0.02)', border: '1px solid var(--color-border)', borderRadius: '8px' }}>
            <label style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem', fontWeight: 600 }}>Tìm thông tin game bằng Tavily</label>
            <input
              type="password"
              className="input-field"
              placeholder="Nhập Tavily API Key..."
              value={tavilyApiKey}
              onChange={e => setTavilyApiKey(e.target.value)}
              style={{ fontSize: '0.85rem' }}
            />
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <input type="text" className="input-field" placeholder="Nhập tên game cần tìm..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} style={{ flex: 1 }} />
              <button type="button" onClick={handleSearchAI} className="btn" style={{ background: 'var(--color-accent)', color: 'white', padding: '0 1.5rem' }} disabled={isSearching}>
                {isSearching ? 'Đang tìm...' : 'Tavily'}
              </button>
            </div>
            <span style={{ color: 'var(--color-text-muted)', fontSize: '0.75rem' }}>Ưu tiên nguồn lớn: Steam, F95Zone, VNDB, itch.io, DLsite, GOG, Epic, MobyGames, IGDB. Kết quả trùng tên sẽ bị lọc.</span>
          </div>

          <form onSubmit={handleAddGame} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <input type="text" className="input-field" placeholder="Tên Game" value={newGame.title} onChange={e => setNewGame({...newGame, title: e.target.value})} required />
            <input type="text" className="input-field" placeholder="Link Ảnh Bìa" value={newGame.image} onChange={e => setNewGame({...newGame, image: e.target.value})} required />
            
            {/* Screenshots Gallery Section */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem', padding: '1rem', border: '1px solid var(--color-border)', borderRadius: '8px', backgroundColor: 'rgba(255,255,255,0.01)' }}>
              <span style={{ color: 'var(--color-text-light)', fontSize: '0.9rem', fontWeight: 600 }}>Ảnh minh họa (Screenshots)</span>
              
              {/* Screenshots Preview Grid */}
              {newGame.screenshots && newGame.screenshots.length > 0 ? (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(80px, 1fr))', gap: '0.6rem', maxHeight: '180px', overflowY: 'auto' }}>
                  {newGame.screenshots.map((url, idx) => (
                    <div key={idx} style={{ position: 'relative', width: '100%', aspectRatio: '16/9', borderRadius: '4px', overflow: 'hidden', border: '1px solid var(--color-border)' }}>
                      <img src={url} alt={`Screenshot ${idx}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      <button 
                        type="button" 
                        onClick={() => handleRemoveScreenshot(idx)} 
                        style={{
                          position: 'absolute',
                          top: '2px',
                          right: '2px',
                          width: '18px',
                          height: '18px',
                          borderRadius: '50%',
                          backgroundColor: 'rgba(255, 77, 79, 0.9)',
                          color: 'white',
                          border: 'none',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '10px',
                          padding: 0
                        }}
                      >
                        <X size={10} />
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', textAlign: 'center', padding: '0.5rem 0' }}>Chưa có ảnh minh họa nào.</div>
              )}

              {/* Upload screenshot from PC */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', borderTop: '1px dashed var(--color-border)', paddingTop: '0.6rem' }}>
                <label style={{ color: 'var(--color-text-muted)', fontSize: '0.8rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                  <Upload size={14} />
                  Tải file ảnh minh họa từ máy tính (Nhiều ảnh cùng lúc)
                </label>
                <input 
                  type="file" 
                  multiple 
                  accept="image/*" 
                  onChange={handleScreenshotFilesUpload} 
                  style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }} 
                />
              </div>

              {/* Enter screenshot URL manually */}
              <div style={{ display: 'flex', gap: '0.4rem', borderTop: '1px dashed var(--color-border)', paddingTop: '0.6rem' }}>
                <input 
                  type="text" 
                  placeholder="Hoặc dán Link ảnh online..." 
                  className="input-field" 
                  value={manualScreenshotUrl} 
                  onChange={e => setManualScreenshotUrl(e.target.value)} 
                  style={{ flex: 1, margin: 0, fontSize: '0.8rem', padding: '0.3rem 0.6rem' }} 
                />
                <button 
                  type="button" 
                  onClick={handleAddManualScreenshot} 
                  className="btn" 
                  style={{ fontSize: '0.8rem', padding: '0.3rem 0.8rem', background: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)', color: 'var(--color-text-light)' }}
                >
                  Thêm
                </button>
              </div>

            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <input type="number" className="input-field" placeholder="Giá (VND)" value={newGame.price} onChange={e => setNewGame({...newGame, price: e.target.value})} required />
              <input type="text" className="input-field" placeholder="Ngày phát hành (ví dụ: 15/05/2026 hoặc 2026-05-15)" value={newGame.releaseDate} onChange={e => setNewGame({...newGame, releaseDate: e.target.value})} />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <input type="number" className="input-field" placeholder="Đánh giá (ví dụ: 4.9)" min="0" max="5" step="0.1" value={newGame.rating} onChange={e => setNewGame({...newGame, rating: e.target.value})} />
              <input type="number" className="input-field" placeholder="Lượt tải/chơi" value={newGame.downloads} onChange={e => setNewGame({...newGame, downloads: e.target.value})} />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <input type="text" className="input-field" placeholder="Nhà phát triển" value={newGame.developer} onChange={e => setNewGame({...newGame, developer: e.target.value})} required />
              <input type="text" className="input-field" placeholder="Thể loại (cách nhau bằng dấu phẩy)" value={newGame.tags} onChange={e => setNewGame({...newGame, tags: e.target.value})} required />
            </div>

            <div style={{ padding: '1rem', backgroundColor: 'rgba(255,255,255,0.02)', border: '1px solid var(--color-border)', borderRadius: '8px', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <h3 style={{ color: 'var(--color-text-light)', fontSize: '0.95rem', fontWeight: 600, borderBottom: '1px solid var(--color-border)', paddingBottom: '0.5rem', margin: 0 }}>Hiển thị trong các mục:</h3>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                <span style={{ color: 'var(--color-accent)', fontSize: '0.85rem', fontWeight: 700 }}>DANH MỤC GAME HOT</span>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.8rem' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', color: 'var(--color-text-light)', fontSize: '0.85rem' }}>
                    <input type="checkbox" checked={newGame.isNew} onChange={e => setNewGame({...newGame, isNew: e.target.checked})} style={{ width: '16px', height: '16px', cursor: 'pointer', accentColor: 'var(--color-accent)' }} />
                    Game Mới Nhất
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', color: 'var(--color-text-light)', fontSize: '0.85rem' }}>
                    <input type="checkbox" checked={newGame.isPopular} onChange={e => setNewGame({...newGame, isPopular: e.target.checked})} style={{ width: '16px', height: '16px', cursor: 'pointer', accentColor: 'var(--color-accent)' }} />
                    Game Nhiều Người Chơi
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', color: 'var(--color-text-light)', fontSize: '0.85rem' }}>
                    <input type="checkbox" checked={newGame.isTopRated} onChange={e => setNewGame({...newGame, isTopRated: e.target.checked})} style={{ width: '16px', height: '16px', cursor: 'pointer', accentColor: 'var(--color-accent)' }} />
                    Game Đánh Giá Cao
                  </label>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', marginTop: '0.5rem' }}>
                <span style={{ color: '#ff4d4f', fontSize: '0.85rem', fontWeight: 700 }}>DANH MỤC GAME 18+</span>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.8rem' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', color: 'var(--color-text-light)', fontSize: '0.85rem' }}>
                    <input type="checkbox" checked={newGame.is18Vn} onChange={e => setNewGame({...newGame, is18Vn: e.target.checked})} style={{ width: '16px', height: '16px', cursor: 'pointer', accentColor: '#ff4d4f' }} />
                    Việt hoá 18
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', color: 'var(--color-text-light)', fontSize: '0.85rem' }}>
                    <input type="checkbox" checked={newGame.is18Uncensored} onChange={e => setNewGame({...newGame, is18Uncensored: e.target.checked})} style={{ width: '16px', height: '16px', cursor: 'pointer', accentColor: '#ff4d4f' }} />
                    Không che
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', color: 'var(--color-text-light)', fontSize: '0.85rem' }}>
                    <input type="checkbox" checked={newGame.is18Pc} onChange={e => setNewGame({...newGame, is18Pc: e.target.checked})} style={{ width: '16px', height: '16px', cursor: 'pointer', accentColor: '#ff4d4f' }} />
                    PC 18+
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', color: 'var(--color-text-light)', fontSize: '0.85rem' }}>
                    <input type="checkbox" checked={newGame.is18Android} onChange={e => setNewGame({...newGame, is18Android: e.target.checked})} style={{ width: '16px', height: '16px', cursor: 'pointer', accentColor: '#ff4d4f' }} />
                    Android 18+
                  </label>
                </div>
              </div>
            </div>

            <textarea className="input-field" placeholder="Mô tả" rows="3" value={newGame.description} onChange={e => setNewGame({...newGame, description: e.target.value})} required />
            <textarea className="input-field" placeholder="Cấu hình hệ thống" rows="2" value={newGame.systemRequirements} onChange={e => setNewGame({...newGame, systemRequirements: e.target.value})} />
            <input type="text" className="input-field" placeholder="Link Tải Game" value={newGame.downloadUrl} onChange={e => setNewGame({...newGame, downloadUrl: e.target.value})} required />
            
            {/* Nhật ký cập nhật Game mới (Tùy chọn) */}
            <div style={{ padding: '1rem', border: '1px solid var(--color-border)', borderRadius: '8px', backgroundColor: 'rgba(255,255,255,0.01)', display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
              <span style={{ color: 'var(--color-accent)', fontSize: '0.9rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <Plus size={16} /> Nhập Nhật ký Cập nhật Mới (Không bắt buộc)
              </span>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '0.8rem' }}>
                <input 
                  type="text" 
                  className="input-field" 
                  placeholder="Phiên bản (Ví dụ: v1.1)" 
                  value={currentUpdateVersion} 
                  onChange={e => setCurrentUpdateVersion(e.target.value)} 
                  style={{ margin: 0, fontSize: '0.85rem' }}
                />
                <span style={{ color: 'var(--color-text-muted)', fontSize: '0.8rem', alignSelf: 'center' }}>
                  * Để trống nếu không đổi phiên bản.
                </span>
              </div>
              
              <textarea 
                className="input-field" 
                placeholder="Nội dung cập nhật (Ví dụ: - Sửa lỗi crash game trên Windows 11\n- Cập nhật bản dịch Việt Hóa mới nhất)" 
                rows="3" 
                value={currentUpdateLog} 
                onChange={e => setCurrentUpdateLog(e.target.value)}
                style={{ margin: 0, fontSize: '0.85rem' }}
              />

              {/* Danh sách lịch sử cập nhật hiện tại (Nếu đang chỉnh sửa) */}
              {editingGameId && newGame.updateHistory && newGame.updateHistory.length > 0 && (
                <div style={{ marginTop: '0.5rem', borderTop: '1px dashed var(--color-border)', paddingTop: '0.5rem' }}>
                  <span style={{ fontSize: '0.8rem', color: 'var(--color-text-light)', fontWeight: 600, display: 'block', marginBottom: '0.4rem' }}>Lịch sử cập nhật hiện tại:</span>
                  <div style={{ maxHeight: '100px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                    {newGame.updateHistory.map((hist, idx) => (
                      <div key={idx} style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', display: 'flex', justifyContent: 'space-between', padding: '0.2rem', backgroundColor: 'rgba(255,255,255,0.02)', borderRadius: '4px' }}>
                        <span><strong>{hist.version}</strong> ({hist.date})</span>
                        <span style={{ textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap', maxWidth: '200px' }}>{hist.content}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div style={{ display: 'flex', gap: '1rem' }}>
              <button type="submit" className="btn btn-success" style={{ flex: 1, backgroundColor: 'var(--color-success)', color: 'white' }}>{editingGameId ? 'Cập nhật' : 'Thêm Game'}</button>
              {editingGameId && <button type="button" className="btn btn-outline" onClick={() => {
                setEditingGameId(null);
                setNewGame({ title: '', price: 0, image: '', tags: '', description: '', developer: '', releaseDate: '', systemRequirements: '', screenshots: [], downloadUrl: '', rating: 5.0, downloads: 0, isNew: false, isPopular: false, isTopRated: false, is18Vn: false, is18Uncensored: false, is18Pc: false, is18Android: false, updateHistory: [], updatedAt: null, views: 0 });
                setCurrentUpdateVersion('');
                setCurrentUpdateLog('');
              }}>Hủy</button>}
            </div>
          </form>
        </div>
      </div>

      <div className="card">
        <h2 style={{ color: 'var(--color-text-light)', marginBottom: '1.5rem', fontSize: '1.2rem' }}>Kho Game</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem' }}>
          {games.map(game => (
            <div key={game.id} style={{ display: 'flex', gap: '1rem', padding: '1rem', backgroundColor: 'var(--color-bg-main)', borderRadius: '8px', border: '1px solid var(--color-border)' }}>
              <img src={game.image} alt={game.title} style={{ width: '80px', height: '50px', objectFit: 'cover', borderRadius: '4px' }} />
              <div style={{ flex: 1 }}>
                <div style={{ color: 'var(--color-text-light)', fontSize: '0.9rem', fontWeight: 'bold' }}>{game.title}</div>
                <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                  <button onClick={() => handleEditClick(game)} className="btn btn-outline" style={{ fontSize: '0.7rem', padding: '0.2rem' }}>Sửa</button>
                  <button onClick={() => deleteGameFromStore(game.id)} className="btn btn-outline" style={{ fontSize: '0.7rem', padding: '0.2rem', color: '#ff4d4f' }}>Xóa</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default Admin;
