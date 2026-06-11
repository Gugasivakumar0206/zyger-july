import { useEffect, useMemo, useState } from 'react'
import { PageContainer, StatusBadge } from '../../components/ui'
import DataTable from '../../components/tables/DataTable'
import { deleteSubcontractor, getSubcontractors } from '../../lib/api'

const COLUMNS = [
  { key: 'code', label: 'Code', width: 130 },
  { key: 'name', label: 'SubContractor Name', width: 240 },
  { key: 'shortName', label: 'Short Name', width: 170 },
  { key: 'gstNumber', label: 'GST Number', width: 180 },
  { key: 'industryType', label: 'Industry Type', width: 160 },
  { key: 'contactPerson', label: 'Contact Person', width: 180 },
  { key: 'taxCategory', label: 'Tax Category', width: 170 },
  { key: 'bankName', label: 'Bank Name', width: 180 },
  { key: 'status', label: 'Status', width: 110, render: value => <StatusBadge status={value} /> },
]

export default function SubcontractorPage() {
  const [records, setRecords] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  async function loadRecords() {
    try {
      setLoading(true)
      setError('')
      setRecords(await getSubcontractors())
    } catch (err) {
      setError(err.message || 'Unable to load subcontractors.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadRecords()
  }, [])

  const data = useMemo(() => records.map(record => ({
    id: record.id,
    code: record.code,
    name: record.name,
    shortName: record.shortName,
    gstNumber: record.gstNumber || '-',
    industryType: record.industryType || '-',
    contactPerson: record.contactPerson || '-',
    taxCategory: record.taxClassification?.taxCategory || '-',
    bankName: record.bank?.bankName || '-',
    status: record.active ? 'Active' : 'Inactive',
  })), [records])

  async function handleDelete(row) {
    if (!confirm(`Delete ${row.name}?`)) return
    await deleteSubcontractor(row.id)
    setRecords(current => current.filter(record => record.id !== row.id))
  }

  return (
    <PageContainer title="SubContractor" subtitle="SubContractor master list with tax, address, registration and bank details">
      {error && <div className="card p-3 mb-4 text-sm font-bold text-red-600 bg-red-50 border border-red-100">{error}</div>}
      {loading && <div className="card p-3 mb-4 text-sm font-bold text-blue-700 bg-blue-50 border border-blue-100">Loading subcontractors...</div>}
      <DataTable
        columns={COLUMNS}
        data={data}
        addPath="/subcontractor/new"
        addLabel="Create SubContractor"
        rowPath="/subcontractor"
        onDelete={handleDelete}
      />
    </PageContainer>
  )
}
