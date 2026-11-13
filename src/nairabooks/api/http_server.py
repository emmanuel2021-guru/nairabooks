"""Stdlib ThreadingHTTPServer runner exposing LedgerApiApplication."""

from __future__ import annotations

import json
import os
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from typing import cast
from uuid import UUID

from nairabooks.api.app import LedgerApiApplication
from nairabooks.ledger.adapters.in_memory import create_seeded_demo_store

DEFAULT_DEMO_WORKSPACE_ID = UUID("aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaa0001")
DEFAULT_DEMO_ACTOR_ID = UUID("bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbb0001")


def create_http_server(
    host: str = "0.0.0.0",
    port: int = 8000,
    app: LedgerApiApplication | None = None,
) -> ThreadingHTTPServer:
    """Create a configured ThreadingHTTPServer bound to LedgerApiApplication."""
    api_app = app or LedgerApiApplication(
        create_seeded_demo_store(
            workspace_id=DEFAULT_DEMO_WORKSPACE_ID,
            actor_user_id=DEFAULT_DEMO_ACTOR_ID,
        )
    )

    class _Handler(BaseHTTPRequestHandler):
        def do_GET(self) -> None:
            self._dispatch("GET")

        def do_POST(self) -> None:
            self._dispatch("POST")

        def _dispatch(self, method: str) -> None:
            length = int(self.headers.get("Content-Length", "0"))
            raw_body = self.rfile.read(length) if length > 0 else b""
            status_code, response_headers, payload = api_app.handle_request_with_headers(
                method=method,
                path=self.path,
                headers=cast(dict[str, str], dict(self.headers.items())),
                body=raw_body,
            )
            encoded = json.dumps(payload).encode("utf-8")
            self.send_response(status_code)
            self.send_header("Content-Type", "application/json; charset=utf-8")
            self.send_header("Content-Length", str(len(encoded)))
            for header_name, header_val in response_headers:
                self.send_header(header_name, header_val)
            self.end_headers()
            self.wfile.write(encoded)

        def log_message(self, format: str, *args: object) -> None:
            return

    return ThreadingHTTPServer((host, port), _Handler)


if __name__ == "__main__":
    host = os.environ.get("HOST", "0.0.0.0")
    port = int(os.environ.get("PORT", "8000"))
    server = create_http_server(host=host, port=port)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        server.server_close()
