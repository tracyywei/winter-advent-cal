import "@/components/village/village.css";

export default function Home() {
  return (
    <div className="va" style={{ display: "grid", placeItems: "center", textAlign: "center", padding: 24 }}>
      <div>
        <div style={{ fontSize: 56 }}>🎄</div>
        <h1 style={{ margin: "8px 0", fontSize: 30 }}>Advent Calendars from Tracy</h1>
        <p style={{ fontStyle: "italic", fontSize: 18, margin: "0 0 20px" }}>
          If you got a link, open that one. Your village is waiting!
        </p>
      </div>
    </div>
  );
}
