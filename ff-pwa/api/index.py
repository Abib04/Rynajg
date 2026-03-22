from flask import Flask, jsonify, request
from flask_cors import CORS
import json
import os
import time
from datetime import datetime
from dateutil.relativedelta import relativedelta
import traceback

app = Flask(__name__)
CORS(app)
PORT = 3000

@app.route('/api/health')
def health():
    return jsonify({"status": "ok", "message": "Backend is alive!"})

@app.errorhandler(Exception)
def handle_exception(e):
    # Log the full traceback to stdout (shows up in Vercel logs)
    print("UNHANDLED EXCEPTION:", traceback.format_exc())
    return jsonify({
        "success": False,
        "message": "Internal Server Error",
        "error": str(e),
        "traceback": traceback.format_exc() if app.debug else None
    }), 500

# The exact indicators user requested
targetIndicators = [
    # Inflation & Prices
    { "id": 1, "name": "CPI (Consumer Price Index)", "category": "Inflation & Prices", "dateType": "specific", "day": 12, "refUrl": "https://www.forexfactory.com/calendar/78-us-cpi-mm" },
    { "id": 2, "name": "Core CPI", "category": "Inflation & Prices", "dateType": "specific", "day": 12, "refUrl": "https://www.forexfactory.com/calendar/79-us-core-cpi-mm" },
    { "id": 3, "name": "PPI (Producer Price Index)", "category": "Inflation & Prices", "dateType": "specific", "day": 18, "refUrl": "https://www.forexfactory.com/calendar/86-us-ppi-mm" },
    { "id": 4, "name": "Core PPI (Producer Price Index)", "category": "Inflation & Prices", "dateType": "specific", "day": 18, "refUrl": "https://www.forexfactory.com/calendar/87-us-core-ppi-mm" },
    { "id": 5, "name": "Import/Export Prices", "category": "Inflation & Prices", "dateType": "specific", "day": 20, "refUrl": "https://www.forexfactory.com/calendar/90-us-import-prices-mm" },
    { "id": 6, "name": "PCE/Core PCE", "category": "Inflation & Prices", "dateType": "specific", "day": 27, "refUrl": "https://www.forexfactory.com/calendar/85-us-core-pce-price-index-mm" },

    # Labour
    { "id": 7, "name": "Non-farm Payrolls", "category": "Labour", "dateType": "specific", "day": 6, "refUrl": "https://www.forexfactory.com/calendar/66-us-non-farm-employment-change" },
    { "id": 8, "name": "Non-Farm Employment Change", "category": "Labour", "dateType": "specific", "day": 6, "refUrl": "https://www.forexfactory.com/calendar/66-us-non-farm-employment-change" },
    { "id": 9, "name": "Unemployment Rate", "category": "Labour", "dateType": "specific", "day": 6, "refUrl": "https://www.forexfactory.com/calendar/56-us-unemployment-rate" },
    { "id": 10, "name": "Employment Change", "category": "Labour", "dateType": "specific", "day": 15, "refUrl": "https://www.forexfactory.com/calendar/66-us-non-farm-employment-change" },
    { "id": 11, "name": "Average Hourly Earnings", "category": "Labour", "dateType": "specific", "day": 6, "refUrl": "https://www.forexfactory.com/calendar/159-us-average-hourly-earnings-mm" },
    { "id": 12, "name": "Unemployment Claims (W1)", "category": "Labour", "dateType": "specific", "day": 5, "refUrl": "https://www.forexfactory.com/calendar/11-us-unemployment-claims" },
    { "id": 13, "name": "Unemployment Claims (W2)", "category": "Labour", "dateType": "specific", "day": 12, "refUrl": "https://www.forexfactory.com/calendar/11-us-unemployment-claims" },
    { "id": 14, "name": "Unemployment Claims (W3)", "category": "Labour", "dateType": "specific", "day": 19, "refUrl": "https://www.forexfactory.com/calendar/11-us-unemployment-claims" },
    { "id": 15, "name": "Unemployment Claims (W4)", "category": "Labour", "dateType": "specific", "day": 26, "refUrl": "https://www.forexfactory.com/calendar/11-us-unemployment-claims" },
    { "id": 16, "name": "ADP Non-Farm Employment Change", "category": "Labour", "dateType": "specific", "day": 5, "refUrl": "https://www.forexfactory.com/calendar/75-us-adp-non-farm-employment-change" },

    # Economy Growth
    { "id": 17, "name": "GDP (q/q)", "category": "Economy Growth", "dateType": "specific", "day": 25, "refUrl": "https://www.forexfactory.com/calendar/81-us-gdp-qq" },
    { "id": 18, "name": "Final GDP", "category": "Economy Growth", "dateType": "specific", "day": 25, "refUrl": "https://www.forexfactory.com/calendar/81-us-gdp-qq" },
    { "id": 19, "name": "Flash GDP", "category": "Economy Growth", "dateType": "specific", "day": 25, "refUrl": "https://www.forexfactory.com/calendar/81-us-gdp-qq" },
    { "id": 20, "name": "Industrial Production", "category": "Economy Growth", "dateType": "specific", "day": 15, "refUrl": "https://www.forexfactory.com/calendar/111-us-industrial-production-mm" },
    { "id": 21, "name": "Capacity Utilization", "category": "Economy Growth", "dateType": "specific", "day": 15, "refUrl": "https://www.forexfactory.com/calendar/112-us-capacity-utilization-rate" },

    # Consumption & Domestic Demand
    { "id": 22, "name": "Retail Sales", "category": "Consumption & Domestic Demand", "dateType": "specific", "day": 18, "refUrl": "https://www.forexfactory.com/calendar/102-us-retail-sales-mm" },
    { "id": 23, "name": "Core Retail Sales", "category": "Consumption & Domestic Demand", "dateType": "specific", "day": 18, "refUrl": "https://www.forexfactory.com/calendar/112-us-core-retail-sales-mm" },
    { "id": 24, "name": "Personal Spending", "category": "Consumption & Domestic Demand", "dateType": "specific", "day": 27, "refUrl": "https://www.forexfactory.com/calendar/356-us-personal-spending-mm" },
    { "id": 25, "name": "Personal Income", "category": "Consumption & Domestic Demand", "dateType": "specific", "day": 27, "refUrl": "https://www.forexfactory.com/calendar/360-us-personal-income-mm" },

    # Sentiment & Survey
    { "id": 26, "name": "US ISM Manufacturing PMI", "category": "Sentiment & Survey", "dateType": "specific", "day": 4, "refUrl": "https://www.forexfactory.com/calendar/252-us-ism-manufacturing-pmi" },
    { "id": 27, "name": "US ISM Services PMI", "category": "Sentiment & Survey", "dateType": "specific", "day": 6, "refUrl": "https://www.forexfactory.com/calendar/253-us-ism-services-pmi" },
    { "id": 28, "name": "Composite PMI", "category": "Sentiment & Survey", "dateType": "specific", "day": 4, "refUrl": "https://www.forexfactory.com/calendar/113-us-flash-manufacturing-pmi" },
    { "id": 29, "name": "US CB Consumer Confidence", "category": "Sentiment & Survey", "dateType": "specific", "day": 31, "refUrl": "https://www.forexfactory.com/calendar/208-us-cb-consumer-confidence" },
    { "id": 30, "name": "Business Confidence", "category": "Sentiment & Survey", "dateType": "specific", "day": 15, "refUrl": "https://www.forexfactory.com/calendar/114-us-business-inventories-mm" },
    { "id": 31, "name": "ZEW Economic Sentiment", "category": "Sentiment & Survey", "dateType": "specific", "day": 12, "refUrl": "https://www.forexfactory.com/calendar/115-us-zew-economic-sentiment" },

    # Monetary Policy
    { "id": 32, "name": "Interest Rate Decision", "category": "Monetary Policy", "dateType": "specific", "day": 15, "refUrl": "https://www.forexfactory.com/calendar/1-us-federal-funds-rate" },
    { "id": 33, "name": "Monetary Policy Statement", "category": "Monetary Policy", "dateType": "specific", "day": 15, "refUrl": "https://www.forexfactory.com/calendar/1-us-federal-funds-rate" },
    { "id": 34, "name": "FOMC Minutes", "category": "Monetary Policy", "dateType": "specific", "day": 22, "refUrl": "https://www.forexfactory.com/calendar/2-us-fomc-minutes" },
    { "id": 35, "name": "Central Bank Press Conference", "category": "Monetary Policy", "dateType": "specific", "day": 15, "refUrl": "https://www.forexfactory.com/calendar/3-us-fomc-press-conference" },
    { "id": 36, "name": "Governor Speech", "category": "Monetary Policy", "dateType": "specific", "day": 8, "refUrl": "https://www.forexfactory.com/calendar/4-us-fed-chair-powell-speaks" },

    # Balance sheet & External Sector
    { "id": 37, "name": "Trade Balance", "category": "Balance sheet & External Sector", "dateType": "specific", "day": 5, "refUrl": "https://www.forexfactory.com/calendar/117-us-trade-balance" },
    { "id": 38, "name": "Current Account", "category": "Balance sheet & External Sector", "dateType": "specific", "day": 15, "refUrl": "https://www.forexfactory.com/calendar/118-us-current-account" },
    { "id": 39, "name": "Foreign Investment", "category": "Balance sheet & External Sector", "dateType": "specific", "day": 20, "refUrl": "https://www.forexfactory.com/calendar/119-us-tic-long-term-purchases" },
    { "id": 40, "name": "Capital Flows", "category": "Balance sheet & External Sector", "dateType": "specific", "day": 20, "refUrl": "https://www.forexfactory.com/calendar/119-us-tic-long-term-purchases" },

    # Others
    { "id": 41, "name": "Bond Auctions (10Y)", "category": "Others", "dateType": "specific", "day": 12, "refUrl": "https://www.forexfactory.com/calendar/519-us-10-y-bond-auction" },
    { "id": 42, "name": "Crude Oil Inventories (W1)", "category": "Others", "dateType": "specific", "day": 5, "refUrl": "https://www.forexfactory.com/calendar/10-us-crude-oil-inventories" },
    { "id": 43, "name": "Crude Oil Inventories (W2)", "category": "Others", "dateType": "specific", "day": 11, "refUrl": "https://www.forexfactory.com/calendar/10-us-crude-oil-inventories" },
    { "id": 44, "name": "Crude Oil Inventories (W3)", "category": "Others", "dateType": "specific", "day": 19, "refUrl": "https://www.forexfactory.com/calendar/10-us-crude-oil-inventories" },
    { "id": 45, "name": "Crude Oil Inventories (W4)", "category": "Others", "dateType": "specific", "day": 25, "refUrl": "https://www.forexfactory.com/calendar/10-us-crude-oil-inventories" },
    { "id": 46, "name": "Natural Gas Storage (W1)", "category": "Others", "dateType": "specific", "day": 5, "refUrl": "https://www.forexfactory.com/calendar/26-us-natural-gas-storage" },
    { "id": 47, "name": "Natural Gas Storage (W2)", "category": "Others", "dateType": "specific", "day": 12, "refUrl": "https://www.forexfactory.com/calendar/26-us-natural-gas-storage" },
    { "id": 48, "name": "Natural Gas Storage (W3)", "category": "Others", "dateType": "specific", "day": 19, "refUrl": "https://www.forexfactory.com/calendar/26-us-natural-gas-storage" },
    { "id": 49, "name": "Natural Gas Storage (W4)", "category": "Others", "dateType": "specific", "day": 26, "refUrl": "https://www.forexfactory.com/calendar/26-us-natural-gas-storage" },
    { "id": 50, "name": "Housing Starts", "category": "Others", "dateType": "specific", "day": 19, "refUrl": "https://www.forexfactory.com/calendar/199-us-housing-starts" },
    { "id": 51, "name": "Building Permits", "category": "Others", "dateType": "specific", "day": 19, "refUrl": "https://www.forexfactory.com/calendar/198-us-building-permits" },
    { "id": 52, "name": "Miscellaneous", "category": "Others", "dateType": "specific", "day": 15, "refUrl": "https://www.forexfactory.com/" },

    # Australia
    { "id": 101, "name": "RBA Rate Statement", "category": "Australia", "dateType": "specific", "day": 1, "refUrl": "https://www.forexfactory.com/calendar/22-au-rba-rate-statement" },
    { "id": 102, "name": "CPI q/q", "category": "Australia", "dateType": "specific", "day": 1, "refUrl": "https://www.forexfactory.com/calendar/38-au-cpi-qq" },
    { "id": 103, "name": "PPI q/q", "category": "Australia", "dateType": "specific", "day": 1, "refUrl": "https://www.forexfactory.com/calendar/37-au-ppi-qq" },
    { "id": 104, "name": "GDP q/q", "category": "Australia", "dateType": "specific", "day": 1, "refUrl": "https://www.forexfactory.com/calendar/31-au-gdp-qq" },
    { "id": 105, "name": "Retail Sales m/m", "category": "Australia", "dateType": "specific", "day": 1, "refUrl": "https://www.forexfactory.com/calendar/110-au-retail-sales-mm" },
    { "id": 106, "name": "Unemployment Rate", "category": "Australia", "dateType": "specific", "day": 1, "refUrl": "https://www.forexfactory.com/calendar/54-au-unemployment-rate" },
    { "id": 107, "name": "Employment Change", "category": "Australia", "dateType": "specific", "day": 1, "refUrl": "https://www.forexfactory.com/calendar/73-au-employment-change" }
]

import urllib.request
import firebase_admin
from firebase_admin import credentials, firestore
import sys
import os
from bs4 import BeautifulSoup
import re

# Helper to normalize values
def clean_value(val_str):
    if not val_str:
        return ""
    return val_str.strip()

def scrape_forex_history(url):
    """
    Fetches the HTML of a ForexFactory calendar item using urllib and parses its historical data.
    """
    print(f"Scraping {url} ...")
    try:
        req = urllib.request.Request(
            url, 
            headers={
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
                'Accept-Language': 'en-US,en;q=0.9',
                'Cache-Control': 'no-cache',
                'Pragma': 'no-cache'
            }
        )
        with urllib.request.urlopen(req, timeout=15) as response:
            html = response.read().decode('utf-8', errors='ignore')
            
        soup = BeautifulSoup(html, 'html.parser')
        html_title = soup.title.string.strip() if soup.title else "No Title"
        
        # Check for Cloudflare/Access Denied
        if "Just a moment" in html_title or "Access Denied" in html_title or "Attention Required!" in html_title:
            return {"error": f"Blocked by Cloudflare/Protection: {html_title}", "html_title": html_title}

        # Try multiple table classes often used for History
        table = soup.find('table', class_=re.compile(r'calendar__(history-)?table'))
        if not table:
            # Fallback: find any table that has headers like 'Actual' or 'History'
            all_tables = soup.find_all('table')
            for t in all_tables:
                if "Actual" in t.get_text() and "Forecast" in t.get_text():
                    table = t
                    break
                    
        if not table:
            return {"error": "History table not found on page", "html_title": html_title}
            
        # Rows can be 'tr' with various classes
        rows = table.find_all('tr', class_=re.compile(r'calendar(history)?__row'))
        if not rows:
            # Fallback to all tr in tbody
            tbody = table.find('tbody')
            rows = tbody.find_all('tr') if tbody else table.find_all('tr')
            
        history_list = []
        
        for row in rows:
            # Try specific classes first, then general names
            date_td = row.find('td', class_=re.compile(r'date|history'))
            actual_td = row.find('td', class_=re.compile(r'actual'))
            forecast_td = row.find('td', class_=re.compile(r'forecast'))
            previous_td = row.find('td', class_=re.compile(r'previous'))
            
            if date_td and actual_td:
                date_text = date_td.get_text(separator=" ", strip=True) 
                # FF dates are often inside an <a>
                date_link = date_td.find('a')
                if date_link:
                    date_text = date_link.get_text(strip=True)
                
                act_text = actual_td.get_text(separator=" ", strip=True)
                for_text = forecast_td.get_text(separator=" ", strip=True) if forecast_td else ""
                prev_text = previous_td.get_text(separator=" ", strip=True) if previous_td else ""
                
                # Flexible date matching
                date_match = re.search(r'([A-Z][a-z]{2})\s+(\d{1,2}),\s+(\d{4})', date_text)
                if date_match and act_text:
                    clean_date = f"{date_match.group(1)} {date_match.group(2)}, {date_match.group(3)}"
                    history_list.append({
                        "date": clean_date,
                        "actual": clean_value(act_text),
                        "forecast": clean_value(for_text),
                        "previous": clean_value(prev_text),
                        "movementBefore": "", 
                        "movementAfter": ""
                    })

        return {"data": history_list, "html_title": html_title}

    except Exception as e:
        error_msg = str(e)
        print(f"Error scraping {url}: {error_msg}")
        return {"error": error_msg, "html_title": "Exception"}

# Initialize Firebase via env or local file
db = None
if not firebase_admin._apps:
    try:
        cred_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'firebase_credentials.json')
        if os.path.exists(cred_path):
            cred = credentials.Certificate(cred_path)
            firebase_admin.initialize_app(cred)
            db = firestore.client()
        elif os.getenv('FIREBASE_SERVICE_ACCOUNT'):
            # For Vercel deployment
            service_account_info = json.loads(os.getenv('FIREBASE_SERVICE_ACCOUNT'))
            cred = credentials.Certificate(service_account_info)
            firebase_admin.initialize_app(cred)
            db = firestore.client()
    except Exception as e:
        print("CRITICAL: Failed to initialize Firebase:", e)
        # Don't crash the whole app, just log it. 
        # Endpoints using 'db' should check if it's None.

def get_scraped_history():
    history_data = {}
    if db:
        try:
            doc = db.collection('app_data').document('scraped_history').get()
            if doc.exists:
                history_data = doc.to_dict()
            else:
                # Seed Firestore from local JSON if empty
                file_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'scraped_history.json')
                if os.path.exists(file_path):
                    with open(file_path, 'r', encoding='utf-8') as f:
                        history_data = json.load(f)
                    db.collection('app_data').document('scraped_history').set(history_data)
                    print("Synced local scraped_history.json to Firebase!")
        except Exception as e:
            print("Error reading from Firestore:", e)
    else:
        # Fallback to local
        try:
            file_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'scraped_history.json')
            if os.path.exists(file_path):
                with open(file_path, 'r', encoding='utf-8') as f:
                    return json.load(f)
        except Exception as e:
            print("Error reading scraped_history.json:", e)
    return history_data

def save_scraped_history(history_data):
    if db:
        try:
            db.collection('app_data').document('scraped_history').set(history_data)
        except Exception as e:
            print("Error writing to Firestore:", e)
    else:
        try:
            file_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'scraped_history.json')
            with open(file_path, 'w', encoding='utf-8') as f:
                json.dump(history_data, f, indent=4)
        except Exception as e:
            print("Error saving scraped_history.json:", e)

def fetch_free_news_api():
    url = "https://nfs.faireconomy.media/ff_calendar_thisweek.json"
    req = urllib.request.Request(
        url, 
        headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'}
    )
    try:
        with urllib.request.urlopen(req) as response:
            return json.loads(response.read().decode())
    except Exception as e:
        print("Error fetching free news API:", e)
        return []

@app.route('/api/scrape', methods=['GET'])
def scrape_api():
    try:
        history_data = get_scraped_history()
        api_data = fetch_free_news_api()
        
        print(f"[{datetime.now().isoformat()}] Fetched {len(api_data)} events from Free API. Current historic tracked: {len(history_data.keys())}.")

        # Update historical data with new actuals from API if available
        # API items have: title, country, date, impact, forecast, previous, actual
        new_data_added = False
        
        # Month mapping for JS ID logic
        month_names_en = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
        month_names_id = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"]

        if api_data:
            for item in api_data:
                if item.get("country") == "USD" and item.get("actual"):
                    # Check if this matches any of our target indicators
                    for indicator in targetIndicators:
                        # Simple name matching (could be improved with regex/exact mapping)
                        if indicator['name'].lower() in item.get('title', '').lower() or item.get('title', '').lower() in indicator['name'].lower():
                            ind_id = str(indicator['id'])
                            
                            # Parse the date from API (e.g. "2026-02-13T08:30:00-05:00")
                            try:
                                dt = datetime.fromisoformat(item['date'])
                                date_str = f"{month_names_en[dt.month - 1]} {dt.day}, {dt.year}"
                                year_val = dt.year
                                month_pre = month_names_en[dt.month - 1]
                            except Exception:
                                date_str = item.get('date', '').split('T')[0]
                                year_val = datetime.now().year
                                month_pre = ""
                                
                            entry = {
                                "date": date_str,
                                "actual": item.get("actual", ""),
                                "forecast": item.get("forecast", ""),
                                "previous": item.get("previous", "")
                            }
                            
                            if ind_id not in history_data:
                                history_data[ind_id] = []
                            
                            # Prevent duplicates for the same month/year
                            exists = False
                            if month_pre:
                                exists = any(e['date'].endswith(str(year_val)) and e['date'].startswith(month_pre) for e in history_data[ind_id])
                            else:
                                exists = any(e['date'] == date_str for e in history_data[ind_id])
                            
                            if not exists:
                                history_data[ind_id].append(entry)
                                new_data_added = True
                                
        if new_data_added:
            save_scraped_history(history_data)
            print("Saved new data to scraped_history.json")

        final_data = []
        start_date = datetime(2024, 1, 1)
        end_date = datetime.now()
        
        # Calculate month difference
        months_diff = (end_date.year - start_date.year) * 12 + end_date.month - start_date.month + 1

        for m in range(months_diff - 1, -1, -1): # Newest first
            month_year_date = start_date + relativedelta(months=m)
            month_year_str = f"{month_names_id[month_year_date.month - 1]} {month_year_date.year}"

            current_month_en = month_names_en[month_year_date.month - 1]
            current_year_str = str(month_year_date.year)

            for indicator in targetIndicators:
                result_row = indicator.copy()
                
                is_percentage = 'CPI' in indicator['name'] or 'PPI' in indicator['name']
                
                result_row.update({
                    'date': '',
                    'monthYear': month_year_str,
                    'movementBefore': '',
                    'movementAfter': '',
                    'last': '-',
                    'forecast': '-',
                    'actual': '-',
                    'units': 'Percentage (%)' if is_percentage else 'Thousand (K)',
                    'probability': ''
                })

                history = history_data.get(str(indicator['id']), [])
                found_real = False
                
                # Check for Weekly occurrence (W1, W2, etc.)
                week_match = re.search(r'\(W(\d)\)', indicator['name'])
                target_occurrence = int(week_match.group(1)) if week_match else 1
                
                if history and isinstance(history, list):
                    # Find all entries for this month
                    month_entries = []
                    for entry in history:
                        e_date = entry['date'].strip()
                        if e_date.startswith(current_month_en) and e_date.endswith(current_year_str):
                            month_entries.append(entry)
                    
                    # Sort entries by day number
                    def extract_day(e):
                        d_m = re.search(r'(\d{1,2})', e['date'])
                        return int(d_m.group(1)) if d_m else 0
                    month_entries.sort(key=extract_day)
                    
                    if len(month_entries) >= target_occurrence:
                        entry = month_entries[target_occurrence - 1]
                        result_row['date'] = entry['date']
                        result_row['actual'] = entry['actual']
                        result_row['forecast'] = entry['forecast']
                        result_row['last'] = entry['previous']
                        result_row['movementBefore'] = entry.get('movementBefore', '')
                        result_row['movementAfter'] = entry.get('movementAfter', '')
                        found_real = True

                if not found_real and indicator['dateType'] == 'specific':
                    try:
                        spec_date = datetime(month_year_date.year, month_year_date.month, indicator['day'])
                    except ValueError:
                        if month_year_date.month == 2:
                            spec_date = datetime(month_year_date.year, month_year_date.month, 28)
                        else:
                            spec_date = datetime(month_year_date.year, month_year_date.month, 30)
                            
                    result_row['date'] = spec_date.strftime("%b %d, %Y")

                final_data.append(result_row)

        return jsonify({
            'success': True,
            'timestamp': datetime.now().isoformat(),
            'totalRows': len(final_data),
            'realIndicators': list(history_data.keys()),
            'data': final_data
        })

    except Exception as error:
        print("API error:", error)
        return jsonify({
            'success': False,
            'message': 'Failed to process indicators.',
            'error': str(error)
        }), 500

@app.route('/api/indicators', methods=['GET'])
def get_indicators():
    return jsonify({
        'success': True,
        'data': targetIndicators
    })

@app.route('/api/save_manual_data', methods=['POST'])
def save_manual_data():
    try:
        payload = request.json
        if not payload:
            return jsonify({'success': False, 'message': 'No data provided'}), 400
            
        indicator_id = str(payload.get('indicator_id'))
        date_str = payload.get('date').strip()
        actual = payload.get('actual', '').strip()
        forecast = payload.get('forecast', '').strip()
        previous = payload.get('previous', '').strip()
        movementBefore = payload.get('movementBefore', '')
        if isinstance(movementBefore, str):
            movementBefore = movementBefore.strip()
        movementAfter = payload.get('movementAfter', '')
        if isinstance(movementAfter, str):
            movementAfter = movementAfter.strip()
            
        is_partial = payload.get('is_partial_update', False)
        
        if not indicator_id or not date_str:
            return jsonify({'success': False, 'message': 'Indicator ID and Date are required'}), 400
            
        history_data = get_scraped_history()
        
        if indicator_id not in history_data:
            history_data[indicator_id] = []
            
        entry = {
            "date": date_str,
            "actual": actual,
            "forecast": forecast,
            "previous": previous,
            "movementBefore": movementBefore,
            "movementAfter": movementAfter
        }
        
        # Check if date already exists for this indicator, if so, update it. If not, append.
        updated = False
        for i, existing_entry in enumerate(history_data[indicator_id]):
            if existing_entry['date'].lower() == date_str.lower():
                if is_partial:
                    # Update only provided fields, keep everything else
                    for key in ['actual', 'forecast', 'previous', 'movementBefore', 'movementAfter']:
                        if key in payload:
                            existing_entry[key] = payload[key]
                    entry = existing_entry # For the response
                else:
                    history_data[indicator_id][i] = entry
                updated = True
                break
                
        if not updated:
            if is_partial:
                # If doing a partial update on a non-existent row, initialize empty strings for missing ones
                entry = {
                    "date": date_str,
                    "actual": payload.get('actual', ''),
                    "forecast": payload.get('forecast', ''),
                    "previous": payload.get('previous', ''),
                    "movementBefore": payload.get('movementBefore', ''),
                    "movementAfter": payload.get('movementAfter', '')
                }
            history_data[indicator_id].append(entry)
            
        save_scraped_history(history_data)
        
        return jsonify({
            'success': True,
            'message': 'Data saved successfully',
            'action': 'updated' if updated else 'added',
            'data': entry
        })
        
    except Exception as error:
        print("Admin API error:", error)
        return jsonify({
            'success': False,
            'message': 'Failed to save manually.',
            'error': str(error)
        }), 500

@app.route('/api/sync-history', methods=['POST'])
def sync_history():
    """
    Endpoint to trigger backend scraping for specific indicators.
    Payload: { "indicator_ids": ["1", "3", "5"] }
    """
    try:
        payload = request.json or {}
        ids_to_sync = payload.get('indicator_ids', [])
        
        if not ids_to_sync:
            return jsonify({'success': False, 'message': 'No indicator_ids provided for sync'}), 400
            
        history_data = get_scraped_history()
        synced_count = 0
        details = []
        
        # Month mapping for JS ID logic backward compatibility
        month_names_en = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
        
        for ind_id in ids_to_sync:
            # Find the indicator configuration
            indicator_conf = next((ind for ind in targetIndicators if str(ind['id']) == str(ind_id)), None)
            if not indicator_conf or not indicator_conf.get('refUrl'):
                details.append({'id': ind_id, 'status': 'skipped', 'reason': 'No config or refUrl'})
                continue
                
            ref_url = indicator_conf['refUrl']
            scraped_result = scrape_forex_history(ref_url)
            
            scraped_rows = scraped_result.get("data", [])
            error = scraped_result.get("error")
            html_title = scraped_result.get("html_title", "")
            
            if error:
                details.append({'id': ind_id, 'status': 'failed', 'reason': error, 'title': html_title})
                continue
                
            if not scraped_rows:
                details.append({'id': ind_id, 'status': 'failed', 'reason': 'Scraper found no rows in table', 'title': html_title})
                continue
                
            if str(ind_id) not in history_data:
                history_data[str(ind_id)] = []
                
            added_for_ind = 0
            # Merge new rows into history
            for row in scraped_rows:
                # E.g., row['date'] = "Feb 13, 2026"
                date_str = row['date']
                
                # Check uniqueness (ignore missing days or matching months)
                # But here we have exact dates from FF, so we can just match exact date
                exists = False
                for existing_entry in history_data[str(ind_id)]:
                    # Match by month and year to avoid duplicate entries for the same month's release
                    # (Unless it's an indicator that releases multiple times a month, 
                    # but FF calendar dates are exact, so exact string match is safer)
                    if existing_entry['date'].lower() == date_str.lower():
                        exists = True
                        break
                        
                if not exists:
                    history_data[str(ind_id)].append({
                        "date": date_str,
                        "actual": row.get("actual", ""),
                        "forecast": row.get("forecast", ""),
                        "previous": row.get("previous", ""),
                        "movementBefore": "",  # To be filled manually later
                        "movementAfter": ""
                    })
                    added_for_ind += 1
            
            synced_count += added_for_ind
            details.append({'id': ind_id, 'status': 'success', 'added': added_for_ind})
            
        if synced_count > 0:
            save_scraped_history(history_data)
            
        return jsonify({
            'success': True,
            'message': f'Sync complete. Added {synced_count} new historical records.',
            'details': details
        })
        
    except Exception as error:
        print("Sync API error:", error)
        return jsonify({
            'success': False,
            'message': 'Failed to sync history.',
            'error': str(error)
        }), 500

if __name__ == '__main__':
    print(f"[PWA Backend] Server listening on http://localhost:{PORT}")
    app.run(host='0.0.0.0', port=PORT, debug=True)
