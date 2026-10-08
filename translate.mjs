import fs from 'fs';
import { translate } from '@vitalets/google-translate-api';

const files = [
    "C:\\Users\\Admin\\Downloads\\tạm\\香蕉香油 清纯同事的秘密2_ugta_video_project\\video_subtitle.vi.ass",
    "C:\\Users\\Admin\\Downloads\\tạm\\少女洗澡间被袭guoman18_ugta_video_project\\video_subtitle.vi.ass",
    "C:\\Users\\Admin\\Downloads\\tạm\\香蕉香油 清纯同事的秘密1_ugta_video_project\\video_subtitle.vi.ass"
];

async function processFile(filePath) {
    console.log(`Processing ${filePath}...`);
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split(/\r?\n/);
    
    const translateQueue = [];
    
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (line.startsWith('Dialogue:')) {
            const parts = line.split(',');
            if (parts.length >= 10) {
                const textPart = parts.slice(9).join(',');
                if (/[\u4e00-\u9fa5]/.test(textPart)) {
                    const tags = [];
                    let textToTranslate = textPart.replace(/\{[^}]+\}/g, (match) => {
                        tags.push(match);
                        return `[T${tags.length - 1}]`;
                    });
                    translateQueue.push({ index: i, originalText: textPart, textToTranslate, tags });
                }
            }
        }
    }
    
    console.log(`Found ${translateQueue.length} lines to translate in ${filePath}`);
    
    // Chunking to avoid rate limits
    const CHUNK_SIZE = 20; // smaller chunk size to be safer about newline preservation
    for (let i = 0; i < translateQueue.length; i += CHUNK_SIZE) {
        const chunk = translateQueue.slice(i, i + CHUNK_SIZE);
        const combinedText = chunk.map(item => item.textToTranslate).join(' \n ');
        
        try {
            const res = await translate(combinedText, { from: 'zh-CN', to: 'vi' });
            let translatedChunks = res.text.split(/\n/);
            // Trim each chunk and remove empty ones if they occurred due to translation artifacts
            translatedChunks = translatedChunks.map(s => s.trim()).filter(s => s.length > 0);
            
            if (translatedChunks.length === chunk.length) {
                for (let j = 0; j < chunk.length; j++) {
                    let translatedText = translatedChunks[j];
                    chunk[j].tags.forEach((tag, index) => {
                        // Ensure it replaces case insensitively because translation might alter casing of [T0] to [t0]
                        translatedText = translatedText.replace(new RegExp(`\\[T${index}\\]`, 'gi'), tag);
                    });
                    
                    const line = lines[chunk[j].index];
                    const parts = line.split(',');
                    const prefix = parts.slice(0, 9).join(',') + ',';
                    lines[chunk[j].index] = prefix + translatedText;
                }
            } else {
                console.error(`Chunk length mismatch: expected ${chunk.length}, got ${translatedChunks.length}. Doing one-by-one for this chunk...`);
                // Fallback: translate one by one with a small delay
                for (let j = 0; j < chunk.length; j++) {
                     try {
                         const r = await translate(chunk[j].textToTranslate, { from: 'zh-CN', to: 'vi' });
                         let translatedText = r.text;
                         chunk[j].tags.forEach((tag, index) => {
                             translatedText = translatedText.replace(new RegExp(`\\[T${index}\\]`, 'gi'), tag);
                         });
                         const line = lines[chunk[j].index];
                         const parts = line.split(',');
                         const prefix = parts.slice(0, 9).join(',') + ',';
                         lines[chunk[j].index] = prefix + translatedText;
                         await new Promise(res => setTimeout(res, 300));
                     } catch(e) {
                         console.error("Fallback translation failed for a line:", e.message);
                     }
                }
            }
            await new Promise(res => setTimeout(res, 1000)); // Delay between chunks
        } catch (e) {
            console.error(`Error translating chunk:`, e.message);
            // Attempt one by one fallback on global error
            for (let j = 0; j < chunk.length; j++) {
                try {
                    const r = await translate(chunk[j].textToTranslate, { from: 'zh-CN', to: 'vi' });
                    let translatedText = r.text;
                    chunk[j].tags.forEach((tag, index) => {
                        translatedText = translatedText.replace(new RegExp(`\\[T${index}\\]`, 'gi'), tag);
                    });
                    const line = lines[chunk[j].index];
                    const parts = line.split(',');
                    const prefix = parts.slice(0, 9).join(',') + ',';
                    lines[chunk[j].index] = prefix + translatedText;
                    await new Promise(res => setTimeout(res, 500));
                } catch(err) {
                    console.error("Fallback translation failed for a line:", err.message);
                }
            }
        }
    }
    
    fs.writeFileSync(filePath, lines.join('\n'), 'utf8');
    console.log(`Finished ${filePath}`);
}

async function main() {
    for (const file of files) {
        if (fs.existsSync(file)) {
            await processFile(file);
        } else {
            console.log(`File not found: ${file}`);
        }
    }
}

main().catch(console.error);
