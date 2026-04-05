#!/usr/bin/env python3
import sys
from pathlib import Path
from datetime import datetime
import requests
from google.auth.transport.requests import Request
from google.oauth2.service_account import Credentials

SITE_DOMAIN = "https://onradar-dogs.github.io"
SITEMAP_URL = f"{SITE_DOMAIN}/sitemap.xml"
SERVICE_ACCOUNT_KEY_PATH = Path("credentials/google-indexing-key.json")

SCOPES = ["https://www.googleapis.com/auth/indexing"]
INDEXING_API_URL = "https://indexing.googleapis.com/v3/urlNotifications:publish"

def get_auth_token():
    credentials = Credentials.from_service_account_file(SERVICE_ACCOUNT_KEY_PATH, scopes=SCOPES)
    credentials.refresh(Request())
    return credentials.token

def parse_sitemap(sitemap_url):
    response = requests.get(sitemap_url, timeout=10)
    import xml.etree.ElementTree as ET
    root = ET.fromstring(response.content)
    ns = {"ns": "http://www.sitemaps.org/schemas/sitemap/0.9"}
    return [loc.text for loc in root.findall(".//ns:loc", ns)]

def submit_url_to_index(url, token):
    headers = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}
    body = {"url": url, "type": "URL_UPDATED"}
    response = requests.post(INDEXING_API_URL, json=body, headers=headers, timeout=10)
    return response.status_code in [200, 204]

print(f"Starting auto-indexing for {SITE_DOMAIN}")
token = get_auth_token()
urls = parse_sitemap(SITEMAP_URL)
print(f"Found {len(urls)} URLs")
successful = sum(1 for url in urls if submit_url_to_index(url, token))
print(f"Indexed {successful}/{len(urls)} URLs")
