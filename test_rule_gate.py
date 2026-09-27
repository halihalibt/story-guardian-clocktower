"""Local behavioral tests with a GenLayer API stub; no network is contacted.

These tests check our contract's state/consensus flow. They do not stand in for
running real validators on GenLayer Studio.
"""

import importlib.util
import json
import sys
import types
import unittest
from pathlib import Path


class ConsensusDisagreement(Exception):
    pass


class Return:
    def __init__(self, calldata):
        self.calldata = calldata


class VM:
    Return = Return
    UserError = type("UserError", (Exception,), {})

    def run_nondet_unsafe(self, leader, validator):
        result = leader()
        if not validator(Return(result)):
            raise ConsensusDisagreement("Validator rejected the leader's signals")
        return result


class Nondet:
    def __init__(self):
        self.answers = []
        self.prompts = []

    def exec_prompt(self, prompt, response_format=None):
        if response_format != "json":
            raise AssertionError("Expected structured JSON response")
        self.prompts.append(prompt)
        return self.answers.pop(0)


class TreeMap(dict):
    @classmethod
    def __class_getitem__(cls, _args):
        return cls


vm = VM()
nondet = Nondet()
gl = types.SimpleNamespace(
    Contract=object,
    public=types.SimpleNamespace(view=lambda func: func, write=lambda func: func),
    vm=vm,
    nondet=nondet,
)
stub = types.ModuleType("genlayer")
stub.gl = gl
stub.TreeMap = TreeMap
sys.modules["genlayer"] = stub

spec = importlib.util.spec_from_file_location("RuleGate", Path(__file__).with_name("RuleGate.py"))
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)


class RuleGateTests(unittest.TestCase):
    def setUp(self):
        self.contract = module.RuleGate()
        for name in ("titles", "scenarios", "allow_rules", "deny_rules", "decisions"):
            setattr(self.contract, name, TreeMap())
        nondet.answers = []
        nondet.prompts = []
        self.contract.create_policy(
            "clocktower-v1",
            "The Clocktower Letter",
            "A letter must reach a father outside the tower before midnight.",
            "A verbatim copy addressed to the father must reach him before midnight.",
            "The original letter cannot leave the tower and the tower door must stay shut until midnight.",
        )

    def assess(self, submission_id, proposal, signals):
        # Independent executions need not produce the same prose explanation.
        nondet.answers = [dict(signals, reason="Leader explanation"),
                          dict(signals, reason="Validator explanation")]
        self.contract.adjudicate("clocktower-v1", submission_id, proposal)
        return json.loads(self.contract.get_result(submission_id))

    def test_policy_is_immutable_and_second_policy_can_be_added(self):
        with self.assertRaises(vm.UserError):
            self.contract.create_policy("clocktower-v1", "Different", "This is another scenario.",
                                        "This is an allowed condition.", "This is a forbidden condition.")
        self.contract.create_policy("workshop-v1", "Workshop admission",
                                    "A learner requests entry to a workshop.",
                                    "The learner must have a valid registration code.",
                                    "A cancelled registration must not be admitted.")
        self.assertIn("Workshop admission", self.contract.get_policy("workshop-v1"))
        self.assertIn("tower", self.contract.get_policy("clocktower-v1"))

    def test_clear_solution_is_approved_and_saved(self):
        proposal = ("I leave the original letter inside, keep the door shut, and pass "
                    "a complete verbatim copy addressed to the father through the window before midnight.")
        saved = self.assess("try-001", proposal, {"forbidden": "NO", "permitted": "YES"})
        self.assertEqual(saved["verdict"], "APPROVED")
        self.assertEqual(saved["proposal"], proposal)
        self.assertEqual(len(nondet.prompts), 2)  # Leader + independent validator.

    def test_prohibition_takes_precedence_and_missing_facts_are_not_approved(self):
        rejected = self.assess("try-002", "I open the door and carry the original to father.",
                               {"forbidden": "YES", "permitted": "YES"})
        self.assertEqual(rejected["verdict"], "REJECTED")
        unclear = self.assess("try-003", "I photograph the letter and send it to my father.",
                              {"forbidden": "UNKNOWN", "permitted": "UNKNOWN"})
        self.assertEqual(unclear["verdict"], "NEEDS_MORE_INFO")

    def test_disagreeing_validator_cannot_write_a_result(self):
        nondet.answers = [
            {"forbidden": "NO", "permitted": "YES", "reason": "Leader says yes"},
            {"forbidden": "YES", "permitted": "YES", "reason": "Validator says no"},
        ]
        with self.assertRaises(ConsensusDisagreement):
            self.contract.adjudicate("clocktower-v1", "try-004", "I send the copied letter to father.")
        self.assertEqual(self.contract.get_result("try-004"), "")

    def test_bad_model_output_and_duplicate_submission_do_not_overwrite(self):
        nondet.answers = [{"forbidden": "NO", "permitted": "YES", "reason": ""}]
        with self.assertRaises(ValueError):
            self.contract.adjudicate("clocktower-v1", "try-005", "I make a full copy for my father.")
        self.assertEqual(self.contract.get_result("try-005"), "")
        self.assess("try-005", "I make a full copy for my father.",
                    {"forbidden": "NO", "permitted": "YES"})
        with self.assertRaises(vm.UserError):
            self.contract.adjudicate("clocktower-v1", "try-005", "I change the earlier answer now.")


if __name__ == "__main__":
    unittest.main()
