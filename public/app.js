// ✅ FRONTEND app.js (updated with full API URL)

const walletToggle = document.getElementById('walletToggle');
const walletStatus = document.getElementById('walletStatus');
const bonkboyBalance = document.getElementById('bonkboyBalance');
const retryButton = document.getElementById('retryBalance');

let walletAddress = null;

// 🔗 Detect Phantom
function isPhantomInstalled() {
  return window.solana && window.solana.isPhantom;
}

// 🔁 Update UI
function updateWalletUI(address) {
  if (address) {
    walletStatus.textContent = `Connected: ${address.slice(0, 4)}...${address.slice(-4)}`;
    walletToggle.textContent = 'Disconnect Wallet';
    retryButton.style.display = 'inline-block';
  } else {
    walletStatus.textContent = 'Wallet not connected';
    walletToggle.textContent = 'Connect Wallet';
    bonkboyBalance.textContent = 'Balance: -';
    retryButton.style.display = 'none';
  }
}

// 💰 Fetch Balance
async function fetchBalance() {
  if (!walletAddress) return;
  bonkboyBalance.textContent = 'Balance: ...';
  try {
const res = await fetch(`/api/balance/${walletAddress}`);
    const data = await res.json();
    if (data.balance !== undefined) {
      bonkboyBalance.textContent = `Balance: ${data.balance} BONKBOY`;
      bonkboyBalance.classList.add('update');
      setTimeout(() => bonkboyBalance.classList.remove('update'), 600);
    } else {
      bonkboyBalance.textContent = 'Balance not found';
    }
  } catch (err) {
    bonkboyBalance.textContent = 'Error fetching balance';
  }
}

// 🔌 Connect Wallet
async function connectWallet() {
  try {
    if (!window.solana || !window.solana.isPhantom) {
      alert("Please install Phantom Wallet to use this feature.");
      return;
    }
    const resp = await window.solana.connect();
    walletAddress = resp.publicKey.toString();
    localStorage.setItem('wallet', walletAddress);
    updateWalletUI(walletAddress);
    fetchBalance();
  } catch (err) {
    console.warn('Wallet connection failed:', err);
    alert("Wallet connection failed. Please try again.");
  }
}

// 🔌 Disconnect Wallet
function disconnectWallet() {
  walletAddress = null;
  localStorage.removeItem('wallet');
  updateWalletUI(null);
}

// 🧠 Toggle Wallet State
function toggleWallet() {
  if (walletAddress) {
    disconnectWallet();
  } else {
    connectWallet();
  }
}

// 🚀 Init
window.addEventListener('DOMContentLoaded', () => {
  const savedWallet = localStorage.getItem('wallet');
  if (savedWallet) {
    walletAddress = savedWallet;
    updateWalletUI(walletAddress);
    fetchBalance();
  }

  walletToggle.addEventListener('click', toggleWallet);
  retryButton.addEventListener('click', fetchBalance);

  // 🔥 Make overlay visible
  document.getElementById('overlay')?.classList.add('fade-in');
    // 📂 Navigation button handlers
  document.getElementById('memeGenerator')?.addEventListener('click', () => {
    location.href = '/memegenerator.html';
  });

  document.getElementById('merch')?.addEventListener('click', () => {
    location.href = '/merch.html';
  });

  document.getElementById('media')?.addEventListener('click', () => {
    location.href = '/media.html';
  });

  document.getElementById('competitions')?.addEventListener('click', () => {
    location.href = '/competitions.html';
  });

  document.getElementById('roadmap')?.addEventListener('click', () => {
    location.href = '/roadmap.html';
  });

  document.getElementById('whitepaper')?.addEventListener('click', () => {
    location.href = '/whitepaper.html';
  });

  document.getElementById('topHolders')?.addEventListener('click', () => {
    location.href = '/topholders.html';
  });

});
