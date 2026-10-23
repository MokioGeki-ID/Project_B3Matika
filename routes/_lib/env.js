import 'dotenv/config';

// Helper function to throw missing env error without leaking values
const requireEnv = (name) => {
  const value = process.env[name];
  if (!value) {
    throw new Error(`CRITICAL: Required environment variable ${name} is missing.`);
  }
  return value;
};

// Validate URL
const parseBaseUrl = (urlStr, name) => {
  try {
    const url = new URL(urlStr);
    // Remove trailing slash
    const base = url.origin + url.pathname.replace(/\/$/, '');
    if (process.env.NODE_ENV === 'production' && url.protocol !== 'https:') {
      throw new Error(`CRITICAL: ${name} must use HTTPS in production.`);
    }
    return base;
  } catch (err) {
    throw new Error(`CRITICAL: Invalid URL for ${name}.`);
  }
};

const validateEmail = (email) => {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email);
};

const validateUsername = (username) => {
  const re = /^[a-zA-Z0-9._]{3,20}$/;
  return re.test(username);
};

// Start validation
let ENV = {};
try {
  ENV = {
    // A. Superadmin (Optional to prevent crash if not set on Vercel)
    SUPERADMIN_EMAIL: (process.env.SUPERADMIN_EMAIL || '').toLowerCase().trim(),
    SUPERADMIN_USERNAME: process.env.SUPERADMIN_USERNAME || '',
    SUPERADMIN_PASSWORD: process.env.SUPERADMIN_PASSWORD || '',
    SUPERADMIN_NOTIFY_EMAIL: process.env.SUPERADMIN_NOTIFY_EMAIL || process.env.SUPERADMIN_EMAIL || '',

    // B. Token Admin (Optional)
    ADMIN_TOKEN_SECRET: process.env.ADMIN_TOKEN_SECRET || 'dev_admin_secret_minimum_32_chars_long_!',
    ADMIN_TOKEN_TTL_HOURS: parseInt(process.env.ADMIN_TOKEN_TTL_HOURS || '24', 10),
    ADMIN_REQUEST_EXPIRY_DAYS: parseInt(process.env.ADMIN_REQUEST_EXPIRY_DAYS || '7', 10),
    ADMIN_APPROVAL_LINK_TTL_HOURS: parseInt(process.env.ADMIN_APPROVAL_LINK_TTL_HOURS || '48', 10),

    // C. APP URL
    APP_BASE_URL: parseBaseUrl(requireEnv('APP_BASE_URL'), 'APP_BASE_URL'),

    // D. Existing Required
    EMAIL_USER: requireEnv('EMAIL_USER'),
    EMAIL_PASS: requireEnv('EMAIL_PASS'),
    OTP_SECRET: requireEnv('OTP_SECRET'),

    // D2. Email provider (mailer.js) — opsional, tidak wajib untuk keberjalanan
    EMAIL_PROVIDER  : (process.env.EMAIL_PROVIDER  || 'gmail').toLowerCase().trim(),
    EMAIL_FROM_NAME : (process.env.EMAIL_FROM_NAME || 'B3Matika').trim(),
    EMAIL_REPLY_TO  : (process.env.EMAIL_REPLY_TO  || '').trim(),
    SMTP_HOST       : process.env.SMTP_HOST || '',
    SMTP_PORT       : parseInt(process.env.SMTP_PORT || '587', 10),
    SMTP_SECURE     : process.env.SMTP_SECURE === 'true',
    SMTP_USER       : process.env.SMTP_USER || '',
    SMTP_PASS       : process.env.SMTP_PASS || '',
    RESEND_API_KEY  : process.env.RESEND_API_KEY || null,
    SUPABASE_URL: requireEnv('SUPABASE_URL'),
    SUPABASE_SERVICE_ROLE_KEY: requireEnv('SUPABASE_SERVICE_ROLE_KEY'),
    JWT_SECRET: requireEnv('JWT_SECRET'),
    DATABASE_URL: requireEnv('DATABASE_URL'), // Required based on db.js

    // Environment indicators
    NODE_ENV: process.env.NODE_ENV || 'development',
    FRONTEND_URL: process.env.FRONTEND_URL || '*',
    PORT: process.env.PORT || 3000,
    // Normalize API keys and model name (trim whitespace, quotes, newlines)
    GEMINI_API_KEY: (process.env.GEMINI_API_KEY || '').trim().replace(/^["']|["']$/g, '') || null,
    GEMINI_MODEL: (process.env.GEMINI_MODEL || 'gemini-3.8-flash').trim().replace(/^["']|["']$/g, ''),
    GEMINI_FALLBACK_MODEL: (process.env.GEMINI_FALLBACK_MODEL || '').trim().replace(/^["']|["']$/g, '') || null,
    
    // Limits
    LOGIN_MAX_ATTEMPTS: parseInt(process.env.LOGIN_MAX_ATTEMPTS || '5', 10),
    ADMIN_REQUEST_MAX_PER_DAY: parseInt(process.env.ADMIN_REQUEST_MAX_PER_DAY || '3', 10),

    // Avatars
    SUPABASE_AVATAR_BUCKET: process.env.SUPABASE_AVATAR_BUCKET || 'avatars',
    AVATAR_MAX_BYTES: parseInt(process.env.AVATAR_MAX_BYTES || '2097152', 10),
  };

  // Detailed validations
  if (ENV.SUPERADMIN_EMAIL && !validateEmail(ENV.SUPERADMIN_EMAIL)) {
    console.warn('WARNING: SUPERADMIN_EMAIL is not a valid email address.');
  }
  if (ENV.SUPERADMIN_USERNAME && !validateUsername(ENV.SUPERADMIN_USERNAME)) {
    console.warn('WARNING: SUPERADMIN_USERNAME must be 3-20 characters long and contain only letters, numbers, dots, or underscores.');
  }
  if (ENV.SUPERADMIN_PASSWORD && ENV.SUPERADMIN_PASSWORD.length < 12) {
    console.warn('WARNING: SUPERADMIN_PASSWORD is less than 12 characters. It is highly recommended to use a stronger password.');
  }
  if (ENV.ADMIN_TOKEN_SECRET && ENV.ADMIN_TOKEN_SECRET.length < 32) {
    console.warn('WARNING: ADMIN_TOKEN_SECRET must be at least 32 characters long.');
  }
  if (ENV.ADMIN_TOKEN_TTL_HOURS <= 0) {
    throw new Error('CRITICAL: ADMIN_TOKEN_TTL_HOURS must be a positive number.');
  }
  if (ENV.JWT_SECRET === 'secret' || ENV.JWT_SECRET === 'dev' || ENV.JWT_SECRET.length < 16) {
    console.warn('WARNING: JWT_SECRET is weak. It is highly recommended to use a stronger secret (minimum 16 chars).');
  }

} catch (error) {
  console.error('CRITICAL ENV ERROR:', error.message);
  // Do NOT throw here, otherwise the serverless function fails to initialize 
  // and Vercel returns a 500 error WITHOUT CORS headers, causing "Failed to fetch".
  // Let the endpoints fail gracefully when they try to use the missing variables.
  ENV._error = error.message; 
}

export default ENV;
