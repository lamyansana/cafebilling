import React, { useState, useEffect, useRef, useMemo } from "react";
import { supabase } from "./supabaseClient";
import { saveAs } from "file-saver";
import jsPDF from "jspdf";
import { formatDate } from "./formatDate";
import "./App.css";

interface SalesReportProps {
  cafeId: number | null;
}

type Order = {
  id: string;
  created_at: string;
  total_amount: number;
  payment_mode: string;
  order_items: { item_name: string; quantity: number; price: number }[];
};

type Expenditure = {
  amount: number;
  expense_date: string;
  payment_mode: "Cash" | "UPI";
  item: string;
};

type SortConfig = {
  key: string;
  direction: "asc" | "desc";
} | null;

const SalesReport: React.FC<SalesReportProps> = ({ cafeId }) => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [expenditures, setExpenditures] = useState<Expenditure[]>([]);
  const [filter, setFilter] = useState<
    "today" | "yesterday" | "week" | "month" | "year" | "date" | "range"
  >("today");
  const today = new Date().toISOString().split("T")[0];
  const [customStart, setCustomStart] = useState(today);
  const [customEnd, setCustomEnd] = useState(today);
  const [selectedDate, setSelectedDate] = useState(today);

  /////Dark Mode
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    const updateDark = () => {
      setIsDark(document.body.classList.contains("dark"));
    };

    updateDark();

    const observer = new MutationObserver(updateDark);
    observer.observe(document.body, {
      attributes: true,
      attributeFilter: ["class"],
    });

    return () => observer.disconnect();
  }, []);

  const dateRef = useRef<HTMLInputElement>(null);
  const rangeStartRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (filter === "date" && dateRef.current) {
      dateRef.current.showPicker?.();
    }
    if (filter === "range" && rangeStartRef.current) {
      rangeStartRef.current.showPicker?.();
    }
  }, [filter]);

  useEffect(() => {
    if (!cafeId) return;

    const fetchData = async () => {
      const { data: ordersData, error: ordersError } = await supabase
        .from("orders")
        .select(
          `
          id,
          created_at,
          total_amount,
          payment_mode,
          order_items (
            item_name,
            quantity,
            price
          )
        `
        )
        .eq("cafe_id", cafeId)
        .order("created_at", { ascending: false });

      if (!ordersError && ordersData) {
        setOrders(
          ordersData.map((o: any) => ({
            id: o.id,
            created_at: o.created_at,
            total_amount: o.total_amount,
            payment_mode: o.payment_mode,
            order_items: o.order_items || [],
          }))
        );
      }

      const { data: expData, error: expError } = await supabase
        .from("expenditures")
        .select("amount, date, payment_mode, item")
        .eq("cafe_id", cafeId)
        .order("date", { ascending: false });

      if (!expError && expData) {
        setExpenditures(
          expData.map((e: any) => ({
            amount: parseFloat(e.amount),
            expense_date: e.date,
            payment_mode: e.payment_mode,
            item: e.item,
          }))
        );
      }
    };

    fetchData();
  }, [cafeId]);

  // Sorting state
  const [sortConfig, setSortConfig] = useState<SortConfig>(null);

  // Generic toggle-sort helper
  const toggleSort = (key: string) => {
    setSortConfig((prev) => {
      if (!prev || prev.key !== key) {
        return { key, direction: "asc" };
      }
      // same key -> toggle
      return { key, direction: prev.direction === "asc" ? "desc" : "asc" };
    });
  };

  // Generic sort function (pure)
  const sortArray = <T,>(
    data: T[],
    key: keyof T | string,
    direction: "asc" | "desc"
  ) => {
    const copy = [...data];
    copy.sort((a: any, b: any) => {
      const av = a[key as any];
      const bv = b[key as any];

      // handle undefined/null
      if (av == null && bv == null) return 0;
      if (av == null) return direction === "asc" ? -1 : 1;
      if (bv == null) return direction === "asc" ? 1 : -1;

      // numbers
      if (typeof av === "number" && typeof bv === "number") {
        return direction === "asc" ? av - bv : bv - av;
      }

      // dates stored as ISO or date strings
      const aDate = new Date(av);
      const bDate = new Date(bv);
      if (!isNaN(aDate.getTime()) && !isNaN(bDate.getTime())) {
        return direction === "asc"
          ? aDate.getTime() - bDate.getTime()
          : bDate.getTime() - aDate.getTime();
      }

      // fallback to string compare
      return direction === "asc"
        ? String(av).localeCompare(String(bv))
        : String(bv).localeCompare(String(av));
    });
    return copy;
  };

  // Date filter helper
  const filterByDate = (dateStr: string) => {
    const now = new Date();
    const d = new Date(dateStr);

    switch (filter) {
      case "today":
        return d.toDateString() === now.toDateString();
      case "yesterday": {
        const yesterday = new Date(now);
        yesterday.setDate(now.getDate() - 1);
        return d.toDateString() === yesterday.toDateString();
      }
      case "week": {
        const startOfWeek = new Date(now);
        startOfWeek.setDate(now.getDate() - now.getDay());
        startOfWeek.setHours(0, 0, 0, 0);
        const endOfWeek = new Date(startOfWeek);
        endOfWeek.setDate(startOfWeek.getDate() + 6);
        endOfWeek.setHours(23, 59, 59, 999);
        return d >= startOfWeek && d <= endOfWeek;
      }
      case "month":
        return (
          d.getMonth() === now.getMonth() &&
          d.getFullYear() === now.getFullYear()
        );
      case "year":
        return d.getFullYear() === now.getFullYear();
      case "date":
        return d.toDateString() === new Date(selectedDate).toDateString();
      case "range":
        if (!customStart || !customEnd) return true;
        const start = new Date(customStart);
        const end = new Date(customEnd);
        end.setHours(23, 59, 59, 999);
        return d >= start && d <= end;
      default:
        return true;
    }
  };

  // Filtered data
  const filteredOrders = orders.filter((o) => filterByDate(o.created_at));
  const filteredExpenditures = expenditures.filter((e) =>
    filterByDate(e.expense_date)
  );

  // Aggregate item-wise sales (same as original)
  const itemSales = useMemo(() => {
    return filteredOrders
      .flatMap((o) =>
        o.order_items.map((it) => ({
          name: it.item_name,
          quantity: it.quantity,
          amount: it.quantity * it.price,
        }))
      )
      .reduce((acc, cur) => {
        const existing = acc.find((a) => a.name === cur.name);
        if (existing) {
          existing.quantity += cur.quantity;
          existing.amount += cur.amount;
        } else {
          acc.push({ ...cur });
        }
        return acc;
      }, [] as { name: string; quantity: number; amount: number }[]);
  }, [filteredOrders]);

  // Precompute totals
  const revenue = filteredOrders.reduce((sum, o) => sum + o.total_amount, 0);
  const expenses = filteredExpenditures.reduce((sum, e) => sum + e.amount, 0);
  const profit = revenue - expenses;

  const salesByCash = filteredOrders
    .filter((o) => o.payment_mode === "Cash")
    .reduce((sum, o) => sum + o.total_amount, 0);

  const salesByUPI = filteredOrders
    .filter((o) => o.payment_mode === "UPI")
    .reduce((sum, o) => sum + o.total_amount, 0);

  const expensesByCash = filteredExpenditures
    .filter((e) => e.payment_mode === "Cash")
    .reduce((sum, e) => sum + e.amount, 0);

  const expensesByUPI = filteredExpenditures
    .filter((e) => e.payment_mode === "UPI")
    .reduce((sum, e) => sum + e.amount, 0);

  const netProfitByCash = salesByCash - expensesByCash;
  const netProfitByUPI = salesByUPI - expensesByUPI;

  // --- Prepare itemSales with sorting keys (Option A) ---
  const itemSalesWithKeys = useMemo(
    () =>
      itemSales.map((i) => ({
        ...i,
        item_name: i.name,
        item_quantity: i.quantity,
        item_amount: i.amount,
      })),
    [itemSales]
  );

  // Sorted itemSales for display
  const sortedItemSales = useMemo(() => {
    if (!sortConfig) return itemSalesWithKeys;
    // only apply item_ prefixed sorts to item table
    if (!sortConfig.key.startsWith("item_")) return itemSalesWithKeys;

    // remove 'item_' prefix and use remaining key on the object
    const key = sortConfig.key; // use full key because we built item_* keys
    return sortArray(itemSalesWithKeys, key, sortConfig.direction);
  }, [itemSalesWithKeys, sortConfig]);

  // --- Prepare expenditures with sorting keys (Option A) ---
  const expendituresWithKeys = useMemo(
    () =>
      filteredExpenditures.map((e) => ({
        ...e,
        exp_item: e.item,
        exp_amount: e.amount,
        exp_date: e.expense_date,
        exp_payment_mode: e.payment_mode,
      })),
    [filteredExpenditures]
  );

  // Sorted expenditures for display
  const sortedExpenditures = useMemo(() => {
    if (!sortConfig) return expendituresWithKeys;
    if (!sortConfig.key.startsWith("exp_")) return expendituresWithKeys;

    const key = sortConfig.key;
    return sortArray(expendituresWithKeys, key, sortConfig.direction);
  }, [expendituresWithKeys, sortConfig]);

  // CSV download (keeps original logic)
  const downloadCSV = () => {
    const rows: string[][] = [
      ["Item", "Quantity Sold", "Amount"],
      ...itemSales.map((i) => [
        i.name,
        i.quantity.toString(),
        i.amount.toString(),
      ]),
      [],
      ["Expenditures"],
      ["Item", "Amount", "Date", "Payment Mode"],
      ...filteredExpenditures.map((e) => [
        e.item,
        e.amount.toString(),
        formatDate(e.expense_date),
        e.payment_mode,
      ]),
      [],
      ["Revenue", revenue.toString()],
      ["Expenses", expenses.toString()],
      ["Profit", profit.toString()],
      ["Net Profit (Cash)", netProfitByCash.toString()],
      ["Net Profit (UPI)", netProfitByUPI.toString()],
    ];
    const csvContent = rows.map((r) => r.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    saveAs(blob, "sales_report.csv");
  };

  // PDF download (keeps original logic)
  const downloadPDF = async () => {
    let cafeName = "Cafe";
    if (cafeId) {
      const { data, error } = await supabase
        .from("cafes")
        .select("name")
        .eq("id", cafeId)
        .single();
      if (!error && data) cafeName = data.name;
    }

    const doc = new jsPDF({ unit: "pt", format: "a4" });
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const leftMargin = 40;
    const rightMargin = 40;
    const tableWidth = pageWidth - leftMargin - rightMargin;
    const reservedHeaderSpace = 80;
    const reservedFooterSpace = 50;

    const totalPagesExp = "{total_pages_count_string}";
    let y = 60;

    const addHeader = () => {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(16);
      doc.text(cafeName, pageWidth / 2, 40, { align: "center" });
      doc.setFontSize(14);
      doc.text("Sales Report", pageWidth / 2, 60, { align: "center" });
      y = reservedHeaderSpace;
    };

    const addFooter = (pageNum: number) => {
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const footerY = pageHeight - 20;

      doc.setDrawColor(150);
      doc.setLineWidth(0.2);
      doc.line(40, footerY - 10, pageWidth - 40, footerY - 10);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      const footerText = `Page ${pageNum} of ${totalPagesExp}`;

      doc.text(footerText, pageWidth / 2, footerY, { align: "center" });
    };

    const checkPageBreak = (neededSpace = 0) => {
      if (y + neededSpace > pageHeight - reservedFooterSpace) {
        addFooter(doc.internal.getNumberOfPages());
        doc.addPage();
        addHeader();
        y = reservedHeaderSpace;
        doc.setFont("helvetica", "normal");
      }
    };

    addHeader();

    let fileDatePart = "";

    checkPageBreak(30);
    let dateText = "Date: ";
    if (filter === "range" && customStart && customEnd) {
      const start = formatDate(customStart).replace(/ /g, "-");
      const end = formatDate(customEnd).replace(/ /g, "-");
      dateText += start === end ? start : `${start} to ${end}`;
    } else if (filter === "today") {
      dateText += formatDate(customStart || new Date());
    } else if (filter === "yesterday") {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      fileDatePart = formatDate(yesterday).replace(/ /g, "-");
    } else if (filter === "week") {
      const now = new Date();
      const startOfWeek = new Date(now);
      startOfWeek.setDate(now.getDate() - now.getDay());
      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(startOfWeek.getDate() + 6);
      dateText += `${formatDate(startOfWeek)} to ${formatDate(endOfWeek)}`;
    } else if (filter === "month") {
      const now = new Date();
      dateText += `${now.toLocaleString("default", {
        month: "long",
      })} ${now.getFullYear()}`;
    } else if (filter === "year") {
      dateText += new Date().getFullYear().toString();
    } else if (filter === "date") {
      dateText += formatDate(selectedDate);
    }

    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);
    checkPageBreak(20);
    doc.text(dateText, leftMargin, y);
    y += 30;

    const drawTable = (
      title: string,
      headers: string[],
      data: (string | number)[][]
    ) => {
      const lineHeight = 14;
      const cellPadding = 4;

      checkPageBreak(40);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(12);
      doc.text(title, leftMargin, y);
      y += 20;

      const colCount = headers.length;
      const colWidths = headers.map(() => tableWidth / colCount);

      let x = leftMargin;
      const headerHeight = lineHeight + cellPadding * 2;
      headers.forEach((h, i) => {
        doc.rect(x, y, colWidths[i], headerHeight);
        doc.setFont("helvetica", "bold");
        const headerY = y + headerHeight / 2 + lineHeight / 2 - 2;
        doc.text(String(h), x + cellPadding, headerY);
        x += colWidths[i];
      });
      y += headerHeight;

      doc.setFont("helvetica", "normal");

      data.forEach((row) => {
        if (
          y + lineHeight + cellPadding * 2 >
          pageHeight - reservedFooterSpace
        ) {
          addFooter(doc.internal.getNumberOfPages());
          doc.addPage();
          addHeader();

          let x = leftMargin;
          headers.forEach((h, i) => {
            doc.rect(x, y, colWidths[i], headerHeight);
            doc.setFont("helvetica", "bold");
            const headerY = y + headerHeight / 2 + lineHeight / 2 - 2;
            doc.text(String(h), x + cellPadding, headerY);
            x += colWidths[i];
          });
          y += headerHeight;
          doc.setFont("helvetica", "normal");
          doc.setFontSize(12);
        }

        const wrappedTexts: string[][] = [];
        let maxRowHeight = lineHeight + cellPadding * 2;

        row.forEach((cell, i) => {
          const wrapped = doc.splitTextToSize(
            String(cell ?? "-"),
            colWidths[i] - cellPadding * 2
          );
          wrappedTexts.push(wrapped);
          const cellHeight = wrapped.length * lineHeight + cellPadding * 2;
          if (cellHeight > maxRowHeight) maxRowHeight = cellHeight;
        });

        let x = leftMargin;
        wrappedTexts.forEach((lines, i) => {
          doc.rect(x, y, colWidths[i], maxRowHeight);
          const totalTextHeight = lines.length * lineHeight;
          const startY =
            y + (maxRowHeight - totalTextHeight) / 2 + lineHeight / 2;

          lines.forEach((line, j) => {
            doc.text(line, x + cellPadding, startY + j * lineHeight);
          });
          x += colWidths[i];
        });

        y += maxRowHeight;
      });

      y += 20;
    };

    drawTable(
      "Items Sold",
      ["Item", "Quantity Sold", "Amount (Rs)"],
      itemSales.map((i) => [i.name, i.quantity, ` ${i.amount}`])
    );

    drawTable(
      "Expenditures",
      ["Item", "Amount (Rs)", "Date", "Payment Mode"],
      filteredExpenditures.map((e) => [
        e.item ?? "-",
        `${e.amount}`,
        formatDate(e.expense_date),
        e.payment_mode ?? "-",
      ])
    );

    drawTable(
      "Summary",
      ["Label", "Value"],
      [
        ["Total Orders", filteredOrders.length],
        ["Revenue", revenue.toFixed(2)],
        ["Cash Sales", salesByCash.toFixed(2)],
        ["UPI Sales", salesByUPI.toFixed(2)],
        ["Expenses (Cash)", expensesByCash.toFixed(2)],
        ["Expenses (UPI)", expensesByUPI.toFixed(2)],
        ["Total Expenses", expenses.toFixed(2)],
        ["Net Bal (Cash)", (salesByCash - expensesByCash).toFixed(2)],
        ["Net Bal (UPI)", (salesByUPI - expensesByUPI).toFixed(2)],
        ["Net Balance (Total)", profit.toFixed(2)],
      ]
    );

    const totalPages = doc.internal.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      addFooter(i);
    }
    doc.putTotalPages(totalPagesExp);

    if (filter === "range" && customStart && customEnd) {
      const start = formatDate(customStart).replace(/ /g, "-");
      const end = formatDate(customEnd).replace(/ /g, "-");
      fileDatePart = start === end ? start : `${start}_to_${end}`;
    } else if (filter === "today") {
      fileDatePart = formatDate(customStart || new Date()).replace(/ /g, "-");
    } else if (filter === "week") {
      const now = new Date();
      const startOfWeek = new Date(now);
      startOfWeek.setDate(now.getDate() - now.getDay());
      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(startOfWeek.getDate() + 6);
      fileDatePart = `${formatDate(startOfWeek).replace(
        / /g,
        "-"
      )}_to_${formatDate(endOfWeek).replace(/ /g, "-")}`;
    } else if (filter === "month") {
      const now = new Date();
      fileDatePart = `${now.toLocaleString("default", {
        month: "long",
      })}_${now.getFullYear()}`;
    } else if (filter === "year") {
      fileDatePart = new Date().getFullYear().toString();
    } else if (filter === "date") {
      fileDatePart = formatDate(selectedDate).replace(/ /g, "-");
    }

    const fileName = `sales_report_${fileDatePart}.pdf`;
    doc.save(fileName);
  };

  // render
  return (
    <div className="sales-bg">
      <h2>📊 Sales Report</h2>

      {/* Date Filters */}
      <div>
        <label>Filter: </label>
        <select
          value={filter}
          onChange={(e) => {
            const val = e.target.value as typeof filter;
            setFilter(val);

            if (val === "range") {
              const today = new Date().toISOString().split("T")[0];
              setCustomStart(today);
              setCustomEnd(today);
            }
          }}
        >
          <option value="today">Today</option>
          <option value="yesterday">Yesterday</option>
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
              ref={dateRef}
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
            />
          </span>
        )}

        {filter === "range" && (
          <span style={{ marginLeft: "1rem" }}>
            From:{" "}
            <input
              ref={rangeStartRef}
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

      {/* Item-wise Table */}
      <h3>Item-wise Sales</h3>
      <table
        border={1}
        cellPadding={5}
        style={{ borderCollapse: "collapse", marginBottom: "1rem" }}
      >
        <thead>
          <tr>
            <th
              style={{ cursor: "pointer", userSelect: "none" }}
              onClick={() => toggleSort("item_name")}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") toggleSort("item_name");
              }}
            >
              Item{" "}
              {sortConfig?.key === "item_name"
                ? sortConfig.direction === "asc"
                  ? "▲"
                  : "▼"
                : ""}
            </th>

            <th
              style={{ cursor: "pointer", userSelect: "none" }}
              onClick={() => toggleSort("item_quantity")}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ")
                  toggleSort("item_quantity");
              }}
            >
              Quantity Sold{" "}
              {sortConfig?.key === "item_quantity"
                ? sortConfig.direction === "asc"
                  ? "▲"
                  : "▼"
                : ""}
            </th>

            <th
              style={{ cursor: "pointer", userSelect: "none" }}
              onClick={() => toggleSort("item_amount")}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ")
                  toggleSort("item_amount");
              }}
            >
              Amount (₹){" "}
              {sortConfig?.key === "item_amount"
                ? sortConfig.direction === "asc"
                  ? "▲"
                  : "▼"
                : ""}
            </th>
          </tr>
        </thead>
        <tbody>
          {sortedItemSales.map((item) => (
            <tr key={item.item_name}>
              <td>{item.name}</td>
              <td>{item.quantity}</td>
              <td>{item.amount}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Expenditures Table */}
      <h3>Expenditures</h3>
      <div style={{ maxHeight: "400px", overflowY: "auto" }}>
        <table
          border={1}
          cellPadding={5}
          style={{ borderCollapse: "collapse", marginBottom: "1rem" }}
        >
          <thead>
            <tr>
              <th
                style={{ cursor: "pointer", userSelect: "none" }}
                onClick={() => toggleSort("exp_item")}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ")
                    toggleSort("exp_item");
                }}
              >
                Item{" "}
                {sortConfig?.key === "exp_item"
                  ? sortConfig.direction === "asc"
                    ? "▲"
                    : "▼"
                  : ""}
              </th>

              <th
                style={{ cursor: "pointer", userSelect: "none" }}
                onClick={() => toggleSort("exp_amount")}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ")
                    toggleSort("exp_amount");
                }}
              >
                Amount{" "}
                {sortConfig?.key === "exp_amount"
                  ? sortConfig.direction === "asc"
                    ? "▲"
                    : "▼"
                  : ""}
              </th>

              <th
                style={{ cursor: "pointer", userSelect: "none" }}
                onClick={() => toggleSort("exp_date")}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ")
                    toggleSort("exp_date");
                }}
              >
                Date{" "}
                {sortConfig?.key === "exp_date"
                  ? sortConfig.direction === "asc"
                    ? "▲"
                    : "▼"
                  : ""}
              </th>

              <th
                style={{ cursor: "pointer", userSelect: "none" }}
                onClick={() => toggleSort("exp_payment_mode")}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ")
                    toggleSort("exp_payment_mode");
                }}
              >
                Payment Mode{" "}
                {sortConfig?.key === "exp_payment_mode"
                  ? sortConfig.direction === "asc"
                    ? "▲"
                    : "▼"
                  : ""}
              </th>
            </tr>
          </thead>
          <tbody>
            {sortedExpenditures.map((e, idx) => (
              <tr key={`${e.exp_item ?? e.item}-${e.exp_amount}-${idx}`}>
                <td>{e.item}</td>
                <td>{e.amount}</td>
                <td>{formatDate(e.expense_date)}</td>
                <td>{e.payment_mode}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Summary */}
      <div style={{ color: isDark ? "#e0e0e0" : "#333" }}>
        <h3>Summary</h3>
        <p>Revenue: ₹{revenue.toFixed(2)}</p>
        <p>Cash: ₹{salesByCash.toFixed(2)}</p>
        <p>UPI: ₹{salesByUPI.toFixed(2)}</p>
        <p>--------</p>
        <p>Total Expenses: ₹{expenses.toFixed(2)}</p>
        <p>Expenses (Cash): ₹{expensesByCash.toFixed(2)}</p>
        <p>Expenses (UPI): ₹{expensesByUPI.toFixed(2)}</p>
        <p>--------</p>
        <p>Net Bal (Total): ₹{profit.toFixed(2)}</p>
        <p>Net Bal (Cash): ₹{netProfitByCash.toFixed(2)}</p>
        <p>Net Bal (UPI): ₹{netProfitByUPI.toFixed(2)}</p>
      </div>

      {/* Downloads */}
      <button onClick={downloadCSV}>⬇ Download CSV</button>
      <button onClick={downloadPDF} style={{ marginLeft: "1rem" }}>
        ⬇ Download PDF
      </button>
    </div>
  );
};

export default SalesReport;
