import { useEffect, useState } from 'react'
import { ExternalLink, PackageSearch, PlusCircle } from 'lucide-react'
import { Link } from 'react-router-dom'

import { FormGrid, FormInput, PageContainer, SectionCard, SelectDropdown, StatusBadge } from '../../components/ui/index'
import DataTable from '../../components/tables/DataTable'
import { createItemGroup, deleteItemGroup, getItemGroups, getItems } from '../../lib/api'

const GROUP_TYPE_OPTIONS = ['Purchase Item', 'Manufacturing Item', 'Customer Supplied']

function normalizeItemType(value) {
  if (value === 'Manufacturing') return 'Manufacturing Item'
  return value || 'Purchase Item'
}

const COLUMNS = [
  { key: 'id', label: 'Group ID', width: 120 },
  { key: 'groupType', label: 'Item Type', width: 170 },
  { key: 'groupName', label: 'Group Name', width: 180 },
  { key: 'description', label: 'Description' },
  { key: 'inspectionRequired', label: 'Inspection Needed', width: 150, render: (value) => <StatusBadge status={value ? 'Required' : 'Not Required'} /> },
  { key: 'isActive', label: 'Status', width: 100, render: (value) => <StatusBadge status={value ? 'Active' : 'Inactive'} /> },
]

export default function ItemGroupPage() {
  const [data, setData] = useState([])
  const [items, setItems] = useState([])
  const [form, setForm] = useState({ groupName: '', groupType: 'Purchase Item', description: '', inspectionRequired: false, isActive: true })
  const [selectedGroup, setSelectedGroup] = useState('')
  const [error, setError] = useState('')

  async function loadGroups() {
    try {
      setError('')
      const result = await getItemGroups()
      setData((result || []).map((row) => ({
        id: row.id,
        groupName: row.group_name,
        groupType: row.group_type || 'Purchase Item',
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
  }, [])

  useEffect(() => {
    async function loadItems() {
      try {
        const result = await getItems()
        setItems(result || [])
      } catch {
        setItems([])
      }
    }

    loadItems()
  }, [])

  const selectedGroupInfo = data.find((group) => group.groupName === selectedGroup)
  const filteredItems = items.filter((item) => {
    if (!selectedGroupInfo) return false
    return (
      (item.item_group || '') === selectedGroupInfo.groupName &&
      normalizeItemType(item.item_type) === selectedGroupInfo.groupType
    )
  })

  async function addGroup() {
    if (!form.groupName.trim()) {
      alert('Group name is required.')
      return
    }

    await createItemGroup({ ...form, groupName: form.groupName.trim(), groupType: form.groupType || 'Purchase Item' })
    setForm({ groupName: '', groupType: form.groupType || 'Purchase Item', description: '', inspectionRequired: false, isActive: true })
    await loadGroups()
  }

  function getItemPath(item) {
    const itemType = item.item_type || 'Purchase Item'
    if (itemType === 'Manufacturing Item') return `/inventory/items/manufacturing/${item.id}`
    if (itemType === 'Customer Supplied') return `/inventory/items/customer-supplied/${item.id}`
    return `/inventory/items/purchase/${item.id}`
  }

  async function handleDelete(row) {
    if (!confirm('Delete item group?')) return
    await deleteItemGroup(row.id)
    await loadGroups()
  }

  return (
    <PageContainer title="Item Group" subtitle="Master -> Inventory -> Quality. Define item groups by item type and inspection requirement.">
      {error && (
        <div style={{ marginBottom: '16px', padding: '12px 14px', borderRadius: '10px', background: '#fee2e2', color: '#991b1b', fontSize: '13px', fontWeight: '700' }}>
          {error}
        </div>
      )}
      <SectionCard title="Add Item Group" icon={PlusCircle} defaultOpen>
        <FormGrid cols={3}>
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

      <SectionCard title="View Items By Group" icon={PackageSearch} defaultOpen>
        <FormGrid cols={3}>
          <SelectDropdown
            label="Select Item Group"
            placeholder="Select group to view items"
            options={data.map((group) => ({
              value: group.groupName,
              label: `${group.groupName} - ${group.groupType}`,
            }))}
            value={selectedGroup}
            onChange={(event) => setSelectedGroup(event.target.value)}
          />
          <div className="card !p-4">
            <p className="text-xs text-slate-500">Selected Type</p>
            <p className="text-lg font-bold text-slate-800">{selectedGroupInfo?.groupType || '-'}</p>
          </div>
          <div className="card !p-4">
            <p className="text-xs text-slate-500">Items In Group</p>
            <p className="text-lg font-bold text-slate-800">{filteredItems.length}</p>
          </div>
        </FormGrid>

        <div className="mt-4 overflow-x-auto rounded-xl border border-slate-200">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-left font-semibold text-slate-600">Item Code</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-600">Item Name</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-600">Print Name</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-600">UOM</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-600">HSN</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-600">Status</th>
                <th className="px-4 py-3 text-center font-semibold text-slate-600">Open</th>
              </tr>
            </thead>
            <tbody>
              {!selectedGroup ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-slate-500 font-medium">Select RM / item group to view items.</td>
                </tr>
              ) : filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-slate-500 font-medium">No items found in this group.</td>
                </tr>
              ) : filteredItems.map((item) => (
                <tr key={item.id} className="border-t border-slate-100">
                  <td className="px-4 py-3 font-semibold text-primary-700">{item.item_code}</td>
                  <td className="px-4 py-3 text-slate-800">{item.item_name}</td>
                  <td className="px-4 py-3 text-slate-600">{item.print_name || '-'}</td>
                  <td className="px-4 py-3 text-slate-600">{item.uom || '-'}</td>
                  <td className="px-4 py-3 text-slate-600">{item.hsn_code || '-'}</td>
                  <td className="px-4 py-3"><StatusBadge status={item.status || 'Active'} /></td>
                  <td className="px-4 py-3 text-center">
                    <Link
                      to={getItemPath(item)}
                      className="inline-flex items-center gap-1 rounded-lg bg-primary-50 px-3 py-1.5 text-xs font-bold text-primary-700 hover:bg-primary-100"
                    >
                      Open <ExternalLink size={12} />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </SectionCard>
    </PageContainer>
  )
}
