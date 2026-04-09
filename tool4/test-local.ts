import { scrapeJobs } from './src';
import fs from 'fs';

async function run() {
  console.log('Starting scrape...');
  try {
    const jobs = await scrapeJobs({
      siteName: ['indeed', 'linkedin'],
      searchTerm: 'software engineer',
      location: 'London',
      resultsWanted: 5,
      hoursOld: 24,
      countryIndeed: 'UK',
      // linkedinFetchDescription: true 
    });

    console.log(`Found ${jobs.length} jobs`);
    fs.writeFileSync('jobs.json', JSON.stringify(jobs, null, 2));
    console.log('Results saved to jobs.json');
  } catch (error) {
    console.error('Error during scrape:', error);
  }
}

run();
