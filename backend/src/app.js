const express = require('express');
const cors = require('cors');
const path = require('path');

const authRoutes = require('./routes/auth');
const profileRoutes = require('./routes/profile');
const reservesRoutes = require('./routes/reserves');
const favoritesRoutes = require('./routes/favorites');
const reviewsRoutes = require('./routes/reviews');
const metaRoutes = require('./routes/meta');
const adminRoutes = require('./routes/admin');
const routingRoutes = require('./routes/routing');
const savedRoutes = require('./routes/savedRoutes');
const curatedRoutesPublic = require('./routes/curatedRoutesPublic');

const app = express();

const defaultCorsOrigins = [
    'http://localhost:5173',
    'http://localhost:5174',
    'http://127.0.0.1:5173',
    'http://127.0.0.1:5174',
];

app.use(
    cors({
        origin: process.env.CORS_ORIGIN
            ? process.env.CORS_ORIGIN.split(',').map((s) => s.trim())
            : defaultCorsOrigins,
        credentials: true,
    })
);
app.use(express.json());

app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

app.use('/api/auth', authRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/saved-routes', savedRoutes);
app.use('/api/reserves', reservesRoutes);
app.use('/api/favorites', favoritesRoutes);
app.use('/api/reviews', reviewsRoutes);
app.use('/api', metaRoutes);
app.use('/api/routes', routingRoutes);
app.use('/api/curated-routes', curatedRoutesPublic);
app.use('/api/admin', adminRoutes);

module.exports = app;
