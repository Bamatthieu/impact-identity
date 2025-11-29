require('dotenv').config();

module.exports = {
  port: process.env.PORT || 3000,
  nodeEnv: process.env.NODE_ENV || 'development',
  xrpl: {
    server: process.env.XRPL_SERVER || 'wss://s.altnet.rippletest.net:51233',
    network: process.env.XRPL_NETWORK || 'testnet'
  },
  xaman: {
    apiKey: process.env.XAMAN_API_KEY,
    apiSecret: process.env.XAMAN_API_SECRET
  },
  jwt: {
    secret: process.env.JWT_SECRET || 'default-secret-change-me'
  },
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:5173'
};
