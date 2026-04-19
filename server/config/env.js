import dotenv from 'dotenv';

dotenv.config();

const config = {
  // Server
  nodeEnv: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT, 10) || 5000,

  // Database
  mongodbUri: process.env.MONGODB_URI || 'mongodb://localhost:27017/mugal-e-azam',

  // JWT
  jwtSecret: process.env.JWT_SECRET || 'fallback_secret_change_me',
  jwtExpire: process.env.JWT_EXPIRE || '7d',

  // Email
  smtp: {
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT, 10) || 587,
    user: process.env.SMTP_USER,
    password: process.env.SMTP_PASSWORD,
  },
  fromEmail: process.env.FROM_EMAIL || 'noreply@mugaleazam.com',
  fromName: process.env.FROM_NAME || 'Mugal e Azam Restaurant',

  // Twilio SMS
  twilio: {
    enabled: process.env.TWILIO_ENABLED === 'true',
    accountSid: process.env.TWILIO_ACCOUNT_SID,
    authToken: process.env.TWILIO_AUTH_TOKEN,
    phoneNumber: process.env.TWILIO_PHONE_NUMBER,
  },

  // Client URL
  clientUrl: process.env.CLIENT_URL || 'http://localhost:5173',
};

export default config;
