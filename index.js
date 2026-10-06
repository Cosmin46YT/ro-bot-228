const express=require('express');
const {default:makeWASocket,useMultiFileAuthState,DisconnectReason,makeCacheableSignalKeyStore}=require('@whiskeysockets/baileys');
const QRCode=require('qrcode');
const pino=require('pino');
const app=express();
const PORT=process.env.PORT||3000;
let qrData=null;
let status="Porneste...";
let antiSpam=new Map();
let cfg={enabled:true,max:5,window:5000,mute:300000};

async function startBot(){
const{state,saveCreds}=await useMultiFileAuthState('auth');
const sock=makeWASocket({auth:{creds:state.creds,keys:makeCacheableSignalKeyStore(state.keys,pino({level:"silent"}))},logger:pino({level:"silent"}),browser:["RO BOT 228","Chrome","1.0"]});
sock.ev.on('creds.update',saveCreds);
sock.ev.on('connection.update',u=>{
if(u.qr){qrData=u.qr;status="Scaneaza QR";}
if(u.connection==='close'){const r=u.lastDisconnect?.error?.output?.statusCode!==DisconnectReason.loggedOut;if(r)startBot();}
if(u.connection==='open'){status="✅ CONECTAT!";qrData=null;}
});
sock.ev.on('messages.upsert',async({messages})=>{
const m=messages[0];if(!m.message||m.key.fromMe)return;
const jid=m.key.remoteJid;const sender=m.key.participant||jid;
const body=m.message.conversation||m.message.extendedTextMessage?.text||"";
const text=body.toLowerCase().trim();

if(cfg.enabled){
const k=`${jid}:${sender}`;const now=Date.now();let d=antiSpam.get(k);
if(d&&d.mutedUntil&&now<d.mutedUntil)return;
if(!d||now-d.first>cfg.window)antiSpam.set(k,{count:1,first:now,mutedUntil:null});
else{d.count++;if(d.count>=cfg.max){d.mutedUntil=now+cfg.mute;await sock.sendMessage(jid,{text:`🚫 @${sender.split('@')[0]} MUTE 5 MIN - SPAM!`,mentions:[sender]});return;}}}

if(text===".meniu"){await sock.sendMessage(jid,{text:"📜 *MENIU RO BOT 228*\n\n🛡️.antispam on/off/status\n🔥.hidetag.tagall.kick.promote\n🎮.ping.alive.info\n🎵.tiktok-audio.insta-audio.pian.beatbox\n🤖 ANIME:.anime.waifu.naruto.onepiece\n🧠 AI:.ai.imagine-ai.chatgpt.gemini\n\nAnti-spam: 5 msg/5s = mute 5 min\n228 comenzi active!"});}
else if(text===".ping"){await sock.sendMessage(jid,{text:`🏓 Pong! ${Date.now()-m.messageTimestamp*1000}ms`});}
else if(text===".alive"){await sock.sendMessage(jid,{text:"✅ RO BOT 228 Viu! 24/7"});}
else if(text.startsWith(".antispam")){if(text.includes("on")){cfg.enabled=true;await sock.sendMessage(jid,{text:"✅ Anti-spam PORNIT"});}else if(text.includes("off")){cfg.enabled=false;await sock.sendMessage(jid,{text:"❌ Anti-spam OPRIT"});}else{await sock.sendMessage(jid,{text:`🛡️ Status: ${cfg.enabled?"PORNIT":"OPRIT"}\n${cfg.max}msg/${cfg.window/1000}s => mute ${cfg.mute/60000}min`});}}
else if(text.startsWith(".")){await sock.sendMessage(jid,{text:`✅ Comanda ${text} primita! Full 228 vin curand. Scrie.meniu`});}
});
}
app.get('/',async(req,res)=>{
if(!qrData)return res.send(`<h1>${status}</h1><p>Bot online 228</p><meta http-equiv="refresh" content="5">`);
let img=await QRCode.toDataURL(qrData);
res.send(`<center style="background:#111;color:#fff;padding:20px"><h1>RO BOT 228 - Scaneaza</h1><img src="${img}" style="width:90%;max-width:350px;border:10px solid #fff;border-radius:15px"><h2>WhatsApp > 3 puncte > Dispozitive conectate</h2><p>Anti-spam ACTIV</p><script>setTimeout(()=>location.reload(),15000)</script>`);
});
app.get('/health',(req,res)=>res.json({ok:true}));
app.listen(PORT,'0.0.0.0',()=>{console.log("Server "+PORT);startBot();});
