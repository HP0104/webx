// Service to fetch game information from the RAWG Video Games Database API
// Documentation: https://rawg.io/apidocs
// This simple wrapper provides a function to search games by name.

const RAWG_STORAGE_KEY = 'web18p_rawg_api_key';
const API_KEY = import.meta.env.VITE_RAWG_API_KEY || "YOUR_RAWG_API_KEY"; // Replace with your actual API key if required
const BASE_URL = "https://api.rawg.io/api/games";

// Gemini API configuration
const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY || "YOUR_GEMINI_API_KEY"; // Replace with your actual Gemini API key

/**
 * Get active RAWG API Key
 */
export function getActiveRawgKey() {
  const custom = typeof window !== 'undefined' ? localStorage.getItem(RAWG_STORAGE_KEY) : null;
  return (custom && custom.trim()) || (API_KEY !== 'YOUR_RAWG_API_KEY' ? API_KEY : '');
}

/**
 * Search for games matching the given query.
 * @param {string} query - The search term (game name).
 * @param {number} [pageSize=10] - Number of results to return.
 * @returns {Promise<Array>} Resolves to an array of game objects.
 */
export async function searchGames(query, pageSize = 10) {
  if (!query) return [];
  const activeRawgKey = getActiveRawgKey();
  if (!activeRawgKey) {
    throw new Error('Chưa cấu hình RAWG API Key. Vui lòng thêm VITE_RAWG_API_KEY vào .env hoặc cấu hình trong Admin.');
  }

  const url = `${BASE_URL}?search=${encodeURIComponent(query)}&page_size=${pageSize}&key=${activeRawgKey}`;
  try {
    const response = await fetch(url);
    if (!response.ok) {
      if (response.status === 401) {
        throw new Error('RAWG API Key không hợp lệ hoặc đã hết hạn.');
      }
      throw new Error(`Lỗi kết nối RAWG Database (${response.status}: ${response.statusText})`);
    }
    const data = await response.json();
    return data.results || [];
  } catch (err) {
    console.error('Error fetching game data:', err);
    throw err;
  }
}

/**
 * Helper to get available Gemini models using the API key
 */
async function getAvailableGeminiModels(apiKey) {
  const PREFERRED_GEMINI_MODELS = [
    'gemini-2.5-flash',
    'gemini-2.0-flash',
    'gemini-1.5-flash'
  ];
  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
    const data = await response.json().catch(() => ({}));
    if (!response.ok || data?.error) {
      return PREFERRED_GEMINI_MODELS;
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
}

/**
 * Generate game content (review, system requirements, etc.) using Gemini AI.
 * Uses the standardized game.name from RAWG for better accuracy.
 * Enforces JSON response mode and low temperature for factual output.
 * 
 * @param {string} gameName - The standardized game name from RAWG (not the raw user query).
 * @param {string} releasedDate - The release date of the game from RAWG (YYYY-MM-DD).
 * @param {Object} [extraContext] - Additional context from RAWG (genres, platforms, rating, etc.)
 * @param {string} [apiKey] - Optional Gemini API Key. If omitted, will check localStorage and default config.
 * @returns {Promise<Object>} A promise that resolves to structured game content.
 */
export async function generateGameContentWithGemini(gameName, releasedDate, extraContext = {}, apiKey = null) {
  if (!gameName) throw new Error('Game name is required');

  const activeKey = apiKey || (typeof window !== 'undefined' ? localStorage.getItem("web18p_gemini_api_key") : null) || GEMINI_API_KEY;
  if (!activeKey || activeKey === "YOUR_GEMINI_API_KEY") {
    throw new Error('Chưa cấu hình Gemini API Key. Vui lòng nhập Gemini API Key ở mục Cấu hình trong trang Admin.');
  }

  // Build rich context from RAWG data to help Gemini be more accurate
  const contextParts = [];
  if (extraContext.genres?.length) {
    contextParts.push(`Genres: ${extraContext.genres.map(g => g.name).join(', ')}`);
  }
  if (extraContext.platforms?.length) {
    contextParts.push(`Platforms: ${extraContext.platforms.map(p => p.platform?.name).filter(Boolean).join(', ')}`);
  }
  if (extraContext.rating) {
    contextParts.push(`RAWG Rating: ${extraContext.rating}/5`);
  }
  if (extraContext.metacritic) {
    contextParts.push(`Metacritic: ${extraContext.metacritic}/100`);
  }
  const additionalContext = contextParts.length > 0 
    ? `\nAdditional verified info: ${contextParts.join(' | ')}` 
    : '';

  const prompt = `You are a professional gaming journalist with deep knowledge of PC gaming hardware.
Analyze the game "${gameName}" (released: ${releasedDate}).${additionalContext}

Write a detailed, engaging post for a Vietnamese gaming website.

CRITICAL RULES:
- Only provide REAL, verified system requirements. Do NOT invent fake specs.
- If you are unsure about exact system requirements, state the most commonly referenced specs from official sources.
- Write gameplay review in Vietnamese, make it engaging and detailed.
- Split the gameplay section into multiple paragraphs using <p> HTML tags.
- The seo_title must be optimized for SEO and written in Vietnamese.

Respond with a JSON object matching this exact structure:
{
  "seo_title": "string - SEO optimized Vietnamese title for the article",
  "summary": "string - Brief 2-3 sentence summary of the game in Vietnamese",
  "gameplay": "string - Detailed gameplay review in Vietnamese with <p> tags for paragraphs",
  "system_requirements": {
    "minimum": "string - Minimum PC specs (CPU, GPU, RAM, Storage)",
    "recommended": "string - Recommended PC specs (CPU, GPU, RAM, Storage)"
  },
  "faq": "string - A useful tip or FAQ about playing this game in Vietnamese"
}`;

  const models = await getAvailableGeminiModels(activeKey);
  let lastError = null;

  for (const model of models) {
    try {
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${activeKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{
            parts: [{ text: prompt }]
          }],
          generationConfig: {
            temperature: 0.2,
            topP: 0.8,
            topK: 40,
            responseMimeType: "application/json"
          }
        })
      });

      if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(`Gemini API error for model ${model}: ${response.status} - ${errorBody}`);
      }

      const data = await response.json();
      if (!data.candidates || !data.candidates[0]?.content?.parts?.[0]?.text) {
        throw new Error(`Invalid response structure for model ${model}`);
      }

      const text = data.candidates[0].content.parts[0].text;
      let cleanText = text.trim();
      if (cleanText.startsWith('```json')) {
        cleanText = cleanText.slice(7);
      }
      if (cleanText.startsWith('```')) {
        cleanText = cleanText.slice(3);
      }
      if (cleanText.endsWith('```')) {
        cleanText = cleanText.slice(0, -3);
      }
      cleanText = cleanText.trim();

      const jsonData = JSON.parse(cleanText);

      // Normalize gameplay to string
      if (Array.isArray(jsonData.gameplay)) {
        jsonData.gameplay = jsonData.gameplay.join('\n\n');
      } else if (typeof jsonData.gameplay !== 'string') {
        jsonData.gameplay = String(jsonData.gameplay || '');
      }

      // Normalize FAQ to string
      if (Array.isArray(jsonData.faq)) {
        jsonData.faq = jsonData.faq.map(item => {
          if (typeof item === 'object' && item !== null) {
            return `Q: ${item.question || item.q || ''}\nA: ${item.answer || item.a || ''}`;
          }
          return String(item);
        }).join('\n\n');
      } else if (typeof jsonData.faq === 'object' && jsonData.faq !== null) {
        jsonData.faq = `Q: ${jsonData.faq.question || jsonData.faq.q || ''}\nA: ${jsonData.faq.answer || jsonData.faq.a || ''}`;
      } else {
        jsonData.faq = String(jsonData.faq || '');
      }

      // Ensure system_requirements has the expected structure
      if (!jsonData.system_requirements) {
        jsonData.system_requirements = { minimum: 'N/A', recommended: 'N/A' };
      } else if (typeof jsonData.system_requirements === 'string') {
        jsonData.system_requirements = {
          minimum: jsonData.system_requirements,
          recommended: 'Không có thông tin cụ thể'
        };
      }

      return jsonData;
    } catch (err) {
      console.warn(`Model ${model} failed to generate content:`, err.message);
      lastError = err;
    }
  }

  throw lastError || new Error('Tất cả các model Gemini đều không phản hồi thành công.');
}