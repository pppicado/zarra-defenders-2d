#!/usr/bin/env python3
"""Custom HTTP server for zarra-defenders-2d that disables caching.

Replaces python3 -m http.server to add Cache-Control: no-store to every
response, so browsers don't serve stale JS/CSS after the user makes
changes. The Cache-Control header is what AGENTS.md needs for the
"force refresh after edits" pattern.

Usage: python3 tools/dev_server.py [port]
Default port: 8000
"""
import sys
from http.server import HTTPServer, SimpleHTTPRequestHandler
from functools import partial


class NoCacheHandler(SimpleHTTPRequestHandler):
    """Same as SimpleHTTPRequestHandler but adds Cache-Control: no-store."""

    def end_headers(self):
        self.send_header("Cache-Control", "no-store, must-revalidate")
        self.send_header("Pragma", "no-cache")
        self.send_header("Expires", "0")
        super().end_headers()


def main():
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8000
    handler = partial(NoCacheHandler, directory=".")
    httpd = HTTPServer(("0.0.0.0", port), handler)
    print(f"zarra-defenders-2d dev server listening on 0.0.0.0:{port} (no-cache headers)")
    sys.stdout.flush()
    httpd.serve_forever()


if __name__ == "__main__":
    main()
