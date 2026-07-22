import { useEffect, useMemo, useState } from 'react'
import { Boxes, Download, FileSpreadsheet, IndianRupee, Package, Printer } from 'lucide-react'

import { PageContainer } from '../../components/ui/index'
import { getInventoryReport, getInventoryReportCsvUrl } from '../../lib/api'

function formatNumber(value) {
  return Number(value || 0).toLocaleString('en-IN', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })
}

function formatCurrency(value) {
  return Number(value || 0).toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}

export default function InventoryReportPage() {
  const [rows, setRows] = useState([])
  const [summary, setSummary] = useState({
    total_items: 0,
    total_stock_qty: 0,
    accepted_stock: 0,
    rejected_stock: 0,
    idle_stock: 0,
    total_stock_value: 0,
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [filters, setFilters] = useState({
    dateFrom: '',
    dateTo: '',
    stockType: 'Store Stock',
    itemType: '',
    groupType: '',
    stockQty: '',
    search: '',
    showGroupTotal: true,
  })

  useEffect(() => {
    async function loadReport() {
      try {
        setLoading(true)
        setError('')
        const result = await getInventoryReport()
        setRows(result.rows || [])
        setSummary(result.summary || {})
      } catch (err) {
        setError(err.message || 'Failed to load inventory report')
      } finally {
        setLoading(false)
      }
    }

    loadReport()
  }, [])

  const groupOptions = useMemo(
    () => [...new Set(rows.map(row => row.item_group).filter(Boolean))],
    [rows]
  )

  const filteredRows = useMemo(() => {
    const search = filters.search.trim().toLowerCase()
    return rows.filter(row => {
      if (filters.groupType && row.item_group !== filters.groupType) return false
      if (filters.stockQty === 'stock-only' && Number(row.current_stock || 0) <= 0) return false
      if (filters.stockQty === 'zero-stock' && Number(row.current_stock || 0) !== 0) return false
      if (filters.stockQty === 'accepted' && Number(row.accepted_stock || 0) <= 0) return false
      if (filters.stockQty === 'rejected' && Number(row.rejected_stock || 0) <= 0) return false
      if (filters.stockQty === 'idle' && Number(row.idle_stock || 0) <= 0) return false
      if (!search) return true
      return [row.item_code, row.item_name, row.item_group, row.uom, row.status]
        .filter(Boolean)
        .some(value => String(value).toLowerCase().includes(search))
    })
  }, [filters, rows])

  const updateFilter = (key, value) => setFilters(current => ({ ...current, [key]: value }))

  function downloadExcel() {
    const tableRows = filteredRows.map((row) => `
      <tr>
        <td>${escapeHtml(row.item_code)}</td>
        <td>${escapeHtml(row.item_name)}</td>
        <td>${escapeHtml(row.item_group || '-')}</td>
        <td>${escapeHtml(row.uom || '-')}</td>
        <td>${formatNumber(row.current_stock)}</td>
        <td>${formatCurrency(row.purchase_rate)}</td>
        <td>${formatCurrency(row.sales_rate)}</td>
        <td>${formatCurrency(row.stock_value)}</td>
        <td>${escapeHtml(row.status || '-')}</td>
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
          <h1>Inventory Report</h1>
          <p>Total Items: ${formatNumber(summary.total_items)} | Total Stock Qty: ${formatNumber(summary.total_stock_qty)} | Total Stock Value: ${formatCurrency(summary.total_stock_value)}</p>
          <table>
            <thead>
              <tr>
                <th>Item Code</th>
                <th>Item Name</th>
                <th>Group</th>
                <th>UOM</th>
                <th>Stock Qty</th>
                <th>Purchase Rate</th>
                <th>Sales Rate</th>
                <th>Stock Value</th>
                <th>Status</th>
              </tr>
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
    link.download = 'inventory-report.xls'
    link.click()
    URL.revokeObjectURL(url)
  }

  function downloadPdf() {
    const generatedAt = new Date().toLocaleString('en-IN')
    const tableRows = filteredRows.map((row) => `
      <tr>
        <td>${escapeHtml(row.item_code)}</td>
        <td>${escapeHtml(row.item_name)}</td>
        <td>${escapeHtml(row.item_group || '-')}</td>
        <td>${escapeHtml(row.uom || '-')}</td>
        <td style="text-align:right">${formatNumber(row.current_stock)}</td>
        <td style="text-align:right">${formatCurrency(row.purchase_rate)}</td>
        <td style="text-align:right">${formatCurrency(row.sales_rate)}</td>
        <td style="text-align:right">${formatCurrency(row.stock_value)}</td>
        <td>${escapeHtml(row.status || '-')}</td>
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
          <title>Inventory Report PDF</title>
          <style>
            * { box-sizing: border-box; }
            body { margin: 0; padding: 30px; background: #eef4ff; color: #172033; font-family: Inter, Arial, sans-serif; }
            .sheet { background: #fff; border-radius: 18px; padding: 28px; box-shadow: 0 18px 50px rgba(15, 76, 129, 0.16); border: 1px solid #dbeafe; }
            .header { display: flex; justify-content: space-between; gap: 20px; border-bottom: 3px solid #0b6fb7; padding-bottom: 18px; margin-bottom: 18px; }
            .brand { font-size: 13px; font-weight: 800; color: #0b6fb7; letter-spacing: 0.14em; text-transform: uppercase; }
            h1 { margin: 6px 0 8px; font-size: 30px; color: #0f2f57; letter-spacing: -0.03em; }
            .subtitle { margin: 0; color: #52637a; font-size: 13px; }
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
                <h1>Inventory Report</h1>
                <p class="subtitle">Current stock levels, purchase values, and item-wise inventory summary</p>
              </div>
              <div class="meta">
                <div><strong>Generated</strong></div>
                <div>${escapeHtml(generatedAt)}</div>
                <div>Records: ${filteredRows.length}</div>
              </div>
            </div>
            <div class="summary">
              <div class="summary-card"><span>Total Items</span><strong>${formatNumber(summary.total_items)}</strong></div>
              <div class="summary-card"><span>Total Stock Qty</span><strong>${formatNumber(summary.total_stock_qty)}</strong></div>
              <div class="summary-card"><span>Total Stock Value</span><strong>${formatCurrency(summary.total_stock_value)}</strong></div>
            </div>
            <table>
              <thead>
                <tr>
                  <th>Item Code</th>
                  <th>Item Name</th>
                  <th>Group</th>
                  <th>UOM</th>
                  <th>Stock Qty</th>
                  <th>Purchase Rate</th>
                  <th>Sales Rate</th>
                  <th>Stock Value</th>
                  <th>Status</th>
                </tr>
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
      title="Inventory Report"
      subtitle="Current stock levels, purchase values, and item-wise inventory summary"
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
          <a href={getInventoryReportCsvUrl()} className="btn-secondary" download>
            <Download size={15} />
            Download CSV
          </a>
        </>
      )}
    >
      <div className="card p-4 mb-5" style={{ border: '1px solid #d7e8ff' }}>
        <div className="grid grid-cols-1 md:grid-cols-4 xl:grid-cols-6 gap-3">
          <div>
            <label className="form-label">Date From</label>
            <input className="form-input" type="date" value={filters.dateFrom} onChange={event => updateFilter('dateFrom', event.target.value)} />
          </div>
          <div>
            <label className="form-label">Date To</label>
            <input className="form-input" type="date" value={filters.dateTo} onChange={event => updateFilter('dateTo', event.target.value)} />
          </div>
          <div>
            <label className="form-label">Stock</label>
            <select className="form-select" value={filters.stockType} onChange={event => updateFilter('stockType', event.target.value)}>
              <option>Store Stock</option>
              <option>Shop Floor</option>
              <option>Supplier Stock</option>
              <option>Rejected / Hold Stock</option>
              <option>Idle Stock</option>
            </select>
          </div>
          <div>
            <label className="form-label">Item Type</label>
            <select className="form-select" value={filters.itemType} onChange={event => updateFilter('itemType', event.target.value)}>
              <option value="">All</option>
              <option>Purchasable Item</option>
              <option>Manufacturing Item</option>
              <option>Customer Supplied</option>
            </select>
          </div>
          <div>
            <label className="form-label">Group Type</label>
            <select className="form-select" value={filters.groupType} onChange={event => updateFilter('groupType', event.target.value)}>
              <option value="">All</option>
              {groupOptions.map(group => <option key={group} value={group}>{group}</option>)}
            </select>
          </div>
          <div>
            <label className="form-label">Stock Qty</label>
            <select className="form-select" value={filters.stockQty} onChange={event => updateFilter('stockQty', event.target.value)}>
              <option value="">All</option>
              <option value="stock-only">Stock Only</option>
              <option value="zero-stock">Zero Stock</option>
              <option value="accepted">Accepted Only</option>
              <option value="rejected">Rejected / Hold</option>
              <option value="idle">Idle Stock</option>
            </select>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-3 mt-3 items-end">
          <div>
            <label className="form-label">Search</label>
            <input className="form-input" value={filters.search} onChange={event => updateFilter('search', event.target.value)} placeholder="Search item code, item name, group..." />
          </div>
          <label className="flex items-center gap-2 text-sm font-bold text-slate-700 pb-2">
            <input type="checkbox" checked={filters.showGroupTotal} onChange={event => updateFilter('showGroupTotal', event.target.checked)} />
            Show Group Total
          </label>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-6 gap-4 mb-5">
        <div className="card">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary-50 flex items-center justify-center">
              <Package size={18} className="text-primary-600" />
            </div>
            <div>
              <p className="text-xs text-slate-500">Total Items</p>
              <p className="text-2xl font-bold text-slate-800">{formatNumber(summary.total_items)}</p>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-green-50 flex items-center justify-center">
              <Boxes size={18} className="text-green-600" />
            </div>
            <div>
              <p className="text-xs text-slate-500">Accepted Stock</p>
              <p className="text-2xl font-bold text-green-700">{formatNumber(summary.accepted_stock)}</p>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center">
              <Boxes size={18} className="text-red-600" />
            </div>
            <div>
              <p className="text-xs text-slate-500">Rejected / Hold</p>
              <p className="text-2xl font-bold text-red-600">{formatNumber(summary.rejected_stock)}</p>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center">
              <Boxes size={18} className="text-slate-700" />
            </div>
            <div>
              <p className="text-xs text-slate-500">Idle Stock</p>
              <p className="text-2xl font-bold text-slate-800">{formatNumber(summary.idle_stock)}</p>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary-50 flex items-center justify-center">
              <Boxes size={18} className="text-primary-600" />
            </div>
            <div>
              <p className="text-xs text-slate-500">Total Stock Qty</p>
              <p className="text-2xl font-bold text-slate-800">{formatNumber(summary.total_stock_qty)}</p>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary-50 flex items-center justify-center">
              <IndianRupee size={18} className="text-primary-600" />
            </div>
            <div>
              <p className="text-xs text-slate-500">Total Stock Value</p>
              <p className="text-2xl font-bold text-slate-800">{formatCurrency(summary.total_stock_value)}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="card overflow-hidden">
        {loading ? (
          <div className="py-10 text-center text-slate-500 font-medium">Loading inventory report...</div>
        ) : error ? (
          <div className="py-10 text-center text-red-500 font-medium">{error}</div>
        ) : filteredRows.length === 0 ? (
          <div className="py-10 text-center text-slate-500 font-medium">No items found for report generation.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold text-slate-600">Item Code</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-600">Item Name</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-600">Group</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-600">UOM</th>
                  <th className="px-4 py-3 text-right font-semibold text-slate-600">Stock Qty</th>
                  <th className="px-4 py-3 text-right font-semibold text-slate-600">Accepted</th>
                  <th className="px-4 py-3 text-right font-semibold text-slate-600">Rejected/Hold</th>
                  <th className="px-4 py-3 text-right font-semibold text-slate-600">Idle</th>
                  <th className="px-4 py-3 text-right font-semibold text-slate-600">Purchase Rate</th>
                  <th className="px-4 py-3 text-right font-semibold text-slate-600">Sales Rate</th>
                  <th className="px-4 py-3 text-right font-semibold text-slate-600">Stock Value</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-600">Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredRows.map((row) => (
                  <tr key={row.id} className="border-t border-slate-100">
                    <td className="px-4 py-3 text-slate-700 font-medium">{row.item_code}</td>
                    <td className="px-4 py-3 text-slate-700">{row.item_name}</td>
                    <td className="px-4 py-3 text-slate-500">{row.item_group || '-'}</td>
                    <td className="px-4 py-3 text-slate-500">{row.uom || '-'}</td>
                    <td className="px-4 py-3 text-right text-slate-700">{formatNumber(row.current_stock)}</td>
                    <td className="px-4 py-3 text-right text-green-700 font-semibold">{formatNumber(row.accepted_stock)}</td>
                    <td className="px-4 py-3 text-right text-red-600 font-semibold">{formatNumber(row.rejected_stock)}</td>
                    <td className="px-4 py-3 text-right text-slate-700 font-semibold">{formatNumber(row.idle_stock)}</td>
                    <td className="px-4 py-3 text-right text-slate-700">{formatCurrency(row.purchase_rate)}</td>
                    <td className="px-4 py-3 text-right text-slate-700">{formatCurrency(row.sales_rate)}</td>
                    <td className="px-4 py-3 text-right text-slate-700 font-semibold">{formatCurrency(row.stock_value)}</td>
                    <td className="px-4 py-3 text-slate-500">{row.status || '-'}</td>
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
