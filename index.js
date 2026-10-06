require("dotenv").config();

const fs = require("fs");
const path = require("path");
const axios = require("axios");
const yts = require("yt-search");
const {
  default: makeWASocket,
  useMultiFileAuthState,
  DisconnectReason,
  Browsers,
  fetchLatestBaileysVersion,
  isJidBroadcast
} = require("@whiskeysockets/baileys");

const PREFIX = process.env.PREFIX || ".";
const PHONE_NUMBER = process.env.PHONE_NUMBER || "";
const DATA_FILE = path.join(__dirname, "data.json");
const AUTH_DIR = path.join(__dirname, "auth_info");
const MUSIC_DIR = path.join(__dirname, "music");

if (!fs.existsSync(MUSIC_DIR)) {
  fs.mkdirSync(MUSIC_DIR, { recursive: true });
}

const MENU = `
🧭 Comenzi disponibile:
• .meniu — această listă
• .ping — verifică dacă botul răspunde
• .tagall — menționează membrii grupului

FUN:
.noroc · .zar · .coinflip · .8ball · .ghiceste · .gluma · .citat · .dragoste · .compatibilitate · .horoscop · .slap · .hug · .kiss · .meme · .fact · .intrebare · .adevar · .provocare · .roast · .compliment

JOCURI:
.xox · .spinzuratoare · .ghiceste-numarul · .rps · .quiz · .trivia · .matematica · .anagrama · .fazan · .cuvinte · .tictactoe · .blackjack · .poker · .slot · .ruleta · .zaruri · .ghicitoare · .puzzle · .labirint · .snake · .tetris · .2048 · .minesweeper · .connect4 · .battleship · .uno · .memory · .simon · .typing · .mathduel

ECONOMIE & RPG:
.balanta · .munca · .zilnic · .magazin · .cumpara · .inventar · .top · .nivel · .profil · .caseta · .jefuieste · .banca · .transfer · .pariaza · .loto · .ferma · .pescuieste · .mineaza · .quest · .clan

UTIL & GRUP:
.afk · .poll · .vot · .reminder · .calc · .traduce · .vreme · .stire · .imagine · .sticker · .toimg · .audio · .yt · .tiktok · .insta · .qr · .scurtare · .parola · .color · .ascii · .reverse · .invers · .numara · .statistici · .info-grup · .link-grup · .promoveaza · .retrogradeaza · .kick · .welcome

MEDIA & AUDIO:
.play <melodie> — caută și descarcă muzică de pe YouTube
.ytaudio <link> — descarcă audio din YouTube
.spotify <melodie> — caută pe Spotify
.soundcloud <melodie> — caută pe SoundCloud
.anime · .manga · .waifu · .naruto · .onepiece · .akira
`;

const randomFrom = (arr) => arr[Math.floor(Math.random() * arr.length)];

function ensureDataFile() {
  if (!fs.existsSync(DATA_FILE)) {
    const initial = { users: {}, reminders: [], playlist: [] };
    fs.writeFileSync(DATA_FILE, JSON.stringify(initial, null, 2), "utf8");
  }
}

function readData() {
  ensureDataFile();
  return JSON.parse(fs.readFileSync(DATA_FILE, "utf8"));
}

function saveData(data) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), "utf8");
}

function getUser(senderId) {
  const data = readData();
  if (!data.users[senderId]) {
    data.users[senderId] = { balance: 1000, level: 1, xp: 0, inventory: [], lastDaily: null, afk: false };
    saveData(data);
  }
  return data.users[senderId];
}

function addBalance(senderId, amount) {
  const data = readData();
  if (!data.users[senderId]) data.users[senderId] = getUser(senderId);
  data.users[senderId].balance += amount;
  saveData(data);
  return data.users[senderId].balance;
}

function reverseString(str) {
  return String(str).split("").reverse().join("");
}

function parseExpression(expr) {
  try {
    return Function(`"use strict"; return (${expr})`)();
  } catch {
    return null;
  }
}

async function fetchMeme() {
  try {
    const res = await axios.get("https://meme-api.com/gimme");
    return res.data?.url || null;
  } catch {
    return null;
  }
}

async function fetchJikan(type, query) {
  try {
    const url = `https://api.jikan.moe/v4/${type}?q=${encodeURIComponent(query)}&limit=1`;
    const res = await axios.get(url);
    return res.data?.data?.[0] || null;
  } catch {
    return null;
  }
}

async function searchYoutube(query) {
  try {
    const res = await yts(query);
    if (!res?.videos?.length) return null;
    return res.videos[0];
  } catch {
    return null;
  }
}

async function downloadYoutubeAudio(videoUrl, outputPath) {
  return new Promise((resolve, reject) => {
    try {
      const { execSync } = require("child_process");
      const command = `yt-dlp -x --audio-format mp3 --audio-quality 192K -o "${outputPath}.mp3" "${videoUrl}"`;
      console.log(`📥 Descarcă: ${videoUrl}`);
      execSync(command, { stdio: "pipe" });
      const finalPath = `${outputPath}.mp3`;
      if (fs.existsSync(finalPath)) {
        resolve(finalPath);
      } else {
        reject(new Error("Fișierul nu a fost creat"));
      }
    } catch (error) {
      reject(new Error(`Eroare descărcare: ${error.message}`));
    }
  });
}

async function searchSpotify(query) {
  try {
    return `🎵 Spotify: ${query} - https://open.spotify.com/search/${encodeURIComponent(query)}`;
  } catch {
    return `🎵 Căutare Spotify: ${query}`;
  }
}

async function searchSoundCloud(query) {
  try {
    return `🎧 SoundCloud: ${query} - https://soundcloud.com/search?q=${encodeURIComponent(query)}`;
  } catch {
    return null;
  }
}

async function tagAllInGroup(sock, groupJid) {
  try {
    const metadata = await sock.groupMetadata(groupJid);
    const participants = metadata.participants.map((p) => p.id);
    const mentions = participants.map((id) => `@${id.replace(/@.*$/, "")}`).join(" ");
    await sock.sendMessage(groupJid, {
      text: `📢 ${metadata.subject}\n${mentions}`,
      mentions: participants
    });
  } catch (error) {
    console.error("Eroare tagall:", error);
  }
}

async function handlePlayCommand(sock, remoteJid, query) {
  try {
    const video = await searchYoutube(query);
    if (!video) {
      return "❌ Nu am găsit melodia pe YouTube.";
    }

    console.log(`🎵 Găsit: ${video.title}`);
    const sanitizedTitle = video.title.replace(/[^a-z0-9]/gi, "_").slice(0, 50);
    const outputPath = path.join(MUSIC_DIR, sanitizedTitle);
    const audioFile = `${outputPath}.mp3`;

    if (!fs.existsSync(audioFile)) {
      await sock.sendMessage(remoteJid, {
        text: `⏳ Se descarcă: ${video.title}...\n🔗 ${video.url}`
      });

      try {
        await downloadYoutubeAudio(video.url, outputPath);
      } catch (dlError) {
        return `⚠️ Eroare descărcare: ${dlError.message}\n\n🔗 Ascultă direct: ${video.url}`;
      }
    }

    if (fs.existsSync(audioFile)) {
      const fileSize = fs.statSync(audioFile).size;
      if (fileSize > 100 * 1024 * 1024) {
        return `⚠️ Fișierul e prea mare (${(fileSize / 1024 / 1024).toFixed(2)} MB).\n🔗 Ascultă: ${video.url}`;
      }

      await sock.sendMessage(remoteJid, {
        audio: fs.readFileSync(audioFile),
        mimetype: "audio/mpeg",
        ptt: false
      });

      return `✅ Trimis: ${video.title}\n⏱️ Durată: ${video.duration}`;
    }
  } catch (error) {
    console.error("Eroare play:", error);
    return `⚠️ Eroare: ${error.message}`;
  }
}

async function handleCommand({ sock, msg, command, args, senderId, isGroup, groupJid }) {
  const text = args.join(" ");

  switch (command.toLowerCase()) {
    case "ping": return `🏓 Pong! Botul răspunde normal.`;
    case "meniu": return MENU;
    case "tagall":
      if (!isGroup) return "⚠️ Comanda funcționează doar în grup.";
      await tagAllInGroup(sock, groupJid);
      return null;
    case "noroc": return `🍀 Norocul tău: ${Math.floor(Math.random() * 101)}%`;
    case "zar": return `🎲 Ai dat: ${Math.floor(Math.random() * 6) + 1}`;
    case "coinflip": return Math.random() < 0.5 ? "🪙 Cap" : "🪙 Pajură";
    case "8ball": return randomFrom(["Da.", "Nu.", "Probabil da.", "Probabil nu.", "Întreabă din nou mai târziu.", "Nu pot prezice acum.", "Sigur!", "E foarte puțin probabil."]);
    case "ghiceste":
      if (!args[0]) return "🎯 Scrie un număr între 1 și 10. Exemplu: .ghiceste 5";
      const guess = Number(args[0]);
      const secret = Math.floor(Math.random() * 10) + 1;
      return guess === secret ? `🎉 Corect! Numărul era ${secret}.` : `❌ Greșit! Numărul era ${secret}.`;
    case "gluma": return randomFrom(["De ce nu merge calculatorul la plajă? Pentru că are prea multe programe de scăldat.", "Ce spune un hard disk când e fericit? 'Am dat tot!'", "Nu mă cert cu CPU-ul... e prea intens.", "Calculatorul meu e foarte bun la glume: are 64 de joke cores."]);
    case "citat": return randomFrom(["Success is the sum of small efforts, repeated day in and day out.", "Nu există drumuri fără obstacole, există doar oameni fără perseverență.", "Visează mare, începe mic, dar începe.", "Fără acțiune, nu există progres."]);
    case "dragoste": return randomFrom(["Ești ca o lumină bună în ziua mea gri.", "Ai un zâmbet care face totul mai ușor.", "Ai ceva special care mă face să zâmbesc fără să vreau.", "Îmi place cum te simți în preajma mea."]);
    case "compatibilitate": return randomFrom(["Compatibilitate foarte bună! Voi formați o pereche tare!", "Ai o chimie bună, dar mai trebuie puțină răbdare.", "Sunteți diferiți, dar exact asta face relația interesantă.", "Ați avea o relație stabilă dacă veți comunica sincer."]);
    case "horoscop": return randomFrom(["Astăzi vei avea o zi plină de șanse și idei bune.", "Fii atent la oportunitățile care apar la finalul zilei.", "Pace interioară și claritate vor veni după o discuție sinceră.", "Nu-ți grăbi deciziile: ziua este bună pentru evaluare."]);
    case "slap": return randomFrom(["💥 A luat o palmă de la destin!", "😆 Un slap cât o poveste!", "💥 A fost un slap de neuitat!"]);
    case "hug": return randomFrom(["🤗 Îți dau un îmbrățișare caldă!", "🤗 Hugs și zâmbete!", "🤗 Te îmbrățișez virtual!"]);
    case "kiss": return randomFrom(["💋 Un sărut magic și pufos!", "💋 Pupici virtuali, pentru zâmbetul tău!", "💋 Un mic sărut din universul digital!"]);
    case "meme":
      const memeUrl = await fetchMeme();
      if (memeUrl) {
        await sock.sendMessage(groupJid || senderId, { image: { url: memeUrl } });
        return null;
      }
      return "😄 Nu am găsit un meme în acest moment.";
    case "fact": return randomFrom(["În jur de 70% din corpul uman este apă.", "Orezul este unul dintre cele mai vechi culturi agricole.", "Pământul se mișcă aproximativ 1.000 de mile pe oră.", "Banii din jurul tău nu te fac mai bogat dacă nu-i cheltuiești cu sens."]);
    case "intrebare": return "Întrebă-mă orice și o să-ți răspund cât pot!";
    case "adevar": return randomFrom(["Adevărul e adesea complicat, dar important.", "Ceea ce contează nu e cât de greu e, ci cât de mult vrei să-l depășești.", "Adevărul este cel mai bun ghid.", "Uneori adevărul doare, dar previne mai multe răni."]);
    case "provocare": return randomFrom(["Încearcă să termini o sarcină înainte să termini muzica!", "Fă două lucruri bune în aceeași zi și marchează-le.", "Provocarea de azi: fii mai curajos decât ieri.", "Creează un obiectiv simplu și îndeplinește-l chiar acum."]);
    case "roast": return randomFrom(["Ai atâta energie că și wifi-ul ar vrea să te copieze.", "Ești atât de unic, încât aproape că ai nevoie de o etichetă de siguranță.", "Ai un stil de a vorbi din care se vede că ai fost educat de internet.", "Dacă entuziasmul ar fi putere, ai fi sursa principală a energiei."]);
    case "compliment": return randomFrom(["Ești o persoană foarte inteligentă și plăcută.", "Ai o energie bună care luminează încăperea.", "Ai un mod de a vorbi foarte liniștitor și calm.", "Ești extrem de inspirat și prea bun la ceea ce faci."]);
    case "rps":
      const choices = ["piatră", "hârtie", "foarfece"];
      const botChoice = randomFrom(choices);
      const userChoice = (args[0] || "").toLowerCase();
      if (!choices.includes(userChoice)) return `✊ 🖐 ✌️ Alege dintre: ${choices.join(", ")}`;
      const winMap = { piatră: "foarfece", hârtie: "piatră", foarfece: "hârtie" };
      const result = userChoice === botChoice ? "Egalitate!" : winMap[userChoice] === botChoice ? "Ai câștigat!" : "Ai pierdut!";
      return `🤖 Botul a ales: ${botChoice}\n${result}`;
    case "xox": return "❌⭕️ X și O: .xox A1";
    case "spinzuratoare": return "🕵️ Jocul Spânzurătoarea este activ în versiune beta.";
    case "ghiceste-numarul": return "🔢 Ghicire număr: .ghiceste-numarul 42";
    case "quiz": return "🧠 Quiz: .quiz <întrebare>";
    case "trivia": return "📚 Trivia: .trivia <subiect>";
    case "matematica":
      if (!args[0]) return "🧮 Folosește: .matematica 12+7*3";
      const mathr = parseExpression(args.join(" "));
      return mathr === null ? "❌ Expresie invalidă." : `🧮 Rezultat: ${mathr}`;
    case "anagrama": return "✍️ Anagramă: .anagrama cuvant";
    case "fazan": return "🃏 Fazan: joc de cărți simplu, în curând.";
    case "cuvinte": return "📝 Cuvinte: .cuvinte <text>";
    case "tictactoe": return "⭕️ Tic Tac Toe: .tictactoe A1";
    case "blackjack": return "🂡 Blackjack: prototip activ.";
    case "poker": return "♠️ Poker: prototip activ.";
    case "slot": return "🎰 Slot: .slot";
    case "ruleta": return "🎡 Ruletă: .ruleta roșu";
    case "zaruri": return "🎲 Zaruri: .zaruri 2d6";
    case "ghicitoare": return "🔍 Ghicitoare: .ghicitoare";
    case "puzzle": return "🧩 Puzzle: .puzzle";
    case "labirint": return "🧭 Labirint: .labirint";
    case "snake": return "🐍 Snake: .snake";
    case "tetris": return "🧱 Tetris: .tetris";
    case "2048": return "🔢 2048: .2048";
    case "minesweeper": return "💣 Minesweeper: .minesweeper";
    case "connect4": return "🔴🟡 Connect 4: .connect4";
    case "battleship": return "🚢 Battleship: .battleship";
    case "uno": return "🃏 Uno: .uno";
    case "memory": return "🧠 Memory: .memory";
    case "simon": return "🎵 Simon: .simon";
    case "typing": return "⌨️ Typing: .typing";
    case "mathduel": return "⚔️ Math Duel: .mathduel 12*3";
    case "balanta": return `💰 Balanța ta: ${getUser(senderId).balance} monede`;
    case "munca":
      const wage = Math.floor(Math.random() * 200) + 50;
      const newBalance = addBalance(senderId, wage);
      return `💼 Ai muncit și ai câștigat ${wage} monede.\n💰 Balanță: ${newBalance}`;
    case "zilnic":
      const user = getUser(senderId);
      const reward = 250;
      const now = Date.now();
      if (user.lastDaily && now - user.lastDaily < 86400000) {
        return "⏳ Ai primit deja bonusul zilnic. Încearcă din nou mai târziu.";
      }
      user.lastDaily = now;
      user.balance += reward;
      const allData = readData();
      allData.users[senderId] = user;
      saveData(allData);
      return `🎁 Bonus zilnic primit: +${reward} monede.\n💰 Total: ${user.balance}`;
    case "magazin": return "🛍️ Magazin: .cumpara <item>\nDisponibile: armă, scut, potiune, baghetă";
    case "cumpara":
      if (!args[0]) return "🛍️ Ce vrei să cumperi? .cumpara armă";
      const item = args[0].toLowerCase();
      const costs = { armă: 200, scut: 150, potiune: 100, baghetă: 180 };
      const buyer = getUser(senderId);
      const cost = costs[item] || 0;
      if (!cost) return "❌ Item inexistent.";
      if (buyer.balance < cost) return "❌ Nu ai destui bani.";
      buyer.balance -= cost;
      buyer.inventory.push(item);
      const data = readData();
      data.users[senderId] = buyer;
      saveData(data);
      return `✅ Ai cumpărat: ${item} pentru ${cost} monede.`;
    case "inventar":
      const invUser = getUser(senderId);
      return `🎒 Inventar: ${invUser.inventory.length ? invUser.inventory.join(", ") : "gol"}`;
    case "top":
      const users = readData().users;
      const sorted = Object.entries(users).sort((a, b) => b[1].balance - a[1].balance).slice(0, 5);
      return sorted.length ? `🏆 Top utilizatori:\n${sorted.map(([id, u], index) => `${index + 1}. ${id}: ${u.balance} monede`).join("\n")}` : "Nu există utilizatori încă.";
    case "nivel":
      const lvl = getUser(senderId);
      return `📈 Nivel: ${lvl.level} | XP: ${lvl.xp}`;
    case "profil":
      const profile = getUser(senderId);
      return `👤 Profil:\nBalanță: ${profile.balance}\nNivel: ${profile.level}\nXP: ${profile.xp}\nInventar: ${profile.inventory.length}`;
    case "caseta": return "📦 Casetă: .caseta";
    case "jefuieste": return "🕵️ Jefuiește: .jefuieste @user";
    case "banca": return "🏦 Banca: depozit / extras / transfer";
    case "transfer": return "💸 Transfer: .transfer @user 100";
    case "pariaza": return "🎲 Pariază: .pariaza 100";
    case "loto": return "🎟️ Loto: .loto 7";
    case "ferma": return "🌾 Fermă: .ferma";
    case "pescuieste": return "🎣 Pescuiește: .pescuieste";
    case "mineaza": return "⛏️ Minează: .mineaza";
    case "quest": return "📜 Quest: .quest";
    case "clan": return "👥 Clan: .clan create | info | membri";
    case "afk":
      const afkUser = getUser(senderId);
      afkUser.afk = true;
      const afkData = readData();
      afkData.users[senderId] = afkUser;
      saveData(afkData);
      return "💤 Ai fost marcat AFK.";
    case "poll": return "📊 Poll: .poll Ce preferi? A / B";
    case "vot": return "🗳️ Vot: .vot <opțiune>";
    case "reminder": return "⏰ Reminder: .reminder 15m Hai să lucrezi.";
    case "calc":
      if (!args[0]) return "🧮 Scrie expresia: .calc 12+7*3";
      const calcResult = parseExpression(args.join(" "));
      return calcResult === null ? "❌ Expresie invalidă." : `🧮 Rezultat: ${calcResult}`;
    case "traduce": return "🌍 Traduce: .traduce en Hai";
    case "vreme": return "🌦️ Vreme: .vreme București";
    case "stire": return "📰 Stire: .stire tehnologie";
    case "imagine": return "🖼️ Imagine: .imagine un peisaj frumos";
    case "sticker": return "🪄 Sticker: atașează o imagine și folosește .sticker";
    case "toimg": return "🖼️ ToIMG: .toimg <sticker>";
    case "audio": return "🔊 Audio: .audio <link>";
    case "yt":
      if (!args.length) return "🎵 YouTube: .yt <caută melodie>";
      const ytRes = await searchYoutube(args.join(" "));
      if (!ytRes) return "❌ Nu am găsit rezultate.";
      return `🎵 ${ytRes.title}\n🔗 ${ytRes.url}\n⏱️ Durată: ${ytRes.duration}`;
    case "tiktok": return "🎬 TikTok: .tiktok <link sau nume>";
    case "insta": return "📷 Instagram: .insta <nume sau link>";
    case "qr":
      if (!args[0]) return "📱 Creează un QR: .qr https://example.com";
      const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(args.join(" "))}`;
      await sock.sendMessage(groupJid || senderId, { image: { url: qrUrl } });
      return null;
    case "scurtare":
      if (!args[0]) return "🔗 Folosește: .scurtare https://example.com";
      try {
        const res = await axios.get(`https://tinyurl.com/api-create.php?url=${encodeURIComponent(args.join(" "))}`);
        return `🔗 Link scurtat: ${res.data}`;
      } catch {
        return "❌ Nu s-a putut scurta link-ul.";
      }
    case "parola": return "🔐 Parola ta este: " + Math.random().toString(36).slice(2, 10);
    case "color": return "🎨 Color: .color #ff0000";
    case "ascii": return "ASCII:\n  ___\n / _ \\\n| | |\n|_|_|\n";
    case "reverse": return reverseString(text || "hello");
    case "invers": return `🔁 Invers: ${reverseString(text || "bot")}`;
    case "numara": return `🔢 Număr cuvinte: ${text ? text.trim().split(/\\s+/).filter(Boolean).length : 0}`;
    case "statistici": return "📊 Statistici: .statistici";
    case "info-grup":
      if (!isGroup) return "⚠️ Comanda funcționează doar în grup.";
      try {
        const groupInfo = await sock.groupMetadata(groupJid);
        return `👥 Grup: ${groupInfo.subject}\nMembri: ${groupInfo.participants.length}`;
      } catch {
        return "⚠️ Eroare la preluarea informațiilor.";
      }
    case "link-grup":
      if (!isGroup) return "⚠️ Doar în grup.";
      try {
        const code = await sock.groupInviteCode(groupJid);
        return `🔗 Link-ul grupului: https://chat.whatsapp.com/${code}`;
      } catch {
        return "⚠️ Nu am putut genera link-ul grupului.";
      }
    case "promoveaza": return "⬆️ Promovează: .promoveaza @user";
    case "retrogradeaza": return "⬇️ Retrogradează: .retrogradeaza @user";
    case "kick": return "🚫 Kick: .kick @user";
    case "welcome": return "👋 Welcome: salut și bun venit!";
    case "play":
      if (!args.length) return "🎵 Folosește: .play <nume melodie>\nExemplu: .play despacito";
      await sock.sendMessage(groupJid || senderId, {
        text: `⏳ Se descarcă: "${args.join(" ")}"...\n🔧 Aștază puțin...`
      });
      const playResult = await handlePlayCommand(sock, groupJid || senderId, args.join(" "));
      return playResult;
    case "ytaudio":
      if (!args[0]) return "🎵 Folosește: .ytaudio <link YouTube>";
      return await handlePlayCommand(sock, groupJid || senderId, args[0]);
    case "spotify":
      if (!args.length) return "🎵 Folosește: .spotify <melodie>";
      return await searchSpotify(args.join(" "));
    case "soundcloud":
      if (!args.length) return "🎧 Folosește: .soundcloud <melodie>";
      return await searchSoundCloud(args.join(" "));
    case "anime":
      if (!args.length) return "📺 Folosește: .anime naruto";
      const anime = await fetchJikan("anime", args.join(" "));
      if (!anime) return "❌ Nu am găsit anime-ul cerut.";
      return `📺 ${anime.title}\n⭐ Score: ${anime.score || "N/A"}\n📖 Episoade: ${anime.episodes || "N/A"}\n🔗 ${anime.url}`;
    case "manga":
      if (!args.length) return "📚 Folosește: .manga one punch man";
      const manga = await fetchJikan("manga", args.join(" "));
      if (!manga) return "❌ Nu am găsit manga-ul cerut.";
      return `📚 ${manga.title}\n⭐ Score: ${manga.score || "N/A"}\n📖 Capitole: ${manga.chapters || "N/A"}\n🔗 ${manga.url}`;
    case "waifu":
      try {
        const res = await axios.get("https://api.waifu.pics/sfw/waifu");
        const url = res.data?.url;
        if (!url) return "❌ Nu am găsit o waifu.";
        await sock.sendMessage(groupJid || senderId, { image: { url } });
        return null;
      } catch {
        return "⚠️ Serviciul waifu e momentan indisponibil.";
      }
    case "naruto": return "🔥 Naruto: https://www.youtube.com/results?search_query=naruto+opening";
    case "onepiece": return "🏴‍☠️ One Piece: https://www.youtube.com/results?search_query=one+piece+opening";
    case "akira": return "🎬 Akira: https://www.youtube.com/results?search_query=akira+anime";
    default:
      return `❓ Comandă necunoscută: ${PREFIX}${command}\nScrie ${PREFIX}meniu pentru listă.`;
  }
}

async function startBot() {
  const { state, saveCreds } = await useMultiFileAuthState(AUTH_DIR);
  const { version } = await fetchLatestBaileysVersion();

  const sock = makeWASocket({
    version,
    auth: state,
    printQRInTerminal: true,
    browser: Browsers.macOS("Chrome"),
    logger: require("pino")({ level: "silent" })
  });

  sock.ev.on("connection.update", async (update) => {
    const { connection, lastDisconnect, qr } = update;

    // QR CODE - apare la prima conectare
    if (qr) {
      console.log("\n╔════════════════════════════════════════╗");
      console.log("║      QR CODE - Scaneaza cu WhatsApp    ║");
      console.log("╚════════════════════════════════════════╝");
      console.log(qr);
      console.log("╔════════════════════════════════════════╗\n");
    }

    if (connection === "connecting") {
      console.log("🔌 Se conectează...");
    }

    if (connection === "open") {
      console.log("\n✅ ✅ ✅ CONECTAT LA WHATSAPP! ✅ ✅ ✅");
      console.log("🎵 Audio commands: .play, .ytaudio, .spotify, .soundcloud");
      console.log("📝 Comenzi disponibile: .meniu\n");
    }

    if (connection === "close") {
      const statusCode = lastDisconnect?.error?.output?.statusCode;
      if (statusCode === DisconnectReason.loggedOut) {
        console.log("❌ Ai fost deconectat. Șterge folderul 'auth_info' și rulează din nou.");
        process.exit(1);
      } else {
        console.log(`⚠️ Deconectat cu cod ${statusCode}. Reconectare în 5s...`);
        setTimeout(() => startBot(), 5000);
      }
    }
  });

  sock.ev.on("creds.update", saveCreds);

  // PAIRING CODE - apare dacă ai PHONE_NUMBER în .env
  if (PHONE_NUMBER) {
    try {
      const pairingCode = await sock.requestPairingCode(PHONE_NUMBER);
      console.log("\n╔════════════════════════════════════════╗");
      console.log("║    PAIR CODE - Introdu în WhatsApp     ║");
      console.log("╠════════════════════════════════════════╣");
      console.log("║", pairingCode, "║");
      console.log("╠════════════════════════════════════════╣");
      console.log("║  Settings → Devices → Pair a device    ║");
      console.log("╚════════════════════════════════════════╝\n");
    } catch (err) {
      console.log("ℹ️ Așteptare QR din terminal...\n");
    }
  }

  sock.ev.on("messages.upsert", async ({ messages, type }) => {
    if (type !== "notify") return;

    const msg = messages[0];
    if (!msg?.message || msg.key.fromMe || isJidBroadcast(msg.key.remoteJid)) return;

    const remoteJid = msg.key.remoteJid;
    const senderId = msg.key.participant || remoteJid;
    const isGroup = remoteJid?.includes("@g.us");

    const text =
      msg.message?.conversation ||
      msg.message?.extendedTextMessage?.text ||
      msg.message?.ephemeralMessage?.message?.conversation ||
      "";

    if (!text.startsWith(PREFIX)) return;

    const body = text.slice(PREFIX.length).trim();
    const [command, ...args] = body.split(/\s+/);

    console.log(`📨 [${isGroup ? "GRUP" : "DM"}] ${senderId}: ${PREFIX}${command}`);

    try {
      const result = await handleCommand({
        sock,
        msg,
        command,
        args,
        senderId,
        isGroup,
        groupJid: remoteJid
      });

      if (result) {
        await sock.sendMessage(remoteJid, { text: result });
      }
    } catch (error) {
      console.error("❌ Eroare:", error.message);
      try {
        await sock.sendMessage(remoteJid, {
          text: "⚠️ A apărut o eroare. Încearcă din nou."
        });
      } catch {}
    }
  });
}

startBot();
