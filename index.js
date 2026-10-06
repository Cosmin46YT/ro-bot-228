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
if(!m.message)return;
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
if(body==".meniu"||body==".menu"||body=="meniu"){
try{await sock.sendMessage(jid,{react:{text:"🔥",key:m.key}});}catch(e){}
await sock.sendMessage(jid,{text:`🔥 *RO-BOT-228 MENU* 🔥\n\n🤖 BOT ROMANESC 24/7\n\n📜 COMENZI:\n.meniu - afiseaza meniu\n.ping - viteza\n.alive - online?\n\n🛡️ ANTI-SPAM: 5 msg/5sec = MUTE 5min\n\n👑 Creator: Cosmin`});
}
if(body==".ping"){await sock.sendMessage(jid,{text:"⚡ Pong! BOT ONLINE!"})}
if(body==".alive"){await sock.sendMessage(jid,{text:"✅ RO-BOT-228 ONLINE 24/7!"})}
});
}

app.get('/',async(req,res)=>{
if(qrData){
const qi=await QRCode.toDataURL(qrData);
res.send(`<div style=text-align:center;font-family:Arial;margin-top:20px><h1>RO-BOT-228</h1><h2>${status}</
