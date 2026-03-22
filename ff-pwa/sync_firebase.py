import json
import firebase_admin
from firebase_admin import credentials, firestore

cred = credentials.Certificate('firebase_credentials.json')
firebase_admin.initialize_app(cred)
db = firestore.client()

with open('scraped_history.json', 'r') as f:
    data = json.load(f)

db.collection('app_data').document('scraped_history').set(data)
print('Synced to Firestore successfully!')
