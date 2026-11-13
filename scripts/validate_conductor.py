"""Conductor workspace & track integrity validator (`conductor-validator` / `conductor-manage`)."""

from __future__ import annotations

import argparse
import json
import re
import sys
from pathlib import Path

REQUIRED_CONDUCTOR_FILES = (
    "index.md",
    "product.md",
    "product-guidelines.md",
    "tech-stack.md",
    "workflow.md",
    "tracks.md",
    "setup_state.json",
    "code_styleguides/python.md",
    "code_styleguides/typescript.md",
)

TRACK_ID_RE = re.compile(r"^[a-z0-9-]+_\d{8}$")
TRACK_ROW_RE = re.compile(
    r"^\|\s*\[(?P<marker>[ x~])\]\s*\|\s*`(?P<track_id>[^`]+)`\s*\|"
    r"\s*(?P<title>[^|]+?)\s*\|\s*(?P<kind>[^|]+?)\s*\|",
    re.MULTILINE,
)
PHASE_HEADER_RE = re.compile(r"^##\s+Phase\s+\d+\s*:", re.MULTILINE)
TASK_LINE_RE = re.compile(r"^- \[(?P<marker>[ x~])\]\s+Task\s+\d+\.\d+:", re.MULTILINE)

MARKER_TO_STATUS = {
    " ": "pending",
    "~": "in_progress",
    "x": "completed",
}


def validate_conductor(project_root: Path, show_list: bool = False) -> int:
    """Validate Conductor core docs, tracks registry, track IDs, and metadata parity."""
    conductor_dir = project_root / "conductor"
    errors: list[str] = []

    if not conductor_dir.is_dir():
        print(f"ERROR: Missing conductor directory at {conductor_dir}", file=sys.stderr)
        return 1

    for rel_path in REQUIRED_CONDUCTOR_FILES:
        file_path = conductor_dir / rel_path
        if not file_path.is_file() or file_path.stat().st_size == 0:
            errors.append(f"Missing or empty conductor file: conductor/{rel_path}")

    setup_state_path = conductor_dir / "setup_state.json"
    if setup_state_path.is_file():
        try:
            setup_state = json.loads(setup_state_path.read_text(encoding="utf-8"))
            if setup_state.get("status") != "complete":
                errors.append("conductor/setup_state.json status is not 'complete'")
        except json.JSONDecodeError as exc:
            errors.append(f"Invalid JSON in conductor/setup_state.json: {exc}")

    tracks_md_path = conductor_dir / "tracks.md"
    tracks_dir = conductor_dir / "tracks"
    registered_tracks: dict[str, dict[str, str]] = {}

    if tracks_md_path.is_file():
        tracks_md_text = tracks_md_path.read_text(encoding="utf-8")
        for match in TRACK_ROW_RE.finditer(tracks_md_text):
            track_id = match.group("track_id").strip()
            registered_tracks[track_id] = {
                "marker": match.group("marker"),
                "title": match.group("title").strip(),
                "type": match.group("kind").strip(),
            }
        if not registered_tracks:
            errors.append("conductor/tracks.md contains no valid track rows")

    disk_track_dirs = (
        {
            p.name: p
            for p in tracks_dir.iterdir()
            if p.is_dir() and not p.name.startswith("_")
        }
        if tracks_dir.is_dir()
        else {}
    )

    if set(registered_tracks.keys()) != set(disk_track_dirs.keys()):
        missing_on_disk = sorted(set(registered_tracks.keys()) - set(disk_track_dirs.keys()))
        unregistered_on_disk = sorted(set(disk_track_dirs.keys()) - set(registered_tracks.keys()))
        if missing_on_disk:
            errors.append(f"Tracks in tracks.md missing on disk: {missing_on_disk}")
        if unregistered_on_disk:
            errors.append(f"Track directories unregistered in tracks.md: {unregistered_on_disk}")

    summary_rows: list[str] = []
    for track_id, track_path in sorted(disk_track_dirs.items()):
        if not TRACK_ID_RE.match(track_id):
            errors.append(
                f"Invalid track ID '{track_id}' (expected {{shortname}}_{{YYYYMMDD}})"
            )

        for req_name in ("spec.md", "plan.md", "metadata.json", "index.md"):
            req_file = track_path / req_name
            if not req_file.is_file() or req_file.stat().st_size == 0:
                errors.append(f"Track '{track_id}' missing or empty {req_name}")

        meta_path = track_path / "metadata.json"
        plan_path = track_path / "plan.md"
        if meta_path.is_file() and plan_path.is_file():
            try:
                meta = json.loads(meta_path.read_text(encoding="utf-8"))
            except json.JSONDecodeError as exc:
                errors.append(f"Invalid metadata.json in '{track_id}': {exc}")
                continue

            if meta.get("id") != track_id:
                errors.append(f"Track '{track_id}' metadata id mismatch: {meta.get('id')}")

            expected_status = MARKER_TO_STATUS.get(
                registered_tracks.get(track_id, {}).get("marker", " ")
            )
            if meta.get("status") != expected_status:
                errors.append(
                    f"Track '{track_id}' status '{meta.get('status')}' "
                    f"!= tracks.md '{expected_status}'"
                )

            plan_text = plan_path.read_text(encoding="utf-8")
            phase_count = len(PHASE_HEADER_RE.findall(plan_text))
            task_matches = list(TASK_LINE_RE.finditer(plan_text))
            task_total = len(task_matches)
            task_done = sum(1 for m in task_matches if m.group("marker") == "x")

            meta_phases_total = meta.get("phases", {}).get("total")
            meta_tasks_total = meta.get("tasks", {}).get("total")
            meta_tasks_done = meta.get("tasks", {}).get("completed")

            if meta_phases_total != phase_count:
                errors.append(
                    f"Track '{track_id}' phases.total={meta_phases_total} "
                    f"!= plan phases={phase_count}"
                )
            if meta_tasks_total != task_total:
                errors.append(
                    f"Track '{track_id}' tasks.total={meta_tasks_total} != plan tasks={task_total}"
                )
            if meta_tasks_done != task_done:
                errors.append(
                    f"Track '{track_id}' tasks.completed={meta_tasks_done} "
                    f"!= plan completed={task_done}"
                )

            summary_rows.append(
                f"  - [{registered_tracks.get(track_id, {}).get('marker', ' ')}] "
                f"{track_id}: {meta.get('title')} "
                f"({task_done}/{task_total} tasks, {phase_count} phases)"
            )

    if errors:
        print("Conductor validation FAILED:", file=sys.stderr)
        for err in errors:
            print(f"  - {err}", file=sys.stderr)
        return 1

    print(
        f"Conductor validation PASSED: {len(disk_track_dirs)} active tracks synchronized."
    )
    if show_list:
        print("\nActive Tracks Summary:")
        for row in summary_rows:
            print(row)
    return 0


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Validate Conductor project context and track specifications."
    )
    parser.add_argument(
        "--project",
        type=Path,
        default=Path("."),
        help="Path to project root containing conductor/",
    )
    parser.add_argument(
        "--list",
        action="store_true",
        help="Print summary of active Conductor tracks and task counts.",
    )
    args = parser.parse_args()
    return validate_conductor(args.project.resolve(), show_list=args.list)


if __name__ == "__main__":
    raise SystemExit(main())
