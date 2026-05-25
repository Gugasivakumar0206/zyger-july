import { useEffect, useMemo, useState } from 'react'
import { FileText, Printer } from 'lucide-react'
import { Link } from 'react-router-dom'

import DataTable from '../../components/tables/DataTable'
import { PageContainer, StatusBadge } from '../../components/ui/index'
import { getInwardInspections } from '../../lib/api'

function formatDate(value) {
  if (!value) return '-'
  return new Date(value).toLocaleDateString('en-GB')
}

function formatQty(value) {
  return Number(value || 0).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 })
}

export default function InwardInspectionPage() {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    async function loadRows() {
      try {
        setLoading(true)
        setError('')
        const result = await getInwardInspections()
        setRows(Array.isArray(result) ? result : [])
      } catch (loadError) {
        setError(loadError.message || 'Unable to load inward inspections.')
      } finally {
        setLoading(false)
      }
    }

    loadRows()
  }, [])

  const columns = useMemo(
    () => [
      {
        key: 'inspection_no',
        label: 'Inspection No',
        render: (value, row) => (
          <Link to={`/quality/inward-inspection/${row.id}`} target="_blank" rel="noreferrer" className="text-primary-700 font-semibold hover:underline">
            {value}
          </Link>
        ),
      },
      { key: 'inspection_date', label: 'Inspection Date', render: (value) => formatDate(value) },
      { key: 'inward_type', label: 'Inward Type' },
      { key: 'company_name', label: 'Company Name' },
      { key: 'inward_no', label: 'Inward No' },
      { key: 'total_qty', label: 'Received Qty', render: (value) => formatQty(value) },
      { key: 'total_accepted_qty', label: 'Accepted Qty', render: (value) => formatQty(value) },
      { key: 'total_rejected_qty', label: 'Rejected Qty', render: (value) => <span className="text-red-600 font-semibold">{formatQty(value)}</span> },
      { key: 'total_rework_qty', label: 'Rework Qty', render: (value) => formatQty(value) },
      { key: 'status', label: 'Status', render: (value) => <StatusBadge status={value || 'Completed'} /> },
    ],
    []
  )

  const summary = useMemo(() => {
    return rows.reduce(
      (acc, row) => {
        acc.total += 1
        acc.received += Number(row.total_qty || 0)
        acc.rejected += Number(row.total_rejected_qty || 0)
        return acc
      },
      { total: 0, received: 0, rejected: 0 }
    )
  }, [rows])

  return (
    <PageContainer
      title="Inward Inspection"
      subtitle="Quality -> Inward Inspection -> Track accepted, rejected, and rework quantities"
      actions={(
        <>
          <Link to="/reports/inward-inspection" target="_blank" rel="noreferrer" className="btn-secondary">
            <FileText size={15} />
            Reports
          </Link>
          <Link to="/quality/inward-inspection/new" target="_blank" rel="noreferrer" className="btn-primary">
            <Printer size={15} />
            New Inward Inspection
          </Link>
        </>
      )}
      showBackButton={false}
    >
      {error && (
        <div style={{ marginBottom: '16px', padding: '12px 14px', borderRadius: '10px', background: '#fee2e2', color: '#991b1b', fontSize: '13px', fontWeight: '700' }}>
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-5">
        <div className="card">
          <p className="text-xs text-slate-500">Total Inspections</p>
          <p className="text-2xl font-bold text-slate-800">{summary.total}</p>
        </div>
        <div className="card">
          <p className="text-xs text-slate-500">Total Received Qty</p>
          <p className="text-2xl font-bold text-slate-800">{formatQty(summary.received)}</p>
        </div>
        <div className="card">
          <p className="text-xs text-slate-500">Total Rejected Qty</p>
          <p className="text-2xl font-bold text-red-600">{formatQty(summary.rejected)}</p>
        </div>
      </div>

      {loading ? (
        <div className="card text-center py-10 text-slate-500 font-medium">Loading inward inspections...</div>
      ) : (
        <DataTable
          columns={columns}
          data={rows}
          addPath="/quality/inward-inspection/new"
          addLabel="New Inward Inspection"
          rowPath="/quality/inward-inspection"
          extraActions={
            <Link to="/reports/inward-inspection" target="_blank" rel="noreferrer" className="btn-secondary">
              <FileText size={14} />
              Inspection Report
            </Link>
          }
        />
      )}
    </PageContainer>
  )
}
