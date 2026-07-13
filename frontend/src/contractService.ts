import { createClient, createAccount } from "genlayer-js";
import { testnetBradbury } from "genlayer-js/chains";
import { TransactionStatus, TransactionHashVariant } from "genlayer-js/types";
import { parseEther, formatEther } from "viem";
import { CONTRACT_ADDRESS, GENLAYER_NETWORK } from "./chain";

type Hex = `0x${string}`;
const TIMEOUT_MS = 600_000;
const NONFINAL = TransactionHashVariant.LATEST_NONFINAL;

export type Verdict = "VERIFIED" | "REFUTED" | "UNVERIFIABLE" | "";
export type ListingState = "LISTED" | "SOLD" | "" | string;
export type OrderState = "ESCROW" | "DISPUTED" | "RELEASED" | "REFUNDED" | "PARTIAL" | "" | string;
export type Outcome = "RELEASE" | "FULL_REFUND" | "PARTIAL_REFUND" | "" | string;

export interface ClaimIn { text: string; material: boolean; }
export interface ClaimVerdict { text: string; material: boolean; verdict: Verdict; note: string; }

export interface ListingCard {
  id: number; seller: string; title: string; category: string; condition: string;
  priceAtto: string; photoUrl: string; state: ListingState; bought: boolean; claimCount: number;
}
export interface ListingFull extends Omit<ListingCard, "claimCount"> {
  description: string; orderId: number; claims: ClaimIn[];
}
export interface OrderFull {
  id: number; listingId: number; buyer: string; seller: string; amountAtto: string;
  state: OrderState; complaint: string; evidenceUrl: string; outcome: Outcome;
  refundAtto: string; releaseAtto: string; summary: string; verdicts: ClaimVerdict[];
  title: string; photoUrl: string;
}
export interface OrderCard { id: number; listingId: number; amountAtto: string; state: OrderState; outcome: Outcome; }
export interface DisputeCard { id: number; listingId: number; state: OrderState; outcome: Outcome; amountAtto: string; }
export interface Stats { listings: number; orders: number; sold: number; disputed: number; refunded: number; }

export const gen = (atto: string) => { try { return formatEther(BigInt(atto)); } catch { return "0"; } };

function readClient() { return createClient({ chain: testnetBradbury, account: createAccount() }); }
async function writeClient(account: Hex) {
  const c = createClient({ chain: testnetBradbury, account });
  await c.connect(GENLAYER_NETWORK);
  return c;
}
async function waitAccepted(client: any, hash: Hex) {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => { timer = setTimeout(() => reject(new Error("Transaction timed out")), TIMEOUT_MS); });
  try {
    await Promise.race([
      client.waitForTransactionReceipt({ hash: hash as never, status: TransactionStatus.ACCEPTED, interval: 5000, retries: 200 }),
      timeout,
    ]);
  } finally { if (timer) clearTimeout(timer); }
}

function g(o: any, k: string, idx: number): any {
  if (o == null) return undefined;
  if (o instanceof Map) return o.has(k) ? o.get(k) : undefined;
  if (Array.isArray(o)) return o[idx];
  if (typeof o === "object" && k in o) return o[k];
  return undefined;
}
const asStr = (v: any, d = "") => (v == null ? d : String(v));
const asNum = (v: any, d = 0) => { const n = Number(v); return Number.isFinite(n) ? n : d; };
const asBool = (v: any) => v === true || v === "true" || v === 1;

function mapClaim(x: any): ClaimIn {
  return { text: asStr(g(x, "text", 0)), material: asBool(g(x, "material", 1)) };
}
function mapVerdict(x: any): ClaimVerdict {
  return {
    text: asStr(g(x, "text", 0)),
    material: asBool(g(x, "material", 1)),
    verdict: asStr(g(x, "verdict", 2)) as Verdict,
    note: asStr(g(x, "note", 3)),
  };
}
function mapCard(x: any): ListingCard {
  return {
    id: asNum(g(x, "listing_id", 0)),
    seller: asStr(g(x, "seller", 1)),
    title: asStr(g(x, "title", 2)),
    category: asStr(g(x, "category", 3)),
    condition: asStr(g(x, "condition", 4)),
    priceAtto: asStr(g(x, "price", 5), "0"),
    photoUrl: asStr(g(x, "photo_url", 6)),
    state: asStr(g(x, "state", 7)) as ListingState,
    bought: asBool(g(x, "bought", 8)),
    claimCount: asNum(g(x, "claim_count", 9)),
  };
}

// ---- writes ----
export async function createListing(account: Hex, l: { title: string; category: string; condition: string; priceGen: string; description: string; photoUrl: string; claims: ClaimIn[]; }): Promise<number> {
  const wc = await writeClient(account);
  const price = parseEther((l.priceGen || "0").trim() || "0");
  const claimsJson = JSON.stringify((l.claims || []).map((c) => ({ text: c.text, material: !!c.material })));
  const h = (await wc.writeContract({ address: CONTRACT_ADDRESS as Hex, functionName: "create_listing", args: [l.title, l.category, l.condition, price, l.description, l.photoUrl || "", claimsJson], value: 0n })) as Hex;
  await waitAccepted(wc, h);
  const s = await marketStats();
  return Math.max(0, s.listings - 1);
}
export async function purchase(account: Hex, listingId: number, priceAtto: string): Promise<void> {
  const wc = await writeClient(account);
  const value = BigInt(priceAtto);
  if (value <= 0n) throw new Error("Invalid listing price");
  const h = (await wc.writeContract({ address: CONTRACT_ADDRESS as Hex, functionName: "purchase", args: [listingId], value })) as Hex;
  await waitAccepted(wc, h);
}
export async function confirmReceived(account: Hex, orderId: number): Promise<void> {
  const wc = await writeClient(account);
  const h = (await wc.writeContract({ address: CONTRACT_ADDRESS as Hex, functionName: "confirm_received", args: [orderId], value: 0n })) as Hex;
  await waitAccepted(wc, h);
}
export async function openDispute(account: Hex, orderId: number, complaint: string, evidenceUrl: string): Promise<void> {
  const wc = await writeClient(account);
  const h = (await wc.writeContract({ address: CONTRACT_ADDRESS as Hex, functionName: "open_dispute", args: [orderId, complaint, evidenceUrl || ""], value: 0n })) as Hex;
  await waitAccepted(wc, h);
}
export async function resolveDispute(account: Hex, orderId: number): Promise<void> {
  const wc = await writeClient(account);
  const h = (await wc.writeContract({ address: CONTRACT_ADDRESS as Hex, functionName: "resolve_dispute", args: [orderId], value: 0n })) as Hex;
  await waitAccepted(wc, h);
}

// ---- reads ----
export async function getListing(id: number): Promise<ListingFull | null> {
  try {
    const r: any = await readClient().readContract({ address: CONTRACT_ADDRESS as Hex, functionName: "get_listing", args: [id], transactionHashVariant: NONFINAL });
    const c = mapCard({ ...(r instanceof Map ? Object.fromEntries(r) : r) });
    const rawClaims = g(r, "claims", 11);
    const claims = Array.isArray(rawClaims) ? rawClaims.map(mapClaim) : [];
    return {
      id: asNum(g(r, "listing_id", 0)),
      seller: c.seller, title: c.title, category: c.category, condition: c.condition,
      priceAtto: c.priceAtto, photoUrl: c.photoUrl, state: c.state, bought: c.bought,
      description: asStr(g(r, "description", 10)),
      orderId: asNum(g(r, "order_id", 12), -1),
      claims,
    };
  } catch { return null; }
}
export async function getOrder(id: number): Promise<OrderFull | null> {
  try {
    const r: any = await readClient().readContract({ address: CONTRACT_ADDRESS as Hex, functionName: "get_order", args: [id], transactionHashVariant: NONFINAL });
    const rawV = g(r, "verdicts", 12);
    return {
      id: asNum(g(r, "order_id", 0)),
      listingId: asNum(g(r, "listing_id", 1)),
      buyer: asStr(g(r, "buyer", 2)),
      seller: asStr(g(r, "seller", 3)),
      amountAtto: asStr(g(r, "amount", 4), "0"),
      state: asStr(g(r, "state", 5)) as OrderState,
      complaint: asStr(g(r, "complaint", 6)),
      evidenceUrl: asStr(g(r, "evidence_url", 7)),
      outcome: asStr(g(r, "outcome", 8)) as Outcome,
      refundAtto: asStr(g(r, "refund_to_buyer", 9), "0"),
      releaseAtto: asStr(g(r, "release_to_seller", 10), "0"),
      summary: asStr(g(r, "summary", 11)),
      verdicts: Array.isArray(rawV) ? rawV.map(mapVerdict) : [],
      title: asStr(g(r, "title", 13)),
      photoUrl: asStr(g(r, "photo_url", 14)),
    };
  } catch { return null; }
}
export async function listRecent(limit = 60): Promise<ListingCard[]> {
  try {
    const r: any = await readClient().readContract({ address: CONTRACT_ADDRESS as Hex, functionName: "list_recent", args: [limit], transactionHashVariant: NONFINAL });
    return Array.isArray(r) ? r.map(mapCard) : [];
  } catch { return []; }
}
export async function browse(category: string, limit = 60): Promise<ListingCard[]> {
  try {
    const r: any = await readClient().readContract({ address: CONTRACT_ADDRESS as Hex, functionName: "browse", args: [category, limit], transactionHashVariant: NONFINAL });
    return Array.isArray(r) ? r.map(mapCard) : [];
  } catch { return []; }
}
export async function listBySeller(who: string): Promise<ListingCard[]> {
  try {
    const r: any = await readClient().readContract({ address: CONTRACT_ADDRESS as Hex, functionName: "list_by_seller", args: [who.trim()], transactionHashVariant: NONFINAL });
    return Array.isArray(r) ? r.map(mapCard) : [];
  } catch { return []; }
}
export async function listByBuyer(who: string): Promise<OrderCard[]> {
  try {
    const r: any = await readClient().readContract({ address: CONTRACT_ADDRESS as Hex, functionName: "list_by_buyer", args: [who.trim()], transactionHashVariant: NONFINAL });
    if (!Array.isArray(r)) return [];
    return r.map((o: any) => ({
      id: asNum(g(o, "order_id", 0)), listingId: asNum(g(o, "listing_id", 1)),
      amountAtto: asStr(g(o, "amount", 2), "0"), state: asStr(g(o, "state", 3)) as OrderState, outcome: asStr(g(o, "outcome", 4)) as Outcome,
    }));
  } catch { return []; }
}
export async function listDisputes(limit = 60): Promise<DisputeCard[]> {
  try {
    const r: any = await readClient().readContract({ address: CONTRACT_ADDRESS as Hex, functionName: "list_disputes", args: [limit], transactionHashVariant: NONFINAL });
    if (!Array.isArray(r)) return [];
    return r.map((o: any) => ({
      id: asNum(g(o, "order_id", 0)), listingId: asNum(g(o, "listing_id", 1)),
      state: asStr(g(o, "state", 2)) as OrderState, outcome: asStr(g(o, "outcome", 3)) as Outcome, amountAtto: asStr(g(o, "amount", 4), "0"),
    }));
  } catch { return []; }
}
export async function marketStats(): Promise<Stats> {
  try {
    const r: any = await readClient().readContract({ address: CONTRACT_ADDRESS as Hex, functionName: "market_stats", args: [], transactionHashVariant: NONFINAL });
    return {
      listings: asNum(g(r, "listings", 0)), orders: asNum(g(r, "orders", 1)),
      sold: asNum(g(r, "sold", 2)), disputed: asNum(g(r, "disputed", 3)), refunded: asNum(g(r, "refunded", 4)),
    };
  } catch { return { listings: 0, orders: 0, sold: 0, disputed: 0, refunded: 0 }; }
}
