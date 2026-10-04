import 'reflect-metadata';
import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import prisma from './lib/prisma';
import authRoutes from './routes/auth.routes';
import metricRoutes from './routes/metric.routes';
import recordRoutes from './routes/record.routes';
import dashboardRoutes from './routes/dashboard.routes';
import { errorHandler } from './middleware/error.middleware';

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Authentication routes
app.use('/auth', authRoutes);
app.use('/api/auth', authRoutes);

// Metric routes
app.use('/metrics', metricRoutes);
app.use('/api/metrics', metricRoutes);

// Record routes
app.use('/records', recordRoutes);
app.use('/api/records', recordRoutes);

// Dashboard routes
app.use('/dashboard', dashboardRoutes);
app.use('/api/dashboard', dashboardRoutes);

app.get('/api/health', async (_req: Request, res: Response) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.status(200).json({
      status: 'ok',
      message: 'Glance backend API is running',
      database: 'connected',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Database connection failed',
      timestamp: new Date().toISOString(),
    });
  }
});

app.get('/', (_req: Request, res: Response) => {
  res.json({
    name: 'Glance API',
    version: '1.0.0',
    status: 'running',
  });
});

// Centralized error handling
app.use(errorHandler);

const server = app.listen(port, () => {
  console.log(`[server]: Glance backend running at http://localhost:${port}`);
});

process.on('SIGTERM', async () => {
  console.log('[server]: SIGTERM received, shutting down gracefully');
  server.close(async () => {
    await prisma.$disconnect();
    process.exit(0);
  });
});

export default app;
