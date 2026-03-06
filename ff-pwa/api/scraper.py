import cloudscraper
from bs4 import BeautifulSoup
import re
from datetime import datetime

# Helper to normalize values
def clean_value(val_str):
    if not val_str:
        return ""
    return val_str.strip()

# Create a scraper instance (handles simple Cloudflare)
scraper = cloudscraper.create_scraper(
    browser={
        'browser': 'chrome',
        'platform': 'windows',
        'desktop': True
    }
)

def scrape_forex_history(url):
    """
    Fetches the HTML of a ForexFactory calendar item and parses its historical data.
    Returns a list of dicts: [{'date': 'Jan 13, 2026', 'actual': '0.3%', 'forecast': '...', 'previous': '...'}, ...]
    """
    print(f"Scraping {url} ...")
    try:
        response = scraper.get(url, timeout=10)
        
        # If response is not 200, return empty
        if response.status_code != 200:
            print(f"Failed to fetch {url} - Status Code: {response.status_code}")
            return []
            
        soup = BeautifulSoup(response.text, 'html.parser')
        
        # Find the historical calendar table
        table = soup.find('table', class_='calendar__table')
        if not table:
            print(f"No .calendar__table found on {url}")
            return []
            
        rows = table.find_all('tr', class_='calendar__row')
        history_list = []
        
        for row in rows:
            date_td = row.find('td', class_='calendar__date')
            actual_td = row.find('td', class_='calendar__actual')
            forecast_td = row.find('td', class_='calendar__forecast')
            previous_td = row.find('td', class_='calendar__previous')
            
            # Require at least the date and actual
            if date_td and actual_td:
                # E.g. "Feb 13, 2026"
                date_text = date_td.get_text(separator=" ", strip=True) 
                
                # Sometime FF just renders a span inside. Wait, looking at the user's reference image:
                # "Feb 13, 2026", "Jan 13, 2026"
                # Strip out any visual junk (like the folder icon text if included by mistake)
                
                act_text = actual_td.get_text(separator=" ", strip=True)
                
                # Forecast and Prev might be empty or missing
                for_text = forecast_td.get_text(separator=" ", strip=True) if forecast_td else ""
                prev_text = previous_td.get_text(separator=" ", strip=True) if previous_td else ""
                
                # Filter out empty or "header" rows if any sneaked in
                date_match = re.search(r'([A-Z][a-z]{2})\s+(\d{1,2}),\s+(\d{4})', date_text)
                if date_match and act_text:
                    clean_date = f"{date_match.group(1)} {date_match.group(2)}, {date_match.group(3)}"
                    history_list.append({
                        "date": clean_date,
                        "actual": clean_value(act_text),
                        "forecast": clean_value(for_text),
                        "previous": clean_value(prev_text),
                        # Default empty movements, as they are calculated later or input manually
                        "movementBefore": "", 
                        "movementAfter": ""
                    })

        return history_list

    except Exception as e:
        print(f"Error scraping {url}: {str(e)}")
        return []

if __name__ == "__main__":
    # Test function locally (might fail if blocked by ISP, works on cloud)
    test_url = "https://www.forexfactory.com/calendar/78-us-cpi-mm"
    res = scrape_forex_history(test_url)
    print(f"Found {len(res)} records.")
    if len(res) > 0:
        print("Sample:", res[0])
