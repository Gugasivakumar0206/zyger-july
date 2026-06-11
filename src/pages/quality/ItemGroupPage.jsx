import { useEffect, useState } from 'react'
import { PlusCircle } from 'lucide-react'

import { FormGrid, FormInput, PageContainer, SectionCard, SelectDropdown, StatusBadge } from '../../components/ui/index'
import DataTable from '../../components/tables/DataTable'
import { createItemGroup, deleteItemGroup, getItemGroups, getNextItemGroupNumber } from '../../lib/api'

const PURCHASABLE_LABEL = 'Purchasable Item'
const PURCHASE_DB_TYPE = 'Purchase Item'
const GROUP_TYPE_OPTIONS = [PURCHASABLE_LABEL, 'Manufacturing Item', 'Customer Supplied']

function toDisplayType(value) {
  return value === PURCHASE_DB_TYPE ? PURCHASABLE_LABEL : value || PURCHASABLE_LABEL
}

function toDbType(value) {
  return value === PURCHASABLE_LABEL ? PURCHASE_DB_TYPE : value || PURCHASE_DB_TYPE
}

const COLUMNS = [
  { key: 'groupCode', label: 'Group ID', width: 120 },
  { key: 'groupType', label: 'Item Type', width: 170 },
  { key: 'groupName', label: 'Group Name', width: 180 },
  { key: 'description', label: 'Description' },
  { key: 'inspectionRequired', label: 'Inspection Needed', width: 150, render: (value) => <StatusBadge status={value ? 'Required' : 'Not Required'} /> },
  { key: 'isActive', label: 'Status', width: 100, render: (value) => <StatusBadge status={value ? 'Active' : 'Inactive'} /> },
]

export default function ItemGroupPage() {
  const [data, setData] = useState([])
  const [form, setForm] = useState({ groupCode: '', groupName: '', groupType: PURCHASABLE_LABEL, description: '', inspectionRequired: false, isActive: true })
  const [error, setError] = useState('')

  async function loadGroups() {
    try {
      setError('')
      const result = await getItemGroups()
      setData((result || []).map((row) => ({
        id: row.id,
        groupCode: row.group_code || `IG-${String(row.id).padStart(3, '0')}`,
        groupName: row.group_name,
        groupType: toDisplayType(row.group_type),
        description: row.description || '-',
        inspectionRequired: row.inspection_required,
        isActive: row.is_active,
      })))
    } catch (loadError) {
      setError(loadError.message || 'Unable to load item groups.')
    }
  }

  useEffect(() => {
    loadGroups()
    getNextItemGroupNumber()
      .then(result => setForm(current => ({ ...current, groupCode: result.group_code || current.groupCode })))
      .catch(() => {})
  }, [])

  async function addGroup() {
    if (!form.groupName.trim()) {
      alert('Group name is required.')
      return
    }
    const duplicate = data.some(group => (
      group.groupName.trim().toLowerCase() === form.groupName.trim().toLowerCase() &&
      group.groupType === form.groupType
    ))
    if (duplicate) {
      alert('This item group already exists for the selected item type.')
      return
    }

    await createItemGroup({ ...form, groupName: form.groupName.trim(), groupType: toDbType(form.groupType) })
    const next = await getNextItemGroupNumber().catch(() => ({ group_code: '' }))
    setForm({ groupCode: next.group_code || '', groupName: '', groupType: form.groupType || PURCHASABLE_LABEL, description: '', inspectionRequired: false, isActive: true })
    await loadGroups()
  }

  async function handleDelete(row) {
    if (!confirm('Delete item group?')) return
    await deleteItemGroup(row.id)
    await loadGroups()
  }

  return (
    <PageContainer title="Item Group" subtitle="Master -> Inventory. Define item groups by item type and inspection requirement.">
      {error && (
        <div style={{ marginBottom: '16px', padding: '12px 14px', borderRadius: '10px', background: '#fee2e2', color: '#991b1b', fontSize: '13px', fontWeight: '700' }}>
          {error}
        </div>
      )}
      <SectionCard title="Create Item Group" icon={PlusCircle} defaultOpen>
        <FormGrid cols={2}>
          <FormInput label="Group ID" value={form.groupCode} readOnly />
          <SelectDropdown
            label="Item Type"
            required
            options={GROUP_TYPE_OPTIONS}
            value={form.groupType}
            onChange={(event) => setForm((current) => ({ ...current, groupType: event.target.value }))}
          />
          <FormInput label="Group Name" required value={form.groupName} onChange={(event) => setForm((current) => ({ ...current, groupName: event.target.value }))} />
          <FormInput label="Description" value={form.description} onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))} />
          <div className="flex items-center gap-5 pt-6">
            <label className="flex items-center gap-2 text-sm font-semibold text-slate-700">
              <input type="checkbox" checked={form.inspectionRequired} onChange={(event) => setForm((current) => ({ ...current, inspectionRequired: event.target.checked }))} />
              Inspection Required
            </label>
            <label className="flex items-center gap-2 text-sm font-semibold text-slate-700">
              <input type="checkbox" checked={form.isActive} onChange={(event) => setForm((current) => ({ ...current, isActive: event.target.checked }))} />
              Active
            </label>
          </div>
        </FormGrid>

        <button className="btn-primary mt-4" onClick={addGroup}>
          Add Item Group
        </button>
      </SectionCard>

      <DataTable
        columns={COLUMNS}
        data={data}
        onDelete={handleDelete}
      />
    </PageContainer>
  )
}
