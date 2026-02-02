#!/usr/bin/env python3
"""
Logseq CLI HTTP Server

A simple HTTP server that provides REST API access to Logseq CLI commands.
Enables browser extensions and other applications to query Logseq graphs
without requiring the Logseq Desktop app to be running.

Usage:
    python3 logseq_server.py [--port PORT] [--host HOST] [--debug]

Options:
    --port PORT    Port to listen on (default: 8765)
    --host HOST    Host to bind to (default: localhost)
    --debug        Enable debug logging (WARNING: logs all queries)

API Endpoints:
    GET  /health                        - Health check
    GET  /version                       - Get server version
    GET  /list                          - List all graphs
    GET  /show?graph=name               - Show graph info
    GET  /search?q=query[&graph=name]   - Search graphs
    POST /query                         - Execute datalog query
         Body: {"graph": "name", "query": "..."}
    POST /append                        - Append text to current page (requires API token)
         Body: {"content": "text"}

Privacy:
    By default, only health checks and errors are logged.
    Debug mode logs all requests including search queries.
"""

import http.server
import json
import subprocess
import urllib.parse
import argparse
import logging
import os
import shutil
from pathlib import Path

# Version
VERSION = '0.1.0'  # Bumped for Quick Capture support

# Configuration
DEFAULT_PORT = 8765
DEFAULT_HOST = 'localhost'
LOG_FILE = Path(__file__).parent / 'logseq-http-server.log'
LOGSEQ_BIN = os.environ.get('LOGSEQ_BIN', shutil.which('logseq') or '/opt/homebrew/bin/logseq')

# API Token for Logseq HTTP API (used for append command)
# Can be overridden with --api-token flag or LOGSEQ_API_SERVER_TOKEN env var
LOGSEQ_API_TOKEN = os.environ.get('LOGSEQ_API_SERVER_TOKEN', '')


class PrivacyFilter(logging.Filter):
    """Filter that blocks sensitive logging unless debug mode is enabled."""

    def __init__(self, debug_mode=False):
        super().__init__()
        self.debug_mode = debug_mode

    def filter(self, record):
        # Always allow startup, shutdown, errors
        if record.levelno >= logging.ERROR:
            return True

        # If debug mode, allow everything
        if self.debug_mode:
            return True

        # In privacy mode, only allow health checks and system messages
        message = record.getMessage()
        if 'GET /health' in message or 'Server' in message:
            return True

        # Block all other requests
        return False


class LogseqHTTPHandler(http.server.BaseHTTPRequestHandler):
    """HTTP request handler for Logseq CLI commands."""

    def _set_headers(self, status=200, content_type='application/json'):
        """Set response headers including CORS."""
        self.send_response(status)
        self.send_header('Content-Type', content_type)

        # CORS headers - allow all origins for development
        # For production, restrict to specific extension origins
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')

        self.end_headers()

    def _send_json(self, data, status=200):
        """Send JSON response."""
        self._set_headers(status)
        response = json.dumps(data, indent=2).encode('utf-8')
        self.wfile.write(response)

    def _send_error_json(self, message, status=400):
        """Send error response."""
        self._send_json({'success': False, 'error': message}, status)

    def _append_to_journal(self, content, api_token):
        """
        Append content to today's journal using Logseq's native HTTP API.

        This method uses the appendBlockInPage API to directly add content
        to today's journal page, regardless of what page is currently open.

        Args:
            content: Text content to append
            api_token: Logseq HTTP API Server token

        Returns:
            dict: Response with success status and any error message
        """
        import urllib.request
        from datetime import datetime

        # Get today's date in Logseq journal format (YYYY-MM-DD)
        today = datetime.now().strftime('%Y-%m-%d')

        # Build the API request
        api_url = 'http://127.0.0.1:12315/api'
        payload = json.dumps({
            'method': 'logseq.Editor.appendBlockInPage',
            'args': [today, content]
        }).encode('utf-8')

        headers = {
            'Content-Type': 'application/json',
            'Authorization': f'Bearer {api_token}'
        }

        logging.info(f"Appending to journal: {today}")

        try:
            req = urllib.request.Request(api_url, data=payload, headers=headers, method='POST')
            with urllib.request.urlopen(req, timeout=10) as response:
                result = response.read().decode('utf-8')
                if result and result != 'null':
                    return {'success': True, 'data': json.loads(result)}
                else:
                    # null response might mean page doesn't exist, try creating it first
                    return {'success': True}

        except urllib.error.HTTPError as e:
            error_body = e.read().decode('utf-8') if e.fp else str(e)
            logging.error(f"Logseq API error: {e.code} - {error_body}")
            return {'success': False, 'error': f'Logseq API error: {e.code} - {error_body}'}
        except urllib.error.URLError as e:
            logging.error(f"Cannot connect to Logseq: {e}")
            return {'success': False, 'error': 'Cannot connect to Logseq. Make sure Logseq is running with HTTP API Server enabled.'}
        except Exception as e:
            logging.error(f"Unexpected error: {e}")
            return {'success': False, 'error': str(e)}

    def _execute_append_command(self, content, api_token):
        """
        Execute the logseq append command.

        The append command only works with the in-app graph (requires Logseq desktop
        to be running with HTTP API Server enabled).

        Args:
            content: Text content to append to the current page
            api_token: Logseq HTTP API Server token

        Returns:
            dict: Response with success status and any error message
        """
        cmd = [LOGSEQ_BIN, 'append', content, '-a', api_token]

        logging.info("Executing: logseq append <content> -a <token>")  # Don't log sensitive data

        try:
            env = os.environ.copy()
            safe_cwd = os.path.expanduser('~')

            result = subprocess.run(
                cmd,
                capture_output=True,
                text=True,
                timeout=30,
                env=env,
                cwd=safe_cwd
            )

            if result.returncode == 0:
                return {'success': True}
            else:
                error_msg = result.stderr.strip() or result.stdout.strip() or 'Unknown error'
                logging.error(f"Append command failed: {error_msg}")
                return {'success': False, 'error': error_msg}

        except subprocess.TimeoutExpired:
            logging.error("Append command timed out")
            return {'success': False, 'error': 'Command execution timed out after 30 seconds'}
        except FileNotFoundError:
            logging.error("logseq command not found")
            return {
                'success': False,
                'error': 'logseq CLI not found. Install with: npm install -g @logseq/cli'
            }
        except Exception as e:
            logging.error(f"Error executing append command: {e}", exc_info=True)
            return {'success': False, 'error': str(e)}

    def _execute_logseq_command(self, command, args=None):
        """
        Execute a logseq CLI command.

        Args:
            command: Command name (list, show, search, query, etc.)
            args: List of additional arguments
                  NOTE: As of @logseq/cli v4.0, the 'query' command requires -g flag:
                  `logseq query "datalog" -g graph-name`
                  The 'show' command still uses positional arguments:
                  `logseq show graph-name`

        Returns:
            dict: Response with success, stdout, stderr, and optional data
        """
        if args is None:
            args = []

        cmd = [LOGSEQ_BIN, command] + args

        logging.info(f"Executing: {' '.join(cmd)}")

        try:
            env = os.environ.copy()
            safe_cwd = os.path.expanduser('~')

            # For query commands, pipe through jet to convert EDN to JSON
            if command == 'query':
                # Use shell pipe - let the shell handle process management
                shell_cmd = f"{' '.join(cmd)} | jet --to json"
                result = subprocess.run(
                    shell_cmd,
                    shell=True,
                    capture_output=True,
                    text=True,
                    timeout=30,
                    env=env,
                    cwd=safe_cwd
                )
            else:
                result = subprocess.run(
                    cmd,
                    capture_output=True,
                    text=True,
                    timeout=30,
                    env=env,
                    cwd=safe_cwd
                )

            stdout = result.stdout
            stderr = result.stderr
            returncode = result.returncode

            response = {
                'success': returncode == 0,
                'stdout': stdout,
                'stderr': stderr,
                'returncode': returncode
            }

            # Try to parse stdout as JSON if it looks like JSON
            stdout_stripped = stdout.strip()
            if stdout_stripped and (stdout_stripped.startswith('{') or stdout_stripped.startswith('[')):
                try:
                    response['data'] = json.loads(stdout_stripped)
                except json.JSONDecodeError:
                    pass

            return response

        except subprocess.TimeoutExpired:
            logging.error("Command timed out")
            return {
                'success': False,
                'error': 'Command execution timed out after 30 seconds'
            }
        except FileNotFoundError:
            logging.error("logseq command not found")
            return {
                'success': False,
                'error': 'logseq CLI not found. Install with: npm install -g @logseq/cli'
            }
        except Exception as e:
            logging.error(f"Error executing command: {e}", exc_info=True)
            return {
                'success': False,
                'error': str(e)
            }

    def do_OPTIONS(self):
        """Handle OPTIONS requests for CORS preflight."""
        self._set_headers(204)

    def do_GET(self):
        """Handle GET requests."""
        # Parse URL
        parsed = urllib.parse.urlparse(self.path)
        path = parsed.path
        params = urllib.parse.parse_qs(parsed.query)

        logging.info(f"GET {path} - {params}")

        # Route handlers
        if path == '/health':
            self._send_json({'status': 'healthy', 'message': 'Logseq HTTP Server is running'})

        elif path == '/version':
            self._send_json({'version': VERSION})

        elif path == '/list':
            response = self._execute_logseq_command('list')
            self._send_json(response)

        elif path == '/show':
            graph = params.get('graph', [None])[0]
            if not graph:
                self._send_error_json('Missing required parameter: graph')
                return

            response = self._execute_logseq_command('show', [graph])
            self._send_json(response)

        elif path == '/search':
            query = params.get('q', [None])[0]
            if not query:
                self._send_error_json('Missing required parameter: q')
                return

            graph = params.get('graph', [None])[0]

            # Use datalog query instead of search for structured results
            # DB graphs use :block/title for content, not :block/content
            # Build datalog query: find blocks where title contains search term
            if not graph:
                self._send_error_json('Missing required field: graph')
                return

            # Escape double quotes in query for safe inclusion in datalog
            escaped_query_lower = query.replace('"', '\\"').lower()
            escaped_query_orig = query.replace('"', '\\"')

            # Datalog query to search for PAGES (not blocks) by page name OR title
            # Search both name (lowercase) and title (mixed case) for better coverage
            # This provides case-insensitive search by matching either field
            # Returns page info: uuid, name, title, journal-day
            datalog_query = f'[:find (pull ?p [:db/id :block/uuid :block/name :block/title :block/journal-day]) :where [?p :block/name ?name] [?p :block/title ?title] (or [(clojure.string/includes? ?name "{escaped_query_lower}")] [(clojure.string/includes? ?title "{escaped_query_orig}")])]'

            # CLI v4.0 format: logseq query "datalog" -g graph-name
            response = self._execute_logseq_command('query', [datalog_query, '-g', graph])
            self._send_json(response)

        else:
            self._send_error_json(f'Unknown endpoint: {path}', 404)

    def do_POST(self):
        """Handle POST requests."""
        parsed = urllib.parse.urlparse(self.path)
        path = parsed.path

        logging.info(f"POST {path}")

        # Read request body
        content_length = int(self.headers.get('Content-Length', 0))
        body = self.rfile.read(content_length).decode('utf-8')

        try:
            data = json.loads(body) if body else {}
        except json.JSONDecodeError:
            self._send_error_json('Invalid JSON in request body')
            return

        # Route handlers
        if path == '/query':
            graph = data.get('graph')
            query = data.get('query')

            if not graph:
                self._send_error_json('Missing required field: graph')
                return
            if not query:
                self._send_error_json('Missing required field: query')
                return

            # CLI v4.0 format: logseq query "datalog" -g graph-name
            response = self._execute_logseq_command('query', [query, '-g', graph])
            self._send_json(response)

        elif path == '/append-to-journal':
            # Append text to today's journal using Logseq's native HTTP API
            # This works regardless of what page is currently open
            content = data.get('content')

            if not content:
                self._send_error_json('Missing required field: content')
                return

            # Get API token from request body, server config, or environment
            api_token = data.get('token') or LOGSEQ_API_TOKEN
            if not api_token:
                self._send_error_json(
                    'Missing API token. Set LOGSEQ_API_SERVER_TOKEN environment variable, '
                    'use --api-token flag, or include "token" in request body. '
                    'Token can be found in Logseq Settings > Features > HTTP APIs Server.',
                    401
                )
                return

            response = self._append_to_journal(content, api_token)
            if response.get('success'):
                self._send_json({'success': True, 'message': 'Content appended to journal successfully'})
            else:
                self._send_error_json(response.get('error', 'Failed to append content'), 500)

        elif path == '/append':
            # Append text to the current page in Logseq
            # Requires Logseq desktop app to be running with HTTP API Server enabled
            content = data.get('content')

            if not content:
                self._send_error_json('Missing required field: content')
                return

            # Get API token from request body, server config, or environment
            api_token = data.get('token') or LOGSEQ_API_TOKEN
            if not api_token:
                self._send_error_json(
                    'Missing API token. Set LOGSEQ_API_SERVER_TOKEN environment variable, '
                    'use --api-token flag, or include "token" in request body. '
                    'Token can be found in Logseq Settings > Features > HTTP APIs Server.',
                    401
                )
                return

            response = self._execute_append_command(content, api_token)
            if response.get('success'):
                self._send_json({'success': True, 'message': 'Content appended successfully'})
            else:
                self._send_error_json(response.get('error', 'Failed to append content'), 500)

        else:
            self._send_error_json(f'Unknown endpoint: {path}', 404)

    def log_message(self, format, *args):
        """Override to use our logger instead of stderr."""
        logging.info(format % args)


def main():
    """Start the HTTP server."""
    global LOGSEQ_API_TOKEN

    parser = argparse.ArgumentParser(description='Logseq CLI HTTP Server')
    parser.add_argument('--port', type=int, default=DEFAULT_PORT,
                        help=f'Port to listen on (default: {DEFAULT_PORT})')
    parser.add_argument('--host', type=str, default=DEFAULT_HOST,
                        help=f'Host to bind to (default: {DEFAULT_HOST})')
    parser.add_argument('--api-token', type=str, default='',
                        help='Logseq HTTP API Server token (for /append endpoint). '
                             'Can also use LOGSEQ_API_SERVER_TOKEN env var.')
    parser.add_argument('--debug', action='store_true',
                        help='Enable debug logging (logs all queries - privacy warning!)')

    args = parser.parse_args()

    # Set API token from command line if provided
    if args.api_token:
        LOGSEQ_API_TOKEN = args.api_token

    # Display debug warning if enabled
    if args.debug:
        import time
        print("\n" + "="*60)
        print("⚠️  WARNING: DEBUG MODE ENABLED")
        print("="*60)
        print("Full request logging is active. This will log:")
        print("- All search queries")
        print("- Graph names")
        print("- Visited URLs")
        print()
        print("This creates a plain-text history of your activity.")
        print()
        print("Remember to:")
        print("1. Clear logs when done: cat /dev/null > /tmp/logseq-server.log")
        print("2. Disable debug mode after fixing your issue")
        print()
        print("To start without debug: python3 logseq_server.py")
        print("="*60 + "\n")

        # Give user time to see warning
        time.sleep(3)

    # Set up logging with privacy filter
    privacy_filter = PrivacyFilter(debug_mode=args.debug)

    file_handler = logging.FileHandler(LOG_FILE)
    file_handler.addFilter(privacy_filter)

    console_handler = logging.StreamHandler()
    console_handler.addFilter(privacy_filter)

    logging.basicConfig(
        level=logging.INFO,
        format='%(asctime)s - %(levelname)s - %(message)s',
        handlers=[file_handler, console_handler]
    )

    server_address = (args.host, args.port)
    httpd = http.server.HTTPServer(server_address, LogseqHTTPHandler)

    print(f"{'='*60}")
    print(f"Logseq HTTP Server v{VERSION}")
    print(f"{'='*60}")
    print(f"Listening on: http://{args.host}:{args.port}")
    print(f"Log file: {LOG_FILE}")
    if LOGSEQ_API_TOKEN:
        print(f"API Token: configured ✓")
    else:
        print(f"API Token: not configured (needed for /append)")
    print(f"\nEndpoints:")
    print(f"  GET  /health")
    print(f"  GET  /version")
    print(f"  GET  /list")
    print(f"  GET  /show?graph=NAME")
    print(f"  GET  /search?q=QUERY[&graph=NAME]")
    print(f"  POST /query (body: {{\"graph\": \"NAME\", \"query\": \"...\"}})")
    print(f"  POST /append (body: {{\"content\": \"TEXT\"}}) - requires API token")
    print(f"\nPress Ctrl+C to stop")
    print(f"{'='*60}\n")

    if args.debug:
        logging.info(f"Server v{VERSION} started on {args.host}:{args.port} (DEBUG MODE)")
    else:
        logging.info(f"Server v{VERSION} started on {args.host}:{args.port} (Privacy Mode)")

    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\n\nShutting down server...")
        logging.info("Server stopped by user")
        httpd.shutdown()


if __name__ == '__main__':
    main()
