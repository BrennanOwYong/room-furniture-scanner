"""Cross-process state updates on the Linux compute host.
https://docs.python.org/3/library/fcntl.html#fcntl.flock
"""
import fcntl
import json
import os
import threading
import time


def update(folder, only_if_active=False, **fields):
    path=folder/'state.json'
    with (folder/'.state.lock').open('a') as lock:
        fcntl.flock(lock.fileno(),fcntl.LOCK_EX)
        state=json.loads(path.read_text()) if path.exists() else {}
        if only_if_active and state.get('state') in ('complete','failed'):
            return state
        state.update(fields,updated_at=time.time())
        temp=folder/f'.state-{os.getpid()}-{threading.get_ident()}.tmp'
        temp.write_text(json.dumps(state));temp.replace(path)
        return state
