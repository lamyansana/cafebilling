import React, { useState } from "react";

type Order = {
  DateTime: string;
  Items: string;
  Total: string;
};

const ViewPastOrders: React.FC = () => {
  const [filter, setFilter] = useState<"today" | "week" | "month" | "year" | "range">("today");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");

  const getPastOrders = (): Order[] => {
    const csv = localStorage.getItem("ordersCSV");
    if (!csv) return [];

    const rows = csv.trim().split("\n");
    const dataRows = rows.slice(1);

    return dataRows.map((row) => {
      const cols = row.split(/,(.+),/); // split into 3 columns
      return {
        DateTime: cols[0]?.trim(),
        Items: cols[1]?.replace(/"/g, "").trim(),
        Total: cols[2]?.trim(),
      };
    });
  };

  const pastOrders = getPastOrders();

  const filterOrders = (orders: Order[]) => {
    if (orders.length === 0) return [];

    const now = new Date();

    return orders.filter((order) => {
      const orderDate = new Date(order.DateTime);

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
              <th>DateTime</th>
              <th>Items</th>
              <th>Total</th>
            </tr>
          </thead>
          <tbody>
            {filteredOrders.map((order, idx) => (
              <tr key={idx}>
                <td>{order.DateTime}</td>
                <td>{order.Items}</td>
                <td>₹{order.Total}</td>
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
