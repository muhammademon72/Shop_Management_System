#!/bin/bash
# Replace Royal Blue gradient header → Emerald gradient on all module files.
set -euo pipefail

for f in /home/z/my-project/src/components/modules/*.tsx; do
  python3 - "$f" << 'PYEOF'
import sys, re
path = sys.argv[1]
with open(path, 'r') as fp:
    content = fp.read()
old = "bg-gradient-to-r from-blue-700 via-blue-800 to-indigo-900 hover:from-blue-700 hover:via-blue-800 hover:to-indigo-900"
new = "bg-gradient-to-r from-emerald-500 via-emerald-600 to-teal-700 hover:from-emerald-500 hover:via-emerald-600 hover:to-teal-700"
if old in content:
    content = content.replace(old, new)
    with open(path, 'w') as fp:
        fp.write(content)
    print(f"Updated Tailwind gradient: {path}")
PYEOF
done

# Purchases.tsx uses inline style with hex colors
PURCHASES=/home/z/my-project/src/components/modules/purchases.tsx
python3 - "$PURCHASES" << 'PYEOF'
import sys
path = sys.argv[1]
with open(path) as f:
    content = f.read()
old = "linear-gradient(to right, #1d4ed8, #1e40af 50%, #312e81)"
new = "linear-gradient(to right, #10B981, #059669 50%, #0F766E)"
if old in content:
    content = content.replace(old, new)
    with open(path, 'w') as f:
        f.write(content)
    print(f"Updated inline gradient: {path}")
PYEOF

echo "Done."

