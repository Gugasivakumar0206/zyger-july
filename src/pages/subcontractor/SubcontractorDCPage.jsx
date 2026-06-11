import { useEffect, useMemo, useState } from 'react'
import { PageContainer, StatusBadge } from '../../components/ui'
import DataTable from '../../components/tables/DataTable'
import { getSubcontractorDCs } from '../../lib/api'

const COLUMNS = [
  { key: 'dcNo', label: 'DC No', width: 140 },
  { key: 'dcDate', label: 'DC Date', width: 120 },
  { key: 'subcontractorName', label: 'SubContractor', width: 220 },
  { key: 'workOrderNo', label: 'WO No', width: 140 },
  { key: 'processName', label: 'Process', width: 170 },
  { key: 'issueQty', label: 'Issue Qty', width: 110 },
  { key: 'returnedQty', label: 'Return Qty', width: 110 },
  { key: 'pendingQty', label: 'Pending Qty', width: 120 },
  { key: 'status', label: 'Status', width: 120, render: value => <StatusBadge status={value} /> },
]

export default function SubcontractorDCPage() {
  const [records, setRecords] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    async function loadRecords() {
      try {
        setLoading(true)
        setError('')
        setRecords(await getSubcontractorDCs())
      } catch (err) {
        setError(err.message || 'Unable to load SubContractor DC records.')
      } finally {
        setLoading(false)
      }
    }
    loadRecords()
  }, [])

  const data = useMemo(() => records.map(row => ({
    id: row.id,
    dcNo: row.dcNo,
    dcDate: row.dcDate,
    subcontractorName: row.subcontractorName,
    workOrderNo: row.workOrderNo || '-',
    processName: row.processName || '-',
    issueQty: Number(row.totalIssueQty || 0).toLocaleString('en-IN'),
    returnedQty: Number(row.totalReturnedQty || 0).toLocaleString('en-IN'),
    pendingQty: Number(row.totalPendingQty || 0).toLocaleString('en-IN'),
    status: row.status || 'Open',
  })), [records])

  return (
    <PageContainer title="SubContractor DC" subtitle="Issue material to subcontractor and track return / pending quantity">
      {error && <div className="card p-3 mb-4 text-sm font-bold text-red-600 bg-red-50 border border-red-100">{error}</div>}
      {loading && <div className="card p-3 mb-4 text-sm font-bold text-blue-700 bg-blue-50 border border-blue-100">Loading SubContractor DC records...</div>}
      <DataTable
        columns={COLUMNS}
        data={data}
        addPath="/subcontractor/dc/new"
        addLabel="Create SubContractor DC"
        rowPath="/subcontractor/dc"
      />
    </PageContainer>
  )
}
