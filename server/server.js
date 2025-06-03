const fs = require('fs');
const path = require('path');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
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
app.set('trust proxy', 1); // ✅ Trust Render's proxy

const HELIUS_API_KEY = process.env.HELIUS_API_KEY;
const RPC_ENDPOINT = `https://mainnet.helius-rpc.com/?api-key=${HELIUS_API_KEY}`;
console.log("✅ Using Solana RPC:", RPC_ENDPOINT);
const connection = new Connection(RPC_ENDPOINT);

// 🛡 Rate Limiting
app.use(rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  message: "⏳ Too many requests. Please slow down.",
}));

// 🌐 Serve index.html on root
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

// ✅ Healthcheck
app.get('/healthcheck', async (req, res) => {
  try {
    const slot = await connection.getSlot();
    res.send(`✅ Solana RPC live (slot: ${slot})`);
  } catch (err) {
    logger.error("❌ RPC health check failed: " + err.message);
    res.status(500).send("❌ RPC error");
  }
});

// 💸 Token Balance API
app.get('/api/balance/:wallet', async (req, res) => {
  const { wallet } = req.params;
  logger.info(`🔍 Checking balance for wallet: ${wallet}`);

  try {
    const ownerPubkey = new PublicKey(wallet);
    logger.info(`✅ PublicKey created for: ${ownerPubkey.toBase58()}`);

    const tokenAccounts = await connection.getParsedTokenAccountsByOwner(ownerPubkey, {
      programId: TOKEN_PROGRAM_ID,
    });
    logger.info(`🔍 Token accounts fetched for wallet: ${wallet}`);

    if (!tokenAccounts.value || tokenAccounts.value.length === 0) {
      logger.warn(`⚠️ No token accounts found for wallet: ${wallet}`);
      return res.json({ balance: 0, tokens: [] });
    }

    const debugTokens = tokenAccounts.value.map(acc => {
      const mint = acc.account.data.parsed.info.mint;
      const amount = acc.account.data.parsed.info.tokenAmount.uiAmount;
      return { mint, amount };
    });

    logger.info(`🧪 Token list for wallet ${wallet}: ${JSON.stringify(debugTokens, null, 2)}`);

    const bonkAccount = tokenAccounts.value.find(
      acc => acc.account.data.parsed.info.mint === BONKBOY_TOKEN
    );

    if (!bonkAccount) {
      logger.warn(`⚠️ BONKBOY token not found in wallet: ${wallet}`);
    }

    const uiAmount = bonkAccount?.account.data.parsed.info.tokenAmount.uiAmount || 0;
    logger.info(`✅ BONKBOY Balance for ${wallet}: ${uiAmount}`);

    return res.json({ balance: uiAmount, tokens: debugTokens });
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

// 🚀 Launch Server
app.listen(PORT, () => {
  logger.info(`✅ Backend server running on port ${PORT}`);
});
