import axios from 'axios';
import NodeCache from 'node-cache';

// Initialize cache with 1 hour TTL
const jobCache = new NodeCache({ stdTTL: 3600 });

// Fetch jobs from Adzuna API (Free tier available)
const fetchAdzunaJobs = async (query, location) => {
    try {
        // You need to register at https://developer.adzuna.com/ to get these keys
        const APP_ID = process.env.ADZUNA_APP_ID || 'demo_app_id';
        const APP_KEY = process.env.ADZUNA_APP_KEY || 'demo_app_key';
        
        const country = 'in'; // India
        const url = `https://api.adzuna.com/v1/api/jobs/${country}/search/1`;
        
        const params = {
            app_id: APP_ID,
            app_key: APP_KEY,
            results_per_page: 20,
            what: query || 'software developer',
            where: location || 'india',
            content_type: 'application/json'
        };

        const response = await axios.get(url, { params });
        
        // Transform Adzuna data to match our format
        return response.data.results.map(job => ({
            id: job.id,
            title: job.title,
            company: {
                name: job.company.display_name,
                location: job.location.display_name
            },
            description: job.description,
            location: job.location.display_name,
            salary: job.salary_max || 'Not specified',
            jobType: job.contract_type || 'Full-time',
            url: job.redirect_url,
            created_at: job.created,
            source: 'Adzuna'
        }));
    } catch (error) {
        console.error('Adzuna API error:', error.message);
        return [];
    }
};

// Fetch jobs from RemoteOK API (No API key required)
const fetchRemoteOKJobs = async () => {
    try {
        const url = 'https://remoteok.com/api';
        const response = await axios.get(url, {
            headers: {
                'User-Agent': 'JobHunt Platform'
            }
        });
        
        // Filter and transform RemoteOK data
        const jobs = response.data.slice(1, 21); // Skip the first item (it's metadata)
        
        return jobs.map(job => ({
            id: job.id,
            title: job.position,
            company: {
                name: job.company,
                location: 'Remote',
                logo: job.company_logo
            },
            description: job.description,
            location: 'Remote',
            salary: job.salary || 'Not specified',
            jobType: 'Remote',
            url: job.url,
            created_at: job.date,
            tags: job.tags,
            source: 'RemoteOK'
        }));
    } catch (error) {
        console.error('RemoteOK API error:', error.message);
        return [];
    }
};

// Fetch jobs from Remotive API (No API key required)
const fetchRemotiveJobs = async () => {
    try {
        const url = 'https://remotive.com/api/remote-jobs';
        const response = await axios.get(url, {
            params: {
                limit: 20
            }
        });
        
        // Transform Remotive data
        return response.data.jobs.map(job => ({
            id: job.id,
            title: job.title,
            company: {
                name: job.company_name,
                location: 'Remote',
                logo: job.company_logo_url
            },
            description: job.description,
            location: 'Remote',
            salary: job.salary || 'Not specified',
            jobType: job.job_type || 'Full-time',
            url: job.url,
            created_at: job.publication_date,
            category: job.category,
            tags: job.tags,
            source: 'Remotive'
        }));
    } catch (error) {
        console.error('Remotive API error:', error.message);
        return [];
    }
};

// Main controller function to get external jobs
export const getExternalJobs = async (req, res) => {
    try {
        const { query, location, source } = req.query;
        const cacheKey = `external_jobs_${query}_${location}_${source}`;
        
        // Check cache first
        const cachedJobs = jobCache.get(cacheKey);
        if (cachedJobs) {
            return res.status(200).json({
                success: true,
                jobs: cachedJobs,
                cached: true
            });
        }
        
        let jobs = [];
        
        // Fetch from different sources based on request
        switch(source) {
            case 'adzuna':
                jobs = await fetchAdzunaJobs(query, location);
                break;
            case 'remoteok':
                jobs = await fetchRemoteOKJobs();
                break;
            case 'remotive':
                jobs = await fetchRemotiveJobs();
                break;
            default:
                // Fetch from all sources and combine
                const [adzunaJobs, remoteOKJobs, remotiveJobs] = await Promise.all([
                    fetchAdzunaJobs(query, location),
                    fetchRemoteOKJobs(),
                    fetchRemotiveJobs()
                ]);
                jobs = [...adzunaJobs, ...remoteOKJobs, ...remotiveJobs];
        }
        
        // Cache the results
        if (jobs.length > 0) {
            jobCache.set(cacheKey, jobs);
        }
        
        return res.status(200).json({
            success: true,
            jobs,
            count: jobs.length,
            cached: false
        });
        
    } catch (error) {
        console.error('External jobs fetch error:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to fetch external jobs',
            error: error.message
        });
    }
};

// Get trending/latest jobs (combines multiple sources)
export const getTrendingJobs = async (req, res) => {
    try {
        const cacheKey = 'trending_jobs';
        
        // Check cache first
        const cachedJobs = jobCache.get(cacheKey);
        if (cachedJobs) {
            return res.status(200).json({
                success: true,
                jobs: cachedJobs,
                cached: true
            });
        }
        
        // Fetch from multiple sources in parallel
        const [remoteOKJobs, remotiveJobs] = await Promise.all([
            fetchRemoteOKJobs(),
            fetchRemotiveJobs()
        ]);
        
        // Combine and sort by date
        let allJobs = [...remoteOKJobs, ...remotiveJobs];
        
        // Sort by creation date (newest first)
        allJobs.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
        
        // Take top 30 jobs
        const trendingJobs = allJobs.slice(0, 30);
        
        // Cache the results
        jobCache.set(cacheKey, trendingJobs);
        
        return res.status(200).json({
            success: true,
            jobs: trendingJobs,
            count: trendingJobs.length,
            cached: false
        });
        
    } catch (error) {
        console.error('Trending jobs fetch error:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to fetch trending jobs',
            error: error.message
        });
    }
};

// Search external jobs with filters
export const searchExternalJobs = async (req, res) => {
    try {
        const { 
            keyword, 
            location, 
            jobType, 
            minSalary,
            remote 
        } = req.query;
        
        const cacheKey = `search_${keyword}_${location}_${jobType}_${minSalary}_${remote}`;
        
        // Check cache
        const cachedResults = jobCache.get(cacheKey);
        if (cachedResults) {
            return res.status(200).json({
                success: true,
                jobs: cachedResults,
                cached: true
            });
        }
        
        let jobs = [];
        
        if (remote === 'true') {
            // Fetch remote jobs
            const [remoteOKJobs, remotiveJobs] = await Promise.all([
                fetchRemoteOKJobs(),
                fetchRemotiveJobs()
            ]);
            jobs = [...remoteOKJobs, ...remotiveJobs];
        } else {
            // Fetch location-based jobs
            jobs = await fetchAdzunaJobs(keyword, location);
        }
        
        // Apply filters
        if (keyword) {
            jobs = jobs.filter(job => 
                job.title.toLowerCase().includes(keyword.toLowerCase()) ||
                job.description.toLowerCase().includes(keyword.toLowerCase())
            );
        }
        
        if (jobType && jobType !== 'all') {
            jobs = jobs.filter(job => 
                job.jobType.toLowerCase().includes(jobType.toLowerCase())
            );
        }
        
        // Cache filtered results
        if (jobs.length > 0) {
            jobCache.set(cacheKey, jobs);
        }
        
        return res.status(200).json({
            success: true,
            jobs,
            count: jobs.length,
            cached: false
        });
        
    } catch (error) {
        console.error('Job search error:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to search jobs',
            error: error.message
        });
    }
};

// Clear cache endpoint
export const clearJobCache = async (req, res) => {
    try {
        jobCache.flushAll();
        return res.status(200).json({
            success: true,
            message: 'Job cache cleared successfully'
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: 'Failed to clear cache',
            error: error.message
        });
    }
};
