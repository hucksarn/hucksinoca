import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { setupGlobalErrorLogging } from "./lib/logger";

// Initialize global error logging
setupGlobalErrorLogging();

createRoot(document.getElementById("root")!).render(<App />);
