import { scrapeJobs } from './src';
import fs from 'fs';
import path from 'path';
import { Client } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const connectionString = process.env.DATABASE_URL || 'postgres://jobpilot:password@localhost:5432/jobpilot_db';

async function saveJobsToDb(jobs: any[]) {
    const client = new Client({ connectionString });
    try {
        await client.connect();
        console.log('Connected to PostgreSQL database.');

        let successCount = 0;
        let skipCount = 0;

        for (const job of jobs) {
            try {
                // Upsert based on external_id
                const query = `
                    INSERT INTO jobs (
                        external_id, site, title, company, location, 
                        job_url, job_url_direct, description, date_posted,
                        salary_min, salary_max, salary_currency, job_type, is_remote
                    )
                    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
                    ON CONFLICT (external_id) DO NOTHING
                    RETURNING id;
                `;
                const values = [
                    job.id, // external_id
                    job.site,
                    job.title,
                    job.company,
                    job.location,
                    job.jobUrl,
                    job.jobUrlDirect,
                    job.description,
                    job.datePosted ? new Date(job.datePosted) : null,
                    job.minAmount || null,
                    job.maxAmount || null,
                    job.currency || null,
                    job.jobType || null,
                    job.isRemote || false
                ];

                const res = await client.query(query, values);
                if (res.rowCount && res.rowCount > 0) {
                    successCount++;
                } else {
                    skipCount++;
                }
            } catch (err) {
                console.error(`Error saving job ${job.id}:`, err);
            }
        }

        console.log(`✅ DB Update: ${successCount} new jobs added, ${skipCount} duplicates skipped.`);
    } catch (err) {
        console.error('Database connection error:', err);
    } finally {
        await client.end();
    }
}

async function main() {
    const searchTerm = process.argv[2] || 'software engineer';
    const location = process.argv[3] || 'United Kingdom';
    const resultsWanted = parseInt(process.argv[4]) || 10;

    console.log(`🚀 Starting Job Scraper...`);
    console.log(`🔍 Search: "${searchTerm}" in "${location}"`);
    console.log(`🔢 Target: ${resultsWanted} results per site`);

    try {
        const jobs = await scrapeJobs({
            siteName: ['indeed', 'linkedin'],
            searchTerm: searchTerm,
            location: location,
            resultsWanted: resultsWanted,
            hoursOld: 168, // Last 7 days
            countryIndeed: 'UK',
            linkedinFetchDescription: true
        });

        console.log(`✅ Found ${jobs.length} jobs total.`);

        // Save to JSON for backup
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const fileName = `scraped_jobs_${timestamp}.json`;
        fs.writeFileSync(path.join(process.cwd(), fileName), JSON.stringify(jobs, null, 2));
        console.log(`💾 JSON Backup: ${fileName}`);

        // Save to Database
        await saveJobsToDb(jobs);

    } catch (error) {
        console.error('❌ Scraper error:', error);
    }
}

main();
