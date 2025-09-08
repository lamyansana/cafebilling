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

  const todayStr = new Date().toISOString().split("T")[0]
  const [startDate, setStartDate] = useState(todayStr)
  const [endDate, setEndDate] = useState(todayStr)

  const isInRange = (date: Date, start: Date, end: Date) => {
    return date >= start && date <= end
  }

  const generateReport = (startStr: string, endStr: string) => {
    const start = new Date(startStr)
    const end = new Date(endStr)
    end.setHours(23, 59, 59, 999)

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
        if (!isInRange(orderDate, start, end)) return

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

    const expCSV = localStorage.getItem("expendituresCSV")
    let expTotal = 0

    if (expCSV) {
      const rows = expCSV.trim().split("\n").slice(1)
      rows.forEach((row) => {
        const [ amount, dateStr] = row.split(",")
        const expDate = new Date(dateStr)
        if (!isNaN(expDate.getTime()) && isInRange(expDate, start, end)) {
          expTotal += parseFloat(amount || "0")
        }
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

    doc.save(`sales_report_${startDate}_to_${endDate}.pdf`)
  }

  // ✅ Print option
  const printReport = () => {
    const printWindow = window.open("", "_blank")
    if (!printWindow) return

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

          ${
            report.length === 0
              ? "<p>No sales recorded for this period.</p>"
              : `
              <table>
                <thead>
                  <tr>
                    <th>Item</th>
                    <th>Quantity Sold</th>
                    <th>Amount (₹)</th>
                  </tr>
                </thead>
                <tbody>
                  ${report
                    .map(
                      (item) =>
                        `<tr><td>${item.name}</td><td>${item.quantity}</td><td>${item.amount.toFixed(
                          2
                        )}</td></tr>`
                    )
                    .join("")}
                </tbody>
              </table>
            `
          }

          <h3>Sales Total: ₹${overallTotal.toFixed(2)}</h3>
          <h3>Expenditure Total: ₹${expenditureTotal.toFixed(2)}</h3>
          <h3>Net Profit/Loss: ₹${netProfit.toFixed(2)}</h3>
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

      {/* Date Range Picker */}
      <div className="date-picker">
        <label>From: </label>
        <input
          type="date"
          value={startDate}
          onChange={(e) => setStartDate(e.target.value)}
        />
        <label style={{ marginLeft: "10px" }}>To: </label>
        <input
          type="date"
          value={endDate}
          onChange={(e) => setEndDate(e.target.value)}
        />
      </div>

      {/* Export + Print Buttons */}
      <div className="export-buttons" style={{ marginTop: "10px" }}>
        <button onClick={exportCSV}>Export CSV</button>
        <button onClick={exportPDF}>Export PDF</button>
        <button onClick={printReport}>🖨️ Print</button>
      </div>

      {report.length === 0 ? (
        <p>No sales recorded for this period.</p>
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

      <h3>Sales Total: ₹{overallTotal.toFixed(2)}</h3>
      <h3>Expenditure Total: ₹{expenditureTotal.toFixed(2)}</h3>
      <h3>Net Profit/Loss: ₹{netProfit.toFixed(2)}</h3>
    </div>
  )
}

export default SalesReport
