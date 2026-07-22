import { useEffect, useState } from 'react'
import { Layers3, Save } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

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
  { key: 'groupCode', label: 'Group ID', width: 140 },
  { key: 'groupType', label: 'Item Type', width: 180 },
  { key: 'groupName', label: 'Group Name', width: 220 },
  { key: 'description', label: 'Description' },
  { key: 'isActive', label: 'Status', width: 110, render: value => <StatusBadge status={value ? 'Active' : 'Inactive'} /> },
]

export default function ItemGroupPage({ mode = 'list' }) {
  const navigate = useNavigate()
  const [data, setData] = useState([])
  const [form, setForm] = useState({
    groupCode: '',
    groupName: '',
    groupType: PURCHASABLE_LABEL,
    description: '',
    isActive: true,
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function loadGroups() {
    try {
      setError('')
      const result = await getItemGroups()
      setData((result || []).map(row => ({
        id: row.id,
        groupCode: row.group_code || `IG-${String(row.id).padStart(3, '0')}`,
        groupName: row.group_name,
        groupType: toDisplayType(row.group_type),
        description: row.description || '-',
        isActive: row.is_active,
      })))
    } catch (loadError) {
      setError(loadError.message || 'Unable to load item groups.')
    }
  }

  useEffect(() => {
    if (mode === 'list') {
      loadGroups()
      return
    }
    getNextItemGroupNumber()
      .then(result => setForm(current => ({ ...current, groupCode: result.group_code || current.groupCode })))
      .catch(loadError => setError(loadError.message || 'Unable to generate Item Group ID.'))
  }, [mode])

  async function saveGroup() {
    if (!form.groupName.trim()) {
      setError('Group name is required.')
      return
    }
    try {
      setSaving(true)
      setError('')
      await createItemGroup({
        ...form,
        groupName: form.groupName.trim(),
        groupType: toDbType(form.groupType),
        inspectionRequired: false,
      })
      navigate('/master/item-group')
    } catch (saveError) {
      setError(saveError.message || 'Unable to create item group.')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(row) {
    if (!confirm(`Delete item group ${row.groupName}?`)) return
    try {
      await deleteItemGroup(row.id)
      await loadGroups()
    } catch (deleteError) {
      setError(deleteError.message || 'Unable to delete item group.')
    }
  }

  if (mode === 'form') {
    return (
      <PageContainer
        title="Create Item Group"
        subtitle="Master -> Inventory -> Item Group Master"
        showBackButton
        backPath="/master/item-group"
      >
        {error && <div className="card p-3 mb-4 text-sm font-bold text-red-600 bg-red-50 border border-red-100">{error}</div>}
        <SectionCard title="Item Group Information" icon={Layers3}>
          <FormGrid cols={2}>
            <FormInput label="Group ID" value={form.groupCode} readOnly />
            <SelectDropdown
              label="Item Type"
              required
              options={GROUP_TYPE_OPTIONS}
              value={form.groupType}
              onChange={event => setForm(current => ({ ...current, groupType: event.target.value }))}
            />
            <FormInput
              label="Group Name"
              required
              value={form.groupName}
              onChange={event => setForm(current => ({ ...current, groupName: event.target.value }))}
            />
            <FormInput
              label="Description"
              value={form.description}
              onChange={event => setForm(current => ({ ...current, description: event.target.value }))}
            />
            <label className="flex items-center gap-2 text-sm font-semibold text-slate-700">
              <input
                type="checkbox"
                checked={form.isActive}
                onChange={event => setForm(current => ({ ...current, isActive: event.target.checked }))}
              />
              Active
            </label>
          </FormGrid>
          <div className="mt-5 rounded-xl bg-slate-50 border border-slate-100 p-5">
            <div className="text-xs font-black uppercase tracking-wide text-slate-500 mb-3">
              Default Process Flow
            </div>
            <div className="flex items-center gap-3 flex-wrap">
              <div className="rounded-full bg-green-500 text-white font-black px-5 py-4">START</div>
              <span className="text-slate-400 font-black">-&gt;</span>
              <div className="rounded-xl border border-blue-100 bg-white px-4 py-3 font-bold text-slate-700">
                Process
              </div>
            </div>
          </div>
          <button type="button" className="btn-primary mt-5" onClick={saveGroup} disabled={saving}>
            <Save size={14} /> {saving ? 'Saving...' : 'Save Item Group'}
          </button>
        </SectionCard>
      </PageContainer>
    )
  }

  return (
    <PageContainer
      title="Item Group Master"
      subtitle="Maintain item groups for Purchasable, Manufacturing and Customer Supplied items."
      showBackButton
      backPath="/dashboard"
    >
      {error && <div className="card p-3 mb-4 text-sm font-bold text-red-600 bg-red-50 border border-red-100">{error}</div>}
      <DataTable
        columns={COLUMNS}
        data={data}
        addPath="/master/item-group/new"
        addLabel="Create Item Group"
        onDelete={handleDelete}
      />
    </PageContainer>
  )
}
