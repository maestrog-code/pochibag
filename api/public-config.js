export default function handler(_req, res) {
  res.setHeader('Cache-Control', 'no-store');
  return res.status(200).json({
    razorpayKey: process.env.RAZORPAY_KEY_ID || '',
    walletAddress: process.env.POCHIBAG_WALLET_ADDRESS || ''
  });
}
