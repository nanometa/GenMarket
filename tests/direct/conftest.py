import os

import pytest


@pytest.fixture(autouse=True)
def _windows_genlayer_tempfile_compat(monkeypatch):
    """Work around genlayer-test 0.29.2 unlinking its live fd on Windows."""
    if os.name != "nt":
        yield
        return

    original_unlink = os.unlink
    deferred = []

    def unlink_when_closed(path, *args, **kwargs):
        try:
            return original_unlink(path, *args, **kwargs)
        except PermissionError:
            deferred.append(path)
            return None

    monkeypatch.setattr(os, "unlink", unlink_when_closed)
    yield
    monkeypatch.setattr(os, "unlink", original_unlink)
    for path in deferred:
        try:
            original_unlink(path)
        except (FileNotFoundError, PermissionError):
            pass
