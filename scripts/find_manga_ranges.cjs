const BOT_TOKEN = '8762474365:AAE8cgyYGC8GoV6tQ5mZi7Ye8tj5Du-FQpo';
const CHANNEL_ID = '-1004320007781';
const USER_ID = '6221846602';

async function scan() {
  console.log('--- Đang quét các mốc tin nhắn trên kênh Telegram ---');
  // We check sample messages
  const checkIds = [];
  for (let id = 540; id <= 3500; id += 25) checkIds.push(id);
  for (let id = 5960; id <= 9500; id += 25) checkIds.push(id);

  const foundTitles = new Map();

  for (let i = 0; i < checkIds.length; i++) {
    const id = checkIds[i];
    try {
      const res = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/forwardMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: USER_ID, from_chat_id: CHANNEL_ID, message_id: id, disable_notification: true })
      }).then(r => r.json());

      if (res.ok && res.result) {
        const caption = res.result.caption || '';
        if (caption) {
          const firstLine = caption.split('\n')[0];
          console.log(`[Msg ${id}] ${caption.replace(/\n/g, ' | ')}`);
        }
        await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/deleteMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ chat_id: USER_ID, message_id: res.result.message_id })
        });
      }
    } catch (e) {}

    await new Promise(r => setTimeout(r, 40));
  }

  console.log('--- Hoàn tất quét mốc ---');
  process.exit(0);
}

scan().catch(console.error);
