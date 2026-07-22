import { useEffect, useMemo, useState } from 'react'
import { Boxes, Download, FileSpreadsheet, IndianRupee, Package, Printer } from 'lucide-react'

import { PageContainer } from '../../components/ui/index'
import { getBusinessReport, getBusinessReportCsvUrl } from '../../lib/api'

const REPORT_META = {
  inward: {
    title: 'Inward Report',
    subtitle: 'GRN, PO, LO, and JO inward entries with supplier, item, and value details',
    columns: [
      ['inward_type', 'Inward Type'],
      ['inward_no', 'Inward No'],
      ['inward_date', 'Date'],
      ['invoice_no', 'Invoice No'],
      ['vehicle_no', 'Vehicle No'],
      ['supplier_name', 'Supplier'],
      ['customer_name', 'Customer'],
      ['item_code', 'Item Code'],
      ['item_name', 'Item Name'],
      ['qty', 'Qty'],
      ['rate', 'Rate'],
      ['amount', 'Amount'],
      ['status', 'Status'],
    ],
  },
  'lo-inward': {
    title: 'LO Inward Report',
    subtitle: 'LO inward entries with customer, item, and value details',
    columns: [
      ['inward_type', 'Inward Type'],
      ['inward_no', 'Inward No'],
      ['inward_date', 'Date'],
      ['invoice_no', 'Invoice No'],
      ['vehicle_no', 'Vehicle No'],
      ['supplier_name', 'Supplier'],
      ['customer_name', 'Customer'],
      ['item_code', 'Item Code'],
      ['item_name', 'Item Name'],
      ['qty', 'Qty'],
      ['rate', 'Rate'],
      ['amount', 'Amount'],
      ['status', 'Status'],
    ],
  },
  purchase: {
    title: 'Purchase Report',
    subtitle: 'Purchase inward summary, suppliers, customer tags, and line values',
    columns: [
      ['inward_no', 'Inward No'],
      ['inward_date', 'Date'],
      ['supplier_name', 'Supplier'],
      ['customer_name', 'Customer'],
      ['item_code', 'Item Code'],
      ['item_name', 'Item Name'],
      ['qty', 'Qty'],
      ['rate', 'Rate'],
      ['amount', 'Amount'],
      ['status', 'Status'],
    ],
  },
  manufacturing: {
    title: 'Manufacturing Report',
    subtitle: 'Manufacturing-ready item stock and status summary',
    columns: [
      ['item_code', 'Item Code'],
      ['item_name', 'Item Name'],
      ['item_group', 'Group'],
      ['uom', 'UOM'],
      ['current_stock', 'Stock Qty'],
      ['sales_rate', 'Sales Rate'],
      ['status', 'Status'],
    ],
  },
  sales: {
    title: 'Sales Report',
    subtitle: 'Sales DC based customer dispatch and value report',
    columns: [
      ['dc_no', 'DC No'],
      ['dc_date', 'Date'],
      ['customer_name', 'Customer'],
      ['item_code', 'Item Code'],
      ['item_name', 'Item Name'],
      ['uom', 'UOM'],
      ['qty', 'Qty'],
      ['rate', 'Rate'],
      ['amount', 'Amount'],
      ['status', 'Status'],
    ],
  },
  'dc-summary': {
    title: 'DC Summary Report',
    subtitle: 'Delivery challan quantity, pending, and returned summary',
    columns: [
      ['dc_no', 'DC No'],
      ['dc_date', 'Date'],
      ['customer_name', 'Customer'],
      ['item_code', 'Item Code'],
      ['item_name', 'Item Name'],
      ['qty', 'Qty'],
      ['returned_qty', 'Returned Qty'],
      ['pending_qty', 'Pending Qty'],
      ['status', 'Status'],
    ],
  },
  invoice: {
    title: 'Invoice Report',
    subtitle: 'Tax and sale invoice totals, GST values, and customer invoice status',
    columns: [
      ['invoice_type', 'Invoice Type'],
      ['invoice_no', 'Invoice No'],
      ['invoice_date', 'Date'],
      ['customer_name', 'Customer'],
      ['subtotal', 'Subtotal'],
      ['gst_amount', 'GST'],
      ['total_amount', 'Total'],
      ['status', 'Status'],
    ],
  },
  rejection: {
    title: 'Rejection Analysis',
    subtitle: 'Returned and pending quantities tracked from sales DC lines',
    columns: [
      ['dc_no', 'DC No'],
      ['dc_date', 'Date'],
      ['customer_name', 'Customer'],
      ['item_code', 'Item Code'],
      ['item_name', 'Item Name'],
      ['qty', 'Qty'],
      ['returned_qty', 'Returned Qty'],
      ['pending_qty', 'Pending Qty'],
    ],
  },
  'supplier-performance': {
    title: 'Supplier Performance',
    subtitle: 'Supplier inward count, received quantity, and purchase values',
    columns: [
      ['supplier_code', 'Supplier Code'],
      ['supplier_name', 'Supplier Name'],
      ['inward_count', 'Inward Count'],
      ['total_qty', 'Total Qty'],
      ['total_amount', 'Total Amount'],
    ],
  },
  'customer-supplied': {
    title: 'Customer Supplied Report',
    subtitle: 'Customer supplied item lines from sales DC entries',
    columns: [
      ['dc_no', 'DC No'],
      ['dc_date', 'Date'],
      ['customer_code', 'Customer Code'],
      ['customer_name', 'Customer'],
      ['item_code', 'Item Code'],
      ['item_name', 'Item Name'],
      ['uom', 'UOM'],
      ['qty', 'Qty'],
      ['rate', 'Rate'],
      ['amount', 'Amount'],
      ['status', 'Status'],
    ],
  },
  'inward-inspection': {
    title: 'Inward Inspection Report',
    subtitle: 'Quality inward inspection summary with accepted, rejected, and rework quantities',
    columns: [
      ['inspection_no', 'Inspection No'],
      ['inspection_date', 'Inspection Date'],
      ['inward_type', 'Inward Type'],
      ['company_name', 'Company Name'],
      ['inward_no', 'Inward No'],
      ['invoice_no', 'Invoice No'],
      ['item_code', 'Item Code'],
      ['item_name', 'Item Name'],
      ['received_qty', 'Received Qty'],
      ['accepted_qty', 'Accepted Qty'],
      ['rejected_qty', 'Rejected Qty'],
      ['rework_qty', 'Rework Qty'],
      ['hold_qty', 'Lot Hold Qty'],
      ['hold_number', 'Hold Number'],
      ['idle_stock_qty', 'Idle Stock Qty'],
      ['testing', 'Testing'],
      ['location', 'Location'],
      ['batch_number', 'Batch Number'],
      ['remark', 'Remark'],
      ['status', 'Status'],
    ],
  },
}

function formatValue(key, value) {
  if (value == null || value === '') return '-'
  if (typeof value === 'number' && (key.includes('amount') || key.includes('rate') || key.includes('value') || key.includes('subtotal') || key.includes('gst'))) {
    return Number(value).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  }
  if (typeof value === 'number') {
    return Number(value).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 })
  }
  return String(value)
}

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}

export default function BusinessReportPage({ reportKey }) {
  const meta = REPORT_META[reportKey]
  const [rows, setRows] = useState([])
  const [summary, setSummary] = useState({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    async function loadReport() {
      try {
        setLoading(true)
        setError('')
        const result = await getBusinessReport(reportKey)
        setRows(result.rows || [])
        setSummary(result.summary || {})
      } catch (err) {
        setError(err.message || `Failed to load ${meta.title}`)
      } finally {
        setLoading(false)
      }
    }

    loadReport()
  }, [reportKey, meta.title])

  const summaryEntries = useMemo(() => Object.entries(summary || {}), [summary])

  function downloadExcel() {
    const tableRows = rows.map((row) => `
      <tr>
        ${meta.columns.map(([key]) => `<td>${escapeHtml(formatValue(key, row[key]))}</td>`).join('')}
      </tr>
    `).join('')

    const html = `
      <html>
        <head>
          <meta charset="utf-8" />
          <style>
            table { border-collapse: collapse; width: 100%; font-family: Arial, sans-serif; }
            th, td { border: 1px solid #d1d5db; padding: 8px; font-size: 12px; }
            th { background: #f3f4f6; text-align: left; }
            h1 { font-family: Arial, sans-serif; }
          </style>
        </head>
        <body>
          <h1>${escapeHtml(meta.title)}</h1>
          <table>
            <thead>
              <tr>${meta.columns.map(([, label]) => `<th>${escapeHtml(label)}</th>`).join('')}</tr>
            </thead>
            <tbody>${tableRows}</tbody>
          </table>
        </body>
      </html>
    `

    const blob = new Blob([html], { type: 'application/vnd.ms-excel' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `${reportKey}-report.xls`
    link.click()
    URL.revokeObjectURL(url)
  }

  function downloadPdf() {
    const generatedAt = new Date().toLocaleString('en-IN')
    const tableRows = rows.map((row) => `
      <tr>
        ${meta.columns.map(([key]) => `<td>${escapeHtml(formatValue(key, row[key]))}</td>`).join('')}
      </tr>
    `).join('')

    const printFrame = document.createElement('iframe')
    printFrame.style.position = 'fixed'
    printFrame.style.right = '0'
    printFrame.style.bottom = '0'
    printFrame.style.width = '0'
    printFrame.style.height = '0'
    printFrame.style.border = '0'
    document.body.appendChild(printFrame)
    const printDocument = printFrame.contentDocument || printFrame.contentWindow?.document
    if (!printDocument) {
      printFrame.remove()
      alert('Unable to prepare print view. Please try again.')
      return
    }

    printDocument.write(`
      <html>
        <head>
          <title>${escapeHtml(meta.title)}</title>
          <style>
            * { box-sizing: border-box; }
            body { margin: 0; padding: 30px; background: #eef4ff; color: #172033; font-family: Inter, Arial, sans-serif; }
            .sheet { background: #fff; border-radius: 18px; padding: 28px; box-shadow: 0 18px 50px rgba(15, 76, 129, 0.16); border: 1px solid #dbeafe; }
            .header { display: flex; justify-content: space-between; gap: 20px; border-bottom: 3px solid #0b6fb7; padding-bottom: 18px; margin-bottom: 18px; }
            .brand { font-size: 13px; font-weight: 800; color: #0b6fb7; letter-spacing: 0.14em; text-transform: uppercase; }
            h1 { margin: 6px 0 8px; font-size: 30px; color: #0f2f57; letter-spacing: -0.03em; }
            .subtitle { margin: 0; color: #52637a; font-size: 13px; max-width: 720px; }
            .meta { text-align: right; color: #52637a; font-size: 12px; line-height: 1.7; }
            .summary { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin: 18px 0; }
            .summary-card { background: linear-gradient(135deg, #eff6ff, #f8fbff); border: 1px solid #bfdbfe; border-radius: 14px; padding: 12px; }
            .summary-card span { display: block; font-size: 10px; color: #64748b; text-transform: uppercase; letter-spacing: 0.08em; }
            .summary-card strong { display: block; margin-top: 4px; font-size: 18px; color: #0f2f57; }
            table { border-collapse: separate; border-spacing: 0; width: 100%; overflow: hidden; border: 1px solid #dbe3ef; border-radius: 14px; }
            th, td { border-bottom: 1px solid #e5edf7; padding: 9px 10px; font-size: 11px; vertical-align: top; }
            th { background: #075a9f; color: white; text-align: left; font-weight: 800; }
            tr:nth-child(even) td { background: #f8fbff; }
            tr:last-child td { border-bottom: 0; }
            .footer { margin-top: 20px; display: flex; justify-content: space-between; color: #64748b; font-size: 11px; }
            @media print {
              body { background: white; padding: 0; }
              .sheet { box-shadow: none; border: 0; border-radius: 0; }
            }
          </style>
        </head>
        <body>
          <div class="sheet">
            <div class="header">
              <div>
                <div class="brand">Zyger ERP</div>
                <h1>${escapeHtml(meta.title)}</h1>
                <p class="subtitle">${escapeHtml(meta.subtitle)}</p>
              </div>
              <div class="meta">
                <div><strong>Generated</strong></div>
                <div>${escapeHtml(generatedAt)}</div>
                <div>Records: ${rows.length}</div>
              </div>
            </div>
            <div class="summary">
              ${summaryEntries.slice(0, 3).map(([key, value]) => `
                <div class="summary-card">
                  <span>${escapeHtml(key.replaceAll('_', ' '))}</span>
                  <strong>${escapeHtml(formatValue(key, value))}</strong>
                </div>
              `).join('')}
            </div>
            <table>
              <thead>
                <tr>${meta.columns.map(([, label]) => `<th>${escapeHtml(label)}</th>`).join('')}</tr>
              </thead>
              <tbody>${tableRows}</tbody>
            </table>
            <div class="footer">
              <span>Prepared by ERP System</span>
              <span>Checked / Approved By ____________________</span>
            </div>
          </div>
        </body>
      </html>
    `)
    printDocument.close()
    setTimeout(() => {
      printFrame.contentWindow?.focus()
      printFrame.contentWindow?.print()
      setTimeout(() => printFrame.remove(), 1000)
    }, 400)
  }

  return (
    <PageContainer
      title={meta.title}
      subtitle={meta.subtitle}
      showBackButton
      backPath="/reports"
      actions={(
        <>
          <button type="button" className="btn-secondary" onClick={downloadExcel}>
            <FileSpreadsheet size={15} />
            Download Sheet
          </button>
          <button type="button" className="btn-secondary" onClick={downloadPdf}>
            <Printer size={15} />
            Download PDF
          </button>
          <a href={getBusinessReportCsvUrl(reportKey)} className="btn-secondary" download>
            <Download size={15} />
            Download CSV
          </a>
        </>
      )}
    >
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-5">
        {summaryEntries.slice(0, 3).map(([key, value], index) => {
          const icons = [Package, Boxes, IndianRupee]
          const Icon = icons[index] || Package
          return (
            <div className="card" key={key}>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary-50 flex items-center justify-center">
                  <Icon size={18} className="text-primary-600" />
                </div>
                <div>
                  <p className="text-xs text-slate-500">{key.replaceAll('_', ' ')}</p>
                  <p className="text-2xl font-bold text-slate-800">{formatValue(key, value)}</p>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      <div className="card overflow-hidden">
        {loading ? (
          <div className="py-10 text-center text-slate-500 font-medium">Loading report...</div>
        ) : error ? (
          <div className="py-10 text-center text-red-500 font-medium">{error}</div>
        ) : rows.length === 0 ? (
          <div className="py-10 text-center text-slate-500 font-medium">No records found for this report.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50">
                <tr>
                  {meta.columns.map(([, label]) => (
                    <th key={label} className="px-4 py-3 text-left font-semibold text-slate-600">{label}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row, rowIndex) => (
                  <tr key={row.id ?? rowIndex} className="border-t border-slate-100">
                    {meta.columns.map(([key]) => (
                      <td key={`${row.id ?? rowIndex}-${key}`} className="px-4 py-3 text-slate-700">
                        {formatValue(key, row[key])}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </PageContainer>
  )
}
