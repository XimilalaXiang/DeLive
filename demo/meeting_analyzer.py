#!/usr/bin/env python3
"""
DeLive Meeting Analyzer

Calls DeLive's REST API to retrieve the most recent transcription session
and print a formatted summary. Demonstrates how any script or app can
access DeLive's transcription data programmatically.

Usage:
    python meeting_analyzer.py              # Analyze most recent session
    python meeting_analyzer.py --search "keyword"  # Search and analyze

Requirements:
    pip install requests
"""

import argparse
import json
import os
import sys

try:
    import requests
except ImportError:
    print("Please install requests: pip install requests")
    sys.exit(1)

API_BASE = os.environ.get("DELIVE_API_URL", "http://localhost:23456") + "/api/v1"
API_TOKEN = os.environ.get("DELIVE_API_TOKEN", "")


def api_headers():
    headers = {}
    if API_TOKEN:
        headers["Authorization"] = f"Bearer {API_TOKEN}"
    return headers


def check_health():
    try:
        resp = requests.get(f"{API_BASE}/health", headers=api_headers(), timeout=5)
        resp.raise_for_status()
        data = resp.json()
        print(f"DeLive v{data.get('version', '?')} - API is running")
        return True
    except Exception:
        print("Error: Cannot connect to DeLive API.")
        print(f"Make sure DeLive is running. Expected API at: {API_BASE}")
        return False


def get_sessions(search=None, limit=5):
    params = {"limit": limit}
    if search:
        params["search"] = search
    resp = requests.get(f"{API_BASE}/sessions", params=params, headers=api_headers(), timeout=10)
    resp.raise_for_status()
    return resp.json()


def get_session_detail(session_id):
    resp = requests.get(f"{API_BASE}/sessions/{session_id}", headers=api_headers(), timeout=10)
    resp.raise_for_status()
    return resp.json()


def format_duration(ms):
    if not ms:
        return "N/A"
    seconds = ms // 1000
    minutes = seconds // 60
    seconds = seconds % 60
    if minutes > 0:
        return f"{minutes}m {seconds}s"
    return f"{seconds}s"


def print_session_summary(session):
    print()
    print("=" * 60)
    print(f"  {session['title']}")
    print("=" * 60)
    print(f"  Date: {session['date']} {session['time']}")
    print(f"  Status: {session.get('status', 'completed')}")
    print(f"  Duration: {format_duration(session.get('duration'))}")
    print(f"  Provider: {session.get('providerId', 'N/A')}")
    print()

    transcript = session.get("transcript", "")
    if transcript:
        preview = transcript[:500]
        if len(transcript) > 500:
            preview += "..."
        print("--- Transcript Preview ---")
        print(preview)
        print(f"\n  (Total: {len(transcript)} characters)")
    else:
        print("  (No transcript content)")

    pp = session.get("postProcess")
    if pp:
        print()
        if pp.get("summary"):
            print("--- AI Summary ---")
            print(pp["summary"])

        if pp.get("actionItems"):
            print("\n--- Action Items ---")
            for i, item in enumerate(pp["actionItems"], 1):
                print(f"  {i}. {item}")

        if pp.get("keywords"):
            print(f"\n  Keywords: {', '.join(pp['keywords'])}")

    mm = session.get("mindMap")
    if mm and mm.get("markdown"):
        print("\n--- Mind Map ---")
        preview = mm["markdown"][:300]
        if len(mm["markdown"]) > 300:
            preview += "..."
        print(preview)

    print()


def main():
    parser = argparse.ArgumentParser(description="DeLive Meeting Analyzer")
    parser.add_argument("--search", "-s", help="Search keyword")
    parser.add_argument("--limit", "-n", type=int, default=1, help="Number of sessions")
    parser.add_argument("--list", "-l", action="store_true", help="List sessions only")
    args = parser.parse_args()

    if not check_health():
        sys.exit(1)

    print()
    data = get_sessions(search=args.search, limit=args.limit)
    sessions = data.get("sessions", [])
    total = data.get("total", 0)

    if not sessions:
        print("No sessions found.")
        if args.search:
            print(f"Try a different search term (searched for: '{args.search}')")
        return

    print(f"Found {total} session(s)" + (f" matching '{args.search}'" if args.search else "") + f", showing {len(sessions)}:")
    print()

    if args.list:
        for i, s in enumerate(sessions, 1):
            summary_flag = " [AI Summary]" if s.get("hasSummary") else ""
            print(f"  {i}. {s['title']} ({s['date']} {s['time']}){summary_flag}")
            print(f"     ID: {s['id']} | {s.get('transcriptLength', 0)} chars")
        return

    for s in sessions:
        detail = get_session_detail(s["id"])
        print_session_summary(detail)


if __name__ == "__main__":
    main()
