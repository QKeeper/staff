import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import "@/i18n";
import App from "./App.tsx";
import { initAuth } from "./context/AuthContext";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

// Stale-While-Revalidate: sync auth state with server in the background
void initAuth();
