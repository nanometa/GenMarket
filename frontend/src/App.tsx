import { useCallback, useEffect, useState } from "react";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useAccount } from "wagmi";
import { motion } from "framer-motion";
import {
  type ListingCard, type ListingFull, type OrderFull, type Stats, type ClaimIn,
  createListing, purchase, confirmReceived, openDispute, resolveDispute,
  getListing, getOrder, listRecent, marketStats, gen,
} from "./contractService";

type Hex = `0x${string}`;
const short = (a: string) => (a && a.length > 12 ? `${a.slice(0, 6)}…${a.slice(-4)}` : a);
const eq = (a?: string, b?: string) => !!a && !!b && a.toLowerCase() === b.toLowerCase();
const CONDITIONS = ["new", "like-new", "good", "fair", "for-parts"];
const CAT_EMOJI: Record<string, string> = { electronics: "📱", phones: "📱", clothing: "🧥", fashion: "🧥", furniture: "🪑", books: "📚", games: "🎮", music: "🎸", bikes: "🚲", cameras: "📷", watches: "⌚", art: "🖼", tools: "🔧", home: "🏠", sports: "🏀" };
const emojiFor = (c: string) => CAT_EMOJI[(c || "").toLowerCase()] || "📦";

function Stamp({ v }: { v: string }) {
  return (
    <motion.span className={`stamp stamp-${v || "UNVERIFIABLE"}`} initial={{ scale: 1.6, opacity: 0, rotate: -16 }} animate={{ scale: 1, opacity: 1, rotate: -4 }} transition={{ type: "spring", stiffness: 320, damping: 14 }}>
      {v || "—"}
    </motion.span>
  );
}

export function App({ onBack }: { onBack?: () => void }) {
  const { address, isConnected } = useAccount();
  const [stats, setStats] = useState<Stats | null>(null);
  const [cards, setCards] = useState<ListingCard[]>([]);
  const [cur, setCur] = useState<ListingFull | null>(null);
  const [order, setOrder] = useState<OrderFull | null>(null);
  const [busy, setBusy] = useState("");
  const [err, setErr] = useState("");

  const [sTitle, setSTitle] = useState("");
  const [sCat, setSCat] = useState("electronics");
  const [sCond, setSCond] = useState("good");
  const [sPrice, setSPrice] = useState("5");
  const [sDesc, setSDesc] = useState("");
  const [sPhoto, setSPhoto] = useState("");
  const [claims, setClaims] = useState<ClaimIn[]>([{ text: "", material: true }]);

  const [complaint, setComplaint] = useState("");
  const [evidence, setEvidence] = useState("");

  const refresh = useCallback(async () => {
    const [s, l] = await Promise.all([marketStats(), listRecent(40)]);
    setStats(s); setCards(l);
  }, []);

  const loadListing = useCallback(async (id: number) => {
    setBusy(`Loading listing #${id}…`);
    try {
      let l = await getListing(id);
      for (let i = 0; i < 3 && !l; i++) { await new Promise((r) => setTimeout(r, 1200)); l = await getListing(id); }
      setCur(l);
      if (l && l.orderId >= 0) setOrder(await getOrder(l.orderId)); else setOrder(null);
      setComplaint(""); setEvidence("");
      setErr(l ? "" : `No listing #${id}.`);
    } finally { setBusy(""); }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const setClaim = (i: number, patch: Partial<ClaimIn>) => setClaims((cs) => cs.map((c, j) => (j === i ? { ...c, ...patch } : c)));
  const addClaim = () => setClaims((cs) => (cs.length >= 12 ? cs : [...cs, { text: "", material: true }]));
  const rmClaim = (i: number) => setClaims((cs) => (cs.length <= 1 ? cs : cs.filter((_, j) => j !== i)));

  const onSell = async () => {
    if (!address) return;
    const cl = claims.map((c) => ({ text: c.text.trim(), material: c.material })).filter((c) => c.text.length >= 2);
    if (cl.length === 0) { setErr("Add at least one claim with real text."); return; }
    setErr(""); setBusy("Listing your item on-chain…");
    try {
      const id = await createListing(address as Hex, { title: sTitle, category: sCat, condition: sCond, priceGen: sPrice, description: sDesc, photoUrl: sPhoto, claims: cl });
      setSTitle(""); setSDesc(""); setSPhoto(""); setClaims([{ text: "", material: true }]);
      await refresh(); await loadListing(id);
    } catch (e: any) { setErr(e?.message || "Listing failed"); } finally { setBusy(""); }
  };
  const onBuy = async () => {
    if (!address || !cur) return;
    setErr(""); setBusy("Paying into escrow…");
    try { await purchase(address as Hex, cur.id, cur.priceAtto); await loadListing(cur.id); await refresh(); }
    catch (e: any) { setErr(e?.message || "Purchase failed"); } finally { setBusy(""); }
  };
  const onConfirm = async () => {
    if (!address || !order || !cur) return;
    setErr(""); setBusy("Releasing the payment to the seller…");
    try { await confirmReceived(address as Hex, order.id); await loadListing(cur.id); await refresh(); }
    catch (e: any) { setErr(e?.message || "Confirm failed"); } finally { setBusy(""); }
  };
  const onDispute = async () => {
    if (!address || !order || !cur) return;
    setErr(""); setBusy("Opening the dispute on-chain…");
    try { await openDispute(address as Hex, order.id, complaint, evidence); await loadListing(cur.id); await refresh(); }
    catch (e: any) { setErr(e?.message || "Dispute failed"); } finally { setBusy(""); }
  };
  const onResolve = async () => {
    if (!address || !order || !cur) return;
    setErr(""); setBusy("The validator panel is settling the dispute (AI judgement, can take a few minutes)…");
    try { await resolveDispute(address as Hex, order.id); await loadListing(cur.id); await refresh(); }
    catch (e: any) { setErr(e?.message || "Resolve failed. The transaction can hit a temporary revert, so try again."); } finally { setBusy(""); }
  };

  const isSeller = cur && eq(address, cur.seller);
  const isBuyer = order && eq(address, order.buyer);
  const canBuy = cur && cur.state === "LISTED" && !cur.bought && !isSeller;

  return (
    <div className="app">
      <div className="topbar">
        <div className="brand"><span className="glyph">G</span><div>GenMarket<small>SECONDHAND · ESCROW</small></div></div>
        <div className="spacer" />
        {onBack && <button className="back-btn" onClick={onBack}>← Home</button>}
        <ConnectButton showBalance={false} chainStatus="icon" accountStatus="address" />
      </div>

      <div className="wrap grid cols">
        {/* main */}
        <div className="grid" style={{ alignContent: "start", gap: 18 }}>
          {err && <div className="banner warn">{err}</div>}

          {cur ? (
            <div className="panel">
              <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                <div className="eyebrow">Listing #{cur.id}</div>
                <span className={`st st-${cur.state}`}>{cur.state}</span>
              </div>
              <h2 style={{ fontSize: 24, marginTop: 8 }}>{cur.title}</h2>
              <div className="price-big">{gen(cur.priceAtto)}<small>GEN</small></div>
              <div className="meta">
                <span className="chip">Seller <b>{short(cur.seller)}</b></span>
                <span className="chip">{cur.category}</span>
                <span className="chip">{cur.condition}</span>
              </div>
              {cur.description && <p className="muted" style={{ fontSize: 14, lineHeight: 1.6 }}>{cur.description}</p>}
              <div className="eyebrow" style={{ marginTop: 10 }}>Seller's claims</div>
              <div className="claims-list">
                {cur.claims.map((c, i) => (
                  <div className="claim-line" key={i}><span className={`tag ${c.material ? "mat" : ""}`}><span className="dot" />{c.material ? "material" : "minor"}</span><span>{c.text}</span></div>
                ))}
              </div>

              {canBuy && (isConnected
                ? <button className="btn btn-primary btn-block" style={{ marginTop: 16 }} disabled={!!busy} onClick={onBuy}>Buy · pay {gen(cur.priceAtto)} GEN into escrow</button>
                : <ConnectButton.Custom>{({ openConnectModal }) => (<button className="btn btn-block" style={{ marginTop: 16 }} onClick={openConnectModal}>Connect wallet to buy</button>)}</ConnectButton.Custom>)}
              {isSeller && cur.state === "LISTED" && <div className="banner info" style={{ marginTop: 14 }}>This is your listing. Waiting for a buyer.</div>}

              {order && (
                <div style={{ marginTop: 16 }}>
                  <div className="divider" />
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                    <div className="eyebrow">Order #{order.id}</div>
                    <span className={`st st-${order.state}`}>{order.state}</span>
                  </div>

                  {order.state === "ESCROW" && isBuyer && (
                    <div style={{ marginTop: 12 }}>
                      <button className="btn btn-primary btn-block" disabled={!!busy} onClick={onConfirm}>All good · release to seller</button>
                      <div className="field" style={{ marginTop: 14 }}><label>Not as described? Describe the problem</label>
                        <textarea value={complaint} onChange={(e) => setComplaint(e.target.value)} placeholder="e.g. Battery health is 61%, not the 90% claimed, and no original box." /></div>
                      <div className="field"><label>Evidence link (optional)</label>
                        <input value={evidence} onChange={(e) => setEvidence(e.target.value)} placeholder="https://…" /></div>
                      <button className="btn btn-danger btn-block" disabled={!!busy || complaint.trim().length < 10} onClick={onDispute}>Open a dispute</button>
                    </div>
                  )}
                  {order.state === "ESCROW" && !isBuyer && <div className="banner info" style={{ marginTop: 12 }}>In escrow, waiting for the buyer to confirm or dispute.</div>}
                  {order.state === "DISPUTED" && (
                    <div style={{ marginTop: 12 }}>
                      <div className="summary" style={{ borderLeftColor: "var(--warn)" }}>“{order.complaint}”</div>
                      <button className="btn btn-primary btn-block" style={{ marginTop: 12 }} disabled={!!busy} onClick={onResolve}>Summon the validator panel · settle it</button>
                      <p className="faint" style={{ fontSize: 12, marginTop: 8 }}>Validators check each claim against the evidence and must agree on which claims are false.</p>
                    </div>
                  )}

                  {order.verdicts.length > 0 && (
                    <div className="verdict-board" style={{ marginTop: 16 }}>
                      <div className="vb-head"><span className="t">The verdict</span><span className={`st st-${order.state}`}>{order.state}</span></div>
                      {order.verdicts.map((v, i) => (
                        <div className="vb-item" key={i}>
                          <div className="cl"><div className="txt">{v.text}</div>{v.note && <div className="nt">{v.note}</div>}<div className="kind">{v.material ? "material" : "minor"}</div></div>
                          <Stamp v={v.verdict} />
                        </div>
                      ))}
                      {order.outcome && (
                        <div style={{ padding: "16px 18px" }}>
                          <div className={`outcome oc-${order.outcome}`}>
                            <span className="big">{order.outcome.replace(/_/g, " ").toLowerCase()}</span>
                            <span className="amt">{Number(gen(order.refundAtto)) > 0 ? `${gen(order.refundAtto)} GEN → buyer` : `${gen(order.releaseAtto)} GEN → seller`}</span>
                          </div>
                          {order.summary && <div className="summary">{order.summary}</div>}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : <div className="panel"><div className="empty">{busy ? "Loading…" : "Pick an item from the market below, or list one on the right."}</div></div>}

          <div className="panel">
            <h3>The market</h3>
            <p className="sub">Secondhand items listed on-chain. Click one to inspect it.</p>
            {cards.length === 0 && <div className="empty">No listings yet. Be the first to sell.</div>}
            <div className="market">
              {cards.map((c) => (
                <div className={`lcard ${cur && cur.id === c.id ? "sel" : ""}`} key={c.id} onClick={() => loadListing(c.id)}>
                  <div className="top-right"><span className={`st st-${c.state}`}>{c.state}</span></div>
                  <div className="thumb">{c.photoUrl ? <img src={c.photoUrl} alt="" /> : <span className="em">{emojiFor(c.category)}</span>}</div>
                  <div className="body">
                    <div className="lt">{c.title || "Untitled"}</div>
                    <div className="lp">{gen(c.priceAtto)} GEN</div>
                    <div className="lmeta"><span className="tag"><span className="dot" />{c.category}</span><span className="tag"><span className="dot" />{c.condition}</span></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* right rail */}
        <div className="grid" style={{ alignContent: "start", gap: 18 }}>
          <div className="panel">
            <h3>Sell an item</h3>
            <p className="sub">List it and spell out your claims. Buyers are protected by escrow.</p>
            <div className="field"><label>Title</label><input value={sTitle} onChange={(e) => setSTitle(e.target.value)} placeholder="e.g. iPhone 12 128GB" /></div>
            <div className="row2">
              <div className="field"><label>Category</label><input value={sCat} onChange={(e) => setSCat(e.target.value)} placeholder="electronics" /></div>
              <div className="field"><label>Condition</label><select value={sCond} onChange={(e) => setSCond(e.target.value)}>{CONDITIONS.map((c) => <option key={c} value={c}>{c}</option>)}</select></div>
            </div>
            <div className="field"><label>Price (GEN)</label><input className="mono" value={sPrice} onChange={(e) => setSPrice(e.target.value)} placeholder="5" /></div>
            <div className="field"><label>Description</label><textarea value={sDesc} onChange={(e) => setSDesc(e.target.value)} placeholder="Describe the item honestly." /></div>
            <div className="field"><label>Photo / listing URL (optional)</label><input value={sPhoto} onChange={(e) => setSPhoto(e.target.value)} placeholder="https://…" /></div>
            <label style={{ display: "block", fontSize: 11, letterSpacing: ".05em", color: "var(--muted)", margin: "4px 0 8px", textTransform: "uppercase", fontWeight: 600 }}>Claims (checked one by one in a dispute)</label>
            {claims.map((c, i) => (
              <div className="claim-row" key={i}>
                <input value={c.text} onChange={(e) => setClaim(i, { text: e.target.value })} placeholder={`Claim ${i + 1}, e.g. battery health 90%`} />
                <span className={`toggle ${c.material ? "on" : ""}`} onClick={() => setClaim(i, { material: !c.material })}>{c.material ? "material" : "minor"}</span>
                <button className="icon-btn" onClick={() => rmClaim(i)} title="remove">✕</button>
              </div>
            ))}
            {claims.length < 12 && <button className="add-claim" onClick={addClaim}>+ add claim</button>}
            {isConnected
              ? <button className="btn btn-primary btn-block" style={{ marginTop: 14 }} disabled={!!busy || sTitle.trim().length < 3 || sDesc.trim().length < 10} onClick={onSell}>List item →</button>
              : <ConnectButton.Custom>{({ openConnectModal }) => (<button className="btn btn-block" style={{ marginTop: 14 }} onClick={openConnectModal}>Connect wallet to sell</button>)}</ConnectButton.Custom>}
          </div>

          <div className="panel">
            <h3>Market</h3>
            <div className="meta" style={{ marginTop: 6 }}>
              <span className="chip">Listings <b>{stats?.listings ?? 0}</b></span>
              <span className="chip">Sold <b>{stats?.sold ?? 0}</b></span>
              <span className="chip">Disputes <b>{stats?.disputed ?? 0}</b></span>
              <span className="chip">Refunds <b>{stats?.refunded ?? 0}</b></span>
            </div>
            <div className="divider" />
            <p className="faint" style={{ fontSize: 12, lineHeight: 1.6, margin: 0 }}>Payment is held in escrow. On a dispute, a GenLayer panel checks each claim and the refund is computed on-chain. No ratings, no scores.</p>
          </div>
        </div>
      </div>

      {busy && <div className="toast"><span className="spin" />{busy}</div>}
    </div>
  );
}
