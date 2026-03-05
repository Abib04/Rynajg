from playwright.sync_api import sync_playwright
from playwright_stealth import Stealth

testUrl = 'https://www.forexfactory.com/calendar/78-us-cpi-mm'

def run(playwright):
    browser = playwright.chromium.launch(headless=True)
    context = browser.new_context(
        user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
        viewport={"width": 1920, "height": 1080}
    )
    page = context.new_page()
    
    # Apply stealth tactics
    Stealth().apply_stealth_sync(page)
    
    print('Fetching:', testUrl)
    
    try:
        page.goto(testUrl, wait_until='domcontentloaded', timeout=30000)
        
        # Wait for either the table or Cloudflare challenge to be visible
        page.wait_for_selector('.calendar__table', timeout=15000)
        
        rows = []
        row_elements = page.query_selector_all('.calendar__table tr')
        for row in row_elements:
            actual_el = row.query_selector('.calendar__actual')
            if actual_el:
                date_el = row.query_selector('.calendar__date')
                forecast_el = row.query_selector('.calendar__forecast')
                previous_el = row.query_selector('.calendar__previous')
                
                date = date_el.inner_text().strip() if date_el else ''
                actual = actual_el.inner_text().strip() if actual_el else ''
                forecast = forecast_el.inner_text().strip() if forecast_el else ''
                previous = previous_el.inner_text().strip() if previous_el else ''
                
                if date:
                    rows.append({
                        'date': date,
                        'actual': actual,
                        'forecast': forecast,
                        'previous': previous
                    })
                    
        print(f'Found {len(rows)} historical rows.')
        if len(rows) > 0:
            print('Sample Row:', rows[0])
            
    except Exception as e:
        print('Scraping failed:', str(e))
        content = page.content()
        print('Page snippet:', content[:500])
        with open("error_page.html", "w", encoding="utf-8") as f:
            f.write(content)
        print("Full error page saved to error_page.html")
            
    finally:
        browser.close()

with sync_playwright() as playwright:
    run(playwright)
