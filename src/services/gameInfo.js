// Service to fetch game information from the RAWG Video Games Database API
// Documentation: https://rawg.io/apidocs
// This simple wrapper provides a function to search games by name.

const API_KEY = "YOUR_RAWG_API_KEY"; // Replace with your actual API key if required
const BASE_URL = "https://api.rawg.io/api/games";

// Gemini API configuration
const GEMINI_API_KEY = "YOUR_GEMINI_API_KEY"; // Replace with your actual Gemini API key
const GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent";

/**
 * Search for games matching the given query.
 * @param {string} query - The search term (game name).
 * @param {number} [pageSize=10] - Number of results to return.
 * @returns {Promise<Array>} Resolves to an array of game objects.
 */
export async function searchGames(query, pageSize = 10) {
  if (!query) return [];
  const url = `${BASE_URL}?search=${encodeURIComponent(query)}&page_size=${pageSize}&key=${API_KEY}`;
  try {
    const response = await fetch(url);
    if (!response.ok) {
      console.error('Failed to fetch game data:', response.statusText);
      return [];
    }
    const data = await response.json();
    return data.results || [];
  } catch (err) {
    console.error('Error fetching game data:', err);
    return [];
  }
}

/**
 * Generate game content (review, system requirements, etc.) using Gemini AI.
 * @param {string} gameName - The standardized game name from RAWG.
 * @param {string} releasedDate - The release date of the game from RAWG (YYYY-MM-DD).
 * @returns {Promise<Object>} A promise that resolves to an object containing SEO title, summary, gameplay, system requirements, and FAQ.
 */
export async function generateGameContentWithGemini(gameName, releasedDate) {
  if (!gameName) throw new Error('Game name is required');

  const prompt = `
You are a professional gaming journalist. Analyze the game "${gameName}" (released: ${releasedDate}).
Provide a detailed post for a gaming website in Vietnamese.

You MUST respond strictly in JSON format matching the following structure:
{
  "seo_title": "Tiêu đề bài viết chuẩn SEO bài viết",
  "summary": "Tóm tắt ngắn gọn về game (khoảng 2-3 câu)",
  "gameplay": "Đánh giá chi tiết về lối chơi, đồ họa, âm thanh (viết dài, cuốn hút, chia đoạn bằng thẻ <p>)",
  "system_requirements": {
    "minimum": "Cấu hình tối thiểu (CPU, GPU, RAM...)",
    "recommended": "Cấu hình đề nghị (CPU, GPU, RAM...)"
  },
  "faq": "Một mẹo nhỏ hoặc câu hỏi thường gặp khi chơi game này"
}

Do not include any markdown formatting like \`\`\`json or regular text outside the JSON object.
  `.trim();

  try {
    const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
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
      throw new Error(`Gemini API error: ${response.status}`);
    }

    const data = await response.json();
    // Extract the text content from the response
    const text = data.candidates[0].content.parts[0].text;
    // Parse the JSON string
    const jsonData = JSON.parse(text);
    return jsonData;
  } catch (err) {
    console.error('Error generating game content with Gemini:', err);
    throw err;
  }
}