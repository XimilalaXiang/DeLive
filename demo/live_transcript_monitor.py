#!/usr/bin/env python3
"""
DeLive Live Transcript Monitor

Connects to DeLive's WebSocket endpoint and prints real-time captions
as they are spoken. Demonstrates DeLive's open ecosystem — any app
can receive live transcription data.

Usage:
    python live_transcript_monitor.py

Requirements:
    pip install websockets
"""

import asyncio
import json
import os
import sys
from datetime import datetime
try:
    import websockets
except ImportError:
    print("Please install websockets: pip install websockets")
    sys.exit(1)

_BASE = os.environ.get("DELIVE_API_URL", "http://localhost:23456").replace("http://", "ws://").replace("https://", "wss://")
_TOKEN = os.environ.get("DELIVE_API_TOKEN", "")
DELIVE_WS_URL = f"{_BASE}/ws/live" + (f"?token={_TOKEN}" if _TOKEN else "")

COLORS = {
    "reset": "\033[0m",
    "green": "\033[92m",
    "yellow": "\033[93m",
    "cyan": "\033[96m",
    "dim": "\033[2m",
    "bold": "\033[1m",
}


def color(text, name):
    return f"{COLORS.get(name, '')}{text}{COLORS['reset']}"


async def monitor():
    print(color("=" * 60, "cyan"))
    print(color("  DeLive Live Transcript Monitor", "bold"))
    print(color("=" * 60, "cyan"))
    print(f"  Connecting to {DELIVE_WS_URL} ...")
    print()

    try:
        async with websockets.connect(DELIVE_WS_URL) as ws:
            print(color("  Connected! Waiting for transcript data...", "green"))
            print(color("  Press Ctrl+C to stop.", "dim"))
            print()

            async for message in ws:
                try:
                    data = json.loads(message)
                except json.JSONDecodeError:
                    continue

                msg_type = data.get("type", "")
                ts = datetime.fromtimestamp(data.get("timestamp", 0) / 1000).strftime("%H:%M:%S")

                if msg_type == "transcript":
                    stable = data.get("stableText", "")
                    active = data.get("activeText", "")
                    is_final = data.get("isFinal", False)

                    if stable or active:
                        prefix = color(f"[{ts}]", "dim")
                        if is_final:
                            print(f"{prefix} {color(stable, 'green')}")
                        else:
                            text = stable + color(active, "yellow") if active else stable
                            print(f"\r{prefix} {text}", end="", flush=True)

                    translated_stable = data.get("translatedStableText", "")
                    if translated_stable:
                        print(f"\n         {color(translated_stable, 'cyan')}")

                elif msg_type == "session-start":
                    sid = data.get("sessionId", "?")
                    print(f"\n{color(f'[{ts}] Session started: {sid}', 'green')}\n")

                elif msg_type == "session-end":
                    sid = data.get("sessionId", "?")
                    print(f"\n{color(f'[{ts}] Session ended: {sid}', 'yellow')}\n")

    except ConnectionRefusedError:
        print(color("\n  Error: Cannot connect to DeLive.", "yellow"))
        print("  Make sure DeLive is running on your desktop.")
        print(f"  Expected WebSocket at: {DELIVE_WS_URL}")
        sys.exit(1)
    except KeyboardInterrupt:
        print(color("\n\n  Monitor stopped.", "dim"))


if __name__ == "__main__":
    asyncio.run(monitor())
