import "./Header.css";

export default function Header({ storeName, lastUpdated }) {
  const formattedDate = lastUpdated
    ? new Date(lastUpdated).toLocaleString(undefined, {
        dateStyle: "medium",
        timeStyle: "short",
      })
    : null;

  return (
    <header className="app-header">
      <h1 className="app-header-title">{storeName || "TimeOff Board"}</h1>
      {formattedDate && (
        <p className="app-header-updated">Last updated: {formattedDate}</p>
      )}
    </header>
  );
}
