async function e(e,t=10){if(!e)return[];let n=`https://api.rawg.io/api/games?search=${encodeURIComponent(e)}&page_size=${t}&key=YOUR_RAWG_API_KEY`;try{let e=await fetch(n);return e.ok?(await e.json()).results||[]:(console.error(`Failed to fetch game data:`,e.statusText),[])}catch(e){return console.error(`Error fetching game data:`,e),[]}}async function t(e){let t=[`gemini-2.5-flash`,`gemini-2.5-flash-lite`,`gemini-2.0-flash`,`gemini-2.0-flash-lite`,`gemini-1.5-flash`];try{let n=await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${e}`),r=await n.json().catch(()=>({}));if(!n.ok||r?.error)return t;let i=(r.models||[]).filter(e=>e.supportedGenerationMethods?.includes(`generateContent`)).map(e=>e.name?.replace(/^models\//,``)).filter(Boolean),a=t.filter(e=>i.includes(e)),o=i.filter(e=>e.includes(`gemini`)&&!a.includes(e));return[...a,...o]}catch(e){return console.warn(`Gemini model list warning:`,e.message),t}}async function n(e,n,r={},i=null){if(!e)throw Error(`Game name is required`);let a=i||(typeof window<`u`?localStorage.getItem(`web18p_gemini_api_key`):null)||`YOUR_GEMINI_API_KEY`;if(!a||a===`YOUR_GEMINI_API_KEY`)throw Error(`Chưa cấu hình Gemini API Key. Vui lòng nhập Gemini API Key ở mục Cấu hình trong trang Admin.`);let o=[];r.genres?.length&&o.push(`Genres: ${r.genres.map(e=>e.name).join(`, `)}`),r.platforms?.length&&o.push(`Platforms: ${r.platforms.map(e=>e.platform?.name).filter(Boolean).join(`, `)}`),r.rating&&o.push(`RAWG Rating: ${r.rating}/5`),r.metacritic&&o.push(`Metacritic: ${r.metacritic}/100`);let s=`You are a professional gaming journalist with deep knowledge of PC gaming hardware.
Analyze the game "${e}" (released: ${n}).${o.length>0?`\nAdditional verified info: ${o.join(` | `)}`:``}

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
}`,c=await t(a),l=null;for(let e of c)try{let t=await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${e}:generateContent?key=${a}`,{method:`POST`,headers:{"Content-Type":`application/json`},body:JSON.stringify({contents:[{parts:[{text:s}]}],generationConfig:{temperature:.2,topP:.8,topK:40,responseMimeType:`application/json`}})});if(!t.ok){let n=await t.text();throw Error(`Gemini API error for model ${e}: ${t.status} - ${n}`)}let n=await t.json();if(!n.candidates||!n.candidates[0]?.content?.parts?.[0]?.text)throw Error(`Invalid response structure for model ${e}`);let r=n.candidates[0].content.parts[0].text.trim();r.startsWith("```json")&&(r=r.slice(7)),r.startsWith("```")&&(r=r.slice(3)),r.endsWith("```")&&(r=r.slice(0,-3)),r=r.trim();let i=JSON.parse(r);for(let e of[`seo_title`,`summary`,`gameplay`,`system_requirements`,`faq`])i[e]||console.warn(`Missing field in AI response: ${e}`);return i.system_requirements&&typeof i.system_requirements==`string`&&(i.system_requirements={minimum:i.system_requirements,recommended:`Không có thông tin cụ thể`}),i}catch(t){console.warn(`Model ${e} failed to generate content:`,t.message),l=t}throw l||Error(`Tất cả các model Gemini đều không phản hồi thành công.`)}export{e as n,n as t};