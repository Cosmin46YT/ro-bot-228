const express = require('express');
const fs = require('fs');
const app = express();
const PORT = process.env.PORT || 3000;
let qrData = null;
let status = "Se incarca...";
let sock = null;
let mySessionId = null;

function genMySession(){
 try{
  if(!fs.existsSync('./auth/creds.json')) return null;
  const creds = fs.readFileSync('./auth/creds.json','utf-8');
  const b64 = Buffer.from(creds).toString('base64');
  mySessionId = `RO-BOT-228;;;${b64}`;
  return mySessionId;
 }catch(e){ return null; }
}

async function startBot(){
 try{
  if(process.env.SESSION_ID){
   try{
    if(!fs.existsSync('./auth')) fs.mkdirSync('./auth',{recursive:true});
    let data = process.env.SESSION_ID.trim();
    if(data.includes(';;;')) data = data.split(';;;').pop();
    fs.writeFileSync('./auth/creds.json', Buffer.from(data,'base64').toString('utf-8'));
    console.log('✅ Session din ENV restaurat!');
   }catch(e){}
  }
  if(!fs.existsSync('./auth')) fs.mkdirSync('./auth');
  const { default: makeWASocket, useMultiFileAuthState, DisconnectReason } = require('@whiskeysockets/baileys');
  const pino = require('pino');
  const { state, saveCreds } = await useMultiFileAuthState('./auth');
  sock = makeWASocket({ auth: state, logger: pino({level:'silent'}), browser:["RO-BOT-228","Chrome","1.0.0"] });
  sock.ev.on('creds.update', saveCreds);
  sock.ev.on('connection.update', async(u)=>{
   if(u.qr){ qrData=u.qr; status="Scaneaza QR/COD"; }
   if(u.connection==='close'){
    const c=u.lastDisconnect?.error?.output?.statusCode;
    if(c!==DisconnectReason.loggedOut) setTimeout(startBot,3000);
   }
   if(u.connection==='open'){
    status="✅ CONECTAT!";
    qrData=null;
    const sess = genMySession();
    console.log('✅ CONECTAT! SESSION:', sess?.slice(0,50));
    // trimite automat session in privat la owner dupa 3 sec
    if(sess &&!process.env.SESSION_ID){
     setTimeout(async()=>{
      try{
       const ownerJid = sock.user.id;
       await sock.sendMessage(ownerJid, {text:`✅ *RO-BOT-228 SESSION ID GENERAT DE BOTUL TAU!*\n\nCopie tot textul de jos si pune-l in Render > Environment > SESSION_ID:\n\n\`\`\`${sess}\`\`\`\n\nDupa ce il pui in Render, botul ramane online permanent!`});
      }catch(e){ console.log(e); }
     },3000);
    }
   }
  });

  // --- COMENZILE TALE 200+ ---
  sock.ev.on('messages.upsert', async({messages})=>{
   const m=messages[0]; if(!m.message || m.key.fromMe) return;
   const jid=m.key.remoteJid; const raw=(m.message.conversation||m.message.extendedTextMessage?.text||"").trim(); const text=raw.toLowerCase();
   const args=raw.slice(1).split(" "); const cmd=args[0].toLowerCase(); const q=args.slice(1).join(" ").trim();
   const reply=async(t)=>{ await sock.sendMessage(jid,{text:t},{quoted:m}); };
   if(text===".meniu") await sock.sendMessage(jid,{text:`🧭 RO-BOT-228 200+ COMENZI\n.meniu.ping.owner.noroc.zar.balanta.munca.tagall.link-grup.play.waifu\nScrie.session ca sa iti dea SESSION ID-ul botului tau!`},{quoted:m});
   if(text===".session" || text===".getsession"){
    const sess=genMySession();
    if(!sess) return reply("❌ Nu e conectat inca! Conecteaza-te intai cu QR/COD!");
    await reply(`✅ *SESSION ID DE LA BOTUL TAU RO-BOT-228:*\n\nCopie tot de mai jos si pune in Render ENV:\n\n${sess}\n\nPune in Render > Environment > SESSION_ID`);
   }
   if(text===".ping") await reply("⚡ Pong! ONLINE!");
   if(text===".owner") await reply("👑 Cosmin46YT Craiova");
   if(text.startsWith(".noroc")) await reply(`🍀 ${Math.floor(Math.random()*100)}%`);
   if(cmd==="play"){
    if(!q) return reply("Scrie.play nume");
    try{ const yts=require('yt-search'); const s=await yts(q); const v=s.videos[0]; await sock.sendMessage(jid,{image:{url:v.thumbnail},caption:`🎵 ${v.title}\n${v.url}`},{quoted:m}); }catch(e){ await reply("Eroare play"); }
   }
   if(["waifu","neko"].includes(cmd)){
    try{ const r=await fetch(`https://api.waifu.pics/sfw/${cmd}`); const d=await r.json(); await sock.sendMessage(jid,{image:{url:d.url},caption:`✨ ${cmd}`},{quoted:m}); }catch(e){}
   }
  });
  status=process.env.SESSION_ID? "✅ SESSION ACTIV" : "Astept QR/COD";
 }catch(e){ status="Eroare: "+e.message; }
}

app.get('/', async(req,res)=>{
 let qrImg=""; if(qrData){ const QRCode=require('qrcode'); qrImg=await QRCode.toDataURL(qrData); }
 const sess=genMySession();
 res.send(`<html><head><meta name="viewport" content="width=device-width,initial-scale=1"><style>body{background:#000;color:#fff;font-family:Arial;text-align:center;padding:15px}.box{background:#111;border-radius:20px;padding:20px;max-width:400px;margin:auto;border:1px solid #222}input{padding:14px;width:85%;border-radius:12px;border:none;margin:8px 0;text-align:center}button{padding:14px;width:90%;border-radius:12px;border:none;background:#25D366;color:#fff;font-weight:bold;margin:5px 0}code{word-break:break-all;background:#000;padding:10px;display:block;border-radius:8px;font-size:10px;margin:10px 0}</style></head><body><div class="box"><h2>RO-BOT-228</h2><h3 style="color:#25D366">${status}</h3>${process.env.SESSION_ID? `<p style="background:#0a2e0a;padding:10px;border-radius:10px">✅ Conectat cu SESSION ID din ENV</p>`: `${qrImg? `<img src="${qrImg}" width="260"><p>Scaneaza QR</p>`:`<p>QR se genereaza...</p>`}<hr><input id="n" placeholder="407xxxxxxxx"><br><button onclick="gen()">GENEREAZA COD PAIR</button><div id="c"></div>`}<hr>${sess? `<h4>✅ SESSION ID DE LA BOTUL TAU:</h4><code>${sess}</code><p style="font-size:11px">Copie tot si pune in Render > ENV > SESSION_ID</p><button onclick="navigator.clipboard.writeText('${sess}')">COPIAZA SESSION</button>`:`<p>Session apare aici dupa ce conectezi botul cu QR/COD</p>`}<hr><p style="font-size:10px;opacity:0.5">Scrie.session in privat dupa conectare</p></div><script>async function gen(){const n=document.getElementById('n').value; if(!n) return alert('Pune nr'); document.getElementById('c').innerHTML='Se genereaza...'; const r=await fetch('/code?number='+n); const t=await r.text(); document.getElementById('c').innerHTML=t;} setTimeout(()=>location.reload(),30000);</script></body></html>`);
});
app.get('/code', async(req,res)=>{
 const num=req.query.number?.replace(/[^0-9]/g,''); if(!num) return res.send('Pune nr'); try{ if(!sock) return res.send('Asteapta'); const code=await sock.requestPairingCode(num); res.send(`<div style="background:#fff;color:#000;padding:15px;border-radius:12px"><h1 style="letter-spacing:5px">${code}</h1><p style="font-size:11px">Baga in WhatsApp > Dispozitive > Conecteaza cu nr</p></div>`);}catch(e){ res.send('Eroare:'+e.message); }
});
app.listen(PORT, ()=>{ console.log('Live'); startBot(); });
