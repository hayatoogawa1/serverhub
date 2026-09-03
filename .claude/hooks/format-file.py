#!/usr/bin/env python3
"""PostToolUse フック: 編集された Frontend のファイルを Prettier で整形する。

- 対象は frontend/ 配下の .ts/.tsx/.js/.jsx/.json/.css/.html のみ。
- Prettier が使えない場合や対象外の場合は何もせず正常終了する（編集をブロックしない）。
- Backend(Java) の整形は重いのでフックでは行わない（`make be-format` / CI で担保）。
"""

import json
import subprocess
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[2]
FRONTEND = REPO_ROOT / "frontend"
EXTENSIONS = {".ts", ".tsx", ".js", ".jsx", ".json", ".css", ".html"}


def main() -> int:
    try:
        payload = json.load(sys.stdin)
    except (json.JSONDecodeError, ValueError):
        return 0

    raw_path = (payload.get("tool_input") or {}).get("file_path")
    if not raw_path:
        return 0

    path = Path(raw_path)
    if not path.is_absolute():
        path = (REPO_ROOT / path).resolve()

    try:
        rel = path.relative_to(FRONTEND)
    except ValueError:
        return 0

    if path.suffix not in EXTENSIONS:
        return 0
    if any(part in {"node_modules", "dist", "coverage"} for part in rel.parts):
        return 0
    if not path.exists():
        return 0
    if not (FRONTEND / "node_modules" / ".bin" / "prettier").exists():
        return 0

    subprocess.run(
        ["node_modules/.bin/prettier", "--write", "--log-level", "warn", str(rel)],
        cwd=FRONTEND,
        check=False,
    )
    return 0


if __name__ == "__main__":
    sys.exit(main())
