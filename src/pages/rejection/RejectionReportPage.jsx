import { useState } from 'react'
import { PageContainer } from '../../components/ui/index'
import DataTable from '../../components/tables/DataTable'
import { MOCK_REJECTIONS } from '../../data/mockData'

const COLUMNS = [
  { key: 'reportNumber', label: 'Report No.', width: 130 },
  { key: 'date', label: 'Date', width: 110 },
  { key: 'itemName', label: 'Item Name' },
  { key: 'batchNumber', label: 'Batch No.', width: 130 },
  { key: 'rejectedQuantity', label: 'Qty Rejected', width: 120 },
  { key: 'reason', label: 'Reason', width: 180 },
]

export default function RejectionReportPage() {
  const [data, setData] = useState(MOCK_REJECTIONS)
  return (
    <PageContainer title="Rejection Report" subtitle="Manage rejection report records" showBackButton backPath="/reports">
      <DataTable
        columns={COLUMNS}
        data={data}
        addPath="/rejection/new"
        addLabel="New Report"
        rowPath="/rejection"
        onDelete={(row) => { if (confirm(`Delete?`)) setData(d => d.filter(r => r.id !== row.id)) }}
      />
    </PageContainer>
  )
}
