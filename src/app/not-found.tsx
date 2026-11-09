import "@/components/village/village.css";

export default function NotFound() {
  return (
    <div className="va" style={{ display: "grid", placeItems: "center", textAlign: "center", padding: 24 }}>
      <div>
        <div style={{ fontSize: 56 }}>❄️</div>
        <h1 style={{ margin: "8px 0", fontSize: 28 }}>This village got snowed in</h1>
        <p style={{ fontStyle: "italic", fontSize: 18, margin: 0 }}>
          Double-check the link you were sent. It should end with a long secret code.
        </p>
      </div>
    </div>
  );
}
