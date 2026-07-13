<h1 align="center">GenMarket</h1>

<p align="center">
  <b>Escrow-backed resale, judged by AI.</b><br/>
  List a used item, get paid through escrow, and if a buyer says it was not as described,
  a GenLayer validator panel rules on it one claim at a time. No fees, no ratings, no scores.
</p>

<p align="center">
  <a href="https://genmarket-three.vercel.app"><img src="https://img.shields.io/badge/live-genmarket-a3e635?style=flat-square&labelColor=0a0b0e" alt="live" /></a>
  <a href="https://explorer-bradbury.genlayer.com/address/0x9526cfB6ECcDDB50f7886474c5088983FfBAC0E8"><img src="https://img.shields.io/badge/contract-0x9526…C0E8-38bdf8?style=flat-square&labelColor=0a0b0e" alt="contract" /></a>
  <img src="https://img.shields.io/badge/GenLayer-Bradbury%20%C2%B7%204221-6366f1?style=flat-square&labelColor=0a0b0e" alt="network" />
  <img src="https://img.shields.io/badge/license-MIT-9aa4b4?style=flat-square&labelColor=0a0b0e" alt="license" />
</p>

## The idea

Selling something secondhand online means either trusting a stranger with your money or handing a
marketplace 10 to 15 percent to sit in the middle. GenMarket removes both. The payment is escrowed by
the contract, and when a deal goes wrong the resolution is not a support ticket or a star rating, it is
a verifiable ruling produced by a panel of GenLayer validators reading the seller's own claims against
the buyer's evidence.

## Flow

```
list ──▶ buy (escrow) ──┬─▶ confirm ─────────────▶ funds release to seller
                        └─▶ dispute ─▶ verdict ─▶ refund computed on-chain
```

1. A seller lists an item and writes down its **claims** (for example "128GB", "battery 90%", "boxed"), each tagged **material** or **minor**.
2. A buyer pays and the price is locked in escrow.
3. Happy buyer confirms and the seller is paid. Unhappy buyer files a dispute with a complaint and an optional evidence link.
4. The validator panel returns a verdict for every claim and the contract settles the money.

## Judging without a score

Most "AI on-chain" designs flatten a decision into a single 0 to 100 number. GenMarket deliberately does
not. A dispute produces one label per claim, nothing more:

| Verdict | Meaning |
| --- | --- |
| `VERIFIED` | the claim holds up against the evidence |
| `REFUTED` | the evidence contradicts the claim |
| `UNVERIFIABLE` | not decidable from what was provided |

Consensus is reached on the **set of refuted claims**, so heterogeneous validator models agree on the
substance even if their wording differs. The payout is then pure contract logic, never the model's
opinion:

- a **material** claim refuted → the buyer is refunded in full,
- only **minor** claims refuted → the buyer gets half back,
- nothing refuted → the escrow releases to the seller.

Buyer text and any fetched page are handled as untrusted input: capped, delimiter-wrapped, and the model
is instructed to ignore any commands hidden inside them and to never emit a number.

## Live example

Read straight from the deployed contract on GenLayer Bradbury.

| | |
| --- | --- |
| Contract | [`0x9526…C0E8`](https://explorer-bradbury.genlayer.com/address/0x9526cfB6ECcDDB50f7886474c5088983FfBAC0E8) |
| Listings / Sold | **1 / 1** |
| Disputes / Refunds | **1 / 1** |

One order was carried end to end as a live test, each step on the explorer:

| Step | What happened | |
| --- | --- | --- |
| list | iPhone 12 128GB with three claims | [tx](https://explorer-bradbury.genlayer.com/tx/0x18ee4e4e21988d87e6999b7afd7e164f05bf3c64621c9dcf42a5579e48989e7e) |
| buy | 5 GEN escrowed | [tx](https://explorer-bradbury.genlayer.com/tx/0xd16a38cd89d3f1487136d5bd8242a0ebf3cac5d02ce84d23c285c26672f2c78b) |
| dispute | "battery is 61 percent, not 90, and no box" | [tx](https://explorer-bradbury.genlayer.com/tx/0x985142b04c4eeb291ad1145aea361907c9716a3f3a4836bc5f1a4c4adea61db9) |
| verdict | battery claim `REFUTED`, buyer fully refunded | [tx](https://explorer-bradbury.genlayer.com/tx/0x83c9ed4fb2fdc6f205c544ded46d02da3c41f8cf62adefdcac2c4e5b7b4e1090) |

## Contract API

`backend/contract.py`, one Python contract on the GenVM with a pinned runner. Nothing is floating
point; ids and amounts are sized integers (`u32`, `u256`) and verdicts are plain strings.

| Write | |
| --- | --- |
| `create_listing(title, category, condition, price, description, photo_url, claims_json)` | publish an item |
| `purchase(listing_id)` | pay into escrow |
| `confirm_received(order_id)` | release to the seller |
| `open_dispute(order_id, complaint, evidence_url)` | contest the item |
| `resolve_dispute(order_id)` | run the panel and settle |

| Read | |
| --- | --- |
| `get_listing(id)` / `get_order(id)` | one full record |
| `list_recent(limit)` / `browse(category, limit)` | the market |
| `list_by_seller(who)` / `list_by_buyer(who)` / `list_disputes(limit)` | filtered views |
| `market_stats()` | counters |

The dispute round is a `gl.vm.run_nondet_unsafe` block: the leader drafts the per-claim verdicts and each
validator re-runs the judgement, accepting only when the refuted set matches.

## Built with

- **Contract:** Python on the GenVM, GenLayer SDK, validated with `genvm-linter`, shipped with the `genlayer` CLI.
- **Front:** Vite, React 18, TypeScript. A live **three.js** showroom (`@react-three/fiber` + `@react-three/drei`), **framer-motion** for the verdict stamps, **wagmi** + **RainbowKit** for wallets, **genlayer-js** + **viem** for the chain.
- **Type & feel:** Space Grotesk, Inter, JetBrains Mono on a dark canvas with a lime accent.

## Local dev

```bash
# contract
genvm-lint check backend/contract.py

# frontend
cd frontend && npm install && npm run dev
```

## Deploy

The contract goes to Bradbury through the `genlayer` CLI (`genlayer deploy --contract backend/contract.py`).
The front is a static Vite build (`npm run build` → `frontend/dist`) hosted on Vercel; the only config that
matters is the contract address and RPC in `frontend/src/chain.ts`.

## Layout

```
backend/contract.py     the GenMarket contract
frontend/src/           App · Landing · Showroom3D · contractService · chain · wagmi · index.css
frontend/               Vite project (public, package.json, config)
```

## License

MIT © nanometa
