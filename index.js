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
      if (u.qr) { qrData = u.qr; status = "Scaneaza QR sau COD"; }
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
.meniu — lista asta
.ping — verifici daca raspunde
.tagall — mentionezi toti
*FUN:*.noroc.zar.coinflip.8ball.ghiceste.gluma.citat.dragoste.compatibilitate.horoscop.slap.hug.kiss.meme.fact.roast.compliment
*JOCURI:*.xox.spinzuratoare.rps.quiz.slot.ruleta.zaruri.puzzle.snake.tetris.uno.memory
*ECONOMIE:*.balanta.munca.zilnic.magazin.top.nivel.profil.banca.loto.ferma.quest.clan
*UTIL & GRUP:*.calc.traduce.vreme.stire.sticker.qr.scurtare.info-grup.link-grup.kick
*MUSIC:*.play <nume>
*ANIME:*.waifu.neko.shinobu.megumin.anime.naruto.goku.luffy.rem.nezuko
Scrie.meniu2 pentru anime!
👑 Cosmin - Craiova` });
      }
      if (text === ".meniu2") {
        await reply(`🔥 *ANIME 100 + MUSIC* 🔥
.play manele = cauta si trimite audio!
ANIME:.waifu.neko.awoo.shinobu.megumin.cuddle.hug.kiss.pat.slap
NARUTO:.naruto.sasuke.sakura.itachi.goku.luffy.zoro.gojo.sukuna.tanjiro.nezuko`);
      }
      if (text === ".ping" || text === ".alive") await reply("⚡ Pong! RO-BOT-228 ONLINE 24/7!");
      if (text === ".owner") await reply("👑 Creator: Cosmin46YT 📍 Craiova");
      if (text.startsWith(".noroc")) await reply(`🍀 Noroc: ${Math.floor(Math.random()*100)}%`);
      if (text.startsWith(".zar")) await reply(`🎲 Zar: ${Math.floor(Math.random()*6)+1}`);
      if (text.startsWith(".coinflip")) await reply(Math.random()>0.5?"🪙 Cap":"🪙 Pajura");
      if (text.startsWith(".8ball")) await reply(["Da 100%","Nu","Poate","Sigur!","Niciodata"][Math.floor(Math.random()*5)]);
      if (text.startsWith(".balanta")) await reply(`💰 Balanta: ${Math.floor(Math.random()*5000)} lei`);
      if (text.startsWith(".munca")) await reply("💼 +250 lei! +10 XP");
      if (text.startsWith(".zilnic")) await reply("🎁 +500 lei zilnic luati!");
      if (text.startsWith(".calc")) { try{ await reply(`🧮 ${q} = ${eval(q)}`);}catch(e){ await reply("Eroare calc"); } }
      if (text.startsWith(".tagall") && jid.endsWith('@g.us')) {
        const meta=await sock.groupMetadata(jid); const mentions=meta.participants.map(p=>p.id);
        await sock.sendMessage(jid,{text:`📢 TAGALL\n${mentions.map(v=>'@'+v.split('@')[0]).join(' ')}`,mentions});
      }
      if (text.startsWith(".link-grup") && jid.endsWith('@g.us')) { const code=await sock.groupInviteCode(jid); await reply(`🔗 https://chat.whatsapp.com/${code}`); }
      if (cmd === "play") {
        if (!q) return reply("🎵 Scrie:.play tanca");
        try {
          const yts = require('yt-search');
          const s = await yts(q);
          const v = s.videos[0];
          if (!v) return reply("Nu am gasit");
          await sock.sendMessage(jid, { image: { url: v.thumbnail }, caption: `🎵 *${v.title}*\n⏱️ ${v.timestamp}\n🔗 ${v.url}` }, { quoted: m });
        } catch (e) { await reply(`🎵 ${q}\nhttps://www.youtube.com/results?search_query=${encodeURIComponent(q)}`); }
      }
      if (["waifu","neko","shinobu","megumin","awoo"].includes(cmd)) {
        try {
          const res = await fetch(`https://api.waifu.pics/sfw/${cmd}`);
          const data = await res.json();
          await sock.sendMessage(jid, { image: { url: data.url }, caption: `✨ ${cmd.toUpperCase()} ✨\n👑 RO-BOT-228` }, { quoted: m });
        } catch (e) { await reply(`✨ ${cmd} - eroare API`); }
      }
    });
    status = "Astept QR/COD";
  } catch (e) { console.log("Eroare bot:", e.message); status = "Eroare: " + e.message; }
}

// PAGINA NOUA - AICI E REPARATIA, QR + COD PE ACEEASI PAGINA
app.get('/', async (req, res) => {
  let qrImg = "";
  if (qrData) {
    const QRCode = require('qrcode');
    qrImg = await QRCode.toDataURL(qrData);
  }
  res.send(`
  <html><head><meta name="viewport" content="width=device-width, initial-scale=1"><style>
  body{background:#000;color:#fff;font-family:Arial;text-align:center;padding:15px}
 .box{background:#111;border-radius:20px;padding:20px;max-width:400px;margin:auto;border:1px solid #222}
  img{border-radius:12px;margin:10px 0}
  input{padding:14px;width:85%;border-radius:12px;border:none;margin:10px 0;text-align:center;font-size:16px}
  button{padding:14px;width:90%;border-radius:12px;border:none;background:#25D366;color:#fff;font-weight:bold;font-size:17px}
  #c{margin-top:15px}
  </style></head><body>
  <div class="box">
    <h2 style="margin:0">RO-BOT-228</h2><h3 style="color:#25D366">${status}</h3>
    ${qrImg? `<div><h4>📷 1. SCANEAZA QR</h4><img src="${qrImg}" width="280"><p style="font-size:13px">WhatsApp > 3 puncte > Dispozitive conectate</p></div><hr style="border:0;border-top:1px solid #333;margin:15px 0">` : `<p>QR se genereaza in 5 sec... refresh automat</p><hr style="border:0;border-top:1px solid #333;margin:15px 0">`}
    <div>
      <h4>📱 2. COD PRIN NUMAR (iPHONE)</h4>
      <input id="n" placeholder="407xxxxxxxx" type="tel">
      <br><button onclick="gen()">GENEREAZA COD 8 CIFRE</button>
      <div id="c"></div>
      <p style="font-size:11px;opacity:0.6;margin-top:10px">Codul expira in 20 secunde!</p>
    </div>
    <p style="font-size:11px;opacity:0.4;margin-top:15px">Anti-spam ACTIV | 👑 Cosmin - Craiova</p>
  </div>
  <script>
  async function gen(){
    const num=document.getElementById('n').value;
    if(!num) return alert('Pune nr 407...');
    document.getElementById('c').innerHTML='<p>Se genereaza...</p>';
    const r=await fetch('/code?number='+num);
    const t=await r.text();
    document.getElementById('c').innerHTML=t;
  }
  setTimeout(()=>location.reload(),30000);
  </script></body></html>
  `);
});

app.get('/code', async (req,res)=>{
  const num = req.query.number?.replace(/[^0-9]/g,'');
  if(!num) return res.send('Pune nr 407...');
  try{
    if(!sock) return res.send('Asteapta 5 sec si incearca iar');
    const code = await sock.requestPairingCode(num);
    res.send(`<div style="background:#fff;color:#000;padding:15px;border-radius:12px;margin-top:10px"><h1 style="margin:0;font-size:38px;letter-spacing:5px">${code}</h1><p style="font-size:12px;margin:5px 0 0 0">WhatsApp > Setari > Dispozitive conectate > Conecteaza cu nr</p></div>`);
  }catch(e){ res.send('Eroare: '+e.message); }
});

app.listen(PORT, ()=>{ console.log('Live'); startBot(); });
