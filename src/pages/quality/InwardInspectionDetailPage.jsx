import { useEffect, useMemo, useState } from 'react'
import { Building2, CalendarDays, ClipboardCheck, FileText, Printer, ShieldAlert, ShoppingBag, Undo2 } from 'lucide-react'
import { Link, useParams } from 'react-router-dom'

import { PageContainer, SectionCard } from '../../components/ui/index'
import { getInwardInspectionById } from '../../lib/api'

function formatDate(value, includeTime = false) {
  if (!value) return '-'
  const date = new Date(value)
  if (includeTime) {
    return `${date.toLocaleDateString('en-GB')} ${date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}`
  }
  return date.toLocaleDateString('en-GB')
}

function formatQty(value) {
  return Number(value || 0).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 })
}

function InfoTile({ icon: Icon, label, value }) {
  return (
    <div className="card !p-4">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl bg-primary-50 flex items-center justify-center shrink-0">
          <Icon size={18} className="text-primary-600" />
        </div>
        <div>
          <p className="text-xs text-slate-500">{label}</p>
          <p className="text-sm font-semibold text-slate-800 whitespace-pre-line">{value || '-'}</p>
        </div>
      </div>
    </div>
  )
}

export default function InwardInspectionDetailPage() {
  const { id } = useParams()
  const [header, setHeader] = useState(null)
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    async function loadDetail() {
      try {
        setLoading(true)
        setError('')
        const result = await getInwardInspectionById(id)
        setHeader(result.header || null)
        setItems(result.items || [])
      } catch (loadError) {
        setError(loadError.message || 'Unable to load inward inspection details.')
      } finally {
        setLoading(false)
      }
    }

    loadDetail()
  }, [id])

  const totals = useMemo(() => {
    return items.reduce(
      (acc, row) => {
        acc.received += Number(row.received_qty || 0)
        acc.accepted += Number(row.accepted_qty || 0)
        acc.rejected += Number(row.rejected_qty || 0)
        acc.rework += Number(row.rework_qty || 0)
        return acc
      },
      { received: 0, accepted: 0, rejected: 0, rework: 0 }
    )
  }, [items])

  function handlePrint() {
    window.print()
  }

  return (
    <PageContainer
      title={header ? `Inward Inspection ${header.inspection_no}` : 'Inward Inspection Detail'}
      subtitle="Quality -> Inward Inspection -> View inward inspection and rejected quantity details"
      actions={(
        <>
          <Link to="/reports/inward-inspection" className="btn-secondary">
            <FileText size={15} />
            Reports
          </Link>
          <button type="button" className="btn-secondary" onClick={handlePrint}>
            <Printer size={15} />
            Print Report
          </button>
        </>
      )}
    >
      {loading ? (
        <div className="card text-center py-10 text-slate-500 font-medium">Loading inward inspection detail...</div>
      ) : error ? (
        <div style={{ marginBottom: '16px', padding: '12px 14px', borderRadius: '10px', background: '#fee2e2', color: '#991b1b', fontSize: '13px', fontWeight: '700' }}>
          {error}
        </div>
      ) : (
        <>
          <SectionCard title="Inward Inspection Information" icon={ClipboardCheck} defaultOpen>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <InfoTile icon={ShieldAlert} label="Inward Inspection Number" value={header?.inspection_no} />
              <InfoTile icon={Building2} label="Company Name" value={header?.company_name} />
              <InfoTile icon={CalendarDays} label="Inward Inspection Date" value={formatDate(header?.inspection_date, true)} />
            </div>
          </SectionCard>

          <SectionCard title="Inward Information" icon={ShoppingBag} defaultOpen>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <InfoTile icon={ClipboardCheck} label="Inward Number" value={header?.inward_no} />
              <InfoTile icon={CalendarDays} label="Inward Date" value={formatDate(header?.inward_date)} />
              <InfoTile icon={Undo2} label="Inward Type" value={header?.inward_type} />
              <InfoTile icon={FileText} label="Invoice No" value={header?.invoice_no} />
              <InfoTile icon={Building2} label="Created By" value={header?.created_by || '-'} />
              <InfoTile icon={ClipboardCheck} label="Status" value={header?.status || 'Inspection Done'} />
              <InfoTile icon={ShieldAlert} label="Total Rejected Qty" value={formatQty(header?.total_rejected_qty)} />
              <InfoTile icon={Undo2} label="Total Rework Qty" value={formatQty(header?.total_rework_qty)} />
            </div>
          </SectionCard>

          <SectionCard title="Product Information" icon={ClipboardCheck} defaultOpen>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-primary-700 text-white">
                  <tr>
                    <th className="px-3 py-3 text-left">S No</th>
                    <th className="px-3 py-3 text-left">Item</th>
                    <th className="px-3 py-3 text-left">Tolerance</th>
                    <th className="px-3 py-3 text-left">UoM</th>
                    <th className="px-3 py-3 text-left">Qty</th>
                    <th className="px-3 py-3 text-left">Acc Qty</th>
                    <th className="px-3 py-3 text-left">Rejected Qty</th>
                    <th className="px-3 py-3 text-left">Rework Qty</th>
                    <th className="px-3 py-3 text-left">Testing</th>
                    <th className="px-3 py-3 text-left">Location</th>
                    <th className="px-3 py-3 text-left">Batch Number</th>
                    <th className="px-3 py-3 text-left">Remark</th>
                    <th className="px-3 py-3 text-left">Attachment</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((row, index) => (
                    <tr key={row.id || index} className="border-b border-slate-100 align-top">
                      <td className="px-3 py-3">{index + 1}</td>
                      <td className="px-3 py-3 min-w-52">
                        <div className="font-semibold text-slate-800">{row.item_code}</div>
                        <div className="text-slate-600">{row.item_name}</div>
                      </td>
                      <td className="px-3 py-3">{formatQty(row.tolerance)}</td>
                      <td className="px-3 py-3">{row.uom || '-'}</td>
                      <td className="px-3 py-3">{formatQty(row.received_qty)}</td>
                      <td className="px-3 py-3 text-green-700 font-semibold">{formatQty(row.accepted_qty)}</td>
                      <td className="px-3 py-3 text-red-600 font-semibold">{formatQty(row.rejected_qty)}</td>
                      <td className="px-3 py-3 text-amber-600 font-semibold">{formatQty(row.rework_qty)}</td>
                      <td className="px-3 py-3">{row.testing || '-'}</td>
                      <td className="px-3 py-3">{row.location || '-'}</td>
                      <td className="px-3 py-3">{row.batch_number || '-'}</td>
                      <td className="px-3 py-3">{row.remark || '-'}</td>
                      <td className="px-3 py-3">{row.attachment || '-'}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-slate-50 font-semibold text-slate-700">
                  <tr>
                    <td colSpan={4} className="px-3 py-3 text-right">Totals</td>
                    <td className="px-3 py-3">{formatQty(totals.received)}</td>
                    <td className="px-3 py-3 text-green-700">{formatQty(totals.accepted)}</td>
                    <td className="px-3 py-3 text-red-600">{formatQty(totals.rejected)}</td>
                    <td className="px-3 py-3 text-amber-600">{formatQty(totals.rework)}</td>
                    <td colSpan={5} className="px-3 py-3">Inspection done and rejected quantity view available here.</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </SectionCard>

          <SectionCard title="Inspection Remark" icon={FileText} defaultOpen>
            <div className="card !shadow-none !border-slate-200">
              <p className="text-sm text-slate-700 whitespace-pre-line">{header?.remarks || 'No overall inspection remark added.'}</p>
            </div>
          </SectionCard>
        </>
      )}
    </PageContainer>
  )
}
