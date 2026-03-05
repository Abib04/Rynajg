const cloudscraper = require('cloudscraper');
const cheerio = require('cheerio');

const testUrl = 'https://www.forexfactory.com/calendar/78-us-cpi-mm';

console.log('Fetching:', testUrl);

cloudscraper.get(testUrl).then(html => {
    const $ = cheerio.load(html);
    const rows = [];

    // Select the history table rows
    $('.calendar__table tr').each((i, el) => {
        const row = $(el);
        if (row.find('.calendar__actual').length > 0) {
            const date = row.find('.calendar__date').text().trim();
            const actual = row.find('.calendar__actual').text().trim();
            const forecast = row.find('.calendar__forecast').text().trim();
            const previous = row.find('.calendar__previous').text().trim();

            if (date) {
                rows.push({ date, actual, forecast, previous });
            }
        }
    });

    console.log('Found', rows.length, 'historical rows.');
    if (rows.length > 0) {
        console.log('Sample Row:', rows[0]);
    } else {
        console.log('No data found. Checking if HTML contains expected selectors...');
        console.log('HTML snippet:', html.substring(0, 500));
    }
}).catch(err => {
    console.error('Scraping failed:', err.message);
});
