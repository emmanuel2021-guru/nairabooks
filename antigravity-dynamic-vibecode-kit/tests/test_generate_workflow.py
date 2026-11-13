"""Comprehensive end-to-end tests for Antigravity Dynamic Vibecode Kit."""

from __future__ import annotations

import json
import sys
import tempfile
import unittest
from pathlib import Path

KIT_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(KIT_ROOT / "scripts"))

import generate_workflow as gw  # noqa: E402
import verify_workflow as vw  # noqa: E402


MASTER_SKILLS_DIR = KIT_ROOT / "skills"


def compute_preset_selection(preset_name: str, catalog: dict, html_questions_blocks: list[dict] | None = None) -> dict:
    """Compute exact selectedSkills and blocks matching wizard traversal for a preset."""
    # Extract Q&A routing directly from wizard HTML so tests mirror browser traversal 100%
    wizard_html = (KIT_ROOT / "wizard" / "skills_decision_wizard.html").read_text(encoding="utf-8")
    import re
    m = re.search(r"const QUESTIONS = (\[.*?\n    \]);", wizard_html, re.S)
    assert m, "Could not locate QUESTIONS in wizard HTML"
    # Use node subprocess cleanly only if needed, or parse presets via catalog; here let's run tiny node JSON dump
    import subprocess
    js = f"""
    const fs = require('fs');
    const vm = require('vm');
    const html = fs.readFileSync({json.dumps(str(KIT_ROOT / 'wizard' / 'skills_decision_wizard.html'))}, 'utf8');
    const m = html.match(/const BLOCKS = (\\{{[\\s\\S]*?\\n    \\}});[\\s\\S]*?const REDUNDANT_DUPLICATES = new Set\\((\\[[\\s\\S]*?\\])\\);[\\s\\S]*?const QUESTIONS = (\\[[\\s\\S]*?\\n    \\]);[\\s\\S]*?const PRESETS = (\\{{[\\s\\S]*?\\n    \\}});/);
    const ctx = vm.createContext({{}});
    vm.runInContext('var BLOCKS=' + m[1] + ';var DUPES=new Set(' + m[2] + ');var QUESTIONS=' + m[3] + ';var PRESETS=' + m[4] + ';', ctx);
    const qMap = Object.fromEntries(ctx.QUESTIONS.map(q => [q.id, q]));
    const p = ctx.PRESETS[{json.dumps(preset_name)}];
    let ptr = 'Q0', seen = new Set(), groups = [], answers = [];
    const seenSk = new Set();
    while (ptr !== 'DONE') {{
      if (seen.has(ptr)) throw new Error('cycle');
      seen.add(ptr);
      const q = qMap[ptr];
      const opt = q.options[p[ptr]];
      answers.push({{ qId: ptr, stage: q.stage, question: q.question, chosenLabel: opt.label }});
      for (const bid of opt.blocks) {{
        const kept = ctx.BLOCKS[bid].skills.filter(s => !ctx.DUPES.has(s) && !seenSk.has(s));
        kept.forEach(s => seenSk.add(s));
        if (kept.length) groups.push({{ blockId: bid, label: ctx.BLOCKS[bid].label, skills: kept }});
      }}
      ptr = opt.next;
    }}
    console.log(JSON.stringify({{ mode: 'wizard_path', dedupApplied: true, selectedSkills: [...seenSk], blocks: groups, answers }}));
    """
    proc = subprocess.run(["node", "-e", js], capture_output=True, text=True, check=True)
    return json.loads(proc.stdout)


class DynamicVibecodeKitTests(unittest.TestCase):
    """Verify wizard compilation, 100% skill coverage, context/doc gates, and error guards."""

    @classmethod
    def setUpClass(cls) -> None:
        cls.catalog = gw.load_catalog(KIT_ROOT / "catalog" / "workflow_catalog.json")

    def test_presets_compile_and_verify_with_tailored_phases(self) -> None:
        for preset in ("billSplit", "saas", "script"):
            payload = compute_preset_selection(preset, self.catalog)
            with tempfile.TemporaryDirectory() as tmp:
                tmp_path = Path(tmp)
                wfile = tmp_path / "input-wizard.json"
                out_dir = tmp_path / f"app-{preset}"
                wfile.write_text(json.dumps(payload), encoding="utf-8")

                summary = gw.generate_project_workflow(wfile, out_dir, project_name=f"App-{preset}")
                self.assertEqual(summary["totalSkills"], len(payload["selectedSkills"]))
                self.assertLessEqual(summary["agentsBytes"], 24000)

                ok, msgs = vw.verify_project(out_dir, require_complete=False)
                self.assertTrue(ok, f"{preset} verification failed: {msgs}")

                plan_md = (out_dir / "docs" / "WORKFLOW_PLAN.md").read_text(encoding="utf-8")
                if preset == "script":
                    # UI stage should be dynamically omitted for pure CLI Python script
                    self.assertNotIn("Phase 5: Visual Design System", plan_md)
                    self.assertIn("Phase 6: Core Build Loop", plan_md)
                else:
                    self.assertIn("Phase 5: Visual Design System", plan_md)

    def test_all_307_skills_stress_test_fits_under_agents_byte_cap(self) -> None:
        all_skills = gw.dedup_ordered(
            sk
            for blk in self.catalog["blocks"].values()
            for sk in blk["skills"]
        )
        self.assertEqual(len(all_skills), 307)

        with tempfile.TemporaryDirectory() as tmp:
            tmp_path = Path(tmp)
            wfile = tmp_path / "all307.json"
            out_dir = tmp_path / "enterprise-all"
            wfile.write_text(json.dumps({"mode": "all_skills", "selectedSkills": all_skills}), encoding="utf-8")

            summary = gw.generate_project_workflow(wfile, out_dir)
            self.assertEqual(summary["totalSkills"], 307)
            self.assertLessEqual(summary["agentsBytes"], 24000)

            ok, msgs = vw.verify_project(out_dir, require_complete=False)
            self.assertTrue(ok, f"All-307 verification failed: {msgs}")

    def test_bundled_skills_directory_has_all_307_skills(self) -> None:
        self.assertTrue(MASTER_SKILLS_DIR.is_dir())
        dirs = [d for d in MASTER_SKILLS_DIR.iterdir() if d.is_dir()]
        self.assertEqual(len(dirs), 307)

    def test_text_list_and_custom_skills_are_never_dropped(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            tmp_path = Path(tmp)
            txt = tmp_path / "skills.txt"
            txt.write_text("conductor-setup\npython-pro\ncustom-proprietary-ocr-skill\n", encoding="utf-8")
            out_dir = tmp_path / "custom-app"

            summary = gw.generate_project_workflow(txt, out_dir, mode="link")
            self.assertEqual(summary["totalSkills"], 3)

            ok, msgs = vw.verify_project(out_dir, require_complete=False)
            self.assertTrue(ok, f"Custom skill verification failed: {msgs}")
            plan_md = (out_dir / "docs" / "WORKFLOW_PLAN.md").read_text(encoding="utf-8")
            self.assertIn("`custom-proprietary-ocr-skill`", plan_md)

    def test_preserve_docs_keeps_prd_and_completed_checkmarks_while_adding_new_skill(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            tmp_path = Path(tmp)
            w1 = tmp_path / "w1.json"
            w1.write_text(json.dumps({"selectedSkills": ["conductor-setup", "python-pro"]}), encoding="utf-8")
            out_dir = tmp_path / "evolving-app"
            gw.generate_project_workflow(w1, out_dir)

            # Simulate real progress in docs/PRD.md and docs/SKILL_COVERAGE.md
            prd_file = out_dir / "docs" / "PRD.md"
            prd_file.write_text("# My Real Live PRD\nCustom user notes kept.\n", encoding="utf-8")
            cov_file = out_dir / "docs" / "SKILL_COVERAGE.md"
            cov_text = cov_file.read_text(encoding="utf-8").replace(
                "| 1 | `conductor-setup` | phase-2-foundation | Conductor Project Init | [ ] Pending | _Pending execution_ |",
                "| 1 | `conductor-setup` | phase-2-foundation | Conductor Project Init | [x] Executed | conductor/product.md |",
            )
            cov_file.write_text(cov_text, encoding="utf-8")

            w2 = tmp_path / "w2.json"
            w2.write_text(json.dumps({"selectedSkills": ["conductor-setup", "python-pro", "stripe-integration"]}), encoding="utf-8")
            gw.generate_project_workflow(w2, out_dir, preserve_docs=True)

            self.assertIn("Custom user notes kept.", prd_file.read_text(encoding="utf-8"))
            new_cov = cov_file.read_text(encoding="utf-8")
            self.assertIn("[x] Executed | conductor/product.md", new_cov)
            self.assertIn("`stripe-integration`", new_cov)
            ok, msgs = vw.verify_project(out_dir)
            self.assertTrue(ok, msgs)

    def test_copy_mode_and_require_complete_verification(self) -> None:
        if not MASTER_SKILLS_DIR.is_dir():
            self.skipTest("Master skills catalog not present on disk")

        with tempfile.TemporaryDirectory() as tmp:
            tmp_path = Path(tmp)
            wfile = tmp_path / "w.json"
            wfile.write_text(json.dumps({"selectedSkills": ["conductor-setup", "python-pro"]}), encoding="utf-8")
            out_dir = tmp_path / "portable-app"

            gw.generate_project_workflow(wfile, out_dir, mode="copy", skills_dir=str(MASTER_SKILLS_DIR))
            self.assertFalse((out_dir / ".agents" / "skills.json").exists())
            self.assertTrue((out_dir / ".agents" / "skills" / "python-pro" / "SKILL.md").is_file())
            self.assertTrue((out_dir / ".agents" / "skills" / "conductor-setup" / "SKILL.md").is_file())

            # Before execution: structural check passes, require_complete fails
            ok_struct, _ = vw.verify_project(out_dir, require_complete=False)
            ok_done, msgs_done = vw.verify_project(out_dir, require_complete=True)
            self.assertTrue(ok_struct)
            self.assertFalse(ok_done)
            self.assertTrue(any("still not marked [x]" in m for m in msgs_done))

            # Mark all skills executed -> require_complete must pass
            cov_file = out_dir / "docs" / "SKILL_COVERAGE.md"
            cov_file.write_text(cov_file.read_text(encoding="utf-8").replace("[ ] Pending", "[x] Executed"), encoding="utf-8")
            ok_after, msgs_after = vw.verify_project(out_dir, require_complete=True)
            self.assertTrue(ok_after, msgs_after)

            # Negative check: drop a skill from coverage -> verification must catch it
            cov_file.write_text(cov_file.read_text(encoding="utf-8").replace("`python-pro`", "`wrong-name`"), encoding="utf-8")
            ok_broken, msgs_broken = vw.verify_project(out_dir, require_complete=False)
            self.assertFalse(ok_broken)
            self.assertTrue(any("python-pro" in m for m in msgs_broken))

    def test_empty_input_raises_error(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            tmp_path = Path(tmp)
            empty = tmp_path / "empty.json"
            empty.write_text("{}", encoding="utf-8")
            with self.assertRaises(ValueError):
                gw.generate_project_workflow(empty, tmp_path / "out")

    def test_utf8_bom_json_handled_cleanly(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            tmp_path = Path(tmp)
            bom_json = tmp_path / "bom-wizard.json"
            payload = {"mode": "wizard_path", "selectedSkills": ["conductor-setup", "python-pro", "python-testing-patterns"]}
            bom_json.write_bytes(b"\xef\xbb\xbf" + json.dumps(payload, indent=2).encode("utf-8"))
            out_dir = tmp_path / "bom-app"

            summary = gw.generate_project_workflow(bom_json, out_dir)
            self.assertEqual(summary["totalSkills"], 3)
            self.assertEqual(summary["activePhases"], 3)
            ok, msgs = vw.verify_project(out_dir)
            self.assertTrue(ok, msgs)


if __name__ == "__main__":
    unittest.main(verbosity=2)
