import dotenv from 'dotenv';

dotenv.config();

export default {
  accessToken: {
    secret: process.env.ACCESS_TOKEN_SECRET,
    expiry: process.env.ACCESS_TOKEN_EXPIRY || '15m'
  },
  refreshToken: {
    secret: process.env.REFRESH_TOKEN_SECRET,
    expiry: process.env.REFRESH_TOKEN_EXPIRY || '7d'
  },
  session: {
    secret: process.env.SESSION_SECRET,
    secure: process.env.NODE_ENV === 'production'
  },
  oauth: {
    google: {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: process.env.GOOGLE_CALLBACK_URL || 'http://localhost:3000/auth/google/callback'
    },
    github: {
      clientID: process.env.GITHUB_CLIENT_ID,
      clientSecret: process.env.GITHUB_CLIENT_SECRET,
      callbackURL: process.env.GITHUB_CALLBACK_URL || 'http://localhost:3000/auth/github/callback'
    }
  },
  frontend: {
    url: process.env.FRONTEND_URL || 'http://localhost:5173'
  }
};