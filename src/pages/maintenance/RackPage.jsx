import { useEffect, useState } from 'react'
import { Archive, PlusCircle } from 'lucide-react'

import { ActionButtons, FormGrid, FormInput, PageContainer, SectionCard, StatusBadge } from '../../components/ui/index'
import DataTable from '../../components/tables/DataTable'
import { createRack, getRacks } from '../../lib/api'

const COLUMNS = [
  { key: 'rackCode', label: 'Rack Code', width: 140 },
  { key: 'rackName', label: 'Rack / Store Name', width: 180 },
  { key: 'location', label: 'Location', width: 160 },
  { key: 'capacity', label: 'Capacity', width: 110 },
  {
    key: 'isActive',
    label: 'Status',
    width: 100,
    render: (value) => <StatusBadge status={value ? 'Active' : 'Inactive'} />,
  },
]

const emptyForm = {
  rackCode: '',
  rackName: '',
  location: '',
  capacity: '',
  isActive: true,
}

export default function RackPage() {
  const [data, setData] = useState([])
  const [form, setForm] = useState(emptyForm)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  async function loadRacks() {
    try {
      setLoading(true)
      setError('')
      const result = await getRacks()
      setData(Array.isArray(result) ? result : [])
    } catch (loadError) {
      setError(loadError.message || 'Unable to load rack/store master.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadRacks()
  }, [])

  function updateField(key, value) {
    setForm((current) => ({ ...current, [key]: value }))
  }

  async function handleSave() {
    if (!form.rackCode.trim() || !form.rackName.trim()) {
      setSuccess('')
      setError('Rack code and rack/store name are required.')
      return
    }

    try {
      setSaving(true)
      setError('')
      setSuccess('')
      await createRack({
        ...form,
        rackCode: form.rackCode.trim(),
        rackName: form.rackName.trim(),
      })
      setSuccess('Rack / store location saved successfully.')
      setForm(emptyForm)
      await loadRacks()
    } catch (saveError) {
      setError(saveError.message || 'Unable to save rack/store location.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <PageContainer title="Rack / Store Master" subtitle="Maintenance -> Rack. These locations will appear in Quality Inward Inspection dropdowns.">
      {error && (
        <div className="mb-4 rounded-xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
          {error}
        </div>
      )}
      {success && (
        <div className="mb-4 rounded-xl bg-green-50 px-4 py-3 text-sm font-semibold text-green-700">
          {success}
        </div>
      )}

      <SectionCard title="Add Rack / Store Location" icon={PlusCircle} defaultOpen>
        <FormGrid cols={4}>
          <FormInput
            label="Rack Code"
            required
            value={form.rackCode}
            onChange={(event) => updateField('rackCode', event.target.value)}
            placeholder="e.g. STORE-1"
          />
          <FormInput
            label="Rack / Store Name"
            required
            value={form.rackName}
            onChange={(event) => updateField('rackName', event.target.value)}
            placeholder="e.g. Store 1"
          />
          <FormInput
            label="Location"
            value={form.location}
            onChange={(event) => updateField('location', event.target.value)}
            placeholder="e.g. Main Store"
          />
          <FormInput
            label="Capacity"
            value={form.capacity}
            onChange={(event) => updateField('capacity', event.target.value)}
            placeholder="Optional"
          />
        </FormGrid>

        <label className="mt-4 flex items-center gap-2 text-sm font-semibold text-slate-700">
          <input
            type="checkbox"
            checked={form.isActive}
            onChange={(event) => updateField('isActive', event.target.checked)}
            className="h-4 w-4 rounded border-slate-300 text-primary-600 focus:ring-primary-500"
          />
          Active
        </label>

        <div className="mt-5">
          <ActionButtons
            onSave={handleSave}
            onCancel={() => setForm(emptyForm)}
            saveLabel="Save Rack"
            cancelLabel="Clear"
            loading={saving}
          />
        </div>
      </SectionCard>

      <SectionCard title="Rack / Store List" icon={Archive} defaultOpen>
        {loading && (
          <div className="mb-3 rounded-xl bg-blue-50 px-4 py-3 text-sm font-semibold text-blue-700">
            Loading rack/store locations...
          </div>
        )}
        <DataTable columns={COLUMNS} data={data} />
      </SectionCard>
    </PageContainer>
  )
}
