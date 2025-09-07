import express from 'express';
import mongoose from 'mongoose';

const router = express.Router();

// Health check endpoint
router.get('/health', async (req, res) => {
    try {
        const healthcheck = {
            uptime: process.uptime(),
            message: 'OK',
            timestamp: Date.now(),
            environment: process.env.NODE_ENV || 'development',
            database: {
                status: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
                name: mongoose.connection.name || 'not connected',
                host: mongoose.connection.host || 'not connected',
            }
        };

        // Test database connection with a simple query
        if (mongoose.connection.readyState === 1) {
            const adminDb = mongoose.connection.db.admin();
            await adminDb.ping();
            healthcheck.database.ping = 'successful';
        } else {
            healthcheck.database.ping = 'failed - not connected';
        }

        res.status(200).json(healthcheck);
    } catch (error) {
        res.status(503).json({
            uptime: process.uptime(),
            message: 'ERROR',
            timestamp: Date.now(),
            environment: process.env.NODE_ENV || 'development',
            database: {
                status: 'error',
                error: error.message
            }
        });
    }
});

// Simple ping endpoint
router.get('/ping', (req, res) => {
    res.status(200).json({ message: 'pong', timestamp: Date.now() });
});

export default router;
