// CORS Configuration with multiple allowed origins

const getAllowedOrigins = () => {
    const allowedOrigins = [
        'http://localhost:5173',
        'http://localhost:5174',
        'http://localhost:3000',
        'https://jobhunt-client-eta.vercel.app',
        'https://jobhunt-client.vercel.app',
        // Add all possible Vercel preview URLs patterns
        /https:\/\/jobhunt-client-.*\.vercel\.app$/,
        /https:\/\/.*-karan-prajapats-projects\.vercel\.app$/
    ];

    // Add environment variable if set
    if (process.env.CLIENT_URL) {
        allowedOrigins.push(process.env.CLIENT_URL);
    }

    return allowedOrigins;
};

const corsOptions = {
    origin: function (origin, callback) {
        const allowedOrigins = getAllowedOrigins();
        
        // Allow requests with no origin (like mobile apps or Postman)
        if (!origin) {
            return callback(null, true);
        }

        // Check if origin matches any allowed origin
        const isAllowed = allowedOrigins.some(allowedOrigin => {
            if (allowedOrigin instanceof RegExp) {
                return allowedOrigin.test(origin);
            }
            return allowedOrigin === origin;
        });

        if (isAllowed) {
            callback(null, true);
        } else {
            console.log('Blocked by CORS:', origin);
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Cookie'],
    exposedHeaders: ['set-cookie']
};

export default corsOptions;
