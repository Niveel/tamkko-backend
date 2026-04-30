import express, { Application } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import path from 'path';
import { connectDB } from '@config/db';
import { env } from '@config/env';
import { errorHandler } from '@middleware/errorHandler';
import { authRoutes } from '@routes/auth.routes';
import { videoRoutes } from '@routes/video.routes';
import tipRoutes from '@routes/tipping.routes';
import notificationRoutes from '@routes/notifications.routes';
import referralRoutes from '@routes/referral.routes';
import vipRoutes from '@routes/vip.routes';
import creatorRoutes from '@routes/creator.routes';
import userRoutes from '@routes/user.routes';

const app: Application = express();

// Global Middleware
app.use(helmet());
app.use(cors({
  origin: env.NODE_ENV === 'production' ? ['https://tamkko.app'] : '*',
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(compression());
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

// Health Check
app.get('/health', (_req, res) => {
  res.status(200).json({ status: 'ok', uptime: process.uptime(), timestamp: new Date().toISOString() });
});

// API Routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/videos', videoRoutes);
app.use('/api/v1/tips', tipRoutes);
app.use('/api/v1/wallet', tipRoutes);
app.use('/api/v1/notifications', notificationRoutes);
app.use('/api/v1/referral', referralRoutes);
app.use('/api/v1/referrals', referralRoutes);
app.use('/api/v1', referralRoutes);
app.use('/api/v1/vip', vipRoutes);
app.use('/api/v1/creators', creatorRoutes);
app.use('/api/v1/users', userRoutes);

// Global Error Handler
app.use(errorHandler);

// Start Server
const PORT = env.PORT || 5000;

const start = () => {
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT} in ${env.NODE_ENV} mode`);
  });
};

const boot = env.SKIP_DB_CONNECT ? Promise.resolve() : connectDB();

boot.then(start).catch((err) => {
  console.error('❌ Failed to start server:', err);
  process.exit(1);
});

export default app;
