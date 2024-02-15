const puppeteer = require('puppeteer-extra');
const pluginStealth = require('puppeteer-extra-plugin-stealth');
const ejs = require('ejs');
const fs = require('fs');
const cron = require('node-cron');

puppeteer.use(pluginStealth());

// Define the scrapeAndRender function with error handling
async function scrapeAndRender() {
    try {
        const browser = await puppeteer.launch({ headless: true });
        const page = await browser.newPage();

        // Navigate to Dawn News TV page with retry mechanism
        for (let attempt = 0; attempt < 3; attempt++) {
            try {
                await page.goto('https://www.dawnnews.tv/watch-live/', { waitUntil: 'networkidle0' });
                break; // Exit loop if navigation succeeds
            } catch (error) {
                console.error(`Navigation attempt ${attempt + 1} failed:`, error);
                if (attempt === 2) {
                    throw new Error('Failed to navigate to Dawn News TV after 3 attempts.');
                }
            }
        }

        // Wait for the media__item element with timeout and potential handling
        await page.waitForSelector('.media__item', { timeout: 10000 }).catch(error => {
            console.error(`Timed out waiting for .media__item:`, error);
            throw new Error('Failed to find the video element.');
        });

        // Extract video src with error handling
        const videoSrc = await page.evaluate(() => {
            const iframe = document.querySelector('.media__item iframe');
            return iframe ? iframe.src : null;
        }).catch(error => {
            console.error(`Error extracting video source:`, error);
            throw new Error('Failed to extract video source.');
        });

        console.log('Video Source:', videoSrc);

        // Navigate to jobz.pk page with retry mechanism
        for (let attempt = 0; attempt < 3; attempt++) {
            try {
                await page.goto('https://www.jobz.pk/government-jobs/', { waitUntil: 'networkidle0' });
                break; // Exit loop if navigation succeeds
            } catch (error) {
                console.error(`Navigation attempt ${attempt + 1} failed:`, error);
                if (attempt === 2) {
                    throw new Error('Failed to navigate to jobz.pk after 3 attempts.');
                }
            }
        }

        // Extract news data with error handling (optional)
        let news;
        try {
            news = await page.evaluate(() => {
                // Your news extraction logic here
            });
        } catch (error) {
            console.error(`Error extracting news data:`, error);
            news = []; // Fallback to an empty array if extraction fails
        }

        console.log("news", news);

        // Close the browser
        await browser.close();

        // Render EJS template (assuming template.ejs exists)
        const html = await ejs.renderFile('template.ejs', { videoSrc, news });

        // Write HTML to file with error handling
        fs.writeFileSync('index.html', html, (error) => {
            if (error) {
                console.error(`Error writing HTML file:`, error);
                throw new Error('Failed to write HTML file.');
            }
        });

        console.log("HTML generated successfully!");
    } catch (error) {
        console.error('Error during scraping and rendering:', error);
    }
}

// Call the function once to start the process
scrapeAndRender();

// Schedule cron job with error handling
cron.schedule('*/10 * * * *', async () => {
    console.log('Running cron job...');
    try {
        await scrapeAndRender();
    } catch (error) {
        console.error('Error during cron job:', error);
    }
});
