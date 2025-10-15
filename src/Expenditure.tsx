import React, { useState, useEffect, useRef } from "react";
import { supabase } from "./supabaseClient";
import { formatDate } from "./formatDate";
import "./css/expenditure.css";
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

interface Item {
  id: number;
  name: string;
  category: string;
}

// Utility: always return YYYY-MM-DD in local timezone
const getLocalDate = (d: Date = new Date()) =>
  new Date(d.getTime() - d.getTimezoneOffset() * 60000)
    .toISOString()
    .split("T")[0];

const Expenditure: React.FC<ExpenditureProps> = ({ cafeId, role }) => {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [filteredExpenses, setFilteredExpenses] = useState<Expense[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [search, setSearch] = useState("");
  const [selectedDate, setSelectedDate] = useState(getLocalDate());
  const [filter, setFilter] = useState<"day" | "week" | "month" | "year">(
    "day"
  );
  const [form, setForm] = useState({
    category: "",
    item: "",
    rate: "",
    quantity: "1",
    amount: "",
    date: getLocalDate(),
    payment_mode: "Cash",
    isNew: false,
  });
  const [editingId, setEditingId] = useState<number | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const [categories, setCategories] = useState<string[]>([]);
  const itemInputRef = useRef<HTMLDivElement>(null);
  const [highlightedIndex, setHighlightedIndex] = useState<number>(-1);
  const topRef = useRef<HTMLDivElement>(null);

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

  // Fetch items list
  useEffect(() => {
    const fetchItems = async () => {
      const { data, error } = await supabase
        .from("expenditure_items")
        .select("*");
      if (!error && data) setItems(data as Item[]);
    };
    fetchItems();
  }, []);

  // Filter logic
  useEffect(() => {
    const selected = new Date(selectedDate);
    const filtered = expenses.filter((exp) => {
      const expDate = new Date(exp.date);
      if (isNaN(expDate.getTime())) return false;

      if (filter === "day")
        return expDate.toDateString() === selected.toDateString();
      if (filter === "week") {
        const startOfWeek = new Date(selected);
        startOfWeek.setDate(selected.getDate() - selected.getDay());
        startOfWeek.setHours(0, 0, 0, 0);
        const endOfWeek = new Date(startOfWeek);
        endOfWeek.setDate(startOfWeek.getDate() + 6);
        endOfWeek.setHours(23, 59, 59, 999);
        return expDate >= startOfWeek && expDate <= endOfWeek;
      }
      if (filter === "month")
        return (
          expDate.getMonth() === selected.getMonth() &&
          expDate.getFullYear() === selected.getFullYear()
        );
      if (filter === "year")
        return expDate.getFullYear() === selected.getFullYear();
      return false;
    });
    setFilteredExpenses(filtered);
  }, [expenses, selectedDate, filter]);

  useEffect(() => {
    const fetchItems = async () => {
      const { data, error } = await supabase
        .from("expenditure_items")
        .select("*");
      if (!error && data) {
        setItems(data as Item[]);
        const uniqueCategories = Array.from(
          new Set(data.map((i) => i.category))
        );
        setCategories(uniqueCategories);
      }
    };
    fetchItems();
  }, []);

  // Form change
  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    let updated = { ...form, [name]: value };

    if (name === "item") {
      const matched = items.find(
        (i) => i.name.toLowerCase() === value.toLowerCase()
      );
      if (matched) {
        updated.category = matched.category; // auto-fill category
      }
    }

    if (name === "rate" || name === "quantity") {
      const rate = parseFloat(name === "rate" ? value : updated.rate || "0");
      const qty = parseFloat(
        name === "quantity" ? value : updated.quantity || "0"
      );
      updated.amount =
        !isNaN(rate) && !isNaN(qty) ? (rate * qty).toFixed(2) : "";
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
      date: getLocalDate(),
      payment_mode: "Cash",
      isNew: false,
    });
    setSearch("");
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
      isNew: false,
    });
    setSearch(exp.item);
    topRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  // Delete with modal
  const handleDelete = (id: number) => {
    if (!isAdmin) return;
    setDeleteId(id);
  };

  const confirmDelete = async () => {
    if (deleteId === null) return;
    const { error } = await supabase
      .from("expenditures")
      .delete()
      .eq("id", deleteId);
    if (!error) {
      setExpenses(expenses.filter((exp) => exp.id !== deleteId));
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

    try {
      // 1️⃣ If this is a new item, insert it into expenditure_items
      if (form.isNew) {
        const { data: newItemData, error: newItemError } = await supabase
          .from("expenditure_items")
          .insert([{ name: form.item, category: form.category }])
          .select();

        if (newItemError) {
          console.error("Failed to add new item:", newItemError.message);
          setToast("Failed to add new item ❌");
          return;
        }

        // Update local items state with the newly added item
        if (newItemData && newItemData.length > 0) {
          setItems((prev) => [...prev, newItemData[0] as Item]);
        }

        // Reset isNew flag
        setForm((prev) => ({ ...prev, isNew: false }));
      }

      // 2️⃣ Insert/update the expense
      const expenseData = {
        category: form.category,
        item: form.item,
        rate,
        quantity: qty,
        date: getLocalDate(new Date(form.date)),
        payment_mode: form.payment_mode,
        cafe_id: cafeId,
      };

      if (editingId) {
        if (!isAdmin) return;
        const { data, error } = await supabase
          .from("expenditures")
          .update(expenseData)
          .eq("id", editingId)
          .select();

        if (!error && data) {
          setExpenses(
            expenses.map((exp) => (exp.id === editingId ? data[0] : exp))
          );
          setToast("Expense updated ✅");
          handleCancel();
        }
      } else {
        const { data, error } = await supabase
          .from("expenditures")
          .insert([expenseData])
          .select();

        if (!error && data) {
          setExpenses([data[0], ...expenses]);
          setToast("Expense added ✅");
          handleCancel();
        } else if (error) {
          console.error("Insert expense error:", error.message);
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
  const cashTotal = filteredExpenses
    .filter((exp) => exp.payment_mode === "Cash")
    .reduce((sum, exp) => sum + exp.amount, 0);
  const upiTotal = filteredExpenses
    .filter((exp) => exp.payment_mode === "UPI")
    .reduce((sum, exp) => sum + exp.amount, 0);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        itemInputRef.current &&
        !itemInputRef.current.contains(event.target as Node)
      ) {
        setShowDropdown(false);
        setForm((prev) => {
          // Only reset if it's NOT a new item
          if (!prev.isNew && !items.find((i) => i.name === prev.item)) {
            setSearch(""); // Show placeholder again
            return { ...prev, item: "", category: "" };
          }
          return prev;
        });
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [items]);

  // Filtered items for search suggestions
  const suggestedItems = items.filter((i) =>
    i.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="exp-bg">
      <div ref={topRef}></div>
      <h2>💰 Expenditure</h2>

      {/* Add/Edit Form */}
      <form onSubmit={handleSubmit} className="exp-form">
        {/* Date Input */}
        <input
          type="date"
          name="date"
          value={form.date}
          onChange={handleChange}
          required
          className="exp-input"
        />

        {/* Item Search with Suggestions */}
        {/* Item Search with Suggestions */}
        {/* Item Search with Suggestions */}
        <div className="item-wrapper" ref={itemInputRef}>
          <input
            type="text"
            name="item"
            placeholder="Search or select item"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setForm((prev) => ({ ...prev, item: e.target.value }));
              setShowDropdown(true);
              setHighlightedIndex(-1);
            }}
            onFocus={() => setShowDropdown(true)}
            onKeyDown={(e) => {
              if (!showDropdown) return;

              if (e.key === "ArrowDown") {
                e.preventDefault();
                setHighlightedIndex((prev) =>
                  prev < suggestedItems.length - 1 ? prev + 1 : prev
                );
              } else if (e.key === "ArrowUp") {
                e.preventDefault();
                setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : -1));
              } else if (e.key === "Enter") {
                e.preventDefault();
                if (
                  highlightedIndex >= 0 &&
                  highlightedIndex < suggestedItems.length
                ) {
                  const selected = suggestedItems[highlightedIndex];
                  setSearch(selected.name);
                  setForm((prev) => ({
                    ...prev,
                    item: selected.name,
                    category: selected.category,
                    isNew: false, // mark as existing item
                  }));
                  setShowDropdown(false);
                } else if (isAdmin) {
                  // Admin adding a new item
                  setForm((prev) => ({
                    ...prev,
                    item: search,
                    category: "", // category can be selected
                    isNew: true, // mark as new item
                  }));
                  setShowDropdown(false);
                }
              } else if (e.key === "Escape") {
                setShowDropdown(false);
              }
            }}
            className="exp-input search-input"
          />

          {showDropdown && (
            <ul className="item-suggestions">
              {suggestedItems.length > 0 ? (
                suggestedItems.map((i, idx) => (
                  <li
                    key={i.id}
                    className={idx === highlightedIndex ? "highlighted" : ""}
                    onMouseEnter={() => setHighlightedIndex(idx)}
                    onClick={() => {
                      setSearch(i.name);
                      setForm((prev) => ({
                        ...prev,
                        item: i.name,
                        category: i.category,
                        isNew: false,
                      }));
                      setShowDropdown(false);
                    }}
                  >
                    {i.name}
                  </li>
                ))
              ) : isAdmin ? (
                <li
                  className="custom-item-option"
                  onClick={() => {
                    setForm((prev) => ({
                      ...prev,
                      item: search,
                      category: "",
                      isNew: true, // new item
                    }));
                    setShowDropdown(false);
                  }}
                >
                  + Add New Item
                </li>
              ) : (
                <li className="no-item-option">No items found</li>
              )}
            </ul>
          )}
        </div>

        {/* Category selection */}
        <select
          name="category"
          value={form.category}
          onChange={(e) =>
            setForm((prev) => ({
              ...prev,
              category: e.target.value,
              // only set item if it's an existing item
              item: prev.isNew ? prev.item : prev.item,
            }))
          }
          required
          className="category-select"
          disabled={!isAdmin && !form.isNew}
        >
          <option value="">Select Category</option>
          {categories.map((cat) => (
            <option key={cat} value={cat}>
              {cat}
            </option>
          ))}
        </select>

        {/* Rate and Quantity Inputs */}
        <input
          type="number"
          name="rate"
          placeholder="Rate (₹)"
          value={form.rate}
          onChange={handleChange}
          required
          className="exp-input"
        />
        <input
          type="number"
          name="quantity"
          placeholder="Quantity"
          value={form.quantity}
          onChange={handleChange}
          required
          className="exp-input"
        />

        {/* Amount Display */}
        <div>Amount: ₹{form.amount}</div>

        {/* Payment Mode */}
        <div className="payment-container">
          {["Cash", "UPI"].map((mode) => (
            <label
              key={mode}
              className={`payment-label ${
                form.payment_mode === mode ? "active" : ""
              }`}
            >
              <input
                type="radio"
                name="payment_mode"
                value={mode}
                checked={form.payment_mode === mode}
                onChange={handleChange}
                className="hidden-radio"
              />
              {mode}
            </label>
          ))}
        </div>

        {/* Submit & Cancel Buttons */}
        <div className="submit-btn-container">
          <button type="submit" className="submit-btn">
            {editingId ? "💾 Save Changes" : "+ Add Expense"}
          </button>
          {editingId && (
            <button type="button" onClick={handleCancel} className="cancel-btn">
              ❌ Cancel
            </button>
          )}
        </div>
      </form>

      <h2>💰 Past Expenditures</h2>
      {/* Date & Filter */}
      <div className="filter-container">
        <label>Select Date: </label>
        <input
          type="date"
          value={selectedDate}
          onChange={(e) => setSelectedDate(e.target.value)}
        />
        <div className="filter-buttons">
          <button onClick={() => setFilter("day")}>Today</button>
          <button onClick={() => setFilter("week")}>This Week</button>
          <button onClick={() => setFilter("month")}>This Month</button>
          <button onClick={() => setFilter("year")}>This Year</button>
        </div>
      </div>
      {/* Expenditure Table */}
      <table border={1} cellPadding={8} className="exp-table">
        <thead>
          <tr>
            <th>ID</th>
            <th>Category</th>
            <th>Item</th>
            <th>Rate</th>
            <th>Qty</th>
            <th>Amount</th>
            <th>Date</th>
            <th>Payment Mode</th>
            {isAdmin && <th>Actions</th>}
          </tr>
        </thead>
        <tbody>
          {filteredExpenses.length === 0 ? (
            <tr>
              <td colSpan={isAdmin ? 9 : 8} style={{ textAlign: "center" }}>
                No expenses found
              </td>
            </tr>
          ) : (
            filteredExpenses.map((exp) => (
              <tr key={exp.id}>
                <td>{exp.id}</td>
                <td>{exp.category}</td>
                <td>{exp.item}</td>
                <td>{exp.rate.toFixed(2)}</td>
                <td>{exp.quantity}</td>
                <td>{exp.amount.toFixed(2)}</td>
                <td>{formatDate(exp.date)}</td>
                <td>{exp.payment_mode}</td>
                {isAdmin && (
                  <td>
                    <button onClick={() => handleEdit(exp)}>✏️</button>
                    <button onClick={() => handleDelete(exp.id)}>🗑️</button>
                  </td>
                )}
              </tr>
            ))
          )}
          {filteredExpenses.length > 0 && (
            <>
              <tr style={{ fontWeight: "bold" }}>
                <td colSpan={5}>Cash Total</td>
                <td>{cashTotal.toFixed(2)}</td>
                <td colSpan={isAdmin ? 3 : 2}></td>
              </tr>
              <tr style={{ fontWeight: "bold" }}>
                <td colSpan={5}>UPI Total</td>
                <td>{upiTotal.toFixed(2)}</td>
                <td colSpan={isAdmin ? 3 : 2}></td>
              </tr>
              <tr style={{ fontWeight: "bold" }}>
                <td colSpan={5}>Grand Total</td>
                <td>{total.toFixed(2)}</td>
                <td colSpan={isAdmin ? 3 : 2}></td>
              </tr>
            </>
          )}
        </tbody>
      </table>

      {/* Toast */}
      {toast && <div className="toast">{toast}</div>}

      {/* Delete Modal */}
      {deleteId !== null && (
        <div className="delete-modal">
          <div className="delete-modal-content">
            <p>Are you sure you want to delete this expense?</p>
            <button onClick={confirmDelete}>Yes</button>
            <button onClick={cancelDelete}>No</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Expenditure;
