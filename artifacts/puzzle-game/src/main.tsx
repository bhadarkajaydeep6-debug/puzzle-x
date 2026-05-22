import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { initCapacitor } from "@/lib/capacitorInit";

// Boot Capacitor plugins (status bar, splash, AdMob, back button, haptics).
// On the web this is a fast no-op — it never blocks rendering.
initCapacitor().catch(() => {});

createRoot(document.getElementById("root")!).render(<App />);
