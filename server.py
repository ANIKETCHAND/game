#!/usr/bin/env python3
"""
Echo Duel - Local HTTP Server
Starts a local web server serving the accessible hackathon game prototype.
"""

import http.server
import socketserver
import webbrowser
import sys
import os

# Ensure safe UTF-8 output on Windows
if sys.platform == 'win32':
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except Exception:
        pass

PORT = 8000

class CustomHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        # Enable CORS and caching headers suitable for development
        self.send_header('Cache-Control', 'no-cache, no-store, must-revalidate')
        self.send_header('Pragma', 'no-cache')
        self.send_header('Expires', '0')
        super().end_headers()

def main():
    web_dir = os.path.dirname(os.path.abspath(__file__))
    os.chdir(web_dir)
    
    # Allow address reuse
    socketserver.TCPServer.allow_reuse_address = True
    with socketserver.TCPServer(("", PORT), CustomHandler) as httpd:
        url = f"http://localhost:{PORT}"
        print("=" * 60)
        print("[ECHO DUEL] ACCESSIBLE REACTION SHOWDOWN")
        print(f"Local Server running at: {url}")
        print("Press Ctrl+C to stop the server.")
        print("=" * 60)
        
        # Open default browser automatically if running interactively with --open
        if len(sys.argv) > 1 and sys.argv[1] == '--open':
            webbrowser.open(url)
            
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\nShutting down Echo Duel server.")
            httpd.server_close()

if __name__ == '__main__':
    main()
