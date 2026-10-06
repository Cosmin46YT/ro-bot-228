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
if(u.connection==='open'){status="CONECTAT!";qrData=null}
});
sock.ev.on('messages.upsert',async({messages})=>{
const m=messages[0];
if(!m.message||m.key.fromMe)return;
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
try{await sock.sendMessage(jid,{text:"MUTE 5 min - spam! @"+sender.split('@')[0],mentions:[sender]});}catch(e){}
}
antiSpam.set(sender,d);
if(body==".meniu"||body==".menu"||body=="meniu"||body=="menu"){
try{await sock.sendMessage(jid,{react:{text:"🔥",key:m.key}});}catch(e){}
await sock.sendMessage(jid,{text:"*RO-BOT-228 MENU*\n\nBOT ROMANESC 24/7\n\nCOMENZI:\n.meniu - meniu\n.ping - viteza\n.alive - online?\n\nANTI-SPAM: 5 msg/5sec = MUTE 5min\nCreator: Cosmin"});
}
if(body==".ping"){await sock.sendMessage(jid,{text:"Pong! BOT ONLINE!"})}
if(body==".alive"){await sock.sendMessage(jid,{text:"RO-BOT-228 ONLINE 24/7!"})}
});
}

app.get('/',async(req,res)=>{
if(qrData){
const qi=await QRCode.toDataURL(qrData);
res.send(`<div style=text-align:center><h1>RO-BOT-228</h1><h2>${status}</h2><img src="${qi}" width=300></div>`);
}else{
if(status.includes('CONECTAT'))res.send(`<h1 style=text-align:center>${status}<br>Scrie.meniu in grup!</h1>`);
else res.send(`<div style=text-align:center><h1>RO-BOT-228</h1><h2>${status}</h2><script>setTimeout(()=>location.reload(),3000)</script></div>`);
}
});

app.get('/code',async(req,res)=>{
const number=req.query.number?.replace(/[^0-9]/g,'');
if(!number)return res.send('Pune numar!');
try{
if(!sock)await startBot();
await new Promise(r=>setTimeout(r,2000));
const code=await sock.requestPairingCode(number);
res.send(`<h1 style="font-size:60px">${code}</h1>`);
}catch(e){res.send('Eroare: '+e.message)}
});

app.listen(PORT,()=>{startBot();console.log('Live pe '+PORT)});
