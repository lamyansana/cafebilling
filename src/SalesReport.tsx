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
  const [totalCustomers, setTotalCustomers] = useState(0)
  const [salesByCash, setSalesByCash] = useState(0)
  const [salesByUPI, setSalesByUPI] = useState(0)

  const todayStr = new Date().toISOString().split("T")[0]
  const [startDate, setStartDate] = useState(todayStr)
  const [endDate, setEndDate] = useState(todayStr)
  const [quickFilter, setQuickFilter] = useState<"day" | "week" | "month" | "year">("day")

  const isInRange = (date: Date, start: Date, end: Date) => date >= start && date <= end

const applyQuickFilter = (filter: typeof quickFilter) => {
  const today = new Date()
  let start: Date = new Date(today) // initialize
  let end: Date = new Date(today)   // initialize

  if (filter === "day") {
    // start and end already set to today
  } else if (filter === "week") {
    start.setDate(today.getDate() - today.getDay())
    start.setHours(0, 0, 0, 0)
    end = new Date(start)
    end.setDate(start.getDate() + 6)
    end.setHours(23, 59, 59, 999)
  } else if (filter === "month") {
    start = new Date(today.getFullYear(), today.getMonth(), 1)
    end = new Date(today.getFullYear(), today.getMonth() + 1, 0)
    end.setHours(23, 59, 59, 999)
  } else if (filter === "year") {
    start = new Date(today.getFullYear(), 0, 1)
    end = new Date(today.getFullYear(), 11, 31)
    end.setHours(23, 59, 59, 999)
  }

  setStartDate(start.toISOString().split("T")[0])
  setEndDate(end.toISOString().split("T")[0])
  setQuickFilter(filter)
}


  const generateReport = (startStr: string, endStr: string) => {
    const start = new Date(startStr)
    const end = new Date(endStr)
    end.setHours(23, 59, 59, 999)

    const csv = localStorage.getItem("ordersCSV")
    const itemMap: Record<string, SalesItem> = {}
    let grandTotal = 0
    let customerCount = 0
    let cashTotal = 0
    let upiTotal = 0

    if (csv) {
      const rows = csv.trim().split("\n").slice(1)
      rows.forEach((row) => {
        const cols = row.split(/,(?=(?:[^"]*"[^"]*")*[^"]*$)/)
        const dateTimeStr = cols[1]?.replace(/"/g, "").trim()
        if (!dateTimeStr) return

        const orderDate = new Date(dateTimeStr)
        if (isNaN(orderDate.getTime())) return
        if (!isInRange(orderDate, start, end)) return

        customerCount += 1
        const itemsStr = cols[2]?.replace(/"/g, "").trim() || ""
        const total = parseFloat(cols[3] || "0")
        const paymentMode = cols[4]?.replace(/"/g, "").trim() || ""

        grandTotal += total
        if (paymentMode.toLowerCase() === "cash") cashTotal += total
        else if (paymentMode.toLowerCase() === "upi") upiTotal += total

        itemsStr.split(";").forEach((part) => {
          const [name, qtyStr] = part.split("x")
          const itemName = name.trim()
          const qty = parseInt(qtyStr?.trim() || "1", 10)

          const menuItem = menuItems.find((m) => m.name === itemName)
          const price = menuItem ? menuItem.price : 0
          const amount = price * qty

          if (!itemMap[itemName]) itemMap[itemName] = { name: itemName, quantity: 0, amount: 0 }
          itemMap[itemName].quantity += qty
          itemMap[itemName].amount += amount
        })
      })
    }

    setReport(Object.values(itemMap))
    setOverallTotal(grandTotal)
    setTotalCustomers(customerCount)
    setSalesByCash(cashTotal)
    setSalesByUPI(upiTotal)

    // ---------- Expenditures ----------
    const expCSV = localStorage.getItem("expendituresCSV")
    let expTotal = 0
    if (expCSV) {
      const rows = expCSV.trim().split("\n").slice(1)
      rows.forEach((row) => {
        const cols = row.split(",")
        const amount = parseFloat(cols[5] || "0") // amount column
        const dateStr = cols[6]
        const expDate = new Date(dateStr)
        if (!isNaN(expDate.getTime()) && isInRange(expDate, start, end)) expTotal += amount
      })
    }
    setExpenditureTotal(expTotal)
  }

  useEffect(() => {
    generateReport(startDate, endDate)
  }, [startDate, endDate])

  const netProfit = overallTotal - expenditureTotal

  // ✅ Export CSV
  const exportCSV = () => {
    if (report.length === 0) return

    let csvContent =
      "data:text/csv;charset=utf-8,Item,Quantity,Amount (₹)\n" +
      report.map((item) => `${item.name},${item.quantity},${item.amount.toFixed(2)}`).join("\n") +
      `\nSales Total,,${overallTotal.toFixed(2)}` +
      `\nSales by Cash,,${salesByCash.toFixed(2)}` +
      `\nSales by UPI,,${salesByUPI.toFixed(2)}` +
      `\nExpenditure Total,,${expenditureTotal.toFixed(2)}` +
      `\nNet Profit/Loss,,${netProfit.toFixed(2)}` +
      `\nTotal Customers,,${totalCustomers}`

    const link = document.createElement("a")
    link.href = encodeURI(csvContent)
    link.download = `sales_report_${startDate}_to_${endDate}.csv`
    link.click()
  }

  // ✅ Export PDF
  const exportPDF = async () => {
    const { jsPDF } = await import("jspdf")
    const doc = new jsPDF()

    doc.setFontSize(16)
    doc.text("Sales Report", 14, 20)
    doc.setFontSize(12)
    doc.text(`From: ${startDate}`, 14, 30)
    doc.text(`To: ${endDate}`, 100, 30)

    let y = 50
    doc.text("Item", 14, y)
    doc.text("Quantity", 90, y)
    doc.text("Amount (₹)", 150, y)
    y += 10

    report.forEach((item) => {
      doc.text(item.name, 14, y)
      doc.text(item.quantity.toString(), 90, y)
      doc.text(item.amount.toFixed(2), 150, y)
      y += 8
    })

    y += 10
    doc.setFontSize(14)
    doc.text(`Sales Total: ₹${overallTotal.toFixed(2)}`, 14, y)
    y += 8
    doc.text(`Sales by Cash: ₹${salesByCash.toFixed(2)}`, 14, y)
    y += 8
    doc.text(`Sales by UPI: ₹${salesByUPI.toFixed(2)}`, 14, y)
    y += 8
    doc.text(`Expenditure Total: ₹${expenditureTotal.toFixed(2)}`, 14, y)
    y += 8
    doc.text(`Net Profit/Loss: ₹${netProfit.toFixed(2)}`, 14, y)
    y += 8
    doc.text(`Total Customers: ${totalCustomers}`, 14, y)

    doc.save(`sales_report_${startDate}_to_${endDate}.pdf`)
  }

  // ✅ Print
  const printReport = () => {
    const printWindow = window.open("", "_blank")
    if (!printWindow) return

    let tableRows = report.map((item) =>
      `<tr><td>${item.name}</td><td>${item.quantity}</td><td>${item.amount.toFixed(2)}</td></tr>`
    ).join("")

    const reportHTML = `
      <html>
        <head>
          <title>Sales Report</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { border: 1px solid #ccc; padding: 8px; text-align: center; }
            th { background: #f2f2f2; }
            h2, h3 { margin: 5px 0; }
          </style>
        </head>
        <body>
          <h2>📊 Sales Report</h2>
          <p><b>From:</b> ${startDate} &nbsp;&nbsp; <b>To:</b> ${endDate}</p>
          <table>
            <thead>
              <tr><th>Item</th><th>Quantity Sold</th><th>Amount (₹)</th></tr>
            </thead>
            <tbody>${tableRows}</tbody>
          </table>
          <h3>Sales Total: ₹${overallTotal.toFixed(2)}</h3>
          <h3>Sales by Cash: ₹${salesByCash.toFixed(2)}</h3>
          <h3>Sales by UPI: ₹${salesByUPI.toFixed(2)}</h3>
          <h3>Expenditure Total: ₹${expenditureTotal.toFixed(2)}</h3>
          <h3>Net Profit/Loss: ₹${netProfit.toFixed(2)}</h3>
          <h3>Total Customers: ${totalCustomers}</h3>
        </body>
      </html>
    `

    printWindow.document.write(reportHTML)
    printWindow.document.close()
    printWindow.print()
  }

  return (
    <div className="sales-report">
      <h2>📊 Sales Report</h2>

      {/* Quick Filters */}
      <div style={{ marginBottom: "10px" }}>
        <button onClick={() => applyQuickFilter("day")}>Today</button>
        <button onClick={() => applyQuickFilter("week")}>This Week</button>
        <button onClick={() => applyQuickFilter("month")}>This Month</button>
        <button onClick={() => applyQuickFilter("year")}>This Year</button>
      </div>

      {/* Date Range Picker */}
      <div className="date-picker" style={{ marginBottom: "10px" }}>
        <label>From: </label>
        <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
        <label style={{ marginLeft: "10px" }}>To: </label>
        <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
      </div>

      {/* Export Buttons */}
      <div style={{ marginBottom: "10px" }}>
        <button onClick={exportCSV}>Export CSV</button>
        <button onClick={exportPDF}>Export PDF</button>
        <button onClick={printReport}>🖨️ Print</button>
      </div>

      {/* Report Table */}
      {report.length === 0 ? (
        <p>No sales recorded for this period.</p>
      ) : (
        <>
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

          <h3>Total Customers: {totalCustomers}</h3>
          <h3>Sales by Cash: ₹{salesByCash.toFixed(2)}</h3>
          <h3>Sales by UPI: ₹{salesByUPI.toFixed(2)}</h3>
          <h3>Sales Total: ₹{overallTotal.toFixed(2)}</h3>
          <h3>Expenditure Total: ₹{expenditureTotal.toFixed(2)}</h3>
          <h3>Net Profit/Loss: ₹{netProfit.toFixed(2)}</h3>
        </>
      )}
    </div>
  )
}

export default SalesReport
