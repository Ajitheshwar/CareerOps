// src/app.ts
import express from 'express';
import cors from 'cors';
import * as path from 'path';
import apiRouter from './routes';
import { errorHandler } from './shared/middlewares/error.middleware';

const app = express();

// Config cors and parsing middlewares
app.use(cors());
app.use(express.json());

// API route groups
app.use('/api', apiRouter);

// Centralized error handling
app.use(errorHandler);

// Serve frontend static files if they exist (production build support)
const clientBuildPath = path.join(__dirname, '../../client/dist/client/browser');
app.use(express.static(clientBuildPath));

// Catch-all route for spa client
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api')) {
    return next();
  }
  res.sendFile(path.join(clientBuildPath, 'index.html'), (err) => {
    if (err) {
      res.status(200).send('CareerOps API is running. Client build files not found or served.');
    }
  });
});

export default app;
