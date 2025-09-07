import express from "express";
import { 
    getExternalJobs, 
    getTrendingJobs, 
    searchExternalJobs,
    clearJobCache 
} from "../controllers/externalJobs.controller.js";

const router = express.Router();

// Public routes - no authentication required for external job fetching
router.route("/external").get(getExternalJobs);
router.route("/trending").get(getTrendingJobs);
router.route("/search").get(searchExternalJobs);
router.route("/cache/clear").delete(clearJobCache);

export default router;
