import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import path from 'path';

import authRouter from './routes/auth';
import storesRouter from './routes/stores';
import usersRouter from './routes/users';
import productsRouter from './routes/products';
import stockRouter from './routes/stock';
import customersRouter from './routes/customers';
import salesRouter from './routes/sales';
import ordersRouter from './routes/orders';
import receiptsRouter from './routes/receipts';
import reorderRouter from './routes/reorder';
import reportsRouter from './routes/reports';
import auditLogRouter from './routes/auditLog';
import lookupsRouter from './routes/lookups';
import { authMiddleware } from './middleware/auth';

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Public routes
app.use('/api/auth', authRouter);

// All other API routes require auth
app.use('/api/stores', authMiddleware, storesRouter);
app.use('/api/users', authMiddleware, usersRouter);
app.use('/api/products', authMiddleware, productsRouter);
app.use('/api/stock', authMiddleware, stockRouter);
app.use('/api/customers', authMiddleware, customersRouter);
app.use('/api/sales', authMiddleware, salesRouter);
app.use('/api/orders', authMiddleware, ordersRouter);
app.use('/api/receipts', authMiddleware, receiptsRouter);
app.use('/api/reorder', authMiddleware, reorderRouter);
app.use('/api/reports', authMiddleware, reportsRouter);
app.use('/api/audit-log', authMiddleware, auditLogRouter);
app.use('/api/lookups', authMiddleware, lookupsRouter);

// Serve React client in production
const clientDist = path.join(__dirname, '../../client/dist');
app.use(express.static(clientDist));
app.get(/^(?!\/api).*/, (_req, res) => {
  res.sendFile(path.join(clientDist, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
