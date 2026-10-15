"""Nonpublishing NFS job-gate regression (stdlib only; no secrets/network/jobs).
Run: python3 -m unittest scripts/tests/test_nfs_release_workflow.py -v.
Reads the workflow's actual single-line job needs/if fields and evaluates only
its boolean-expression subset. Models GitHub's transitive default-success rule;
not a hosted Actions runner, shell/signing test, or release qualification.
Contracts: https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax#jobsjob_idneeds
https://docs.github.com/en/actions/reference/workflows-and-actions/expressions#status-check-functions
"""
import ast
import re
import unittest
from pathlib import Path

WORKFLOW = Path(__file__).resolve().parents[2] / '.github/workflows/release-nfs.yml'
ORDER = ['prepare', 'engine-packages', 'engine-inputs', 'engine', 'binaries', 'publish']


def job_gates(text):
    # Deliberately narrow fixture reader, not a general YAML parser. New shapes
    # fail explicitly; workflow grammar is separately checked with actionlint.
    blocks = re.findall(r'^  ([a-z-]+):\n(.*?)(?=^  [a-z-]+:|\Z)',
                        text.split('\njobs:\n', 1)[1], re.M | re.S)
    assert [name for name, _ in blocks] == ORDER
    jobs = {}
    for name, body in blocks:
        needs = re.findall(r'^    needs: (.+)$', body, re.M)
        condition = re.findall(r'^    if: (.+)$', body, re.M)
        assert len(needs) <= 1 and len(condition) <= 1
        deps = needs[0].strip('[]').split(', ') if needs else []
        assert all(dep in jobs for dep in deps), (name, deps)
        expr = condition[0] if condition else 'success()'
        if expr.startswith('${{ '):
            assert expr.endswith(' }}')
            expr = expr[4:-3]
        jobs[name] = {'needs': deps, 'if': expr}
    return jobs


def boolean(node):
    if isinstance(node, ast.Constant):
        assert isinstance(node.value, (str, bool))
        return node.value
    if isinstance(node, ast.UnaryOp) and isinstance(node.op, ast.Not):
        return not boolean(node.operand)
    if isinstance(node, ast.BoolOp):
        values = [boolean(n) for n in node.values]
        if isinstance(node.op, ast.And):
            return all(values)
        if isinstance(node.op, ast.Or):
            return any(values)
    if isinstance(node, ast.Compare) and len(node.ops) == 1:
        left, right = boolean(node.left), boolean(node.comparators[0])
        if isinstance(node.ops[0], ast.Eq):
            return left == right
        if isinstance(node.ops[0], ast.NotEq):
            return left != right
    raise AssertionError(f'Unsupported gate expression: {ast.dump(node)}')


def eligible(jobs, name, results, publish, cancelled=False):
    deps = set(jobs[name]['needs'])
    pending = list(deps)
    while pending:
        for dep in jobs[pending.pop()]['needs']:
            if dep not in deps:
                deps.add(dep)
                pending.append(dep)
    success = not cancelled and all(results[d] == 'success' for d in deps)
    expr = jobs[name]['if']
    if not re.search(r'\b(always|success|failure|cancelled)\(\)', expr):
        if not success:  # Ordinary booleans still inherit implicit success().
            return False
    expr = expr.replace('needs.prepare.outputs.publish', repr(str(publish).lower()))
    def result(match):
        assert match[1] in jobs[name]['needs'], match[1]
        return repr(results[match[1]])
    expr = re.sub(r'needs\.([a-z-]+)\.result', result, expr)
    for fn, value in [('always', True), ('cancelled', cancelled), ('success', success),
                      ('failure', any(results[d] == 'failure' for d in deps))]:
        expr = expr.replace(fn + '()', str(value))
    expr = re.sub(r'!(?!=)', ' not ', expr).replace('&&', ' and ').replace('||', ' or ')
    return boolean(ast.parse(expr.strip(), mode='eval').body)


def schedule(jobs, publish, failures=None):
    results = {}
    for name in ORDER:
        results[name] = ((failures or {}).get(name, 'success')
                         if eligible(jobs, name, results, publish) else 'skipped')
    return results


class ReleaseWorkflowGatesTest(unittest.TestCase):
    def setUp(self):
        self.text = WORKFLOW.read_text()
        self.jobs = job_gates(self.text)

    def test_build_only_runs_all_build_gates_without_publishing(self):
        self.assertEqual(schedule(self.jobs, False), dict(zip(ORDER,
            ['success', 'success', 'success', 'success', 'success', 'skipped'])))

    def test_existing_candidate_skip_rebuild_reaches_publication(self):
        self.assertEqual(schedule(self.jobs, True), dict(zip(ORDER,
            ['success', 'skipped', 'success', 'success', 'success', 'success'])))

    def test_failed_or_skipped_applicable_prerequisites_block_dependents(self):
        # binaries is the matrix result, including Mac signing/notarization.
        for publish in (False, True):
            applicable = ORDER[:-1] if not publish else [x for x in ORDER[:-1] if x != 'engine-packages']
            for name in applicable:
                for state in ('failure', 'cancelled', 'skipped'):
                    with self.subTest(publish=publish, prerequisite=name, state=state):
                        results = schedule(self.jobs, publish, {name: state})
                        self.assertEqual(results[name], state)
                        for child in ORDER[ORDER.index(name)+1:]:
                            self.assertEqual(results[child], 'skipped')

    def test_each_gate_rejects_bad_direct_needs_and_cancellation(self):
        for publish in (False, True):
            results = schedule(self.jobs, publish)
            for name in ORDER[2:]:
                with self.subTest(publish=publish, job=name, cancelled=True):
                    self.assertFalse(eligible(self.jobs, name, results, publish, cancelled=True))
                for dep in self.jobs[name]['needs']:
                    for state in ('failure', 'cancelled', 'skipped'):
                        # Only this exact branch may skip the rebuild prerequisite.
                        if publish and name == 'engine-inputs' and dep == 'engine-packages' and state == 'skipped':
                            continue
                        with self.subTest(publish=publish, job=name, dep=dep, state=state):
                            changed = dict(results, **{dep: state})
                            self.assertFalse(eligible(self.jobs, name, changed, publish))
        self.assertFalse(eligible(self.jobs, 'engine-inputs',
            {'prepare': 'success', 'engine-packages': 'success'}, True))

    def test_qualification_candidate_and_signing_gates_remain_required(self):
        self.assertEqual(self.jobs['engine-packages']['if'], "needs.prepare.outputs.publish != 'true'")
        self.assertEqual(self.jobs['publish']['needs'], ['prepare', 'engine-inputs', 'engine', 'binaries'])
        self.assertEqual(self.text.count('release.py --check-publish'), 2)
        self.assertIn('[[ "$CANDIDATE_RUN" =~ ^[0-9]+$ ]]', self.text)
        self.assertIn('run-id: ${{ inputs.candidate_run_id }}', self.text)
        self.assertIn('manifest.py verify --directory engine-candidate', self.text)
        self.assertIn('json.load(open("engine-candidate/engine-manifest.json")) == json.load(open("autobyteus-nfs/packaging/release-lock.json"))["engine"]', self.text)
        self.assertIn("if: matrix.os == 'darwin' && needs.prepare.outputs.publish == 'true'", self.text)
        self.assertIn('codesign --verify --strict', self.text)
        self.assertIn('xcrun notarytool submit', self.text)
        self.assertNotIn('continue-on-error:', self.text)


if __name__ == '__main__':
    unittest.main()
