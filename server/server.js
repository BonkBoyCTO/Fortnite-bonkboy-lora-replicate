const fs = require('fs');
const path = require('path');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const winston = require('winston');
require('winston-daily-rotate-file');
require('dotenv').config();
const rateLimit = require('express-rate-limit');
const { Connection, PublicKey } = require('@solana/web3.js');

const app = express();
const PORT = process.env.PORT || 3001;

// 🔥 Serve static frontend files
app.use(express.static(path.join(__dirname, '../public')));

// 🔐 Middleware
app.use(cors());
app.use(helmet());
app.use(express.json());

// 📁 Logs
const logDir = path.join(__dirname, 'logs');
if (!fs.existsSync(logDir)) fs.mkdirSync(logDir);

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.printf(({ timestamp, level, message }) => `[${timestamp}] ${level.toUpperCase()}: ${message}`)
  ),
  transports: [
    new winston.transports.DailyRotateFile({
      filename: path.join(logDir, 'server-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      maxSize: '10m',
      maxFiles: '14d',
    }),
    new winston.transports.Console()
  ],
});

// 💰 Solana Config
const BONKBOY_TOKEN = "BEyp5W9oQosUDD2hPt2Qeg6fuAkNUbnvR6ZJhD8Ybonk";
const TOKEN_PROGRAM_ID = new PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA");
const RPC_ENDPOINT = process.env.HELIUS_RPC_URL || "https://mainnet.helius-rpc.com/?api-key=YOUR_API_KEY";
const connection = new Connection(RPC_ENDPOINT);

// 🛡 Rate Limit
app.use(rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  message: "⏳ Too many requests. Please slow down.",
}));

// 🔁 Redirect root to index.html
app.get('/', (req, res) => {
 res.sendFile(path.join(__dirname, '../public/index.html'));
});

// ✅ Health
app.get('/healthcheck', async (req, res) => {
  try {
    const slot = await connection.getSlot();
    res.send(`✅ Solana RPC live (slot: ${slot})`);
  } catch (err) {
    logger.error("❌ RPC health check failed: " + err.message);
    res.status(500).send("❌ RPC error");
  }
});

// 💸 Token Balance
app.get('/api/balance/:wallet', async (req, res) => {
  const { wallet } = req.params;
  logger.info(`🔍 Request received for BONKBOY balance: ${wallet}`);

  try {
    const ownerPubkey = new PublicKey(wallet);
    const tokenAccounts = await connection.getParsedTokenAccountsByOwner(ownerPubkey, {
      programId: TOKEN_PROGRAM_ID,
    });

    const bonkAccount = tokenAccounts.value.find(acc =>
      acc.account.data.parsed.info.mint === BONKBOY_TOKEN
    );

    const uiAmount = bonkAccount?.account.data.parsed.info.tokenAmount.uiAmount || 0;

    logger.info(`✅ Balance for ${wallet}: ${uiAmount}`);
    res.set('Cache-Control', 'no-store');
    return res.json({ balance: uiAmount });
  } catch (err) {
    logger.error(`❌ Failed to fetch balance for ${wallet}: ${err.message}`);
    return res.status(500).json({ error: "Failed to fetch balance" });
  }
});

// ❌ Catch-All 404
app.use((req, res) => {
  res.status(404).json({
    error: "Route not found. Try /api/balance/:wallet or /healthcheck"
  });
});

// 🚀 Start Server
app.listen(PORT, () => {
  logger.info(`✅ Backend server running on port ${PORT}`);
});
