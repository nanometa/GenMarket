import { useState } from "react";
import { Landing } from "./Landing";
import { App } from "./App";

export function Shell() {
  const initial: "landing" | "app" =
    typeof window !== "undefined" && window.location.hash === "#app" ? "app" : "landing";
  const [page, setPage] = useState<"landing" | "app">(initial);
  const go = (p: "landing" | "app") => {
    setPage(p);
    if (typeof window !== "undefined") {
      window.history.replaceState(null, "", p === "app" ? "#app" : "#");
      window.scrollTo({ top: 0 });
    }
  };
  return page === "landing" ? <Landing onLaunch={() => go("app")} /> : <App onBack={() => go("landing")} />;
}
