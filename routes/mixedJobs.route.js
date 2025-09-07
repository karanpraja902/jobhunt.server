import express from "express";
import { 
    getMixedJobs, 
    getRandomMixedJobs,
    clearMixedJobsCache 
} from "../controllers/mixedJobs.controller.js";

const router = express.Router();

// Public routes - no authentication required for viewing jobs
router.route("/mixed").get(getMixedJobs);
router.route("/random").get(getRandomMixedJobs);
router.route("/cache/clear").delete(clearMixedJobsCache);

export default router;
