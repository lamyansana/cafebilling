import React, { useState, useEffect } from "react"
import { supabase } from "./supabaseClient"

interface ExpenditureProps {
  //session: any; 
  cafeId: number | null;  // <-- receive cafeId as prop
}

interface Expense {
  id: number
  category: string
  item: string
  rate: number
  quantity: number
  amount: number
  date: string
  payment_mode: "Cash" | "UPI"
}

const Expenditure: React.FC<ExpenditureProps> = ({ cafeId }) => {
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [filteredExpenses, setFilteredExpenses] = useState<Expense[]>([])
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split("T")[0])
  const [filter, setFilter] = useState<"day" | "week" | "month" | "year">("day")

  const [form, setForm] = useState({
    category: "",
    item: "",
    rate: "",
    quantity: "1",
    amount: "",
    date: new Date().toISOString().split("T")[0],
    payment_mode: "Cash",
  })

  // ✅ Fetch expenditures from Supabase
  useEffect(() => {
    if (!cafeId) return; // Don't fetch if cafeId is null

    const fetchExpenses = async () => {
      const { data, error } = await supabase
        .from("expenditures")
        .select("*")
        .eq("cafe_id", cafeId) 
        .order("date", { ascending: false })

      if (error) {
        console.error("Fetch error:", error.message)
      } else if (data) {
        setExpenses(data as Expense[])
      }
    }

    fetchExpenses()
  }, [cafeId])

  // ✅ Filter logic
  useEffect(() => {
    const selected = new Date(selectedDate)
    const filtered = expenses.filter((exp) => {
      const expDate = new Date(exp.date)
      if (isNaN(expDate.getTime())) return false

      if (filter === "day") {
        return expDate.toDateString() === selected.toDateString()
      } else if (filter === "week") {
        const startOfWeek = new Date(selected)
        startOfWeek.setDate(selected.getDate() - selected.getDay())
        startOfWeek.setHours(0, 0, 0, 0)

        const endOfWeek = new Date(startOfWeek)
        endOfWeek.setDate(startOfWeek.getDate() + 6)
        endOfWeek.setHours(23, 59, 59, 999)

        return expDate >= startOfWeek && expDate <= endOfWeek
      } else if (filter === "month") {
        return (
          expDate.getMonth() === selected.getMonth() &&
          expDate.getFullYear() === selected.getFullYear()
        )
      } else if (filter === "year") {
        return expDate.getFullYear() === selected.getFullYear()
      }
      return false
    })

    setFilteredExpenses(filtered)
  }, [expenses, selectedDate, filter])

  // ✅ Form change
  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target
    let updated = { ...form, [name]: value }

    if (name === "rate" || name === "quantity") {
      const rate = parseFloat(name === "rate" ? value : updated.rate || "0")
      const qty = parseFloat(name === "quantity" ? value : updated.quantity || "0")
      if (!isNaN(rate) && !isNaN(qty)) {
        updated.amount = (rate * qty).toFixed(2)
      }
    }

    setForm(updated)
  }


  // ✅ Submit new expense to Supabase
const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  if (!form.category || !form.item || !form.rate || !form.quantity) {
    alert("Please fill in all required fields");
    return;
  }

  if (!cafeId) {
    alert("Cafe ID is missing!");
    return;
  }

  const newExpense = {
    cafe_id: cafeId, // <-- include cafeId here
    category: form.category,
    item: form.item,
    rate: parseFloat(form.rate),
    quantity: parseFloat(form.quantity),
    //amount: parseFloat(form.amount),
    date: form.date,
    payment_mode: form.payment_mode,
  };

  const { data, error } = await supabase
    .from("expenditures")
    .insert([newExpense])
    .select();

  if (error) {
    console.error("Insert error:", error.message);
    alert("Failed to add expense");
  } else if (data && data.length > 0) {
    setExpenses([data[0] as Expense, ...expenses]);
    setForm({
      category: "",
      item: "",
      rate: "",
      quantity: "1",
      amount: "",
      date: new Date().toISOString().split("T")[0],
      payment_mode: "Cash",
    });
  }
}


  
    // ✅ Totals
  const total = filteredExpenses.reduce((sum, exp) => sum + exp.amount, 0)
  const cashTotal = filteredExpenses
    .filter((exp) => exp.payment_mode === "Cash")
    .reduce((sum, exp) => sum + exp.amount, 0)

  const upiTotal = filteredExpenses
    .filter((exp) => exp.payment_mode === "UPI")
    .reduce((sum, exp) => sum + exp.amount, 0)


  return (
    <div style={{ padding: "20px" }}>
      <h2>💰 Expenditure</h2>

      {/* ✅ Date & Filter */}
      <div style={{ marginBottom: "20px" }}>
        <label>Select Date: </label>
        <input
          type="date"
          value={selectedDate}
          onChange={(e) => setSelectedDate(e.target.value)}
        />
        <div style={{ marginTop: "10px" }}>
          <button onClick={() => setFilter("day")}>Today</button>
          <button onClick={() => setFilter("week")}>This Week</button>
          <button onClick={() => setFilter("month")}>This Month</button>
          <button onClick={() => setFilter("year")}>This Year</button>
        </div>
      </div>

      {/* ✅ Add Expense Form */}
      <form
        onSubmit={handleSubmit}
        style={{ display: "grid", gap: "10px", maxWidth: "600px", marginBottom: "20px" }}
      >
        <select name="category" value={form.category} onChange={handleChange} required>
          <option value="">Select Category</option>
          <option value="Veg">Veg</option>
          <option value="Meat">Meat</option>
          <option value="Grocery">Grocery</option>
          <option value="Coffee">Coffee</option>
          <option value="Rent">Rent</option>
          <option value="Utilities">Utilities</option>
          <option value="Misc">Misc</option>
        </select>

        <input type="text" name="item" placeholder="Item" value={form.item} onChange={handleChange} required />
        <input type="number" name="rate" placeholder="Rate (₹)" value={form.rate} onChange={handleChange} required />
        <input type="number" name="quantity" placeholder="Quantity" value={form.quantity} onChange={handleChange} required />
        <input type="number" name="amount" placeholder="Amount" value={form.amount} readOnly />
        <input type="date" name="date" value={form.date} onChange={handleChange} required />

        {/* ✅ Payment Mode (Cash / UPI) */}
        <div>
          <label>
            <input
              type="radio"
              name="payment_mode"
              value="Cash"
              checked={form.payment_mode === "Cash"}
              onChange={handleChange}
            />
            Cash
          </label>
          <label style={{ marginLeft: "20px" }}>
            <input
              type="radio"
              name="payment_mode"
              value="UPI"
              checked={form.payment_mode === "UPI"}
              onChange={handleChange}
            />
            UPI
          </label>
        </div>

        <button type="submit">➕ Add Expense</button>
      </form>

      {/* ✅ Expenditure Table */}
      <table border={1} cellPadding={8} style={{ borderCollapse: "collapse", width: "100%" }}>
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
          </tr>
        </thead>
        <tbody>
          {filteredExpenses.length === 0 ? (
            <tr>
              <td colSpan={8} style={{ textAlign: "center" }}>No expenses found</td>
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
                <td>{exp.date}</td>
                <td>{exp.payment_mode}</td>
              </tr>
            ))
          )}
                  {filteredExpenses.length > 0 && (
          <>
            <tr style={{ fontWeight: "bold" }}>
              <td colSpan={5}>Cash Total</td>
              <td>{cashTotal.toFixed(2)}</td>
              <td colSpan={2}></td>
            </tr>
            <tr style={{ fontWeight: "bold" }}>
              <td colSpan={5}>UPI Total</td>
              <td>{upiTotal.toFixed(2)}</td>
              <td colSpan={2}></td>
            </tr>
            <tr style={{ fontWeight: "bold", backgroundColor: "#f0f0f0" }}>
              <td colSpan={5}>Grand Total</td>
              <td>{total.toFixed(2)}</td>
              <td colSpan={2}></td>
            </tr>
          </>
        )}

        </tbody>
      </table>
    </div>
  )
}

export default Expenditure
