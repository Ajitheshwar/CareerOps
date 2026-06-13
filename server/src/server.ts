// src/server.ts
import app from './app';
import { connectDB } from './db';

const PORT = process.env.PORT || 5000;

// Initialize database first before starting HTTP server
connectDB()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`==================================================`);
      console.log(` CareerOps server listening on http://localhost:${PORT}`);
      console.log(`==================================================`);
    });
  })
  .catch((err) => {
    console.error('Failed to connect to MongoDB, starting server anyway:', err.message);
    app.listen(PORT, () => {
      console.log(`==================================================`);
      console.log(` CareerOps server listening on http://localhost:${PORT} (Database offline)`);
      console.log(`==================================================`);
    });
  });
