"use client";

import { useDynamicContext } from "@dynamic-labs/sdk-react-core";

export function SecurityCard() {
  const { user } = useDynamicContext();

  if (!user) return null;

  // Derive recovery methods from Dynamic SDK user context
  const hasEmail = !!user.email;
  const hasPasskey = user.verifiedCredentials?.some((cred: any) => cred.format === "passkey");
  
  let securityStatus = "Secured by Passkey + Email";
  if (!hasEmail && hasPasskey) securityStatus = "Secured by Passkey";
  if (hasEmail && !hasPasskey) securityStatus = "Secured by Email (OTP)";
  if (!hasEmail && !hasPasskey) securityStatus = "Unsecured (Action Required)";

  return (
    <div style={{ border: "1px solid #e5e7eb", padding: "1.5rem", borderRadius: "12px", maxWidth: "400px", width: "100%", background: "linear-gradient(to bottom right, #f8fafc, #f1f5f9)", boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "1rem" }}>
        <h2 style={{ margin: 0, fontSize: "1.25rem", color: "#1e293b" }}>Security & Recovery</h2>
      </div>
      
      <div style={{ padding: "0.75rem", background: "white", borderRadius: "8px", border: "1px solid #e2e8f0", marginBottom: "1rem" }}>
        <p style={{ margin: 0, fontWeight: "bold", color: hasPasskey || hasEmail ? "#10b981" : "#f59e0b", display: "flex", alignItems: "center", gap: "0.5rem" }}>
          🛡️ {securityStatus}
        </p>
      </div>

      <p style={{ fontSize: "0.85rem", color: "#64748b", margin: 0, lineHeight: "1.4" }}>
        Your self-custodial wallet is securely tied to your authentication methods. If you lose your device, you can recover your wallet seamlessly by authenticating with these methods again. No seed phrases required!
      </p>
    </div>
  );
}
