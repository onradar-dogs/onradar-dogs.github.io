#!/usr/bin/env python3
"""
Auto-update 'Explore More' section in all articles.
Scans article metadata, sorts by date (newest first), updates all sidebars.

Usage:
    python3 scripts/update_latest_posts.py
"""
import os
import re
from pathlib import Path
from datetime import datetime

ARTICLES_DIR = Path("/Users/piotrsopyla/onradar-dogs.github.io")
ARTICLE_PATTERN = r"national-.*-day\.html"

def extract_metadata(file_path):
    """Extract title, date, and slug from article metadata."""
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()

    # Extract published date from meta tag
    date_match = re.search(r'<meta property="article:published_time" content="(\d{4}-\d{2}-\d{2})"', content)
    if not date_match:
        # Try alternative date format
        date_match = re.search(r'published[_-]date["\s]*[=:]\s*["\'](\d{4}-\d{2}-\d{2})', content)

    published_date = date_match.group(1) if date_match else "2026-01-01"

    # Extract title from <title> tag
    title_match = re.search(r'<title>(.*?)</title>', content)
    title = title_match.group(1) if title_match else "Unknown"

    # Extract slug from filename
    slug = file_path.stem  # e.g., "national-akita-day"

    return {
        'file': file_path,
        'slug': slug,
        'title': title,
        'date': published_date,
        'date_obj': datetime.strptime(published_date, '%Y-%m-%d')
    }

def get_all_articles():
    """Find all article files and extract metadata."""
    articles = []
    for html_file in ARTICLES_DIR.glob("national-*-day.html"):
        try:
            metadata = extract_metadata(html_file)
            articles.append(metadata)
        except Exception as e:
            print(f"⚠️  Error reading {html_file}: {e}")

    # Sort by date, newest first
    articles.sort(key=lambda x: x['date_obj'], reverse=True)
    return articles

def update_article_explore_more(article_file, articles):
    """Update Explore More section in a single article."""
    with open(article_file, 'r', encoding='utf-8') as f:
        content = f.read()

    # Build new Explore More links (exclude current article)
    explore_links = []
    for article in articles:
        if article['file'] != article_file:
            explore_links.append(f'        <a href="/{article["slug"]}.html">{article["title"]}</a>')

    new_explore_html = '        ' + '\n        '.join(explore_links)

    # Find and replace all <a> tags inside the "Explore More" widget
    # This pattern handles the Explore More section regardless of structure
    pattern = r'(<h3>📖 Explore More</h3>)\s*((?:<a href="[^"]*">[^<]*</a>\s*)*)'

    def replace_func(match):
        h3_tag = match.group(1)
        return f"{h3_tag}\n{new_explore_html}"

    updated_content = re.sub(pattern, replace_func, content, flags=re.DOTALL)

    if updated_content != content:
        with open(article_file, 'w', encoding='utf-8') as f:
            f.write(updated_content)
        return True
    return False

def main():
    print("🔄 Scanning articles...")
    articles = get_all_articles()

    if not articles:
        print("❌ No articles found!")
        return

    print(f"✅ Found {len(articles)} articles")
    print("\nOrder (newest → oldest):")
    for i, art in enumerate(articles, 1):
        print(f"  {i}. {art['title']} ({art['date']})")

    # Update all articles
    print("\n🔄 Updating 'Explore More' in all articles...")
    updated_count = 0
    for article in articles:
        if update_article_explore_more(article['file'], articles):
            updated_count += 1
            print(f"  ✅ {article['slug']}")
        else:
            print(f"  ⚠️  {article['slug']} (no changes)")

    print(f"\n✅ Updated {updated_count}/{len(articles)} articles")
    print("📌 Don't forget to git commit and push!")

if __name__ == "__main__":
    main()
