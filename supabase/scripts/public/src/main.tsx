import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Add pwa-standalone class for native-feel CSS when running as installed app
if (
  window.matchMedia("(display-mode: standalone)").matches ||
  (navigator as any).standalone === true
) {
  document.documentElement.classList.add("pwa-standalone");
}

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
