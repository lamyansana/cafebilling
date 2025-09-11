import React, { useState, useEffect } from "react";
import { supabase } from "./supabaseClient"; // adjust path if needed

type Order = {
  id: number;
  created_at: string;
  total_amount: number;
  payment_mode: string;
  items: { item_name: string; quantity: number }[];
};

const ViewPastOrders: React.FC = () => {
  const [filter, setFilter] = useState<"today" | "week" | "month" | "year" | "range">("today");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");
  const [pastOrders, setPastOrders] = useState<Order[]>([]);

  // 🔽 Load orders from Supabase
  useEffect(() => {
    const fetchOrders = async () => {
      const { data, error } = await supabase
        .from("orders")
        .select(
          `
          id,
          created_at,
          total_amount,
          payment_mode,
          order_items (
            item_name,
            quantity
          )
        `
        )
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error loading orders:", error);
        return;
      }
      if (data) {
        setPastOrders(
          data.map((o: any) => ({
            id: o.id,
            created_at: o.created_at,
            total_amount: o.total_amount,
            payment_mode: o.payment_mode,
            items: o.order_items || [],
          }))
        );
      }
    };

    fetchOrders();
  }, []);

  // 🔍 Filtering
  const filterOrders = (orders: Order[]) => {
    if (orders.length === 0) return [];
    const now = new Date();

    return orders.filter((order) => {
      const orderDate = new Date(order.created_at);

      switch (filter) {
        case "today":
          return orderDate.toDateString() === now.toDateString();

        case "week": {
          const startOfWeek = new Date(now);
          startOfWeek.setDate(now.getDate() - now.getDay());
          startOfWeek.setHours(0, 0, 0, 0);

          const endOfWeek = new Date(startOfWeek);
          endOfWeek.setDate(startOfWeek.getDate() + 6);
          endOfWeek.setHours(23, 59, 59, 999);

          return orderDate >= startOfWeek && orderDate <= endOfWeek;
        }

        case "month":
          return (
            orderDate.getMonth() === now.getMonth() &&
            orderDate.getFullYear() === now.getFullYear()
          );

        case "year":
          return orderDate.getFullYear() === now.getFullYear();

        case "range":
          if (!customStart || !customEnd) return true;
          const start = new Date(customStart);
          const end = new Date(customEnd);
          end.setHours(23, 59, 59, 999);
          return orderDate >= start && orderDate <= end;

        default:
          return true;
      }
    });
  };

  const filteredOrders = filterOrders(pastOrders);

  return (
    <div>
      <h2>Past Orders</h2>

      {/* Filter controls */}
      <div style={{ marginBottom: "1rem" }}>
        <label>Filter: </label>
        <select value={filter} onChange={(e) => setFilter(e.target.value as any)}>
          <option value="today">Today</option>
          <option value="week">This Week</option>
          <option value="month">This Month</option>
          <option value="year">This Year</option>
          <option value="range">Custom Range</option>
        </select>

        {filter === "range" && (
          <span style={{ marginLeft: "1rem" }}>
            From:{" "}
            <input
              type="date"
              value={customStart}
              onChange={(e) => setCustomStart(e.target.value)}
            />
            To:{" "}
            <input
              type="date"
              value={customEnd}
              onChange={(e) => setCustomEnd(e.target.value)}
            />
          </span>
        )}
      </div>

      {filteredOrders.length > 0 ? (
        <table border={1} cellPadding={6}>
          <thead>
            <tr>
              <th>Order #</th>
              <th>DateTime</th>
              <th>Items</th>
              <th>Total</th>
              <th>Payment Mode</th>
            </tr>
          </thead>
          <tbody>
            {filteredOrders.map((order) => (
              <tr key={order.id}>
                <td>{order.id}</td>
                <td>{new Date(order.created_at).toLocaleString()}</td>
                <td>
                  {order.items.map((it, idx) => (
                    <span key={idx}>
                      {it.item_name} × {it.quantity}
                      {idx < order.items.length - 1 ? ", " : ""}
                    </span>
                  ))}
                </td>
                <td>₹{order.total_amount}</td>
                <td>{order.payment_mode}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <p>No orders found for this filter.</p>
      )}
    </div>
  );
};

export default ViewPastOrders;
