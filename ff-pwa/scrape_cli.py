import sys
import os
import time

# Ensure we can import from api
sys.path.append(os.path.join(os.path.dirname(__file__), 'api'))
from index import targetIndicators, scrape_forex_history, get_scraped_history, save_scraped_history

def main():
    history_data = get_scraped_history()
    print(f"Loaded existing history for {len(history_data)} indicators.")
    
    total_added = 0
    count = 0
    
    # We only want to scrape newly added countries or all of them. Let's do all to be safe,
    # or just AU, UK, JP, NZ, SZ, CA.
    for ind in targetIndicators:
        # Avoid free API generic indicators if they don't have refUrl or if their ID is not in our target range
        if ind['id'] < 100: 
            continue # skip US indicators
            
        print(f"\n[{ind['category']}] Scraping {ind['name']} (ID {ind['id']})")
        
        result = scrape_forex_history(ind['refUrl'])
        if "error" in result:
            print(f"  ✗ Error: {result['error']}")
            continue
            
        rows = result.get("data", [])
        print(f"  ✓ {len(rows)} records fetched.")
        
        if str(ind['id']) not in history_data:
            history_data[str(ind['id'])] = []
            
        added = 0
        for r in rows:
            date_str = r['date']
            exists = any(db_entry['date'].lower() == date_str.lower() for db_entry in history_data[str(ind['id'])])
            if not exists:
                history_data[str(ind['id'])].append({
                    "date": date_str,
                    "actual": r.get("actual", ""),
                    "forecast": r.get("forecast", ""),
                    "previous": r.get("previous", ""),
                    "movementBefore": "",
                    "movementAfter": ""
                })
                added += 1
                
        print(f"  → Added {added} NEW records.")
        total_added += added
        count += 1
        
        # Save every 5 indicators to prevent loss
        if count % 5 == 0:
            save_scraped_history(history_data)
            
        time.sleep(2) # delay to avoid 429 Too Many Requests

    save_scraped_history(history_data)
    print(f"\nDone! Total {total_added} new records added.")

if __name__ == '__main__':
    main()
