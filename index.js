import express from "express";
import cookieParser from "cookie-parser";
import cors from "cors";
import dotenv from "dotenv";
import connectDB from "./utils/db.js";
import corsOptions from "./utils/corsConfig.js";
import userRoute from "./routes/user.route.js";
import companyRoute from "./routes/company.route.js";
import jobRoute from "./routes/job.route.js";
import applicationRoute from "./routes/application.route.js";
import externalJobsRoute from "./routes/externalJobs.route.js";
import mixedJobsRoute from "./routes/mixedJobs.route.js";
import healthRoute from "./routes/health.route.js";

dotenv.config({});

const app = express();

// middleware
app.use(express.json());
app.use(express.urlencoded({extended:true}));
app.use(cookieParser());

// Use the improved CORS configuration
app.use(cors(corsOptions));

const PORT = process.env.PORT || 5000;


// api's
app.use("/api/v1/user", userRoute);
app.use("/api/v1/company", companyRoute);
app.use("/api/v1/job", jobRoute);
app.use("/api/v1/application", applicationRoute);
app.use("/api/v1/external-jobs", externalJobsRoute);
app.use("/api/v1/mixed-jobs", mixedJobsRoute);
app.use("/api/v1", healthRoute); // Health check endpoints
const welcomeStrings = [
  "Hello Express!",
  "To learn more about Express on Vercel, visit https://vercel.com/docs/frameworks/backend/express",
]
app.get('/', (_req, res) => {
    res.send(welcomeStrings.join('\n\n'))
  })


// Connect to database first, then start server
const startServer = async () => {
    try {
        // Connect to MongoDB
        await connectDB();
        
        // Start server only after DB connection is established
        app.listen(PORT, () => {
            console.log(`Server running at port ${PORT}`);
            console.log(`Server running in ${process.env.NODE_ENV || 'development'} mode`);
            console.log(`Accepting requests from: ${corsOptions.origin || 'multiple origins'}`);
        });
    } catch (error) {
        console.error('Failed to start server:', error);
        process.exit(1);
    }
};

startServer();
