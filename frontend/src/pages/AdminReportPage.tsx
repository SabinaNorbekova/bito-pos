import { useState } from "react";
import { useAuth } from "../api/useAuth";
import { api, ApiClientError } from "../api/client";
import type { SalesReport } from "../types";

function isoDaysAgo(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString();
}

export default function AdminReportPage() {
  const { user, logout } = useAuth();
  const [from, setFrom] = useState(isoDaysAgo(30).slice(0, 10));
  const [to, setTo] = useState(new Date().toISOString().slice(0, 10));
  const [report, setReport] = useState<SalesReport | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await api.getSalesReport(
        new Date(from).toISOString(),
        new Date(to + "T23:59:59").toISOString()
      );
      setReport(res);
    } catch (err) {
      setError(
        err instanceof ApiClientError ? err.message : "Failed to load report"
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="page">
      <div className="topbar">
        <span>BITO POS Admin — {user?.name}</span>
        <button className="link" onClick={logout}>
          Log out
        </button>
      </div>

      <div className="card">
        <h2>Sales report</h2>
        <div className="report-filters">
          <label>
            From{" "}
            <input
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
            />
          </label>
          <label>
            To{" "}
            <input
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
            />
          </label>
          <button onClick={load} disabled={loading}>
            {loading ? "Loading…" : "Run report"}
          </button>
        </div>

        {error && <div className="error">{error}</div>}

        {report && (
          <>
            <div className="report-summary">
              <div>
                <span className="muted small">Orders</span>
                <strong>{report.orderCount}</strong>
              </div>
              <div>
                <span className="muted small">Revenue</span>
                <strong>${report.totalRevenue.toFixed(2)}</strong>
              </div>
              <div>
                <span className="muted small">Margin</span>
                <strong>${report.totalMargin.toFixed(2)}</strong>
              </div>
            </div>

            <h3>Top products</h3>
            <table>
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Qty sold</th>
                  <th>Revenue</th>
                  <th>Margin</th>
                </tr>
              </thead>
              <tbody>
                {report.topProducts.map((p) => (
                  <tr key={p.productId}>
                    <td>{p.name}</td>
                    <td>{p.quantitySold}</td>
                    <td>${p.revenue.toFixed(2)}</td>
                    <td>${p.margin.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}
      </div>
    </div>
  );
}
