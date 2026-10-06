const express=require('express');
const {default:makeWASocket,useMultiFileAuthState,DisconnectReason}=require('@whiskeysockets/baileys');
const QRCode=require('qrcode');
const pino=require('pino');
const app=express();
const PORT=process.env.PORT||3000;
let qrData=null;
let status="Porneste...";
let sock;
let antiSpam=new Map();

async function startBot(){
const{state,saveCreds}=await useMultiFileAuthState('./auth');
sock=makeWASocket({auth:state,logger:pino({level:'silent'})});
sock.ev.on('creds.update',saveCreds);
sock.ev.on('connection.update',u=>{
if(u.qr){qrData=u.qr;status="Scaneaza QR / COD"}
if(u.connection==='close'){const r=u.lastDisconnect?.error?.output?.statusCode;if(r!==DisconnectReason.loggedOut)startBot()}
if(u.connection==='open'){status="✅ CONECTAT!";qrData=null}
});
sock.ev.on('messages.upsert',async({messages})=>{
const m=messages[0];
if(!m.message)return; // FIX - AM SCOS fromMe CA SA ITI RASPUNDA SI TIE!
const jid=m.key.remoteJid;
const sender=m.key.participant||jid;
const body=(m.message.conversation||m.message.extendedTextMessage?.text||"").toLowerCase().trim();
const now=Date.now();
let d=antiSpam.get(sender)||{msgs:[],mutedUntil:0};
if(d.mutedUntil>now)return;
d.msgs=d.msgs.filter(t=>now-t<5000);
d.msgs.push(now);
if(d.msgs.length>5&&jid.endsWith('@g.us')){
d.mutedUntil=now+300000;d.msgs=[];
try{await sock.sendMessage(jid,{text:`🚫 @${sender.split('@')[0]} MUTE 5 min spam!`,mentions:[sender]});}catch(e){}
}
antiSpam.set(sender,d);

// MENU
if(body==".meniu"||body==".menu"){
try{await sock.sendMessage(jid,{react:{text:"🔥",key:m.key}});}catch(e){}
await sock.sendMessage(jid,{text:`🔥 *RO-BOT-228 MENU - 200 COMENZI* 🔥

🤖 BOT ROMANESC 24/7

📜 *PRINCIPALE:*
.meniu - acest meniu
.ping - viteza bot
.alive - status
.owner - creator

🛡️ *ANTI-SPAM:*
.anti-spam - info anti-spam
.mute @user - mute manual
.unmute @user - unmute

😂 *FUN 30 comenzi:*
.pacanea.meme.banc.quote.8ball
.gay @.prostitut @.prost @.frumos @
.slut @.noroc.ghinion.iubeste @
.pup @.palma @.shoot @

🎮 *JOCURI:*
.xo.zar.ghiceste.rps

⚙️ *GRUP:*
.link.info.admins.kick @.add 40xxx
.promote @.demote @.tagall.hidetag
.close.open.setname.setdesc

🔞 *+18 (doar privat):*
.pula.pizda.fute etc...

📥 *DOWNLOAD:*
.yt url.tiktok url.insta url

Si inca 150+ comenzi!
Scrie.comenzi full pentru lista completa!

👑 Creator: Cosmin`});
return;
}

if(body==".ping"){await sock.sendMessage(jid,{text:`⚡ Pong! ${Date
