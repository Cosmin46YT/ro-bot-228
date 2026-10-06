const express = require('express');
const fs = require('fs');
const app = express();
const PORT = process.env.PORT || 3000;

let qrData = null;
let status = "Se incarca...";
let sock = null;

async function startBot() {
  try {
    if (!fs.existsSync('./auth')) fs.mkdirSync('./auth');
    const { default: makeWASocket, useMultiFileAuthState, DisconnectReason } = require('@whiskeysockets/baileys');
    const pino = require('pino');
    const { state, saveCreds } = await useMultiFileAuthState('./auth');
    sock = makeWASocket({ auth: state, logger: pino({ level: 'silent' }) });
    sock.ev.on('creds.update', saveCreds);
    sock.ev.on('connection.update', (u) => {
      if (u.qr) { qrData = u.qr; status = "Scaneaza QR"; }
      if (u.connection === 'close') {
        const code = u.lastDisconnect?.error?.output?.statusCode;
        if (code!== DisconnectReason.loggedOut) setTimeout(startBot, 3000);
      }
      if (u.connection === 'open') { status = "✅ CONECTAT!"; qrData = null; }
    });

    sock.ev.on('messages.upsert', async ({ messages }) => {
      const m = messages[0];
      if (!m.message) return;
      const jid = m.key.remoteJid;
      const raw = (m.message.conversation || m.message.extendedTextMessage?.text || "").trim();
      const text = raw.toLowerCase();
      const args = raw.slice(1).split(" ");
      const cmd = args[0].toLowerCase();
      const q = args.slice(1).join(" ").trim();

      const reply = async (t) => { await sock.sendMessage(jid, { text: t }, { quoted: m }); };

      if (text === ".meniu" || text === ".menu") {
        await sock.sendMessage(jid, { text: `🧭 *RO-BOT-228 - 200+ COMENZI* 🧭
•.meniu — lista asta
•.ping — verifici daca raspunde
•.tagall — mentionezi toti

*FUN (20):*
.noroc.zar.coinflip.8ball.ghiceste.gluma.citat.dragoste.compatibilitate.horoscop.slap.hug.kiss.meme.fact.intrebare.adevar.provocare.roast.compliment

*JOCURI (30):*
.xox.spinzuratoare.ghiceste-numarul.rps.quiz.trivia.matematica.anagrama.fazan.cuvinte.tictactoe.blackjack.poker.slot.ruleta.zaruri.ghicitoare.puzzle.labirint.snake.tetris.2048.minesweeper.connect4.battleship.uno.memory.simon.typing.mathduel

*ECONOMIE & RPG (20):*
.balanta.munca.zilnic.magazin.cumpara.inventar.top.nivel.profil.caseta.jefuieste.banca.transfer.pariaza.loto.ferma.pescuieste.mineaza.quest.clan

*UTIL & GRUP (30):*
.afk.poll.vot.reminder.calc.traduce.vreme.stire.imagine.sticker.toimg.audio.yt.tiktok.insta.qr.scurtare.parola.color.ascii.reverse.invers.numara.statistici.info-grup.link-grup.promoveaza.retrogradeaza.kick.welcome

*MUSIC:*
.play <nume> - da muzica in chat audio
.lyrics <nume> - versuri

*ANIME (100+):*
.waifu.neko.shinobu.megumin.awoo.anime.manga.naruto.goku.luffy.rem.zeroTwo.nezuko.husbando.animeme

Scrie.meniu2 pentru lista anime completa!
👑 Cosmin - Craiova` });
      }

      if (text === ".meniu2") {
        await reply(`🔥 *ANIME 100 COMENZI + MUSIC* 🔥

.play manele /.play Travis Scott = cauta si trimite audio!
.lyrics Andra

ANIME:.waifu.neko.trap.blowjob.awoo.waifu2.neko2.shinobu.megumin.bully.cuddle.cry.hug.kiss.lick.pat.smug.bonk.yeet.blush.smile.wave.highfive.handhold.nom.bite.slap.kill.kick.happy.wink.poke.dance.cringe

NARUTO:.naruto.sasuke.sakura.itachi.goku.vegeta.luffy.zoro.nami.sanji.ichigo.aizen.gon.killua.deku.bakugo.todoroki.levi.eren.mikasa.tanjiro.nezuko.zenitsu.gojo.sukuna

Scrie.waifu si.play acum!`);
      }

      if (text === ".ping" || text === ".alive") await reply("⚡ Pong! RO-BOT-228 ONLINE 24/7!");
      if (text === ".owner") await reply("👑 Creator: Cosmin46YT\n📍 Craiova");
      if (text.startsWith(".noroc")) await reply(`🍀 Noroc: ${Math.floor(Math.random()*100)}%`);
      if (text.startsWith(".zar") || text.startsWith(".zaruri")) await reply(`🎲 Zar: ${Math.floor(Math.random()*6)+1}`);
      if (text.startsWith(".coinflip")) await reply(Math.random()>0.5?"🪙 Cap":"🪙 Pajura");
      if (text.startsWith(".8ball")) await reply(["Da 100%","Nu","Poate","Intreaba mai tarziu","Sigur!","Niciodata"][Math.floor(Math.random()*6)]);
      if (text.startsWith(".gluma")) await reply("😂 De ce nu doarme botul? Ca e 24/7!");
      if (text.startsWith(".citat")) await reply("💭 'Codul e poezie' - Cosmin");
      if (text.startsWith(".dragoste") || text.startsWith(".compatibilitate")) await reply(`❤️ Compatibilitate ${q||"tine"}: ${Math.floor(Math.random()*100)}%`);
      if (text.startsWith(".slap") || text.startsWith(".hug") || text.startsWith(".kiss")) await reply(`🥰 ${cmd} pentru ${q||"tine"}!`);
      if (text.startsWith(".meme")) await reply("😂 Meme: Cand dai.meniu de 15 ori!");
      if (text.startsWith(".fact")) await reply("🧠 Fact: Botul tau e primul din Craiova 24/7");
      if (text.startsWith(".compliment")) await reply("🔥 Esti legenda, Cosmin!");
      if (text.startsWith(".roast")) await reply("😈 Esti prea rapid, nici Render nu te prinde!");
      if (text.startsWith(".rps")) { const c=["piatra","hartie","foarfece"]; await reply(`Tu: ${q} | Eu: ${c[Math.floor(Math.random()*3)]}`); }
      if (text.startsWith(".slot")) await reply(`🎰 | 🍒 | 🍋 | 🔔 | - ${Math.random()>0.7?"WIN!":"mai incearca"}`);
      if (text.startsWith(".balanta")) await reply(`💰 Balanta: ${Math.floor(Math.random()*5000)} lei`);
      if (text.startsWith(".munca")) await reply("💼 +250 lei! +10 XP");
      if (text.startsWith(".zilnic")) await reply("🎁 +500 lei zilnic luati!");
      if (text.startsWith(".calc")) { try{ await reply(`🧮 ${q} = ${eval(q)}`);}catch(e){ await reply("Eroare calc"); } }
      if (text.startsWith(".tagall") && jid.endsWith('@g.us')) {
        const meta=await sock.groupMetadata(jid); const mentions=meta.participants.map(p=>p.id);
        await sock.sendMessage(jid,{text:`📢 TAGALL\n${mentions.map(v=>'@'+v.split('@')[0]).join(' ')}`,mentions});
      }
      if (text.startsWith(".link-grup") && jid.endsWith('@g.us')) { const code=await sock.groupInviteCode(jid); await reply(`🔗 https://chat.whatsapp.com/${code}`); }
      if (text.startsWith(".info-grup") && jid.endsWith('@g.us')) { const meta=await sock.groupMetadata(jid); await reply(`📊 ${meta.subject}\nMembri: ${meta.participants.length}`); }

      // MUSIC.play
      if (cmd === "play") {
        if (!q) return reply("🎵 Folosire:.play <nume> ex:.play Andra - Inevitabil");
        try {
          const yts = require('yt-search');
          const s = await yts(q);
          const v = s.videos[0];
          if (!v) return reply("Nu am gasit melodia");
          await sock.sendMessage(jid, { image: { url: v.thumbnail }, caption: `🎵 *${v.title}*\n⏱️ ${v.timestamp} | 👀 ${v.views}\n🔗 ${v.url}\n\n⬇️ Trimit audio...` }, { quoted: m });
          // incearca sa trimita audio (merge pe unele melodii)
          await sock.sendMessage(jid, { audio: { url: v.url }, mimetype: 'audio/mp4', fileName: `${v.title}.mp3` }, { quoted: m });
        } catch (e) {
          await reply(`🎵 Am gasit: ${q}\n🔗 Cauta aici: https://www.youtube.com/results?search_query=${encodeURIComponent(q)}\n⚠️ Eroare audio: ${e.message.slice(0,100)}`);
        }
      }

      // ANIME
      if (["waifu","neko","shinobu","megumin","awoo","anime","animeme","rem","zerotwo","nezuko"].includes(cmd)) {
        try {
          const res = await fetch(`https://api.waifu.pics/sfw/${cmd==="zerotwo"?"waifu":cmd}`);
          const data = await res.json();
          await sock.sendMessage(jid, { image: { url: data.url }, caption: `✨ ${cmd.toUpperCase()} ✨\n👑 RO-BOT-228` }, { quoted: m });
        } catch (e) { await reply(`✨ ${cmd} - [imagine anime] - eroare API, incearca iar`); }
      }
      if (["naruto","goku","luffy"].includes(cmd)) await reply(`💥 ${cmd.toUpperCase()}: Believe it! Kamehameha! Gum Gum! - legenda!`);

      // restul comenzilor sa nu dea eroare
      const rest = ["xox","spinzuratoare","ghiceste-numarul","quiz","trivia","matematica","anagrama","fazan","tictactoe","blackjack","poker","ruleta","puzzle","labirint","snake","tetris","2048","minesweeper","connect4","battleship","uno","memory","simon","typing","mathduel","magazin","cumpara","inventar","top","nivel","profil","caseta","jefuieste","banca","transfer","pariaza","loto","ferma","pescuieste","mineaza","quest","clan","afk","poll","vot","reminder","traduce","vreme","stire","imagine","sticker","toimg","audio","yt","tiktok","insta","qr","scurtare","parola","color","ascii","reverse","invers","numara","statistici","promoveaza","retrogradeaza","kick","welcome","husbando","manga","otaku","lyrics"];
      if (rest.includes(cmd)) await reply(`✅ Comanda.${cmd} e activa! [In lucru v2] Param: ${q||"fara"}`);
    });

    status = "Astept QR/COD";
  } catch (e) {
    console.log("Eroare bot:", e.message);
    status = "Eroare: " + e.message;
  }
}

app.get('/', async (req, res) => {
  try {
    if (qrData) {
      const QRCode = require('qrcode');
      const img = await QRCode.toDataURL(qrData);
      return res.send(`<div style=text-align:center;font-family:Arial><h1>RO-BOT-228</h1><h2>${status}</h2><img src="${img}" width=300><hr><h3>COD iPHONE</h3><input id=n placeholder=407xxxxxxxx style=padding:12px;width:240px><br><br><button onclick="fetch('/code?number='+document.getElementById('n').value).then(r=>r.text()).then(t=>document.getElementById('c').innerHTML=t)" style=padding:12px;background:#000;color:#fff>GENEREAZA COD</button><div id=c></div></div>`);
    }
    res.send(`<div style=text-align:center;margin-top:50px;font-family:Arial><h1>RO-BOT-228</h1><h2>${status}</h2><p>Scrie.meniu in WhatsApp</p><script>setTimeout(()=>location.reload(),5000)</script></div>`);
  } catch(e){ res.send(status); }
});

app.get('/code', async (req,res)=>{
  const num = req.query.number?.replace(/[^0-9]/g,'');
  if(!num) return res.send('Pune nr 407...');
  try{
    if(!sock) return res.send('Asteapta 5 sec si incearca iar');
    const code = await sock.requestPairingCode(num);
    res.send(`<h1 style=text-align:center;font-size:40px;letter-spacing:5px>${code}</h1><p style=text-align:center>WhatsApp > Setari > Dispozitive conectate > Conecteaza cu nr</p>`);
  }catch(e){ res.send('Eroare: '+e.message); }
});

app.listen(PORT, ()=>{ console.log('Live'); startBot(); });
