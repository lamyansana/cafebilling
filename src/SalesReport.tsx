import { useEffect, useState } from "react"
import type { MenuItem } from "./Master"

interface SalesItem {
  name: string
  quantity: number
  amount: number
}

interface SalesReportProps {
  menuItems: MenuItem[]
}

function SalesReport({ menuItems }: SalesReportProps) {
  const [report, setReport] = useState<SalesItem[]>([])
  const [overallTotal, setOverallTotal] = useState(0)
  const [expenditureTotal, setExpenditureTotal] = useState(0)
  const [selectedDate, setSelectedDate] = useState(
    new Date().toISOString().split("T")[0]
  )
  const [filter, setFilter] = useState<"day" | "week" | "month" | "year">("day")

  const matchesFilter = (date: Date, selected: Date, filterType: string) => {
    if (filterType === "day") {
      return date.toDateString() === selected.toDateString()
    } else if (filterType === "week") {
      const startOfWeek = new Date(selected)
      startOfWeek.setDate(selected.getDate() - selected.getDay())
      startOfWeek.setHours(0, 0, 0, 0)

      const endOfWeek = new Date(startOfWeek)
      endOfWeek.setDate(startOfWeek.getDate() + 6)
      endOfWeek.setHours(23, 59, 59, 999)

      return date >= startOfWeek && date <= endOfWeek
    } else if (filterType === "month") {
      return (
        date.getMonth() === selected.getMonth() &&
        date.getFullYear() === selected.getFullYear()
      )
    } else if (filterType === "year") {
      return date.getFullYear() === selected.getFullYear()
    }
    return false
  }

  const generateReport = (dateStr: string, filterType: string) => {
    const selected = new Date(dateStr)

    // ---------- SALES ----------
    const csv = localStorage.getItem("ordersCSV")
    const itemMap: Record<string, SalesItem> = {}
    let grandTotal = 0

    if (csv) {
      const rows = csv.trim().split("\n").slice(1)
      rows.forEach((row) => {
        const cols = row.split(/,(?=(?:[^"]*"[^"]*")*[^"]*$)/)
        const dateTimeStr = cols[1]?.replace(/"/g, "").trim()
        if (!dateTimeStr) return

        const orderDate = new Date(dateTimeStr)
        if (isNaN(orderDate.getTime())) return
        if (!matchesFilter(orderDate, selected, filterType)) return

        const itemsStr = cols[2]?.replace(/"/g, "").trim() || ""
        const total = parseFloat(cols[3] || "0")
        grandTotal += total

        itemsStr.split(";").forEach((part) => {
          const [name, qtyStr] = part.split("x")
          const itemName = name.trim()
          const qty = parseInt(qtyStr?.trim() || "1", 10)

          const menuItem = menuItems.find((m) => m.name === itemName)
          const price = menuItem ? menuItem.price : 0
          const amount = price * qty

          if (!itemMap[itemName]) {
            itemMap[itemName] = { name: itemName, quantity: 0, amount: 0 }
          }
          itemMap[itemName].quantity += qty
          itemMap[itemName].amount += amount
        })
      })
    }

    setReport(Object.values(itemMap))
    setOverallTotal(grandTotal)

    // ---------- EXPENDITURES ----------
    const expCSV = localStorage.getItem("expendituresCSV")
    let expTotal = 0

    if (expCSV) {
      const rows = expCSV.trim().split("\n").slice(1)
      rows.forEach((row) => {
        const [id, category, amount, dateStr] = row.split(",")
        const expDate = new Date(dateStr)
        if (!isNaN(expDate.getTime()) && matchesFilter(expDate, selected, filterType)) {
          expTotal += parseFloat(amount || "0")
        }
      })
    }

    setExpenditureTotal(expTotal)
  }

  useEffect(() => {
    generateReport(selectedDate, filter)
  }, [selectedDate, filter])

  const netProfit = overallTotal - expenditureTotal

  // ✅ Export CSV
  const exportCSV = () => {
    if (report.length === 0 && overallTotal === 0 && expenditureTotal === 0) return

    let csvContent =
      "data:text/csv;charset=utf-8,Item,Quantity,Amount (₹)\n" +
      report
        .map((item) => `${item.name},${item.quantity},${item.amount.toFixed(2)}`)
        .join("\n") +
      `\nSales Total,,${overallTotal.toFixed(2)}` +
      `\nExpenditure Total,,${expenditureTotal.toFixed(2)}` +
      `\nNet Profit/Loss,,${netProfit.toFixed(2)}`

    const link = document.createElement("a")
    link.href = encodeURI(csvContent)
    link.download = `sales_report_${filter}_${selectedDate}.csv`
    link.click()
  }

  // ✅ Export PDF
  const exportPDF = async () => {
    const { jsPDF } = await import("jspdf")
    const doc = new jsPDF()

    doc.setFontSize(16)
    doc.text("Sales Report", 14, 20)

    doc.setFontSize(12)
    doc.text(`Filter: ${filter}`, 14, 30)
    doc.text(`Date: ${selectedDate}`, 14, 36)

    let y = 50
    doc.text("Item", 14, y)
    doc.text("Quantity", 90, y)
    doc.text("Amount (₹)", 150, y)
    y += 10

    report.forEach((item) => {
      doc.text(item.name, 14, y)
      doc.text(item.quantity.toString(), 100, y)
      doc.text(item.amount.toFixed(2), 160, y)
      y += 8
    })

    y += 10
    doc.setFontSize(14)
    doc.text(`Sales Total: ₹${overallTotal.toFixed(2)}`, 14, y)
    y += 8
    doc.text(`Expenditure Total: ₹${expenditureTotal.toFixed(2)}`, 14, y)
    y += 8
    doc.text(`Net Profit/Loss: ₹${netProfit.toFixed(2)}`, 14, y)

    doc.save(`sales_report_${filter}_${selectedDate}.pdf`)
  }

  return (
    <div className="sales-report">
      <h2>📊 Sales Report</h2>

      {/* Date Picker */}
      <div className="date-picker">
        <label>Select Date: </label>
        <input
          type="date"
          value={selectedDate}
          onChange={(e) => setSelectedDate(e.target.value)}
        />
      </div>

      {/* Quick Filters */}
      <div className="filters">
        <button onClick={() => setFilter("day")}>Today</button>
        <button onClick={() => setFilter("week")}>This Week</button>
        <button onClick={() => setFilter("month")}>This Month</button>
        <button onClick={() => setFilter("year")}>This Year</button>
      </div>

      {/* Export Buttons */}
      <div className="export-buttons" style={{ marginTop: "10px" }}>
        <button onClick={exportCSV}>Export CSV</button>
        <button onClick={exportPDF}>Export PDF</button>
      </div>

      {report.length === 0 ? (
        <p>No sales recorded for this {filter}.</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>Item</th>
              <th>Quantity Sold</th>
              <th>Amount (₹)</th>
            </tr>
          </thead>
          <tbody>
            {report.map((item) => (
              <tr key={item.name}>
                <td>{item.name}</td>
                <td>{item.quantity}</td>
                <td>{item.amount.toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <h3>Sales Total ({filter}): ₹{overallTotal.toFixed(2)}</h3>
      <h3>Expenditure Total ({filter}): ₹{expenditureTotal.toFixed(2)}</h3>
      <h3>Net Profit/Loss: ₹{netProfit.toFixed(2)}</h3>
    </div>
  )
}

export default SalesReport
