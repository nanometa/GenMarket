# GenMarket

A trustless secondhand marketplace on GenLayer (Testnet Bradbury).

A seller lists an item and spells out its claims. A buyer pays into escrow. If the item is not as
described, the buyer opens a dispute, and a panel of GenLayer validators settles it claim by claim.
The refund is computed on-chain from the verdict. There is no platform cut, no star ratings and no
numeric score.

> Different by design. The AI never returns a 0 to 100 score. It returns a categorical verdict per
> claim (VERIFIED, REFUTED or UNVERIFIABLE); the validators reach consensus on the set of refuted
> claims; and the money split is decided by the contract, not the model.

## How the mechanic works

- A listing carries structured claims, each marked material or minor (for example "128GB storage"
  as material, "original box included" as minor).
- `purchase` holds the price in escrow. The buyer can either confirm receipt, which releases the
  payment to the seller, or open a dispute.
- `resolve_dispute` runs a single LLM pass under consensus. For each claim the panel returns
  VERIFIED, REFUTED or UNVERIFIABLE with a short reason. Validators agree only when they
  independently produce the same set of REFUTED claims (set consensus, not a scalar tolerance).
- The refund is deterministic and computed by the contract: if any material claim is refuted the
  buyer is fully refunded; if only minor claims are refuted the buyer gets half back; otherwise the
  payment is released to the seller.

## Deployed contract (Bradbury)

```
GenMarket  0x2cd2E45bbA4B2533375064803Dc5483995699A01
chain 4221 · https://rpc-bradbury.genlayer.com
```

## Contract ABI

Writes
- `create_listing(title, category, condition, price, description, photo_url, claims_json)` returns
  the listing id.
- `purchase(listing_id)` returns the order id and holds the price in escrow.
- `confirm_received(order_id)`. The buyer releases the payment to the seller.
- `open_dispute(order_id, complaint, evidence_url)`. The buyer contests the item.
- `resolve_dispute(order_id)` returns the outcome. The panel judges each claim and the contract
  computes the refund.

Views
- `get_listing(id)`, `get_order(id)`, `list_recent(limit)`, `browse(category, limit)`,
  `list_by_seller(who)`, `list_by_buyer(who)`, `list_disputes(limit)`, `market_stats()`.

## Design

A dark, glassy storefront with a live three.js showroom of floating goods, motion throughout, and a
signature verdict board where each claim is stamped VERIFIED or REFUTED as the dispute resolves.
Type is Space Grotesk, Inter and JetBrains Mono. Stack: Vite, React 18, TypeScript, wagmi,
RainbowKit, genlayer-js, viem, three.js with @react-three/fiber and @react-three/drei, and
framer-motion.

## Notes

- Testnet only (Bradbury). Escrow and refunds are notional; final settlement is off-chain.
- An LLM dispute transaction can occasionally hit a temporary consensus-contract revert on submit.
  Just retry; the UI shows when this happens. Reads use the latest non-final state with retries.
