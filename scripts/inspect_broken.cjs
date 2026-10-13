const { initializeApp } = require('firebase/app');
const { getFirestore, doc, getDoc } = require('firebase/firestore');

const firebaseConfig = {
  apiKey: 'AIzaSyBu21BND7UH8gbWEWYYJw2Ih02MJ_twz5A',
  authDomain: 'webk-a064e.firebaseapp.com',
  projectId: 'webk-a064e'
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const brokenIds = [
  '1788983108477',
  '1789225571301',
  '1789226219331',
  '1789227438028',
  '1789749805106',
  '1791559799510',
  '1791528146912'
];

async function inspect() {
  for (const id of brokenIds) {
    const d = await getDoc(doc(db, 'manga', id));
    if (!d.exists()) continue;
    const m = d.data();
    console.log(`=== [${id}] ${m.title} ===`);
    console.log('Cover:', m.cover);
    console.log(`Chapters (${m.chapters?.length}):`);
    m.chapters?.forEach((c, idx) => {
      console.log(`  [${idx}] id=${c.id}, number=${c.number}, title="${c.title}", pages=${c.images?.length}, firstUrl=${c.images?.[0] ? c.images[0].slice(0, 95) : 'none'}`);
    });
  }
  process.exit(0);
}
inspect();
