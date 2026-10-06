 express = require('express');
const { default: makeWASocket, useMultiFileAuthState, DisconnectReason } = require('@whiskeysockets/baileys');
const QRCode = require('qrcode');
const pino = require('pino');

const app = express();
const PORT = process.env.PORT || 3000;

let qrData = null;
let status = "Porneste...";
let sock;
let antiSpam = new Map();

async function startBot() {
    const { state, saveCreds } = await useMultiFileAuthState('./auth');
    sock = makeWASocket({
        auth: state,
        logger: pino({ level: 'silent' })
    });

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('connection.update', (u) => {
        if (u.qr) {
            qrData = u.qr;
            status = "Scaneaza QR / COD";
        }
        if (u.connection === 'close') {
            const r = u.lastDisconnect?.error?.output?.statusCode;
            if (r!== DisconnectReason.loggedOut) startBot();
        }
        if (u.connection === 'open') {
            status = "✅ CONECTAT!";
            qrData = null;
        }
    });

    sock.ev.on('messages.upsert', async ({ messages }) => {
        const m = messages[0];
        if (!m.message) return;
        const jid = m.key.remoteJid;
        const sender = m.key.participant || jid;
        const body = (m.message.conversation || m.message.extendedTextMessage?.text || "").toLowerCase().trim();
        const now = Date.now();

        let d = antiSpam.get(sender) || { msgs: [], mutedUntil: 0 };
        if (d.mutedUntil > now) return;
        d.msgs = d.msgs.filter(t => now - t < 5000);
        d.msgs.push(now);
        if (d.msgs.length > 5 && jid.endsWith('@g.us')) {
