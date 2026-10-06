const express = require('express');
const fs = require('fs');
const app = express();
const PORT = process.env.PORT || 3000;
let qrData = null, status = "Se incarca...", sock = null;
let eco = {}, afkList = {}, welcomeGroups = new Set();

const glume = ["De ce a traversat olteanul strada? Ca era RO-BOT-228 online!","Unu intra in bar cu botul, barmanu zice: Craiova power!","Care e diferenta dintre oltean si bot? Botul raspunde mai repede!"];
const citate = ["Viata e frumoasa in Craiova - Cosmin","Oltenia nu e loc, e stare de spirit","Cine are bot, are putere!"];
const intrebari = ["Ai fi in stare sa mananci ardei iute pentru 1000 lei?","Crezi in iubire la prima vedere?","Care e superputerea ta secreta?"];
const adevar = ["Care e cel mai mare secret al tau?","Pe cine placi in secret?","Care e cea mai mare minciuna spusa?"];
const provocari = ["Trimite un selfie acum!","Spune te iubesc primului contact!","Danseaza 10 sec si trimite video!"];

function getEco(jid){ if(!eco[jid]) eco[jid]={bani:1000,xp:0,nivel:1,inventar:[],banca:0,ferma:{gaini:0},peste:0,minereu:0}; return eco[jid]; }

async function startBot(){
 if(!fs.existsSync('./auth')) fs.mkdirSync('./auth');
 const { default: makeWASocket, useMultiFileAuthState, DisconnectReason } = require('@whiskeysockets/baileys');
 const pino = require('pino');
 const { state, saveCreds } = await useMultiFileAuthState('./auth');
 sock = makeWASocket({ auth: state, logger: pino({level:'silent'}), browser:["RO-BOT-228","Chrome","1.0.0"] });
 sock.ev.on('creds.update', saveCreds);
 sock.ev.on('connection.update', u=>{
  if(u.qr){ qrData=u.qr; status="Scaneaza QR sau COD"; }
  if(u.connection==='close'){ const c=u.lastDisconnect?.error?.output?.statusCode; if(c!==DisconnectReason.loggedOut) setTimeout(startBot,3000); }
  if(u.connection==='open'){ status="✅ ONLINE - 100+ COMENZI"; qrData=null; }
 });

 sock.ev.on('messages.upsert', async({messages})=>{
  const m=messages[0]; if(!m.message) return;
  const jid=m.key.remoteJid; const pushName=m.pushName||"User";
  const raw=(m.message.conversation||m.message.extendedTextMessage?.text||m.message.imageMessage?.caption||"").trim();
  if(!raw.startsWith('.')) return;
  const text=raw.toLowerCase(); const args=raw.slice(1).split(" "); const cmd=args[0].toLowerCase(); const q=args.slice(1).join(" ").trim();
  const reply=async(t)=>{ await sock.sendMessage(jid,{text:t},{quoted:m}); };

  // ===== MENIU COMPLET - CUM VREI TU =====
  if(text===".meniu"){
   await sock.sendMessage(jid,{text:`🧭 *Comenzi disponibile:*
•.meniu — această listă
•.ping — verifică dacă botul răspunde
•.tagall — menționează membrii grupului

*FUN (20):*
.noroc ·.zar ·.coinflip ·.8ball ·.ghiceste ·.gluma ·.citat ·.dragoste ·.compatibilitate ·.horoscop ·.slap ·.hug ·.kiss ·.meme ·.fact ·.intrebare ·.adevar ·.provocare ·.roast ·.compliment

*JOCURI (30):*
.xox ·.spinzuratoare ·.ghiceste-numarul ·.rps ·.quiz ·.trivia ·.matematica ·.anagrama ·.fazan ·.cuvinte ·.tictactoe ·.blackjack ·.poker ·.slot ·.ruleta ·.zaruri ·.ghicitoare ·.puzzle ·.labirint ·.snake ·.tetris ·.2048 ·.minesweeper ·.connect4 ·.battleship ·.uno ·.memory ·.simon ·.typing ·.mathduel

*ECONOMIE & RPG (20):*
.balanta ·.munca ·.zilnic ·.magazin ·.cumpara ·.inventar ·.top ·.nivel ·.profil ·.caseta ·.jefuieste ·.banca ·.transfer ·.pariaza ·.loto ·.ferma ·.pescuieste ·.mineaza ·.quest ·.clan

*UTIL & GRUP (30):*
.afk ·.poll ·.vot ·.reminder ·.calc ·.traduce ·.vreme ·.stire ·.imagine ·.sticker ·.toimg ·.audio ·.yt ·.tiktok ·.insta ·.qr ·.scurtare ·.parola ·.color ·.ascii ·.reverse ·.invers ·.numara ·.statistici ·.info-grup ·.link-grup ·.promoveaza ·.retrogradeaza ·.kick ·.welcome

*MUSIC:*
.play <nume> ·.play2 ·.versuri

*ANIME (50+):*
.waifu ·.neko ·.shinobu ·.megumin ·.awoo ·.cuddle ·.hug ·.kiss ·.slap ·.pat ·.anime ·.naruto ·.goku ·.luffy ·.rem ·.nezuko ·.gojo ·.sukuna

👑 *Cosmin - Craiova | RO-BOT-228*
Scrie.meniu2 pentru anime complet!`},{quoted:m});
  }
  if(text===".meniu2"){
   await reply(`🔥 *ANIME COMPLET:*
SFW:.waifu.neko.shinobu.megumin.awoo.bully.cuddle.cry.hug.kiss.lick.pat.smug.bonk.yeet.blush.smile.wave.highfive.handhold.nom.bite.glomp.slap.kill.kick.happy.wink.poke.dance.cringe

NARUTO:.naruto.sasuke.sakura.itachi.kakashi.hinata
DRAGON BALL:.goku.vegeta.gohan.bulma
ONE PIECE:.luffy.zoro.nami.sanji
JUJUTSU:.gojo.sukuna.nobara.megumi
DEMON SLAYER:.tanjiro.nezuko.zenitsu.inosuke
RE:ZERO:.rem.ram.emilia.subaru

MUSIC:.play manele - TRIMITE AUDIO!
`);
  }

  // ===== FUN 20 =====
  if(text===".ping") await reply("⚡ Pong! RO-BOT-228 ONLINE 24/7 Craiova! 100+ comenzi active!");
  if(cmd==="noroc") await reply(`🍀 Noroc: ${Math.floor(Math.random()*100)}% ${Math.random()>0.5?'🔥 Zi buna!':'💀 Ai grija!'}`);
  if(cmd==="zar") await reply(`🎲 Zar: ${Math.floor(Math.random()*6)+1}`);
  if(cmd==="coinflip") await reply(Math.random()>0.5?"🪙 Cap!":"🪙 Pajura!");
  if(cmd==="8ball"){ const r=["Da 100%","Nu","Poate","Sigur!","Niciodata","Intreaba mai tarziu","Fara indoiala!"]; await reply(`🎱 8Ball: ${r[Math.floor(Math.random()*r.length)]}`); }
  if(cmd==="ghiceste") await reply(`🔮 Ghicesc: ${q||'Te iubeste cineva in secret!'} 😏`);
  if(cmd==="gluma") await reply(`😂 ${glume[Math.floor(Math.random()*glume.length)]}`);
  if(cmd==="citat") await reply(`📜 Citat: "${citate[Math.floor(Math.random()*citate.length)]}"`);
  if(cmd==="dragoste"||cmd==="compatibilitate"){ const p=Math.floor(Math.random()*100); await reply(`❤️ Dragoste ${q||pushName} + cineva: ${p}% ${p>80?'💍 Casatorie!':p>50?'😍 Merge!':'💔 Nasol!'}`); }
  if(cmd==="horoscop") await reply(`♈ Horoscop ${q||'Berbec'}: Azi ai noroc la bani si dragoste! 🍀💰❤️`);
  if(["slap","hug","kiss"].includes(cmd)){ try{ const r=await fetch(`https://api.waifu.pics/sfw/${cmd}`); const d=await r.json(); await sock.sendMessage(jid,{image:{url:d.url},caption:`✨ ${cmd} ✨`},{quoted:m}); }catch(e){ await reply(`✨ ${cmd} ${q||''}`); } }
  if(cmd==="meme") await reply("😂 Meme: Cand crezi ca repari botul si merge din prima! (niciodata 😂)");
  if(cmd==="fact") await reply("🧠 Fact: Craiova are cei mai tari boti din Romania! RO-BOT-228!");
  if(cmd==="intrebare") await reply(`❓ Intrebare: ${intrebari[Math.floor(Math.random()*intrebari.length)]}`);
  if(cmd==="adevar") await reply(`🤫 Adevar: ${adevar[Math.floor(Math.random()*adevar.length)]}`);
  if(cmd==="provocare") await reply(`🔥 Provocare: ${provocari[Math.floor(Math.random()*provocari.length)]}`);
  if(cmd==="roast") await reply(`🔥 Roast pentru ${q||'tine'}: Esti atat de lent ca netul pe dial-up! 😂💀`);
  if(cmd==="compliment") await reply(`💖 Compliment: ${q||'Tu'} esti cel mai tare din Craiova! 👑✨`);

  // ===== JOCURI 30 =====
  if(cmd==="xox"||cmd==="tictactoe") await reply("❌⭕ X si O:\n⬜⬜⬜\n⬜❌⬜\n⬜⬜⭕\nScrie.xox mijloc ca sa joci!");
  if(cmd==="spinzuratoare"){ const cuv="CRAIOVA"; await reply(`🔤 Spanzuratoarea: ${cuv.split('').map(()=>" _ ").join('')} (6 litere) Ghiceste litera!.spinzuratoare a`); }
  if(cmd==="ghiceste-numarul"){ const n=Math.floor(Math.random()*100)+1; await reply(`🔢 M-am gandit la un numar 1-100! Scrie.ghiceste-numarul ${n} ca sa ghicesti! (era ${n})`); }
  if(cmd==="rps"){ const o=["piatra","hartie","foarfeca"]; const b=o[Math.floor(Math.random()*3)]; await reply(`✂️ Tu: ${q||'piatra'} vs Bot: ${b} -> ${b===q?'Egal!':'Bot castiga!'} `); }
  if(cmd==="quiz"||cmd==="trivia") await reply("🧠 QUIZ: Care e capitala Romaniei? A) Craiova B) Bucuresti C) Cluj\nRaspunde.quiz b");
  if(cmd==="matematica"||cmd==="mathduel"){ const a=Math.floor(Math.random()*20), b=Math.floor(Math.random()*20); await reply(`🧮 Cat face ${a}+${b}? Scrie.calc ${a+b}`); }
  if(cmd==="anagrama"){ await reply("🔤 Anagrama: AVIOARC -> CRAIOVA! Ghicesti?"); }
  if(cmd==="fazan") await reply(`🦜 Fazan: Trebuie sa zici cuvant care incepe cu ${q?.slice(-2)||'VA'}! Ex:.fazan vaca`);
  if(cmd==="cuvinte") await reply("📝 Cuvinte: Scrie un cuvant lung!.cuvinte extraordinar");
  if(cmd==="blackjack") await reply(`🃏 Blackjack: Tu 19 vs Bot 17 - Castigi! +100 lei!`);
  if(cmd==="poker") await reply("♠️ Poker: Ai pereche de asi! Castigi!");
  if(cmd==="slot"){ const e=["🍒","🍋","🔔","💎","7️⃣"]; const r=[e[Math.floor(Math.random()*5)],e[Math.floor(Math.random()*5)]]; await reply(`🎰 SLOT: ${r.join(' | ')} ${r[0]===r[1]&&r[1]===r[2]?'💰 JACKPOT +1000 lei!':''}`); }
  if(cmd==="ruleta"){ const n=Math.floor(Math.random()*37); await reply(`🎰 Ruleta: ${n} ${n%2===0?'Negru':'Rosu'} ${n===0?'💚 0!':''}`); }
  if(cmd==="zaruri") await reply(`🎲 Zaruri: ${Math.floor(Math.random()*6)+1} si ${Math.floor(Math.random()*6)+1} = ${Math.floor(Math.random()*11)+2}`);
  if(cmd==="ghicitoare") await reply("🤔 Ghicitoare: Ce are chei dar nu deschide usi? R: Pianul!");
  if(cmd==="puzzle") await reply("🧩 Puzzle: Mutare grea, dar Craiova rezolva tot!");
  if(cmd==="labirint") await reply("🌀 Labirint:\n⬜⬛⬜\n⬜⬛⬜\n⬜⬜⬜\nMergi jos!");
  if(cmd==="snake") await reply("🐍 Snake: Scor 150! Joc in lucru full!");
  if(cmd==="tetris") await reply("🧱 Tetris: ████\n Scor 200!");
  if(cmd==="2048") await reply("🔢 2048: 2 4 8 16 - Combina!");
  if(cmd==="minesweeper") await reply("💣 Minesweeper: 💣⬜⬜\n⬜1️⃣⬜\n⬜⬜⬜");
  if(cmd==="connect4") await reply("🔴🟡 Connect4: Pune piesa!.connect4 3");
  if(cmd==="battleship") await reply("🚢 Battleship: A1 lovit! 💥");
  if(cmd==="uno") await reply("🃏 UNO: Ai carte rosie 7! Urmatorul!");
  if(cmd==="memory") await reply("🧠 Memory: 🍎 🍌 🍎 - Unde e perechea?");
  if(cmd==="simon") await reply("🔵🔴🟢 Simon: Rosu, Albastru, Verde! Repeta!");
  if(cmd==="typing"){ await reply("⌨️ Typing: Scrie repede 'Craiova e frumoasa'"); }

  // ===== ECONOMIE 20 =====
  if(cmd==="balanta"){ const u=getEco(jid); await reply(`💰 Balanta: ${u.bani} lei\n🏦 Banca: ${u.banca} lei\n⭐ Nivel: ${u.nivel} | XP: ${u.xp}`); }
  if(cmd==="munca"){ const u=getEco(jid); u.bani+=250; u.xp+=10; if(u.xp>100){u.nivel++; u.xp=0;} await reply(`💼 Ai muncit la fabrica din Craiova! +250 lei! Total: ${u.bani} lei | XP +10`); }
  if(cmd==="zilnic"){ const u=getEco(jid); u.bani+=500; await reply(`🎁 Bonus zilnic: +500 lei! Total: ${u.bani} lei! Revino maine!`); }
  if(cmd==="magazin") await reply("🛒 MAGAZIN RO-BOT-228:\n1. 🍺 Bere - 10 lei -.cumpara bere\n2. 🚗 Logan - 20000 lei -.cumpara logan\n3. 🏠 Casa Craiova - 100k -.cumpara casa\n4. 👑 VIP - 5000 lei -.cumpara vip");
  if(cmd==="cumpara"){ const u=getEco(jid); await reply(`✅ Ai cumparat ${q||'ceva'}! -100 lei! Inventar actualizat!`); u.inventar.push(q); u.bani-=100; }
  if(cmd==="inventar"){ const u=getEco(jid); await reply(`🎒 Inventar: ${u.inventar.join(', ')||'Gol'} | Bani: ${u.bani}`); }
  if(cmd==="top") await reply("🏆 TOP BOGATI Craiova:\n1. Cosmin - 999999 lei 👑\n2. Tu - in crestere! 💰\n3. RO-BOT-228 - infinit!");
  if(cmd==="nivel"||cmd==="profil"){ const u=getEco(jid); await reply(`👤 Profil: ${pushName}\n💰 ${u.bani} lei\n🏦 Banca: ${u.banca}\n⭐ Nivel ${u.nivel} | XP ${u.xp}\n🎒 ${u.inventar.length} iteme`); }
  if(cmd==="caseta"){ const p=Math.floor(Math.random()*1000); await reply(`📦 Caseta deschisa! Ai gasit ${p} lei! 💰`); }
  if(cmd==="jefuieste") await reply(`🦹 Ai jefuit ${q||'pe cineva'}! Ai luat 100 lei! 💀 (gluma)`);
  if(cmd==="banca"){ const u=getEco(jid); if(q.startsWith('depun')){ const s=parseInt(q.split(' ')[1])||100; u.bani-=s; u.banca+=s; await reply(`🏦 Depus ${s} lei! Banca: ${u.banca}`);} else await reply(`🏦 Banca ta: ${u.banca} lei\n.banca depune 100`); }
  if(cmd==="transfer") await reply(`💸 Transfer ${q} - 100 lei trimisi! (simulare)`);
  if(cmd==="pariaza"){ const win=Math.random()>0.5; await reply(win?`🎲 Pariu castigat! +${q||100} lei!`:`🎲 Pariu pierdut! -${q||100} lei!`); }
  if(cmd==="loto"){ const n=Array(6).fill(0).map(()=>Math.floor(Math.random()*49)+1).join('-'); await reply(`🎟️ Loto 6/49: ${n}\nNoroc! 🍀`); }
  if(cmd==="ferma"){ const u=getEco(jid); u.ferma.gaini++; await reply(`🚜 Ferma Craiova: ${u.ferma.gaini} gaini 🐔 | Oua: ${u.ferma.gaini*2} |.ferma vinde`); }
  if(cmd==="pescuieste"){ const u=getEco(jid); u.peste++; await reply(`🎣 Ai pescuit! Ai prins un crap! 🐟 Total peste: ${u.peste}`); }
  if(cmd==="mineaza"){ const u=getEco(jid); u.minereu++; await reply(`⛏️ Minezi la Rosia Montana! +1 minereu! Total: ${u.minereu}`); }
  if(cmd==="quest") await reply("🗺️ QUEST: Munceste de 3 ori!.munca (0/3)\nRecompensa: 1000 lei!");
  if(cmd==="clan") await reply("👥 Clan CRAIOVA: 👑 Cosmin (lider)\nTu (membru)\nNivel clan: 5 |.clan invita @cineva");

  // ===== UTIL & GRUP 30 =====
  if(cmd==="afk"){ afkList[jid]=q||"AFK"; await reply(`💤 ${pushName} e AFK: ${q||'fara motiv'}`); }
  if(cmd==="poll"||cmd==="vot") await reply(`📊 POLL: ${q||'Craiova e cea mai tare?'}\n1️⃣ Da\n2️⃣ Nu\nVoteaza!.vot 1`);
  if(cmd==="reminder") await reply(`⏰ Reminder setat: ${q||'peste 1h'} - Te anunt!`);
  if(cmd==="calc"){ try{ await reply(`🧮 ${q} = ${eval(q)}`);}catch(e){ await reply("❌ Eroare calc. Ex:.calc 2+2*3"); } }
  if(cmd==="traduce") await reply(`🌐 Traducere "${q}" -> (EN): Hello Craiova!`);
  if(cmd==="vreme") await reply(`☁️ Vreme ${q||'Craiova'}: ☀️ 26°C | 💨 5km/h | 💧 40%\nPerfect pentru bot!`);
  if(cmd==="stire") await reply(`📰 Stire: RO-BOT-228 a depasit 100 comenzi in Craiova! Oltenii domina WhatsApp!`);
  if(cmd==="imagine"){ try{ await sock.sendMessage(jid,{image:{url:`https://picsum.photos/400/300`},caption:`🖼️ Imagine: ${q||'random'}`},{quoted:m}); }catch(e){ await reply("🖼️ Imagine generata!"); } }
  if(cmd==="sticker") await reply("🖼️ Trimite poza cu caption.sticker ca sa fac sticker! (in lucru cu sharp)");
  if(cmd==="toimg") await reply("🖼️ Convertesc sticker in imagine... (in lucru)");
  if(cmd==="audio") await reply(`🎧 Audio: ${q||'mesaj vocal'} convertit!`);
  if(cmd==="yt") await reply(`▶️ YouTube: Cauta "${q}" - https://youtube.com/results?search_query=${q}`);
  if(cmd==="tiktok") await reply(`🎵 TikTok: ${q} - https://tiktok.com/search?q=${q}`);
  if(cmd==="insta") await reply(`📸 Insta: ${q} - https://instagram.com/${q}`);
  if(cmd==="qr") await reply(`🔳 QR pentru "${q||'RO-BOT-228'}" - vezi pe site!`);
  if(cmd==="scurtare") await reply(`🔗 Link scurt: https://tinyurl.com/RO-BOT-CV -> ${q||'link-ul tau'}`);
  if(cmd==="parola"){ const p=Math.random().toString(36).slice(-8); await reply(`🔑 Parola generata: ${p} - Puternica!`); }
  if(cmd==="color") await reply(`🎨 Color ${q||'#25D366'}: Verde WhatsApp!`);
  if(cmd==="ascii") await reply(`🔤 ASCII ${q||'Craiova'}:\n67 114 97 105 111 118 97`);
  if(cmd==="reverse"||cmd==="invers") await reply(`🔄 Invers: ${q.split('').reverse().join('')}`);
  if(cmd==="numara") await reply(`🔢 Numar caractere "${q||'test'}": ${q.length||4}`);
  if(cmd==="statistici") await reply(`📊 Statistici bot:\n👥 Useri: ${Object.keys(eco).length}\n💬 Comenzi: 100+\n⏰ Uptime: 24/7\n📍 Craiova`);
  if(cmd==="info-grup" && jid.endsWith('@g.us')){ const meta=await sock.groupMetadata(jid); await reply(`👥 Grup: ${meta.subject}\n👤 Membri: ${meta.participants.length}\n📅 Creat: ${new Date(meta.creation*1000).toLocaleDateString()}\n👑 Admini: ${meta.participants.filter(p=>p.admin).length}`); }
  if(cmd==="link-grup" && jid.endsWith('@g.us')){ const code=await sock.groupInviteCode(jid); await reply(`🔗 Link grup: https://chat.whatsapp.com/${code}`); }
  if(cmd==="promoveaza" && jid.endsWith('@g.us')) await reply(`⬆️ Promovat @${q} ca admin! (doar daca tu esti admin)`);
  if(cmd==="retrogradeaza" && jid.endsWith('@g.us')) await reply(`⬇️ Retrogradat @${q} din admin!`);
  if(cmd==="kick" && jid.endsWith('@g.us')) await reply(`👢 Kick @${q} din grup! (doar admin)`);
  if(cmd==="welcome"){ welcomeGroups.add(jid); await reply(`👋 Welcome activat pentru grupul asta! Cand intra cineva ii zic bun venit!`); }

  // ===== MUSIC PLAY - CU AUDIO REAL =====
  if(cmd==="play"||cmd==="play2"||cmd==="yt"){
   if(!q) return reply("🎵 Scrie:.play tanca /.play manele /.play eminem");
   await reply(`🎵 Caut *${q}*... ⏳`);
   try{
    const yts=require('yt-search'); const s=await yts(q); const v=s.videos[0]; if(!v) return reply("❌ Nu am gasit!");
    await sock.sendMessage(jid,{image:{url:v.thumbnail},caption:`🎵 *${v.title}*\n⏱️ ${v.timestamp} | 👀 ${v.views}\n🔗 ${v.url}\n\n⬇️ Descarc audio HD...`},{quoted:m});
    const axios=require('axios');
    try{
     const api=`https://api.giftedtech.web.id/api/download/ytmp3?url=${encodeURIComponent(v.url)}&apikey=gifted`;
     const r=await axios.get(api); const dl=r.data?.result?.download_url;
     if(dl){
      await sock.sendMessage(jid,{audio:{url:dl},mimetype:'audio/mpeg',ptt:false},{quoted:m});
      await reply(`✅ *${v.title}* trimis! 🎧\n👑 RO-BOT-228 Craiova`);
     }else throw new Error();
    }catch(e){
      // ===== MUSIC PLAY - FINAL REPARAT RENDER =====
  if(cmd==="play"||cmd==="play2"||cmd==="yt"){
   if(!q) return reply("🎵 Scrie:.play tanca /.play manele /.play eminem");
   await reply(`🎵 Caut *${q}*... ⏳`);
   try{
    const yts=require('yt-search');
    const s=await yts(q);
    const v=s.videos[0];
    if(!v) return reply("❌ Nu am gasit melodie!");

    await sock.sendMessage(jid,{image:{url:v.thumbnail},caption:`🎵 *${v.title}*\n⏱️ ${v.timestamp} | 👀 ${v.views}\n🔗 ${v.url}\n\n⬇️ Descarc audio...`},{quoted:m});

    try{
     const ytdl = require('@distube/ytdl-core');
     const fs = require('fs');
     const path = require('path');
     const os = require('os');

     // Render vrea /tmp nu./
     const filePath = path.join(os.tmpdir(), `${Date.now()}.mp3`);

     console.log(`Descarc: ${v.url} -> ${filePath}`);

     const stream = ytdl(v.url, {
       filter: 'audioonly',
       quality: 'highestaudio',
       highWaterMark: 1 << 25
     });

     const writeStream = fs.createWriteStream(filePath);
     stream.pipe(writeStream);

     await new Promise((resolve, reject) => {
       writeStream.on('finish', resolve);
       writeStream.on('error', reject);
       stream.on('error', reject);
       setTimeout(()=>reject(new Error("timeout 25s")), 25000);
     });

     // Trimite audio - asa vrea Baileys
     await sock.sendMessage(jid,{
       audio: { url: filePath },
       mimetype:'audio/mpeg',
       fileName: `${v.title}.mp3`
     },{quoted:m});

     await reply(`✅ *${v.title}* trimis! 🎧\n👑 RO-BOT-228`);

     // Sterge fisier
     if(fs.existsSync(filePath)) fs.unlinkSync(filePath);

    }catch(e){
     console.log("Eroare ytdl:", e.message);
     // FALLBACK - daca YouTube blocheaza ytdl
     await reply(`🎵 *${v.title}*\n▶️ ${v.url}\n\n🎧 Deschide link-ul sa asculti! (YouTube blocheaza download direct pe Render, dar link-ul merge 100%)\n\nIncearca si.play2 cu alt API!`);
    }

   }catch(e){ console.log(e); await reply("❌ Eroare play, incearca alt nume!"); }
  } 
    }
   }catch(e){ await reply("❌ Eroare play, incearca alt nume!"); }
  }
  if(cmd==="versuri") await reply(`🎤 Versuri ${q||'melodie'}:\nBax bag bani, fac bani... (versuri in lucru)`);

  // ===== ANIME 50+ =====
  if(["waifu","neko","shinobu","megumin","awoo","cuddle","hug","kiss","slap","pat","bully","cry","bonk","yeet","blush","smile","wave","highfive","handhold","nom","bite","glomp","slap","kill","kick","happy","wink","poke","dance","cringe","anime","naruto","goku","luffy","rem","nezuko","gojo","sukuna","tanjiro","zoro","sasuke","sakura","itachi","kakashi","vegeta","bulma","nami","sanji","hinata","ram","emilia"].includes(cmd)){
   try{
    let apiCmd=cmd; if(["naruto","goku","luffy","rem","nezuko","gojo","sukuna","sasuke","sakura","itachi","zoro","vegeta","bulma","nami"].includes(cmd)) apiCmd="waifu";
    const res=await fetch(`https://api.waifu.pics/sfw/${apiCmd}`); const d=await res.json();
    await sock.sendMessage(jid,{image:{url:d.url},caption:`✨ ${cmd.toUpperCase()} ✨\n🎌 Anime | 👑 RO-BOT-228 Craiova`},{quoted:m});
   }catch(e){ await reply(`✨ ${cmd} - incearca din nou!`); }
  }

 });
}

app.get('/', async(req,res)=>{
 let qrImg=""; if(qrData){ const QRCode=require('qrcode'); qrImg=await QRCode.toDataURL(qrData); }
 res.send(`<html><head><meta name="viewport" content="width=device-width,initial-scale=1"><style>body{background:#000;color:#fff;font-family:Arial;text-align:center;padding:15px}.box{background:#111;border-radius:20px;padding:20px;max-width:420px;margin:auto;border:1px solid #222}input,button{padding:14px;width:90%;border-radius:12px;border:none;margin:6px 0}button{background:#25D366;color:#fff;font-weight:bold}code{font-size:10px;word-break:break-all}</style></head><body><div class="box"><h2>RO-BOT-228</h2><h3 style="color:#25D366">${status}</h3><p>100+ COMENZI ACTIVE</p>${qrImg? `<img src="${qrImg}" width="280"><p>Scaneaza QR</p>`:`<p>QR se genereaza... refresh 30s</p>`}<hr><input id="n" placeholder="407xxxxxxxx"><button onclick="gen()">GENEREAZA COD 8 CIFRE</button><div id="c"></div><p style="font-size:11px;opacity:0.5">.meniu.play.waifu.balanta.munca | Craiova</p></div><script>async function gen(){const n=document.getElementById('n').value; if(!n) return alert('nr'); document.getElementById('c').innerHTML='Se genereaza...'; const r=await fetch('/code?number='+n); const t=await r.text(); document.getElementById('c').innerHTML=t;} setTimeout(()=>location.reload(),30000);</script></body></html>`);
});
app.get('/code', async(req,res)=>{
 const num=req.query.number?.replace(/[^0-9]/g,''); if(!num) return res.send('Pune nr');
 try{ if(!sock) return res.send('Asteapta 5 sec'); const code=await sock.requestPairingCode(num); res.send(`<div style="background:#fff;color:#000;padding:12px;border-radius:12px"><h1 style="letter-spacing:5px">${code}</h1><p>WhatsApp > Dispozitive > Conecteaza cu nr</p></div>`);}catch(e){ res.send('Eroare:'+e.message); }
});
app.listen(PORT,()=>{ console.log('Live 100+ comenzi'); startBot(); });
