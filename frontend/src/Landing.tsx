import { motion } from "framer-motion";
import { Showroom3D } from "./Showroom3D";

const STEPS = [
  { n: "01", t: "List with claims", d: "The seller posts an item and spells out its claims, like '128GB', 'battery 90%' or 'original box'. Each claim goes on the record, marked material or minor." },
  { n: "02", t: "Pay into escrow", d: "The buyer pays and the contract holds the money. No big platform taking a 10 to 15 percent cut, and nobody can walk off with your funds." },
  { n: "03", t: "Dispute, claim by claim", d: "If it is not as described, the buyer opens a dispute. A panel of GenLayer validators checks every claim against the description and the evidence." },
];

const DEMO: { txt: string; kind: string; v: string }[] = [
  { txt: "128GB storage", kind: "material", v: "VERIFIED" },
  { txt: "Battery health 90%", kind: "material", v: "REFUTED" },
  { txt: "Original box included", kind: "minor", v: "REFUTED" },
];

export function Landing({ onLaunch }: { onLaunch: () => void }) {
  const go = (id: string) => document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
  return (
    <div className="lp">
      <nav className="lp-nav">
        <div className="brand"><span className="glyph">G</span><div>GenMarket</div></div>
        <div className="links">
          <a onClick={() => go("how")}>How it works</a>
          <a onClick={() => go("verdict")}>The verdict</a>
        </div>
        <button className="btn btn-primary btn-sm" onClick={onLaunch}>Open the market →</button>
      </nav>

      <header className="lp-hero">
        <div className="lp-hero-3d"><Showroom3D /></div>
        <motion.div className="lp-copy" initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, ease: [0.32, 0.72, 0, 1] }}>
          <span className="kicker">Secondhand · escrow · GenLayer</span>
          <h1 className="lp-h1">Buy used<br />without the <span className="hl">fear</span>.</h1>
          <p className="lede">
            GenMarket holds your payment in escrow. If the item is not as described, a panel of
            GenLayer validators settles it claim by claim, and the refund is computed on-chain.
            No middleman taking a cut, no star ratings. Just a verdict.
          </p>
          <div className="cta-row">
            <button className="btn btn-primary" onClick={onLaunch}>Open the market →</button>
            <button className="btn" onClick={() => go("how")}>See how it works</button>
          </div>
          <div className="hero-stats">
            <div className="hs"><b>0%</b><span>platform cut</span></div>
            <div className="hs"><b>Escrow</b><span>on every order</span></div>
            <div className="hs"><b>Claim-by-claim</b><span>AI verdict</span></div>
          </div>
        </motion.div>
      </header>

      <section className="lp-sec" id="how">
        <div className="sh"><h2>Trust, without the middleman</h2><p>Every step is on-chain. Consensus is spent only when someone actually disputes.</p></div>
        <div className="steps">
          {STEPS.map((s, i) => (
            <motion.div className="step" key={s.n} initial={{ opacity: 0, y: 22 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.3 }} transition={{ duration: 0.55, delay: i * 0.08 }}>
              <div className="n">{s.n}</div><h4>{s.t}</h4><p>{s.d}</p>
            </motion.div>
          ))}
        </div>
      </section>

      <section className="lp-sec" id="verdict">
        <div className="sh"><h2>A verdict, not a rating</h2><p>The AI never scores anything from 0 to 100. It checks each claim the seller made and stamps it VERIFIED or REFUTED. The refund follows from the facts.</p></div>
        <div className="vteaser">
          <div className="verdict-board">
            <div className="vb-head"><span className="t">iPhone 12 · dispute #0</span><span className="st st-REFUNDED">refunded</span></div>
            {DEMO.map((d, i) => (
              <motion.div className="vb-item" key={d.txt} initial={{ opacity: 0, x: -14 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.12, duration: 0.4 }}>
                <div className="cl"><div className="txt">{d.txt}</div><div className="kind">{d.kind}</div></div>
                <motion.span className={`stamp stamp-${d.v}`} initial={{ scale: 1.6, opacity: 0, rotate: -14 }} whileInView={{ scale: 1, opacity: 1, rotate: -4 }} viewport={{ once: true }} transition={{ delay: 0.2 + i * 0.12, type: "spring", stiffness: 320, damping: 14 }}>{d.v}</motion.span>
              </motion.div>
            ))}
            <div style={{ padding: "16px 18px" }}>
              <div className="outcome oc-FULL_REFUND"><span className="big">full refund</span><span className="muted" style={{ fontSize: 13 }}>a material claim was false</span><span className="amt">5.00 GEN → buyer</span></div>
            </div>
          </div>
        </div>
      </section>

      <section className="lp-sec">
        <div className="cta-band">
          <h2>List something. Or buy without worrying.</h2>
          <p>Escrow-backed secondhand trading, settled by AI consensus on GenLayer.</p>
          <button className="btn btn-primary" onClick={onLaunch}>Open the market →</button>
        </div>
        <div className="lp-foot">
          <span>GenMarket, a trustless secondhand marketplace on GenLayer.</span>
          <span className="mono">Testnet Bradbury · escrow is notional</span>
        </div>
      </section>
    </div>
  );
}
