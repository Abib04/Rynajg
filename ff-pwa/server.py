from flask import Flask, jsonify
from flask_cors import CORS
import json
import os
import time
from datetime import datetime
from dateutil.relativedelta import relativedelta

app = Flask(__name__)
CORS(app)
PORT = 3000

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
    { "id": 52, "name": "Miscellaneous", "category": "Others", "dateType": "specific", "day": 15, "refUrl": "https://www.forexfactory.com/" }
]

import urllib.request

def get_scraped_history():
    try:
        file_path = os.path.join(os.path.dirname(__file__), 'scraped_history.json')
        if os.path.exists(file_path):
            with open(file_path, 'r', encoding='utf-8') as f:
                return json.load(f)
    except Exception as e:
        print("Error reading scraped_history.json:", e)
    return {}

def save_scraped_history(history_data):
    try:
        file_path = os.path.join(os.path.dirname(__file__), 'scraped_history.json')
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
                            except ValueError:
                                date_str = item.get('date', '').split('T')[0]
                                
                            entry = {
                                "date": date_str,
                                "actual": item.get("actual", ""),
                                "forecast": item.get("forecast", ""),
                                "previous": item.get("previous", "")
                            }
                            
                            if ind_id not in history_data:
                                history_data[ind_id] = []
                            
                            # Prevent duplicates for the same month/year
                            exists = any(e['date'].endswith(str(dt.year)) and e['date'].startswith(month_names_en[dt.month - 1]) for e in history_data[ind_id])
                            
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

                history = history_data.get(str(indicator['id']))
                found_real = False

                if history and isinstance(history, list):
                    for entry in history:
                        if entry['date'].startswith(current_month_en) and entry['date'].endswith(current_year_str):
                            result_row['date'] = entry['date']
                            result_row['actual'] = entry['actual']
                            result_row['forecast'] = entry['forecast']
                            result_row['last'] = entry['previous']
                            found_real = True
                            break

                if not found_real and indicator['dateType'] == 'specific':
                    try:
                        spec_date = datetime(month_year_date.year, month_year_date.month, indicator['day'])
                    except ValueError:
                        if month_year_date.month == 2:
                            spec_date = datetime(month_year_date.year, month_year_date.month, 28)
                        else:
                            spec_date = datetime(month_year_date.year, month_year_date.month, 30)
                            
                    result_row['date'] = spec_date.strftime("%d %b %Y")

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

if __name__ == '__main__':
    print(f"[PWA Backend] Server listening on http://localhost:{PORT}")
    app.run(host='0.0.0.0', port=PORT, debug=True)
