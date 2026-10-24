import asyncio
import json
import logging
import os
import threading
from concurrent.futures import Future
from datetime import datetime, timezone
from pathlib import Path
from typing import Callable

from dnotifier import DNotifier

logger = logging.getLogger(__name__)
BACKEND_DIR = Path(__file__).resolve().parents[1]


def _load_env_file() -> None:
    env_path = BACKEND_DIR / ".env"
    if not env_path.is_file():
        return

    for line in env_path.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#"):
            continue
        if line.startswith("export "):
            line = line[7:].strip()
        if "=" not in line:
            continue

        name, value = line.split("=", 1)
        name = name.strip()
        value = value.strip()
        if len(value) >= 2 and value[0] == value[-1] and value[0] in {"'", '"'}:
            value = value[1:-1]
        if name:
            os.environ.setdefault(name, value)


_load_env_file()

APP_ID = os.getenv("DNOTIFIER_APP_ID")
SECRET = os.getenv("DNOTIFIER_SECRET") or os.getenv("DNOTIFIER_API_KEY")
SENDER_ID = "caretrack-backend"


def _require_credentials() -> tuple[str, str]:
    if not APP_ID or not SECRET:
        raise RuntimeError(
            "DNotifier credentials are missing. Set DNOTIFIER_APP_ID and "
            "DNOTIFIER_SECRET (or DNOTIFIER_API_KEY) in backend/.env. The "
            "installed SDK requires an app ID and a secret/key."
        )
    return APP_ID, SECRET


class _AsyncRuntime:
    def __init__(self) -> None:
        self.loop = asyncio.new_event_loop()
        self.thread = threading.Thread(
            target=self._run,
            name="dnotifier-event-loop",
            daemon=True,
        )
        self.thread.start()

    def _run(self) -> None:
        asyncio.set_event_loop(self.loop)
        self.loop.run_forever()

    def submit(self, coroutine) -> Future:
        return asyncio.run_coroutine_threadsafe(coroutine, self.loop)


_runtime: _AsyncRuntime | None = None
_runtime_lock = threading.Lock()
_clients: list[DNotifier] = []
_clients_lock = threading.Lock()
_sender: DNotifier | None = None
_sender_lock = threading.Lock()


def _get_runtime() -> _AsyncRuntime:
    global _runtime
    with _runtime_lock:
        if _runtime is None:
            _runtime = _AsyncRuntime()
        return _runtime


async def _create_client(
    user_id: str,
    callback: Callable | None = None,
) -> DNotifier:
    app_id, secret = _require_credentials()
    client = DNotifier(
        app_id=app_id,
        secret=secret,
        transport="ws",
        user_id=user_id,
        on_message=callback,
        on_disconnected=lambda **details: logger.warning(
            "DNotifier disconnected for %s: %s", user_id, details
        ),
    )
    await client.connect()
    with _clients_lock:
        _clients.append(client)
    return client


def _get_sender() -> DNotifier:
    global _sender
    with _sender_lock:
        if _sender is None:
            _sender = _get_runtime().submit(_create_client(SENDER_ID)).result()
        return _sender


def _message_data(message) -> dict:
    data = message.payload.to_json()
    if isinstance(data, str):
        data = json.loads(data)
    if not isinstance(data, dict):
        raise ValueError("DNotifier message payload must be a JSON object")
    data = dict(data)
    data["_sender"] = message.metadata.sender
    return data


def _make_receiver_handler(callback: Callable) -> Callable:
    def handle_message(message) -> None:
        try:
            data = _message_data(message)
        except (TypeError, ValueError, json.JSONDecodeError):
            logger.exception("Could not decode incoming DNotifier message")
            return

        async def run_callback() -> None:
            try:
                await asyncio.to_thread(callback, data)
            except Exception:
                logger.exception("DNotifier message handler failed")

        asyncio.create_task(run_callback())

    return handle_message


def send_message(channel: str, payload: dict) -> None:
    message = dict(payload)
    message["timestamp"] = datetime.now(timezone.utc).isoformat()
    client = _get_sender()

    async def send() -> None:
        await client.send(
            sender_id=SENDER_ID,
            receiver_id=channel,
            data=message,
        )

    _get_runtime().submit(send()).result()
    logger.info(
        "Sent DNotifier message to %s for report %s",
        channel,
        message.get("reportId", "Unknown"),
    )


def broadcast_progress(
    report_id: str,
    agent_name: str,
    step: str,
    done: bool = False,
) -> None:
    send_message(
        "progress-listener",
        {
            "reportId": report_id,
            "agent": agent_name,
            "step": step,
            "done": done,
        },
    )


def listen_to_channels(subscriptions: dict[str, Callable]) -> None:
    if not subscriptions:
        raise ValueError("At least one DNotifier receiver must be configured")

    async def start_listeners() -> None:
        await asyncio.gather(
            *(
                _create_client(channel, _make_receiver_handler(callback))
                for channel, callback in subscriptions.items()
            )
        )

    _get_runtime().submit(start_listeners()).result()
    for channel in subscriptions:
        logger.info("Listening for DNotifier messages addressed to %s", channel)

    try:
        threading.Event().wait()
    except KeyboardInterrupt:
        logger.info("Stopping DNotifier listeners")
        raise


def listen_to_channel(channel: str, callback: Callable) -> None:
    listen_to_channels({channel: callback})
