#!/bin/bash
# Detach from controlling terminal and run next dev
exec </dev/null
exec >>/home/z/my-project/.zscripts/dev.out 2>&1
cd /home/z/my-project
trap '' SIGHUP SIGTERM SIGINT
exec node node_modules/.bin/next dev -p 3000
