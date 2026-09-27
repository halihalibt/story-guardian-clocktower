# Story Guardian — Project Guide

Story Guardian is a browser-based story puzzle built around a deployed GenLayer Intelligent Contract. Players describe their own solution to *The Clocktower Letter*; the RuleGate contract evaluates it against a published policy and records the proposal, verdict, and reason. Visitors can inspect the rules and past results without connecting a wallet.

This repository contains the full browser app and the RuleGate contract source. The website uses a RuleGate contract that was already deployed on Studionet; the browser interface, wallet flow, public records, and five website submissions are the additions documented here.

## Try the game

- [Play the live demo](https://story-guardian-clocktower.zsf197176.chatgpt.site/)
- [Browse the source](https://github.com/halihalibt/story-guardian-clocktower)
- [Inspect the deployed contract](https://explorer-studio.genlayer.com/address/0x66772109f272c69498168503A5868b6Ecf8fEd08)
- Network: GenLayer Studionet (chain ID `61999`); policy ID: `clocktower-v1`.

The chapter asks players to get a letter to the father outside a clocktower before midnight. A complete verbatim copy, still addressed to him, must reach him before the deadline. The original must remain in the tower, and the tower door must stay closed until midnight. Players can propose any concrete sequence of actions; missing facts may lead to `NEEDS_MORE_INFO`.

## How it works

1. The site calls `get_policy` and displays the published rule. If the rule cannot be read, it pauses new submissions.
2. A player writes a proposal and confirms an `adjudicate` transaction using an EVM wallet on Studionet.
3. RuleGate assesses whether the proposal violates the prohibition and whether it fulfills the allowed condition. Validators independently check the decision signals. The contract derives and stores an `APPROVED`, `REJECTED`, or `NEEDS_MORE_INFO` result.
4. The site waits for the transaction to finalize, calls `get_result`, and displays the stored reason. A pending attempt is retained in the same browser so the player can check it after a refresh.

Publishing the rule under `clocktower-v1` prevents that policy ID from being overwritten. Stored decisions remain publicly readable by submission ID. This makes the published rule and recorded outcomes auditable; it does not make natural-language judgment infallible. The current game is a Studionet demonstration, not a service for real-world disputes.

## Website transactions

Five proposals were submitted through the live website. The first three appear in the public record cards on the demo page; each card reads its verdict from `get_result` and links to the corresponding transaction. The remaining two can also be queried using their submission IDs.

| Submission ID | Stored verdict | What the example tests | Finalized transaction |
| --- | --- | --- | --- |
| `sg-muj7qsed-eabc677d` | `APPROVED` | The father copies the letter and leaves through the window before midnight; the original stays inside and the door remains closed. | [View](https://explorer-studio.genlayer.com/tx/0x273f34edfbdef9ccea0948bd12a55ef9fd0b6598c8652bb5798a553902903565) |
| `sg-muj7nfoi-644056c6` | `NEEDS_MORE_INFO` | The copy and timing are clear, but the proposal leaves the original's location and the door's status unstated. | [View](https://explorer-studio.genlayer.com/tx/0x341b94f13d8ac3a9ae5bafba9ebf54938ab302c618486c32eae67e915de61ca5) |
| `sg-muj7x9ev-852c8d5e` | `REJECTED` | The copy is delivered before the following midnight, rather than the chapter's deadline. | [View](https://explorer-studio.genlayer.com/tx/0x70ab3430f94ad58dd7f3b1426375923c26771ef2787a76e80e4e37da1d31edd6) |
| `sg-muj7fo48-4dfa2001` | `NEEDS_MORE_INFO` | The plan omits important constraints. | [View](https://explorer-studio.genlayer.com/tx/0x9b013984cb55ac4bd1d67cc6f96db7e9d7e625bfc72032dd454b7ecdf7ad6fb0) |
| `sg-muj70jsp-79e2debe` | `APPROVED` | A complete copy leaves through the window on time while the original and door satisfy the restrictions. | [View](https://explorer-studio.genlayer.com/tx/0x4093e5cdc83ee5558ae571df33252ede7aea9207b97065a3c559ee53ec859559) |

The earlier `try-001`, `try-002`, and `try-003` records were created in GenLayer Studio to test the contract; they are displayed separately from the website submissions. A finalized transaction shows that the call completed. The game's verdict is the value stored by `get_result`, not the Explorer's transaction status.

## Run the source

`RuleGate.py` contains the contract. `frontend/` contains the React and TypeScript site, using `genlayer-js` to read Studionet and submit through the connected wallet. The browser page points to the deployed contract above.

With Node.js 20.19 or newer:

```bash
cd frontend
npm ci
npm run dev
```

Run `npm run build` in `frontend/` to check the web build. The local contract logic checks can be run from the repository root with `python3 -m unittest -q test_rule_gate.py`. To deploy a separate contract, import `RuleGate.py` into [GenLayer Studio](https://studio.genlayer.com/), then call `create_policy` with a new policy ID before using `adjudicate`.

No real asset purchase is required for the public read-only demo. Wallet submissions on Studionet may require testnet tokens; check the wallet's displayed fee before confirming.
