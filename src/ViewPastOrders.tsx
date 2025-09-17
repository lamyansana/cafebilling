import React, { useState, useEffect } from "react";
import { supabase } from "./supabaseClient";
import {formatDate} from "./formatDate"



interface OrdersProps {
  role?: "admin" | "staff" | "viewer";
}

type Order = {
  id: number;
  created_at: string;
  total_amount: number;
  payment_mode: string;
  items: { item_name: string; quantity: number; order_id: number; price: number }[];
};

const ViewPastOrders: React.FC<OrdersProps> = ({ role }) => {
  const today = new Date().toISOString().split("T")[0]; // yyyy-mm-dd format for <input type="date">
  const isAdmin = role === "admin";
  const [filter, setFilter] = useState<"today" | "week" | "month" | "year" | "date" | "range">("today");
  const [customStart, setCustomStart] = useState(today);
  const [customEnd, setCustomEnd] = useState(today);
  const [selectedDate, setSelectedDate] = useState(today);
  const [pastOrders, setPastOrders] = useState<Order[]>([]);
  const [editingItem, setEditingItem] = useState<{ orderId: number; itemName: string; quantity: number } | null>(null);
  const [deleteItem, setDeleteItem] = useState<{ orderId: number; itemName: string } | null>(null);
  const [toast, setToast] = useState<string | null>(null);

   useEffect(() => {
    if (filter === "range") {
      const today = new Date().toISOString().split("T")[0];
      setCustomStart(today);
      setCustomEnd(today);
    }
  }, [filter]);

  // Auto-dismiss toast
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  // Fetch orders
  useEffect(() => {
    const fetchOrders = async () => {
      const { data, error } = await supabase
        .from("orders")
        .select(`id, created_at, total_amount, payment_mode, order_items (item_name, quantity, order_id, price)`)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error loading orders:", error);
        setToast("Failed to load orders ❌");
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

  // Filter orders
  const filterOrders = (orders: Order[]) => {
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
          return orderDate.getMonth() === now.getMonth() && orderDate.getFullYear() === now.getFullYear();
        case "year":
          return orderDate.getFullYear() === now.getFullYear();
        case "date":
          return orderDate.toDateString() === new Date(selectedDate).toDateString();
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
  const grandTotal = filteredOrders.reduce((sum, o) => sum + (o.total_amount || 0), 0);

  // Save updated quantity
  const handleSaveQuantity = async (orderId: number, itemName: string, quantity: number) => {
    if (!isAdmin) return;

    const { error } = await supabase
      .from("order_items")
      .update({ quantity })
      .eq("order_id", orderId)
      .eq("item_name", itemName);

    if (error) {
      console.error("Update item error:", error.message);
      setToast("Failed to update item ❌");
      return;
    }

    const order = pastOrders.find((o) => o.id === orderId);
    if (!order) return;
    const updatedItems = order.items.map((it) =>
      it.item_name === itemName ? { ...it, quantity } : it
    );
    const total_amount = updatedItems.reduce((sum, it) => sum + it.quantity*(it.price ?? 0), 0); // adjust if price info exists

    await supabase
      .from("orders")
      .update({ total_amount })
      .eq("id", orderId);

    setPastOrders((prev) =>
      prev.map((o) =>
        o.id === orderId ? { ...o, items: updatedItems, total_amount } : o
      )
    );

    setEditingItem(null);
    setToast("Item updated ✅");
  };

  // Trigger delete confirmation
  const handleDeleteClick = (orderId: number, itemName: string) => {
    if (!isAdmin) return;
    setDeleteItem({ orderId, itemName });
  };

  // Confirm deletion
  const confirmDelete = async () => {
    if (!deleteItem) return;
    const { orderId, itemName } = deleteItem;

    const { error } = await supabase
      .from("order_items")
      .delete()
      .eq("order_id", orderId)
      .eq("item_name", itemName);

    if (error) {
      console.error("Delete item error:", error.message);
      setToast("Failed to delete item ❌");
      setDeleteItem(null);
      return;
    }

    const order = pastOrders.find((o) => o.id === orderId);
    if (!order) return;

    const updatedItems = order.items.filter((it) => it.item_name !== itemName);

    if (updatedItems.length === 0) {
      await supabase.from("orders").delete().eq("id", orderId);
      setPastOrders((prev) => prev.filter((o) => o.id !== orderId));
      setToast("Order deleted ✅");
    } else {
      const total_amount = updatedItems.reduce((sum, it) => sum + it.quantity*(it.price ?? 0), 0);
      await supabase.from("orders").update({ total_amount }).eq("id", orderId);
      setPastOrders((prev) =>
        prev.map((o) =>
          o.id === orderId ? { ...o, items: updatedItems, total_amount } : o
        )
      );
      setToast("Item deleted ✅");
    }

    setDeleteItem(null);
  };

  const cancelDelete = () => setDeleteItem(null);

  return (
    <div className="pst-bg">
    <div style={{ maxHeight: "500px", overflowY: "auto" }}>
      <h2>Past Orders</h2>

      {/* Filter */}
      <div style={{ marginBottom: "1rem" }}>
        <label>Filter: </label>
        <select value={filter} onChange={(e) => setFilter(e.target.value as any)}>
          <option value="today">Today</option>
          <option value="week">This Week</option>
          <option value="month">This Month</option>
          <option value="year">This Year</option>
           <option value="date">Select Date</option>
          <option value="range">Custom Range</option>
        </select>

        {filter === "date" && (
          <span style={{ marginLeft: "1rem" }}>
            Date:{" "}
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
            />
          </span>
        )}


        {filter === "range" && (
          <span style={{ marginLeft: "1rem" }}>
            From:{" "}
            <input type="date" value={customStart} onChange={(e) => setCustomStart(e.target.value)} />
            To:{" "}
            <input type="date" value={customEnd} onChange={(e) => setCustomEnd(e.target.value)} />
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
                <td>{formatDate(order.created_at)}</td>
                <td>
                  {order.items.map((it, idx) => (
                    <div key={idx} style={{ marginBottom: "4px" }}>
                      {editingItem &&
                      editingItem.orderId === order.id &&
                      editingItem.itemName === it.item_name ? (
                        <>
                          <input
                            type="number"
                            min={1}
                            value={editingItem.quantity}
                            onChange={(e) =>
                              setEditingItem({ ...editingItem, quantity: parseInt(e.target.value) })
                            }
                          />
                          <button onClick={() => handleSaveQuantity(order.id, it.item_name, editingItem.quantity)}>💾</button>
                          <button onClick={() => setEditingItem(null)}>❌</button>
                        </>
                      ) : (
                        <>
                          {it.item_name} × {it.quantity}
                          {isAdmin && (
                            <>
                              <button style={{ marginLeft: "8px" }} onClick={() => setEditingItem({ orderId: order.id, itemName: it.item_name, quantity: it.quantity })}>✏️</button>
                              <button style={{ marginLeft: "4px" }} onClick={() => handleDeleteClick(order.id, it.item_name)}>🗑️</button>
                            </>
                          )}
                        </>
                      )}
                    </div>
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

      {/* Toast */}
{toast && (
  <div
    style={{
      position: "fixed",
      top: "20px",
      left: "50%",
      transform: "translateX(-50%)",
      padding: "10px 20px",
      background: "#333",
      color: "#fff",
      borderRadius: "5px",
      zIndex: 1000,
    }}
  >
    {toast}
  </div>
)}


      {/* Delete Confirmation Modal */}
      {deleteItem && (
        <div style={{
          position: "fixed", top:0, left:0, width:"100%", height:"100%",
          background:"rgba(0,0,0,0.5)", display:"flex", justifyContent:"center", alignItems:"center"
        }}>
          <div style={{ background:"#fff", padding:"20px", borderRadius:"8px", minWidth:"300px" }}>
            <p>Are you sure you want to delete <strong>{deleteItem.itemName}</strong>?</p>
            <button onClick={confirmDelete}>Yes</button>
            <button onClick={cancelDelete} style={{ marginLeft:"10px" }}>No</button>
          </div>
        </div>
      )}
</div>
    <div
  style={{
    marginTop: "10px",
    fontWeight: "bold",
    textAlign: "left",
    color: 'black',
    backgroundColor: 'grey',

  }}
>
  Grand Total: ₹{grandTotal}
</div>

    </div>
    
  );
};

export default ViewPastOrders;
