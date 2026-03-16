import { createRoot } from "react-dom/client";
import { Component, type ReactNode } from "react";
import "./index.css";

class ErrorBoundary extends Component<
  { children: ReactNode },
  { hasError: boolean; error: Error | null }
> {
  state = { hasError: false, error: null as Error | null };

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error("App render error:", error, info);
  }

  render() {
    if (this.state.hasError && this.state.error) {
      return (
        <div style={{ padding: "2rem", fontFamily: "sans-serif", maxWidth: "800px", margin: "0 auto" }}>
          <h1 style={{ color: "#c00" }}>Something went wrong</h1>
          <pre style={{ background: "#f5f5f5", padding: "1rem", overflow: "auto" }}>
            {this.state.error.message}
          </pre>
          <pre style={{ fontSize: "12px", color: "#666" }}>{this.state.error.stack}</pre>
        </div>
      );
    }
    return this.props.children;
  }
}

const rootEl = document.getElementById("root");
if (!rootEl) {
  document.body.innerHTML = "<p style='padding:2rem;font-family:sans-serif;'>Root element not found.</p>";
} else {
  function showLoadError(err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    const stack = err instanceof Error ? err.stack : "";
    rootEl.innerHTML = `
      <div style="padding:2rem;font-family:sans-serif;max-width:800px;margin:0 auto;">
        <h1 style="color:#c00;">Failed to load app</h1>
        <pre style="background:#f5f5f5;padding:1rem;overflow:auto;font-size:14px;">${escapeHtml(msg)}</pre>
        ${stack ? `<pre style="font-size:12px;color:#666;overflow:auto;">${escapeHtml(stack)}</pre>` : ""}
      </div>
    `;
  }

  function escapeHtml(s: string) {
    return s
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  import("./App.tsx")
    .then(({ default: App }) => {
      rootEl.innerHTML = "";
      const mountPoint = document.createElement("div");
      rootEl.appendChild(mountPoint);
      createRoot(mountPoint).render(
        <ErrorBoundary>
          <App />
        </ErrorBoundary>
      );
    })
    .catch((err) => {
      console.error("App load error:", err);
      showLoadError(err);
    });
}
