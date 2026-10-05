#!/usr/bin/env python3
"""Properly daemonize the Next.js dev server using double-fork."""
import os
import sys
import subprocess
import time

DEV_OUT = "/home/z/my-project/.zscripts/dev.out"
WORK_DIR = "/home/z/my-project"

# First fork
pid = os.fork()
if pid > 0:
    # Parent: write PID and exit
    with open("/home/z/my-project/.zscripts/dev.pid", "w") as f:
        f.write(str(pid))
    print(f"Daemon spawned, initial PID: {pid}")
    sys.exit(0)

# Decouple from parent environment
os.setsid()
os.umask(0)

# Second fork (true daemon)
pid = os.fork()
if pid > 0:
    os._exit(0)

# Now we're a daemon: redirect stdio
sys.stdout.flush()
sys.stderr.flush()
with open("/dev/null", "rb") as f:
    os.dup2(f.fileno(), 0)
with open(DEV_OUT, "ab") as f:
    os.dup2(f.fileno(), 1)
    os.dup2(f.fileno(), 2)

# Write actual daemon PID
with open("/home/z/my-project/.zscripts/dev.pid", "w") as f:
    f.write(str(os.getpid()))

os.chdir(WORK_DIR)

# Reset signal handlers to defaults
import signal
for s in (signal.SIGHUP, signal.SIGTERM, signal.SIGINT, signal.SIGCHLD):
    signal.signal(s, signal.SIG_DFL)

# Exec next dev (replaces this process)
os.execv("/usr/bin/node",
         ["/usr/bin/node", "node_modules/.bin/next", "dev", "-p", "3000"])
