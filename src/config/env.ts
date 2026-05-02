import { z } from 'zod';
import dotenv from 'dotenv';

dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(5000),
  MONGODB_URI: z.string().min(1, 'MONGODB_URI is required').default('mongodb://127.0.0.1:27017/tamkko'),
  SKIP_DB_CONNECT: z.coerce.boolean().default(false),
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters').default('development-jwt-secret-change-before-production'),
  JWT_EXPIRES_IN: z.string().default('7d'),
  JWT_REFRESH_SECRET: z.string().min(32, 'JWT_REFRESH_SECRET must be at least 32 characters').default('development-refresh-secret-change-before-production'),
  JWT_REFRESH_EXPIRES_IN: z.string().default('30d'),
  REDIS_URL: z.string().default('redis://localhost:6379'),
  HUBTEL_CLIENT_ID: z.string().optional(),
  HUBTEL_CLIENT_SECRET: z.string().optional(),
  CLOUDFLARE_ACCOUNT_ID: z.string().optional(),
  CLOUDFLARE_STREAM_TOKEN: z.string().optional(),
  MUX_TOKEN_ID: z.string().optional(),
  MUX_TOKEN_SECRET: z.string().optional(),
  MUX_WEBHOOK_SECRET: z.string().optional(),
  MUX_MAX_DURATION_SECONDS: z.coerce.number().default(60),
  MUX_MAX_UPLOAD_SIZE_BYTES: z.coerce.number().default(104857600),
  MUX_PLAYBACK_POLICY: z.enum(['public', 'signed']).default('public'),
  MUX_ALLOWED_VIDEO_CODECS: z.string().default('h264'),
  MUX_ALLOWED_VIDEO_PROFILES: z.string().default('baseline,main,high'),
  CLOUDINARY_CLOUD_NAME: z.string().optional(),
  CLOUDINARY_API_KEY: z.string().optional(),
  CLOUDINARY_API_SECRET: z.string().optional(),
  CLOUDINARY_UPLOAD_PRESET: z.string().optional(),
  EXPO_ACCESS_TOKEN: z.string().optional(),
  EMAIL_PROVIDER: z.enum(['sendgrid', 'ses', 'smtp']).default('sendgrid'),
  EMAIL_API_KEY: z.string().optional(),
  SMS_PROVIDER: z.enum(['africastalking', 'twilio']).default('africastalking'),
  SMS_API_KEY: z.string().optional(),
  SMS_SENDER_ID: z.string().optional(),
  BASE_URL: z.string().default('https://api.tamkko.app/api/v1'),
  CLIENT_URL: z.string().default('https://tamkko.app'),
  RATE_LIMIT_WINDOW_MS: z.coerce.number().default(900000),
  RATE_LIMIT_MAX: z.coerce.number().default(100),
  BCRYPT_ROUNDS: z.coerce.number().default(12),
  MOCK_SEED_ON_STARTUP: z.coerce.boolean().default(true),
});

export type EnvConfig = z.infer<typeof envSchema>;

let config: EnvConfig;

try {
  config = envSchema.parse(process.env);
} catch (error) {
  if (error instanceof z.ZodError) {
    console.error('❌ Invalid environment variables:');
    console.error(error.flatten().fieldErrors);
    process.exit(1);
  }
  throw error;
}

export const env = {
  ...config,
  jwtSecret: config.JWT_SECRET,
  jwtAccessExpiration: config.JWT_EXPIRES_IN,
  jwtRefreshSecret: config.JWT_REFRESH_SECRET,
  jwtRefreshExpiration: config.JWT_REFRESH_EXPIRES_IN,
  CORS_ORIGINS: config.CLIENT_URL ? [config.CLIENT_URL] : ['http://localhost:3000'],
  CLOUDFLARE_API_TOKEN: config.CLOUDFLARE_STREAM_TOKEN,
};

export default env;
