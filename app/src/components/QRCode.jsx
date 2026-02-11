import { QRCodeSVG } from "qrcode.react";
import "./QRCode.css";

export default function QRCode({ url }) {
  return (
    <div className="qr-code">
      <QRCodeSVG value={url} size={160} level="M" />
      <p className="qr-code-hint">Scan to open team view</p>
    </div>
  );
}
