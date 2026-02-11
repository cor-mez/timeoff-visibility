import { useState } from "react";
import "./CopyLink.css";

export default function CopyLink({ url, label }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
      const input = document.createElement("input");
      input.value = url;
      document.body.appendChild(input);
      input.select();
      document.execCommand("copy");
      document.body.removeChild(input);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="copy-link">
      {label && <span className="copy-link-label">{label}</span>}
      <div className="copy-link-row">
        <input
          className="copy-link-input"
          value={url}
          readOnly
          onClick={(e) => e.target.select()}
        />
        <button className="btn btn-secondary copy-link-btn" onClick={handleCopy}>
          {copied ? "Copied!" : "Copy"}
        </button>
      </div>
    </div>
  );
}
