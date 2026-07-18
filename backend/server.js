require('dotenv/config');
const express = require('express');
const session = require('express-session');
const cors = require('cors');
const http = require('http');
const passport = require('./src/config/passport');
const authRoutes = require('./src/routes/auth');
const categoryRoutes = require('./src/routes/categories');
const transactionRoutes = require('./src/routes/transactions');
const budgetRoutes = require('./src/routes/budgets');
const { setupWebSocketServer } = require('./src/websocket/handler');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

app.use(
  cors({
    origin: 'http://localhost:5173',
    credentials: true,
  })
);

app.use(
  session({
    secret: process.env.SESSION_SECRET || 'dev-secret-key',
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
    },
  })
);

app.use(passport.initialize());
app.use(passport.session());

app.use('/auth', authRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/budgets', budgetRoutes);

app.get('/health', (req, res) => {
  res.json({ status: 'OK' });
});

const server = http.createServer(app);
setupWebSocketServer(server);

server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

module.exports = app;
