import express, { Application, Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import userRoutes from './routes/user.routes';
import questRoutes from './routes/quest.routes';
import authRoutes from './routes/auth.routes';
import setupRoutes from './routes/setup.routes';
import slotRoutes from './routes/slot.routes';
import settingsRoutes from './routes/settings.routes';
import availabilityRoutes from './routes/availability.routes';
import { errorHandler } from './middleware/errorHandler';
import cookieParser from 'cookie-parser';

const app: Application = express();

app.use(cookieParser());

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json()); // Позволяет парсить JSON из тела запроса

// Простой health-check эндпоинт
app.get('/health', (_req: Request, res: Response) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Подключаем роутеры
app.use('/api/setup', setupRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/quests', questRoutes);
app.use('/api/slots', slotRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/availability', availabilityRoutes);


app.use(errorHandler);

export default app;