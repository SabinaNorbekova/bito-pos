import { useEffect, useState } from "react";
import { api, ApiClientError } from "../api/client";
import { useAuth } from "../api/useAuth";
import type { CartLine, OrderReceipt, Product } from "../types";

export default function PosPage() {
  const { user, logout } = useAuth();
  const [search, setSearch] = useState("");
  const [products, setProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<CartLine[]>([]);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const [placing, setPlacing] = useState(false);
  const [receipt, setReceipt] = useState<OrderReceipt | null>(null);

  useEffect(() => {
    const handle = setTimeout(() => {
      api
        .searchProducts(search)
        .then((res) => setProducts(res.items))
        .catch(() => setProducts([]));
    }, 250);
    return () => clearTimeout(handle);
  }, [search]);

  useEffect(() => {
    if (!receipt || receipt.status !== "pending_payment") return;
    const interval = setInterval(async () => {
      try {
        const fresh = await api.getOrder(receipt.id);
        setReceipt(fresh);
      } catch {
        /* transient - keep polling */
      }
    }, 2000);
    return () => clearInterval(interval);
  }, [receipt]);

  function addToCart(product: Product) {
    setCart((prev) => {
      const existing = prev.find((l) => l.product._id === product._id);
      if (existing) {
        return prev.map((l) =>
          l.product._id === product._id ? { ...l, qty: l.qty + 1 } : l
        );
      }
      return [...prev, { product, qty: 1 }];
    });
  }

  function changeQty(productId: string, qty: number) {
    if (qty < 1) {
      setCart((prev) => prev.filter((l) => l.product._id !== productId));
      return;
    }
    setCart((prev) =>
      prev.map((l) => (l.product._id === productId ? { ...l, qty } : l))
    );
  }

  const displayTotal = cart.reduce(
    (sum, l) => sum + l.product.price * l.qty,
    0
  );

  async function checkout() {
    setCheckoutError(null);
    setPlacing(true);
    try {
      const order = await api.placeOrder(
        cart.map((l) => ({ productId: l.product._id, qty: l.qty }))
      );
      setReceipt(order);
      setCart([]);
    } catch (err) {
      setCheckoutError(
        err instanceof ApiClientError ? err.message : "Checkout failed"
      );
    } finally {
      setPlacing(false);
    }
  }

  if (receipt) {
    return (
      <div className="page">
        <Header userName={user?.name} onLogout={logout} />
        <div className="card receipt">
          <h2>Receipt</h2>
          <p className={`status status-${receipt.status}`}>
            {receipt.status === "paid"
              ? "✓ Paid"
              : "⏳ Waiting for payment confirmation…"}
          </p>
          <table>
            <thead>
              <tr>
                <th>Item</th>
                <th>Qty</th>
                <th>Price</th>
                <th>Total</th>
              </tr>
            </thead>
            <tbody>
              {receipt.items.map((i) => (
                <tr key={i.productId}>
                  <td>{i.name}</td>
                  <td>{i.qty}</td>
                  <td>${i.priceAtSale.toFixed(2)}</td>
                  <td>${i.lineTotal.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="grand-total">
            Grand total: ${receipt.grandTotal.toFixed(2)}
          </p>
          <button onClick={() => setReceipt(null)}>New sale</button>
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      <Header userName={user?.name} onLogout={logout} />
      <div className="pos-layout">
        <div className="card catalog">
          <input
            placeholder="Search products…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            autoFocus
          />
          <ul className="product-list">
            {products.map((p) => (
              <li key={p._id}>
                <div>
                  <strong>{p.name}</strong>
                  <div className="muted small">
                    {p.sku} · ${p.price.toFixed(2)} · stock {p.stock}
                  </div>
                </div>
                <button disabled={p.stock < 1} onClick={() => addToCart(p)}>
                  Add
                </button>
              </li>
            ))}
            {products.length === 0 && (
              <li className="muted">No products found.</li>
            )}
          </ul>
        </div>

        <div className="card cart">
          <h2>Cart</h2>
          {cart.length === 0 && <p className="muted">Cart is empty.</p>}
          <ul className="cart-list">
            {cart.map((l) => (
              <li key={l.product._id}>
                <span>{l.product.name}</span>
                <input
                  type="number"
                  min={0}
                  value={l.qty}
                  onChange={(e) =>
                    changeQty(
                      l.product._id,
                      parseInt(e.target.value || "0", 10)
                    )
                  }
                />
                <span>${(l.product.price * l.qty).toFixed(2)}</span>
              </li>
            ))}
          </ul>
          <p className="grand-total">Total: ${displayTotal.toFixed(2)}</p>
          {checkoutError && <div className="error">{checkoutError}</div>}
          <button disabled={cart.length === 0 || placing} onClick={checkout}>
            {placing ? "Placing order…" : "Checkout"}
          </button>
        </div>
      </div>
    </div>
  );
}

function Header({
  userName,
  onLogout,
}: {
  userName?: string;
  onLogout: () => void;
}) {
  return (
    <div className="topbar">
      <span>BITO POS — {userName}</span>
      <button className="link" onClick={onLogout}>
        Log out
      </button>
    </div>
  );
}
