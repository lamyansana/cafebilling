import React, { useState, useEffect } from "react"
import jsPDF from "jspdf"

interface Expense {
  id: number
  category: string
  item: string
  rate: number
  quantity: number
  amount: number
  date: string
  notes: string
}

const STORAGE_KEY = "expendituresCSV"
const CAFE_NAME = "Myco Café"

const Expenditure: React.FC = () => {
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [selectedDate, setSelectedDate] = useState(
    new Date().toISOString().split("T")[0]
  )
  const [filter, setFilter] = useState<"day" | "week" | "month" | "year">("day")
  const [filteredExpenses, setFilteredExpenses] = useState<Expense[]>([])

  const getToday = () => new Date().toISOString().split("T")[0]

  const [form, setForm] = useState({
    category: "",
    item: "",
    rate: "",
    quantity: "1",
    amount: "",
    date: getToday(),
    notes: "",
  })

  const parseCSV = (csv: string): Expense[] => {
    const lines = csv.trim().split("\n")
    const headers = lines[0].split(",")
    return lines.slice(1).map((line, index) => {
      const values = line.split(",")
      const obj: any = {}
      headers.forEach((h, i) => (obj[h] = values[i]))
      return {
        id: index + 1,
        category: obj.category,
        item: obj.item,
        rate: parseFloat(obj.rate),
        quantity: parseFloat(obj.quantity),
        amount: parseFloat(obj.amount),
        date: obj.date,
        notes: obj.notes || "",
      } as Expense
    })
  }

  const toCSV = (data: Expense[]): string => {
    const headers = "id,category,item,rate,quantity,amount,date,notes"
    const rows = data.map(
      (exp) =>
        `${exp.id},${exp.category},${exp.item},${exp.rate},${exp.quantity},${exp.amount},${exp.date},${exp.notes || ""}`
    )
    return [headers, ...rows].join("\n")
  }

  useEffect(() => {
    const existingCSV = localStorage.getItem(STORAGE_KEY)
    if (existingCSV) {
      setExpenses(parseCSV(existingCSV))
    }
  }, [])

  useEffect(() => {
    if (expenses.length > 0) {
      localStorage.setItem(STORAGE_KEY, toCSV(expenses))
    }
  }, [expenses])

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

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target
    let updatedForm = { ...form, [name]: value }

    if (name === "rate" || name === "quantity") {
      const rate = parseFloat(
        name === "rate" ? value : updatedForm.rate || "0"
      )
      const qty = parseFloat(
        name === "quantity" ? value : updatedForm.quantity || "0"
      )
      if (!isNaN(rate) && !isNaN(qty)) {
        updatedForm.amount = (rate * qty).toFixed(2)
      }
    }

    setForm(updatedForm)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.category || !form.item || !form.rate || !form.quantity) {
      alert("Please fill in all required fields")
      return
    }
    const newExpense: Expense = {
      id: expenses.length + 1,
      category: form.category,
      item: form.item,
      rate: parseFloat(form.rate),
      quantity: parseFloat(form.quantity),
      amount: parseFloat(form.amount),
      date: form.date,
      notes: form.notes,
    }
    setExpenses([...expenses, newExpense])
    setForm({
      category: "",
      item: "",
      rate: "",
      quantity: "1",
      amount: "",
      date: getToday(),
      notes: "",
    })
  }

  const total = filteredExpenses.reduce((sum, exp) => sum + exp.amount, 0)

  const downloadCSV = () => {
    const csv = toCSV(filteredExpenses)
    const blob = new Blob([csv], { type: "text/csv" })
    const link = document.createElement("a")
    link.href = URL.createObjectURL(blob)
    link.download = `expenditure_report_${filter}_${selectedDate}.csv`
    link.click()
  }

  const downloadPDF = () => {
    const doc = new jsPDF()
    const pageHeight = doc.internal.pageSize.height

    doc.setFontSize(16)
    doc.setFont("helvetica", "bold")
    doc.text(CAFE_NAME, 105, 15, { align: "center" })

    doc.setFontSize(12)
    doc.setFont("helvetica", "normal")
    const today = new Date().toLocaleDateString()
    doc.text(`Expenditure Report (${filter})`, 105, 25, { align: "center" })
    doc.text(`Generated on: ${today}`, 105, 32, { align: "center" })

    let y = 50
    doc.setFontSize(10)
    doc.text("ID", 14, y)
    doc.text("Category", 25, y)
    doc.text("Item", 60, y)
    doc.text("Rate", 100, y)
    doc.text("Qty", 120, y)
    doc.text("Amount", 140, y)
    doc.text("Date", 170, y)
    y += 10

    filteredExpenses.forEach((exp) => {
      doc.text(exp.id.toString(), 14, y)
      doc.text(exp.category, 25, y)
      doc.text(exp.item, 60, y)
      doc.text(exp.rate.toFixed(2), 100, y)
      doc.text(exp.quantity.toString(), 120, y)
      doc.text(exp.amount.toFixed(2), 140, y)
      doc.text(exp.date, 170, y)
      y += 8
      if (y > pageHeight - 20) {
        doc.addPage()
        y = 20
      }
    })

    y += 10
    doc.setFont("helvetica", "bold")
    doc.text(`TOTAL: ₹${total.toFixed(2)}`, 14, y)

    doc.save(`expenditure_report_${filter}_${selectedDate}.pdf`)
  }

  return (
    <div className="expenditure-page" style={{ padding: "20px" }}>
      <h1>💰 Expenditure</h1>

      {/* Date Picker + Filters */}
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

      {/* Add Expense Form */}
      {/* Add Expense Form */}
<form
  onSubmit={handleSubmit}
  style={{
    display: "grid",
    gap: "10px",
    maxWidth: "600px",
    marginBottom: "20px",
  }}
>
  <select
    name="category"
    value={form.category}
    onChange={handleChange}
    required
    style={{ fontSize: "16px", padding: "8px" }}
  >
    <option value="">Select Category</option>
    <option value="Veg">Veg</option>
    <option value="Meat">Meat</option>
    <option value="Grocery">Grocery</option>
    <option value="Coffee">Coffee</option>
    <option value="Whitener">Whitener</option>
    <option value="Rent">Rent</option>
    <option value="Utilities">Utilities</option>
    <option value="Misc">Misc</option>
  </select>

  <input
    type="text"
    name="item"
    placeholder="Item (e.g., Milk, Sugar)"
    value={form.item}
    onChange={handleChange}
    required
    style={{ fontSize: "16px", padding: "8px" }}
  />

  <input
    type="number"
    name="rate"
    placeholder="Rate (₹)"
    value={form.rate}
    onChange={handleChange}
    required
    style={{ fontSize: "16px", padding: "8px" }}
  />

  <input
    type="number"
    name="quantity"
    placeholder="Quantity"
    value={form.quantity}
    onChange={handleChange}
    required
    style={{ fontSize: "16px", padding: "8px" }}
  />

  <input
    type="number"
    name="amount"
    placeholder="Amount (auto)"
    value={form.amount}
    readOnly
    style={{ fontSize: "16px", padding: "8px" }}
  />

  <input
    type="date"
    name="date"
    value={form.date}
    onChange={handleChange}
    required
    style={{ fontSize: "16px", padding: "8px" }}
  />

  <input
    type="text"
    name="notes"
    placeholder="Notes (optional)"
    value={form.notes}
    onChange={handleChange}
    style={{ fontSize: "16px", padding: "8px" }}
  />

  <button type="submit" className="primary-btn" style={{ fontSize: "16px", padding: "10px" }}>
    Add Expense
  </button>
</form>


      {/* Export Buttons */}
      <div style={{ marginBottom: "20px" }}>
        <button onClick={downloadCSV} style={{ marginRight: "10px" }}>
          ⬇️ Download CSV
        </button>
        <button onClick={downloadPDF}>⬇️ Download PDF</button>
      </div>

      {/* Filtered Expenses Table */}
      <table border={1} cellPadding={8} style={{ borderCollapse: "collapse" }}>
        <thead>
          <tr>
            <th>ID</th>
            <th>Category</th>
            <th>Item</th>
            <th>Rate (₹)</th>
            <th>Qty</th>
            <th>Amount (₹)</th>
            <th>Date</th>
            <th>Notes</th>
          </tr>
        </thead>
        <tbody>
          {filteredExpenses.length === 0 ? (
            <tr>
              <td colSpan={8} style={{ textAlign: "center" }}>
                No expenses recorded
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
                <td>{exp.date}</td>
                <td>{exp.notes}</td>
              </tr>
            ))
          )}
          {filteredExpenses.length > 0 && (
            <tr style={{ fontWeight: "bold" }}>
              <td colSpan={5}>Total</td>
              <td>{total.toFixed(2)}</td>
              <td colSpan={2}></td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  )
}

export default Expenditure
