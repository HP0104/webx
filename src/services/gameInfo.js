// Service to fetch game information from the RAWG Video Games Database API
// Documentation: https://rawg.io/apidocs
// This simple wrapper provides a function to search games by name.

const API_KEY = "YOUR_RAWG_API_KEY"; // Replace with your actual API key if required
const BASE_URL = "https://api.rawg.io/api/games";

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
