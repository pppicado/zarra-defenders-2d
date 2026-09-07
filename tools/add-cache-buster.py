"""
add-cache-buster.py

Adds ?v=9 to all relative ES module imports under src/.

This is needed to defeat the browser cache when source changes. Adding the
query string to ALL imports (not just main.js) ensures every module is the
same singleton — otherwise different imports of the same file end up as
different module records, and `instanceof` checks fail (which broke F3 when
only main.js had ?v=9).

Pattern matched:
  import X from './foo.js'
  import X from '../bar.js'
  export ... from './baz.js'

After:
  import X from './foo.js?v=9'
  import X from '../bar.js?v=9'
  export ... from './baz.js?v=9'

Absolute imports (e.g. CDN URLs) are skipped.
"""
import re
import sys
from pathlib import Path

QUERY = '?v=9'

# Match `from '...'` and `from "..."`. Captures the path part.
PATTERN = re.compile(r"""((?:import|export)\b[^'"]*?\bfrom\s+)(['"])(\.{1,2}/[^'"]+)\2""")

def process_file(path: Path) -> bool:
    text = path.read_text(encoding='utf-8')
    new_text = PATTERN.sub(lambda m: f"{m.group(1)}{m.group(2)}{m.group(3)}{QUERY}{m.group(2)}", text)
    if new_text != text:
        path.write_text(new_text, encoding='utf-8')
        return True
    return False

def main(root: str) -> None:
    root_path = Path(root)
    changed = []
    for js_file in sorted(list(root_path.rglob('*.js')) + list(root_path.rglob('*.mjs'))):
        if process_file(js_file):
            changed.append(js_file)
    print(f'Files changed: {len(changed)}')
    for f in changed:
        print(f'  {f}')

if __name__ == '__main__':
    main(sys.argv[1] if len(sys.argv) > 1 else 'src')
