import fs from 'fs';
import { translate } from '@vitalets/google-translate-api';

const filePath = "C:\\Users\\Admin\\Downloads\\tạm\\保险女销售4K.srt";

async function processSrt(filePath) {
    console.log(`Processing ${filePath}...`);
    const content = fs.readFileSync(filePath, 'utf8');
    
    const blocks = content.trim().split(/\r?\n\r?\n/);
    
    const translateQueue = [];
    
    for (let i = 0; i < blocks.length; i++) {
        const block = blocks[i];
        const lines = block.split(/\r?\n/);
        
        if (lines.length >= 3) {
            const textLines = lines.slice(2).join('\n');
            if (/[\u4e00-\u9fa5]/.test(textLines)) {
                translateQueue.push({ index: i, originalText: textLines });
            }
        }
    }
    
    console.log(`Found ${translateQueue.length} blocks to translate in ${filePath}`);
    
    const CHUNK_SIZE = 10;
    for (let i = 0; i < translateQueue.length; i += CHUNK_SIZE) {
        const chunk = translateQueue.slice(i, i + CHUNK_SIZE);
        const combinedText = chunk.map(item => item.originalText).join(' ||| ');
        
        try {
            const res = await translate(combinedText, { from: 'zh-CN', to: 'vi' });
            let translatedChunks = res.text.split(/\s*\|\|\|\s*/);
            
            if (translatedChunks.length === chunk.length) {
                for (let j = 0; j < chunk.length; j++) {
                    chunk[j].translatedText = translatedChunks[j];
                }
            } else {
                console.error(`Chunk mismatch: expected ${chunk.length}, got ${translatedChunks.length}. Fallback to one-by-one.`);
                for (let j = 0; j < chunk.length; j++) {
                    try {
                        const r = await translate(chunk[j].originalText, { from: 'zh-CN', to: 'vi' });
                        chunk[j].translatedText = r.text;
                        await new Promise(res => setTimeout(res, 300));
                    } catch(e) {
                         console.error("Fallback translation failed for block", chunk[j].index);
                         chunk[j].translatedText = chunk[j].originalText; // fallback
                    }
                }
            }
            await new Promise(res => setTimeout(res, 1000));
        } catch (e) {
            console.error(`Error translating chunk:`, e.message);
            // Fallback
            for (let j = 0; j < chunk.length; j++) {
                try {
                    const r = await translate(chunk[j].originalText, { from: 'zh-CN', to: 'vi' });
                    chunk[j].translatedText = r.text;
                    await new Promise(res => setTimeout(res, 300));
                } catch(err) {
                    chunk[j].translatedText = chunk[j].originalText;
                }
            }
        }
        
        // Re-assemble the blocks
        for (let j = 0; j < chunk.length; j++) {
            const blockIndex = chunk[j].index;
            const lines = blocks[blockIndex].split(/\r?\n/);
            // Some translations might remove the internal \n, but it's okay for subtitle text
            const newBlockLines = [lines[0], lines[1], chunk[j].translatedText];
            blocks[blockIndex] = newBlockLines.join('\n');
        }
    }
    
    fs.writeFileSync(filePath, blocks.join('\n\n'), 'utf8');
    console.log(`Finished writing ${filePath}`);
}

processSrt(filePath).catch(console.error);
