import { Job } from '../models/job.model.js';
import axios from 'axios';
import NodeCache from 'node-cache';

// Initialize cache with 30 minutes TTL for mixed results
const mixedJobsCache = new NodeCache({ stdTTL: 1800 });

// Fetch jobs from Adzuna API with proper credentials
const fetchAdzunaJobs = async (query = '', location = '', page = 1, resultsPerPage = 20) => {
    try {
        const APP_ID = process.env.ADZUNA_APP_ID;
        const APP_KEY = process.env.ADZUNA_APP_KEY;
        
        if (!APP_ID || !APP_KEY) {
            console.log('Adzuna API credentials not configured');
            return [];
        }
        
        const country = 'in'; // India
        const url = `https://api.adzuna.com/v1/api/jobs/${country}/search/${page}`;
        
        const params = {
            app_id: APP_ID,
            app_key: APP_KEY,
            results_per_page: resultsPerPage,
            what: query || 'developer', // Default search term
            where: location || 'india',
            content_type: 'application/json',
            sort_by: 'date' // Get latest jobs first
        };

        const response = await axios.get(url, { params });
        
        // Transform Adzuna data to match our job format
        return response.data.results.map(job => ({
            _id: `adzuna_${job.id}`,
            title: job.title.replace(/<[^>]*>/g, ''), // Remove HTML tags
            company: {
                _id: `adzuna_company_${job.company.display_name}`,
                name: job.company.display_name,
                location: job.location.display_name,
                logo: null // Adzuna doesn't provide logos
            },
            description: job.description.replace(/<[^>]*>/g, '').substring(0, 200) + '...',
            location: job.location.display_name,
            salary: job.salary_max || job.salary_min || 0,
            jobType: job.contract_type || job.category?.label || 'Full-time',
            position: 1, // Default position count
            experienceLevel: 0, // Not provided by Adzuna
            requirements: [],
            created_at: job.created,
            url: job.redirect_url,
            source: 'Adzuna',
            isExternal: true
        }));
    } catch (error) {
        console.error('Adzuna API error:', error.message);
        return [];
    }
};

// Fetch jobs from RemoteOK API
const fetchRemoteOKJobs = async (limit = 10) => {
    try {
        const url = 'https://remoteok.com/api';
        const response = await axios.get(url, {
            headers: {
                'User-Agent': 'JobHunt Platform'
            },
            timeout: 5000
        });
        
        // Take only first N jobs and skip metadata
        const jobs = response.data.slice(1, limit + 1);
        
        return jobs.map(job => ({
            _id: `remoteok_${job.id}`,
            title: job.position,
            company: {
                _id: `remoteok_company_${job.company}`,
                name: job.company,
                location: 'Remote',
                logo: job.company_logo
            },
            description: (job.description || '').replace(/<[^>]*>/g, '').substring(0, 200) + '...',
            location: 'Remote',
            salary: parseInt(job.salary_min) || parseInt(job.salary_max) || 0,
            jobType: 'Remote',
            position: 1,
            experienceLevel: 0,
            requirements: job.tags || [],
            created_at: job.date,
            url: job.url || job.apply_url,
            source: 'RemoteOK',
            isExternal: true
        }));
    } catch (error) {
        console.error('RemoteOK API error:', error.message);
        return [];
    }
};

// Fetch jobs from Remotive API
const fetchRemotiveJobs = async (limit = 10) => {
    try {
        const url = 'https://remotive.com/api/remote-jobs';
        const response = await axios.get(url, {
            params: { limit },
            timeout: 5000
        });
        
        return response.data.jobs.map(job => ({
            _id: `remotive_${job.id}`,
            title: job.title,
            company: {
                _id: `remotive_company_${job.company_name}`,
                name: job.company_name,
                location: 'Remote',
                logo: null // Remotive logos have CORS issues, so we skip them
            },
            description: (job.description || '').replace(/<[^>]*>/g, '').substring(0, 200) + '...',
            location: 'Remote',
            salary: 0, // Remotive doesn't always provide salary
            jobType: job.job_type || 'Full-time',
            position: 1,
            experienceLevel: 0,
            requirements: job.tags || [],
            created_at: job.publication_date,
            url: job.url,
            source: 'Remotive',
            isExternal: true
        }));
    } catch (error) {
        console.error('Remotive API error:', error.message);
        return [];
    }
};

// Main controller to get mixed jobs (database + external APIs)
export const getMixedJobs = async (req, res) => {
    try {
        const { 
            keyword = '', 
            location = '', 
            jobType = '',
            source = 'all', // 'database', 'external', 'all'
            page = 1,
            limit = 30,
            includeRemote = true
        } = req.query;
        
        // Create cache key
        const cacheKey = `mixed_${keyword}_${location}_${jobType}_${source}_${page}_${includeRemote}`;
        
        // Check cache first
        const cachedJobs = mixedJobsCache.get(cacheKey);
        if (cachedJobs) {
            return res.status(200).json({
                success: true,
                jobs: cachedJobs,
                page: parseInt(page),
                cached: true
            });
        }
        
        let allJobs = [];
        
        // Fetch from database if source is 'database' or 'all'
        if (source === 'database' || source === 'all') {
            const query = {};
            
            if (keyword) {
                query.$or = [
                    { title: { $regex: keyword, $options: 'i' } },
                    { description: { $regex: keyword, $options: 'i' } }
                ];
            }
            
            if (location && location !== 'all') {
                query.location = { $regex: location, $options: 'i' };
            }
            
            if (jobType && jobType !== 'all') {
                query.jobType = { $regex: jobType, $options: 'i' };
            }
            
            const databaseJobs = await Job.find(query)
                .populate('company')
                .sort({ createdAt: -1 })
                .limit(limit);
            
            // Mark database jobs
            const formattedDbJobs = databaseJobs.map(job => ({
                ...job.toObject(),
                source: 'Database',
                isExternal: false
            }));
            
            allJobs = [...allJobs, ...formattedDbJobs];
        }
        
        // Fetch from external APIs if source is 'external' or 'all'
        if (source === 'external' || source === 'all') {
            // Fetch from multiple sources in parallel
            const externalPromises = [];
            
            // Always try Adzuna for location-based searches
            externalPromises.push(fetchAdzunaJobs(keyword, location, page, 10));
            
            // Include remote job boards if remote jobs are requested
            if (includeRemote === 'true' || jobType === 'Remote') {
                externalPromises.push(fetchRemoteOKJobs(5));
                externalPromises.push(fetchRemotiveJobs(5));
            }
            
            const externalResults = await Promise.allSettled(externalPromises);
            
            externalResults.forEach(result => {
                if (result.status === 'fulfilled' && result.value) {
                    allJobs = [...allJobs, ...result.value];
                }
            });
        }
        
        // Apply additional filtering on combined results
        if (keyword) {
            allJobs = allJobs.filter(job => 
                job.title?.toLowerCase().includes(keyword.toLowerCase()) ||
                job.description?.toLowerCase().includes(keyword.toLowerCase()) ||
                job.company?.name?.toLowerCase().includes(keyword.toLowerCase())
            );
        }
        
        if (location && location !== 'all') {
            allJobs = allJobs.filter(job => 
                job.location?.toLowerCase().includes(location.toLowerCase()) ||
                job.company?.location?.toLowerCase().includes(location.toLowerCase())
            );
        }
        
        if (jobType && jobType !== 'all') {
            allJobs = allJobs.filter(job => 
                job.jobType?.toLowerCase().includes(jobType.toLowerCase())
            );
        }
        
        // Sort by date (newest first)
        allJobs.sort((a, b) => {
            const dateA = new Date(a.created_at || a.createdAt);
            const dateB = new Date(b.created_at || b.createdAt);
            return dateB - dateA;
        });
        
        // Implement pagination
        const startIndex = (page - 1) * limit;
        const endIndex = startIndex + limit;
        const paginatedJobs = allJobs.slice(startIndex, endIndex);
        
        // Cache the results
        if (paginatedJobs.length > 0) {
            mixedJobsCache.set(cacheKey, paginatedJobs);
        }
        
        return res.status(200).json({
            success: true,
            jobs: paginatedJobs,
            totalJobs: allJobs.length,
            page: parseInt(page),
            totalPages: Math.ceil(allJobs.length / limit),
            cached: false
        });
        
    } catch (error) {
        console.error('Mixed jobs fetch error:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to fetch mixed jobs',
            error: error.message
        });
    }
};

// Get random/trending mixed jobs
export const getRandomMixedJobs = async (req, res) => {
    try {
        const cacheKey = 'random_mixed_jobs';
        
        // Check cache
        const cachedJobs = mixedJobsCache.get(cacheKey);
        if (cachedJobs) {
            return res.status(200).json({
                success: true,
                jobs: cachedJobs,
                cached: true
            });
        }
        
        let randomJobs = [];
        
        // Get random database jobs
        const dbJobsCount = await Job.countDocuments();
        const randomSkip = Math.floor(Math.random() * Math.max(0, dbJobsCount - 10));
        
        const databaseJobs = await Job.find()
            .populate('company')
            .skip(randomSkip)
            .limit(10)
            .sort({ createdAt: -1 });
        
        const formattedDbJobs = databaseJobs.map(job => ({
            ...job.toObject(),
            source: 'Database',
            isExternal: false
        }));
        
        randomJobs = [...randomJobs, ...formattedDbJobs];
        
        // Fetch from external APIs
        const [adzunaJobs, remoteOKJobs, remotiveJobs] = await Promise.allSettled([
            fetchAdzunaJobs('', '', 1, 5),
            fetchRemoteOKJobs(5),
            fetchRemotiveJobs(5)
        ]);
        
        if (adzunaJobs.status === 'fulfilled') {
            randomJobs = [...randomJobs, ...adzunaJobs.value];
        }
        
        if (remoteOKJobs.status === 'fulfilled') {
            randomJobs = [...randomJobs, ...remoteOKJobs.value];
        }
        
        if (remotiveJobs.status === 'fulfilled') {
            randomJobs = [...randomJobs, ...remotiveJobs.value];
        }
        
        // Shuffle the array for randomness
        randomJobs = randomJobs.sort(() => Math.random() - 0.5);
        
        // Take only first 30 jobs
        randomJobs = randomJobs.slice(0, 30);
        
        // Cache for 15 minutes
        mixedJobsCache.set(cacheKey, randomJobs);
        
        return res.status(200).json({
            success: true,
            jobs: randomJobs,
            cached: false
        });
        
    } catch (error) {
        console.error('Random jobs fetch error:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to fetch random jobs',
            error: error.message
        });
    }
};

// Clear mixed jobs cache
export const clearMixedJobsCache = async (req, res) => {
    try {
        mixedJobsCache.flushAll();
        return res.status(200).json({
            success: true,
            message: 'Mixed jobs cache cleared successfully'
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: 'Failed to clear cache',
            error: error.message
        });
    }
};
