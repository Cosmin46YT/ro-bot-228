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
    const QRCode = require('qrcode');
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
      const text = (m.message.conversation || m.message.extendedTextMessage?.text || "").trim().toLowerCase();

      if (text === ".meniu" || text === ".menu") {
        await sock.sendMessage(jid, { text: "🔥 RO-BOT-228 MENU 🔥\n\n.meniu - meniu\n.ping - test\n.alive - status\n.owner - creator\n\n✅ iti raspunde si tie acum!\n👑 Cosmin - Craiova" });
      }
      if (text === ".ping") await sock.sendMessage(jid, { text: "⚡ Pong! ONLINE" });
      if (text === ".alive") await sock.sendMessage(jid, { text: "✅ BOT ONLINE 24/7" });
      if (text === ".owner") await sock.sendMessage(jid, { text: "👑 Cosmin46YT" });
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
