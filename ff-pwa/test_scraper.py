import urllib.request
from bs4 import BeautifulSoup
import re

def clean_value(val_str):
    if not val_str: return ""
    return val_str.strip()

def scrape_forex_history(url):
    print(f"Testing URL: {url}")
    headers = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'}
    req = urllib.request.Request(url, headers=headers)
    
    try:
        with urllib.request.urlopen(req, timeout=15) as response:
            html = response.read().decode('utf-8')
            print(f"Page size: {len(html)} characters")
            
        soup = BeautifulSoup(html, 'html.parser')
        
        # Check for common blocking indicators
        if "Cloudflare" in soup.title.string if soup.title else "":
            print("BLOCKED BY CLOUDFLARE")
            return []

        table = soup.find('table', class_='calendar__table')
        if not table:
            print("No .calendar__table found")
            # Print a bit of the body to see what we got
            print("Body snippet:", soup.body.get_text()[:500] if soup.body else "No body")
            return []
            
        rows = table.find_all('tr', class_='calendar__row')
        print(f"Found {len(rows)} potential rows")
        
        history_list = []
        for row in rows:
            date_td = row.find('td', class_='calendar__date')
            actual_td = row.find('td', class_='calendar__actual')
            
            if date_td and actual_td:
                date_text = date_td.get_text(separator=" ", strip=True) 
                act_text = actual_td.get_text(separator=" ", strip=True)
                
                # Regex to match "Feb 13, 2026" or similar
                date_match = re.search(r'([A-Z][a-z]{2})\s+(\d{1,2}),\s+(\d{4})', date_text)
                if date_match and act_text:
                    clean_date = f"{date_match.group(1)} {date_match.group(2)}, {date_match.group(3)}"
                    print(f"Matched: {clean_date} | Actual: {act_text}")
                    history_list.append({"date": clean_date, "actual": act_text})
        
        return history_list

    except Exception as e:
        print(f"Error: {e}")
        return []

if __name__ == "__main__":
    # Test with Indicator 5
    test_url = "https://www.forexfactory.com/calendar/90-us-import-prices-mm"
    results = scrape_forex_history(test_url)
    print(f"\nTotal results found: {len(results)}")
