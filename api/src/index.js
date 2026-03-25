const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const migrate = require('./migrate');
const healthRoutes = require('./routes/health');
const contentRoutes = require('./routes/content');
const analyticsRoutes = require('./routes/analytics');
const documentsRoutes = require('./routes/documents');

const app = express();
const PORT = process.env.PORT || 3000;

// CORS — allow frontend origin
app.use(cors({
    origin: process.env.FRONTEND_URL || 'https://www.sierhill.org',
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
}));

app.use(express.json());

// Rate limit analytics endpoints
const analyticsLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 30,
    standardHeaders: true,
    legacyHeaders: false,
});
app.use('/api/v1/analytics/pageview', analyticsLimiter);
app.use('/api/v1/analytics/event', analyticsLimiter);

// Routes
app.use(healthRoutes);
app.use(contentRoutes);
app.use(analyticsRoutes);
app.use(documentsRoutes);

// Start
async function start() {
    try {
        await migrate();
        app.listen(PORT, () => {
            console.log(`Sierhill API running on port ${PORT}`);
        });
    } catch (err) {
        console.error('Failed to start:', err);
        process.exit(1);
    }
}

start();
