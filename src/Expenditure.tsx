import React, { useState, useEffect } from "react";
import { supabase } from "./supabaseClient";
import { formatDate } from "./formatDate";

interface ExpenditureProps {
  cafeId: number | null;
  role?: "admin" | "staff" | "viewer";
}

interface Expense {
  id: number;
  category: string;
  item: string;
  rate: number;
  quantity: number;
  amount: number;
  date: string;
  payment_mode: "Cash" | "UPI";
}

const Expenditure: React.FC<ExpenditureProps> = ({ cafeId, role }) => {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [filteredExpenses, setFilteredExpenses] = useState<Expense[]>([]);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split("T")[0]);
  const [filter, setFilter] = useState<"day" | "week" | "month" | "year">("day");
  const [form, setForm] = useState({
    category: "",
    item: "",
    rate: "",
    quantity: "1",
    amount: "",
    date: new Date().toISOString().split("T")[0],
    payment_mode: "Cash",
  });
  const [editingId, setEditingId] = useState<number | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);

  const isAdmin = role === "admin";

  // Auto-dismiss toast
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  // Fetch expenses
  useEffect(() => {
    if (!cafeId) return;
    const fetchExpenses = async () => {
      const { data, error } = await supabase
        .from("expenditures")
        .select("*")
        .eq("cafe_id", cafeId)
        .order("date", { ascending: false });
      if (!error && data) setExpenses(data as Expense[]);
    };
    fetchExpenses();
  }, [cafeId]);

  // Filter logic
  useEffect(() => {
    const selected = new Date(selectedDate);
    const filtered = expenses.filter((exp) => {
      const expDate = new Date(exp.date);
      if (isNaN(expDate.getTime())) return false;

      if (filter === "day") return expDate.toDateString() === selected.toDateString();
      if (filter === "week") {
        const startOfWeek = new Date(selected);
        startOfWeek.setDate(selected.getDate() - selected.getDay());
        startOfWeek.setHours(0, 0, 0, 0);
        const endOfWeek = new Date(startOfWeek);
        endOfWeek.setDate(startOfWeek.getDate() + 6);
        endOfWeek.setHours(23, 59, 59, 999);
        return expDate >= startOfWeek && expDate <= endOfWeek;
      }
      if (filter === "month") return expDate.getMonth() === selected.getMonth() && expDate.getFullYear() === selected.getFullYear();
      if (filter === "year") return expDate.getFullYear() === selected.getFullYear();
      return false;
    });
    setFilteredExpenses(filtered);
  }, [expenses, selectedDate, filter]);

  // Form change
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    let updated = { ...form, [name]: value };
    if (name === "rate" || name === "quantity") {
      const rate = parseFloat(name === "rate" ? value : updated.rate || "0");
      const qty = parseFloat(name === "quantity" ? value : updated.quantity || "0");
      updated.amount = (!isNaN(rate) && !isNaN(qty)) ? (rate * qty).toFixed(2) : "";
    }
    setForm(updated);
  };

  // Cancel edit
  const handleCancel = () => {
    setEditingId(null);
    setForm({
      category: "",
      item: "",
      rate: "",
      quantity: "1",
      amount: "",
      date: new Date().toISOString().split("T")[0],
      payment_mode: "Cash",
    });
  };

  // Edit
  const handleEdit = (exp: Expense) => {
    if (!isAdmin) return;
    setEditingId(exp.id);
    setForm({
      category: exp.category,
      item: exp.item,
      rate: exp.rate.toString(),
      quantity: exp.quantity.toString(),
      amount: exp.amount.toFixed(2),
      date: exp.date,
      payment_mode: exp.payment_mode,
    });
  };

  // Delete with modal
  const handleDelete = (id: number) => {
    if (!isAdmin) return;
    setDeleteId(id);
  };

  const confirmDelete = async () => {
    if (deleteId === null) return;
    const { error } = await supabase.from("expenditures").delete().eq("id", deleteId);
    if (!error) {
      setExpenses(expenses.filter(exp => exp.id !== deleteId));
      setToast("Expense deleted ✅");
    }
    setDeleteId(null);
  };

  const cancelDelete = () => setDeleteId(null);

  // Submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.category || !form.item || !form.rate || !form.quantity) {
      alert("Please fill all required fields");
      return;
    }

    const rate = parseFloat(form.rate);
    const qty = parseFloat(form.quantity);
    if (!cafeId) return;
    const expenseData = {
      category: form.category,
      item: form.item,
      rate,
      quantity: qty,
      date: form.date,
      payment_mode: form.payment_mode,
      cafe_id: cafeId,
    };

    try {
      if (editingId) {
        if (!isAdmin) return;
        const { data, error } = await supabase.from("expenditures").update(expenseData).eq("id", editingId).select();
        if (!error && data) {
          setExpenses(expenses.map(exp => (exp.id === editingId ? data[0] : exp)));
          setToast("Expense updated ✅");
          handleCancel();
        }
      } else {
        const { data, error } = await supabase.from("expenditures").insert([expenseData]).select();
        if (!error && data) {
          setExpenses([data[0], ...expenses]);
          setToast("Expense added ✅");
          handleCancel();
        } else if (error) {
          console.error("Insert error:", error.message);
          setToast("Failed to add expense ❌");
        }
      }
    } catch (err) {
      console.error(err);
      setToast("Operation failed ❌");
    }
  };

  // Totals
  const total = filteredExpenses.reduce((sum, exp) => sum + exp.amount, 0);
  const cashTotal = filteredExpenses.filter(exp => exp.payment_mode === "Cash").reduce((sum, exp) => sum + exp.amount, 0);
  const upiTotal = filteredExpenses.filter(exp => exp.payment_mode === "UPI").reduce((sum, exp) => sum + exp.amount, 0);

  return (
    <div className = "exp-bg">
      <h2>💰 Expenditure</h2>

      {/* Date & Filter */}
      <div style={{ marginBottom: "20px" }}>
        <label>Select Date: </label>
        <input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} />
        <div style={{ marginTop: "10px" }}>
          <button onClick={() => setFilter("day")}>Today</button>
          <button onClick={() => setFilter("week")}>This Week</button>
          <button onClick={() => setFilter("month")}>This Month</button>
          <button onClick={() => setFilter("year")}>This Year</button>
        </div>
      </div>

      {/* Add/Edit Form */}
      <form onSubmit={handleSubmit} style={{  display: "grid", 
    gap: "15px", 
    maxWidth: "500px", 
    marginBottom: "20px",
    padding: "20px",
    border: "1px solid #ddd",
    borderRadius: "8px",
    background: "#fafafa",
    boxShadow: "0 2px 6px rgba(0,0,0,0.1)" }}>
        <select name="category" value={form.category} onChange={handleChange} required style={{
    padding: "10px",
    border: "1px solid #ccc",
    borderRadius: "6px",
    fontSize: "14px",
    width: "100%",
    boxSizing: "border-box"
  }}>
          <option value="">Select Category</option>
          <option value="Veg">Veg</option>
          <option value="Meat">Meat</option>
          <option value="Grocery">Grocery</option>
          <option value="Coffee">Coffee</option>
          <option value="Rent">Rent</option>
          <option value="Utilities">Utilities</option>
          <option value="Misc">Misc</option>
        </select>
        <input type="text" name="item" placeholder="Item" value={form.item} onChange={handleChange} required  style={{
    padding: "10px",
    border: "1px solid #ccc",
    borderRadius: "6px",
    fontSize: "14px",
    width: "100%",
    boxSizing: "border-box"
  }}/>
        <input type="number" name="rate" placeholder="Rate (₹)" value={form.rate} onChange={handleChange} required style={{
    padding: "10px",
    border: "1px solid #ccc",
    borderRadius: "6px",
    fontSize: "14px",
    width: "100%",
    boxSizing: "border-box"
  }}/>
        <input type="number" name="quantity" placeholder="Quantity" value={form.quantity} onChange={handleChange} required style={{
    padding: "10px",
    border: "1px solid #ccc",
    borderRadius: "6px",
    fontSize: "14px",
    width: "100%",
    boxSizing: "border-box"
  }}/>
        <input type="number" name="amount" placeholder="Amount" value={form.amount} readOnly style={{
    padding: "10px",
    border: "1px solid #ccc",
    borderRadius: "6px",
    fontSize: "14px",
    width: "100%",
    boxSizing: "border-box"
  }}/>
        <input type="date" name="date" value={form.date} onChange={handleChange} required style={{
    padding: "10px",
    border: "1px solid #ccc",
    borderRadius: "6px",
    fontSize: "14px",
    width: "100%",
    boxSizing: "border-box"
  }}/>
        <div style={{ display: "flex", gap: "10px" }}>
  <label
    style={{
      padding: "8px 15px",
      border: "1px solid #ccc",
      borderRadius: "6px",
      cursor: "pointer",
      background: form.payment_mode === "Cash" ? "#007bff" : "#f9f9f9",
      color: form.payment_mode === "Cash" ? "#fff" : "#333",
      fontWeight: form.payment_mode === "Cash" ? "bold" : "normal",
      transition: "all 0.2s ease",
    }}
  >
    <input
      type="radio"
      name="payment_mode"
      value="Cash"
      checked={form.payment_mode === "Cash"}
      onChange={handleChange}
      style={{ display: "none" }}
    />
    Cash
  </label>

  <label
    style={{
      padding: "8px 15px",
      border: "1px solid #ccc",
      borderRadius: "6px",
      cursor: "pointer",
      background: form.payment_mode === "UPI" ? "#007bff" : "#f9f9f9",
      color: form.payment_mode === "UPI" ? "#fff" : "#333",
      fontWeight: form.payment_mode === "UPI" ? "bold" : "normal",
      transition: "all 0.2s ease",
    }}
  >
    <input
      type="radio"
      name="payment_mode"
      value="UPI"
      checked={form.payment_mode === "UPI"}
      onChange={handleChange}
      style={{ display: "none" }}
    />
    UPI
  </label>
</div>

        <button type="submit"  style={{
    background: "#007e4eff",
    color: "#fff",
    padding: "10px 15px",
    border: "none",
    borderRadius: "6px",
    cursor: "pointer",
    fontSize: "14px"
  }}>{editingId ? "💾 Save Changes" : "+ Add Expense"}</button>
        {editingId && <button type="button" onClick={handleCancel} style={{
      background: "#dc3545",
      color: "#fff",
      padding: "10px 15px",
      border: "none",
      borderRadius: "6px",
      cursor: "pointer",
      fontSize: "14px",
      marginLeft: "10px"
    }}>❌ Cancel</button>}
      </form>

      {/* Expenditure Table */}
      <table border={1} cellPadding={8} style={{ borderCollapse: "collapse", width: "100%" }}>
        <thead>
          <tr>
            <th>ID</th><th>Category</th><th>Item</th><th>Rate</th><th>Qty</th><th>Amount</th><th>Date</th><th>Payment Mode</th>
            {isAdmin && <th>Actions</th>}
          </tr>
        </thead>
        <tbody>
          {filteredExpenses.length === 0 ? (
            <tr><td colSpan={isAdmin ? 9 : 8} style={{ textAlign: "center" }}>No expenses found</td></tr>
          ) : filteredExpenses.map(exp => (
            <tr key={exp.id}>
              <td>{exp.id}</td>
              <td>{exp.category}</td>
              <td>{exp.item}</td>
              <td>{exp.rate.toFixed(2)}</td>
              <td>{exp.quantity}</td>
              <td>{exp.amount.toFixed(2)}</td>
              <td>{formatDate(exp.date)}</td>
              <td>{exp.payment_mode}</td>
              {isAdmin && <td>
                <button onClick={()=>handleEdit(exp)}>✏️</button>
                <button onClick={()=>handleDelete(exp.id)}>🗑️</button>
              </td>}
            </tr>
          ))}
          {filteredExpenses.length > 0 && <>
            <tr style={{ fontWeight:"bold"}}><td colSpan={5}>Cash Total</td><td>{cashTotal.toFixed(2)}</td><td colSpan={isAdmin?3:2}></td></tr>
            <tr style={{ fontWeight:"bold"}}><td colSpan={5}>UPI Total</td><td>{upiTotal.toFixed(2)}</td><td colSpan={isAdmin?3:2}></td></tr>
            <tr style={{ fontWeight:"bold", backgroundColor:"#f0f0f0"}}><td colSpan={5}>Grand Total</td><td>{total.toFixed(2)}</td><td colSpan={isAdmin?3:2}></td></tr>
          </>}
        </tbody>
      </table>

      {/* Toast */}
      {toast && <div style={{ position:"fixed", bottom:"20px", right:"20px", padding:"10px", background:"#333", color:"#fff", borderRadius:"5px" }}>{toast}</div>}

      {/* Delete Confirmation Modal */}
      {deleteId !== null && (
        <div style={{ position:"fixed", top:0,left:0,width:"100%",height:"100%", background:"rgba(0,0,0,0.5)", display:"flex", justifyContent:"center", alignItems:"center" }}>
          <div style={{ background:"#fff", padding:"20px", borderRadius:"8px", minWidth:"300px" }}>
            <p>Are you sure you want to delete this expense?</p>
            <button onClick={confirmDelete}>Yes</button>
            <button onClick={cancelDelete} style={{ marginLeft:"10px" }}>No</button>
          </div>
        </div>
      )}

    </div>
  );
};

export default Expenditure;
