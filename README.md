# GenMarket

**A trustless secondhand marketplace on GenLayer.** Buy and sell used goods with the payment held in escrow. If an item is not as described, a panel of GenLayer validators settles the dispute claim by claim and the refund is computed on-chain. No platform cut, no star ratings, no numeric score.

[![Network](https://img.shields.io/badge/network-GenLayer%20Bradbury-6366f1?style=for-the-badge)](https://explorer-bradbury.genlayer.com)
[![chainId](https://img.shields.io/badge/chainId-4221-1f2937?style=for-the-badge)](https://docs.genlayer.com)
[![Status](https://img.shields.io/badge/status-live-34d399?style=for-the-badge)](https://genmarket-three.vercel.app)
[![Contract](https://img.shields.io/badge/contract-Python%20%C2%B7%20GenVM-0ea5e9?style=for-the-badge)](backend/contract.py)
[![Frontend](https://img.shields.io/badge/frontend-Vite%20%C2%B7%20React%20%C2%B7%20three.js-a3e635?style=for-the-badge)](frontend)
[![License](https://img.shields.io/badge/license-MIT-blue?style=for-the-badge)](LICENSE)

> **App:** https://genmarket-three.vercel.app  ·  **Contract:** [`0x2cd2…9A01`](https://explorer-bradbury.genlayer.com/address/0x2cd2E45bbA4B2533375064803Dc5483995699A01) on GenLayer Bradbury (chain 4221)

---

## On-chain snapshot

Every figure is read directly from the deployed contract. The seeded order below is a real, end-to-end dispute settled by validator consensus, with each step linked to the explorer.

| Metric | Value |
| --- | --- |
| Contract | [`0x2cd2…9A01`](https://explorer-bradbury.genlayer.com/address/0x2cd2E45bbA4B2533375064803Dc5483995699A01) |
| Listings | **1** |
| Sold | **1** |
| Disputes | **1** |
| Refunds | **1** |

### Seeded dispute

A real listing taken through the whole lifecycle (list, buy, dispute, verdict):

| Step | Detail | Transaction |
| --- | --- | --- |
| List | iPhone 12 128GB, 3 claims | [tx ↗](https://explorer-bradbury.genlayer.com/tx/0x18ee4e4e21988d87e6999b7afd7e164f05bf3c64621c9dcf42a5579e48989e7e) |
| Buy | 5 GEN into escrow | [tx ↗](https://explorer-bradbury.genlayer.com/tx/0xd16a38cd89d3f1487136d5bd8242a0ebf3cac5d02ce84d23c285c26672f2c78b) |
| Dispute | battery 61%, not the 90% claimed, no box | [tx ↗](https://explorer-bradbury.genlayer.com/tx/0x985142b04c4eeb291ad1145aea361907c9716a3f3a4836bc5f1a4c4adea61db9) |
| Verdict | battery claim **REFUTED**, full refund | [tx ↗](https://explorer-bradbury.genlayer.com/tx/0x83c9ed4fb2fdc6f205c544ded46d02da3c41f8cf62adefdcac2c4e5b7b4e1090) |

Deployment transaction: [`0xb812…4419`](https://explorer-bradbury.genlayer.com/tx/0xb8124c61fe7d3d9ffe16f4ef90799766c794c8c9b0d3711495f454a4832e4419)

---

## What it is

GenMarket is an escrow-backed marketplace for used goods. A seller lists an item and spells out its **claims** ("128GB", "battery 90%", "original box"), each flagged **material** or **minor**. A buyer pays and the contract holds the funds. The buyer can confirm receipt, which releases the payment, or open a **dispute**. On a dispute, a panel of GenLayer validators reads every claim against the description and the evidence and returns a categorical **verdict** per claim. The refund is then computed by the contract from that verdict.

## Why this needs GenLayer

A deterministic chain can hold escrow and count confirmations; it cannot judge whether an item matched its description. That judgment is subjective and evidence-based, so it must run off the deterministic path yet still be verified by independent validators. GenLayer's optimistic-democracy consensus over non-deterministic (LLM) operations is exactly that primitive:

- **Independent verification.** Each validator re-derives the per-claim verdict; the leader is never trusted blindly.
- **Set consensus, not a score.** Validators agree on the **set of refuted claims**, never on a fragile 0 to 100 number. There is no rating anywhere in the protocol; the outcome is categorical.
- **Deterministic settlement.** The money split (full refund, partial, or release) is decided by the contract from the agreed verdict, so the payout is reproducible and not an LLM guess.

## Lifecycle

1. **List.** The seller submits an item and its claims, each flagged material or minor.
2. **Buy.** The buyer pays; the contract escrows the price.
3. **Confirm or dispute.** The buyer either releases the payment or opens a dispute with a complaint and optional evidence.
4. **Verdict.** Validators mark each claim VERIFIED, REFUTED or UNVERIFIABLE and reach consensus on the refuted set.
5. **Settle.** Any refuted **material** claim triggers a full refund; only **minor** claims refuted give a half refund; otherwise the payment releases to the seller.

## The contract, `GenMarket`

A single GenLayer intelligent contract (`backend/contract.py`), Python on the GenVM with a pinned runner version. Storage uses `TreeMap` and `DynArray` collections, `Address`, and sized integers (`u32`, `u256`). **No numeric score is ever produced or stored**; verdicts are categorical strings.

| Method | Kind | Purpose |
| --- | --- | --- |
| `create_listing(title, category, condition, price, description, photo_url, claims_json)` | `write` | List an item with its claims |
| `purchase(listing_id)` | `write` | Buy and hold the price in escrow |
| `confirm_received(order_id)` | `write` | Release the payment to the seller |
| `open_dispute(order_id, complaint, evidence_url)` | `write` | Contest the item as not as described |
| `resolve_dispute(order_id)` | `write` | The panel judges each claim; the contract computes the refund |
| `get_listing(id)`, `get_order(id)` | `view` | Full listing / order record |
| `list_recent(limit)`, `browse(category, limit)` | `view` | Browse the market |
| `list_by_seller(who)`, `list_by_buyer(who)`, `list_disputes(limit)` | `view` | Filtered listings / orders |
| `market_stats()` | `view` | Protocol counters |

**Consensus design.** `resolve_dispute` runs a custom validator over `gl.vm.run_nondet_unsafe`: the leader produces a per-claim verdict list, and each validator re-runs the evaluation and agrees only when it derives the **same set of REFUTED claims** (set consensus, not a scalar tolerance). All fetched text and buyer input is treated as untrusted DATA (length-capped, delimiter-wrapped, with explicit instructions to the model to ignore embedded directives), and the model is told never to emit a numeric score.

## Tech stack

**Contract**
- Python intelligent contract on the **GenVM**, GenLayer SDK (`from genlayer import *`), pinned runner version.
- `genvm-linter` for static validation; deployed and operated with the `genlayer` CLI.

**Frontend** (`frontend/`)
- **Vite**, **React 18**, **TypeScript**.
- **three.js** with **@react-three/fiber** and **@react-three/drei** for the floating showroom, and **framer-motion** for the verdict-board stamps and motion.
- **wagmi** and **RainbowKit** for wallet connection; **genlayer-js** and **viem** for chain reads and writes.
- Type: **Space Grotesk** (display), **Inter** (UI), **JetBrains Mono** (data). Dark theme, lime accent.

## Project structure

```
.
├── backend/
│   └── contract.py            # the GenMarket intelligent contract
├── frontend/                  # Vite + React dApp
│   ├── src/
│   │   ├── App.tsx            # market, sell, escrow, dispute, verdict board
│   │   ├── Landing.tsx        # 3D hero + how it works
│   │   ├── Showroom3D.tsx     # react-three-fiber scene
│   │   ├── contractService.ts # genlayer-js ABI bindings
│   │   ├── chain.ts           # network + contract address
│   │   ├── wagmi.ts, main.tsx, index.css
│   ├── public/
│   └── package.json
├── README.md
└── LICENSE
```

## Build

**Contract** (Python 3.12+)
```bash
genvm-lint check backend/contract.py
```

**Frontend**
```bash
cd frontend
npm install
npm run build     # outputs to frontend/dist
```

## Deploy

**Contract, to GenLayer Bradbury**, with the `genlayer` CLI: import a funded key, select `testnet-bradbury`, then `genlayer deploy --contract backend/contract.py`.

**Frontend, to Vercel** (static, no backend):

| Setting | Value |
| --- | --- |
| Root directory | `frontend` |
| Build command | `npm run build` |
| Output directory | `dist` |
| Contract address (`src/chain.ts`) | `0x2cd2E45bbA4B2533375064803Dc5483995699A01` |
| RPC | `https://rpc-bradbury.genlayer.com` |

## Links

- **App:** https://genmarket-three.vercel.app
- **Explorer:** https://explorer-bradbury.genlayer.com/address/0x2cd2E45bbA4B2533375064803Dc5483995699A01
- **GitHub:** https://github.com/nanometa/GenMarket

## Notes

- Testnet only (Bradbury). Escrow and refunds are notional; final settlement is off-chain.
- A dispute transaction runs an LLM under consensus and can occasionally hit a transient revert on submit. Simply retry. Reads use the latest non-final state with retries.

## License

[MIT](LICENSE) © nanometa
