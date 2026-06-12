import { useEffect, useMemo, useState } from 'react'
import { Boxes, MapPin, PackageOpen } from 'lucide-react'

import DataTable from '../../components/tables/DataTable'
import {
  ActionButtons,
  FormGrid,
  FormInput,
  PageContainer,
  SectionCard,
  SelectDropdown,
  StatusBadge,
  Textarea,
} from '../../components/ui'
import { createBin, createRack, createStore, getBins, getRacks, getStores } from '../../lib/api'

const storeFormInitial = {
  storeCode: '',
  storeName: '',
  location: '',
  description: '',
  isActive: true,
}

const rackFormInitial = {
  storeId: '',
  rackCode: '',
  rackName: '',
  location: '',
  capacity: '',
  isActive: true,
}

const binFormInitial = {
  rackId: '',
  binCode: '',
  binName: '',
  location: '',
  isActive: true,
}

const statusColumn = {
  key: 'isActive',
  label: 'Status',
  width: 100,
  render: value => <StatusBadge status={value ? 'Active' : 'Inactive'} />,
}

export default function StoreMasterPage() {
  const [stores, setStores] = useState([])
  const [racks, setRacks] = useState([])
  const [bins, setBins] = useState([])
  const [storeForm, setStoreForm] = useState(storeFormInitial)
  const [rackForm, setRackForm] = useState(rackFormInitial)
  const [binForm, setBinForm] = useState(binFormInitial)
  const [saving, setSaving] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  async function loadMasters() {
    try {
      setError('')
      const [storeRows, rackRows, binRows] = await Promise.all([
        getStores(),
        getRacks(),
        getBins(),
      ])
      setStores(Array.isArray(storeRows) ? storeRows : [])
      setRacks(Array.isArray(rackRows) ? rackRows : [])
      setBins(Array.isArray(binRows) ? binRows : [])
    } catch (loadError) {
      setError(loadError.message || 'Unable to load Store Master data.')
    }
  }

  useEffect(() => {
    loadMasters()
  }, [])

  const storeOptions = useMemo(
    () => stores.filter(row => row.isActive !== false).map(row => ({
      value: String(row.id),
      label: `${row.storeCode} - ${row.storeName}`,
    })),
    [stores]
  )

  const rackOptions = useMemo(
    () => racks
      .filter(row => row.isActive !== false)
      .map(row => ({
        value: String(row.id),
        label: `${row.storeName ? `${row.storeName} / ` : ''}${row.rackCode} - ${row.rackName}`,
      })),
    [racks]
  )

  async function saveStore() {
    if (!storeForm.storeCode.trim() || !storeForm.storeName.trim()) {
      setError('Store Code and Store Name are required.')
      return
    }
    try {
      setSaving('store')
      setError('')
      await createStore(storeForm)
      setStoreForm(storeFormInitial)
      setSuccess('Store saved successfully.')
      await loadMasters()
    } catch (saveError) {
      setError(saveError.message || 'Unable to save store.')
    } finally {
      setSaving('')
    }
  }

  async function saveRack() {
    if (!rackForm.storeId || !rackForm.rackCode.trim() || !rackForm.rackName.trim()) {
      setError('Store, Rack Code, and Rack Name are required.')
      return
    }
    try {
      setSaving('rack')
      setError('')
      await createRack({ ...rackForm, storeId: Number(rackForm.storeId) })
      setRackForm(rackFormInitial)
      setSuccess('Rack saved successfully.')
      await loadMasters()
    } catch (saveError) {
      setError(saveError.message || 'Unable to save rack.')
    } finally {
      setSaving('')
    }
  }

  async function saveBin() {
    if (!binForm.rackId || !binForm.binCode.trim() || !binForm.binName.trim()) {
      setError('Rack, Bin Code, and Bin Name are required.')
      return
    }
    try {
      setSaving('bin')
      setError('')
      await createBin({ ...binForm, rackId: Number(binForm.rackId) })
      setBinForm(binFormInitial)
      setSuccess('Bin saved successfully.')
      await loadMasters()
    } catch (saveError) {
      setError(saveError.message || 'Unable to save bin.')
    } finally {
      setSaving('')
    }
  }

  return (
    <PageContainer
      title="Store Master"
      subtitle="Master -> Inventory -> Store Master. Maintain stores, racks, bins, and physical locations."
      showBackButton
      backPath="/dashboard"
    >
      {error && <div className="card p-3 mb-4 text-sm font-bold text-red-700 bg-red-50">{error}</div>}
      {success && <div className="card p-3 mb-4 text-sm font-bold text-green-700 bg-green-50">{success}</div>}

      <SectionCard title="Create Store" icon={MapPin} defaultOpen>
        <FormGrid cols={3}>
          <FormInput label="Store Code" required value={storeForm.storeCode} onChange={event => setStoreForm(current => ({ ...current, storeCode: event.target.value }))} placeholder="STORE-01" />
          <FormInput label="Store Name" required value={storeForm.storeName} onChange={event => setStoreForm(current => ({ ...current, storeName: event.target.value }))} placeholder="Main Store" />
          <FormInput label="Location" required value={storeForm.location} onChange={event => setStoreForm(current => ({ ...current, location: event.target.value }))} placeholder="Plant / Building / Floor" />
          <Textarea label="Description" rows={2} className="lg:col-span-2" value={storeForm.description} onChange={event => setStoreForm(current => ({ ...current, description: event.target.value }))} />
        </FormGrid>
        <ActionButtons onSave={saveStore} onCancel={() => setStoreForm(storeFormInitial)} saveLabel="Save Store" loading={saving === 'store'} />
        <div className="mt-5">
          <DataTable
            columns={[
              { key: 'storeCode', label: 'Store Code' },
              { key: 'storeName', label: 'Store Name' },
              { key: 'location', label: 'Location' },
              { key: 'description', label: 'Description' },
              statusColumn,
            ]}
            data={stores}
          />
        </div>
      </SectionCard>

      <SectionCard title="Rack Master" icon={Boxes} defaultOpen>
        <FormGrid cols={3}>
          <SelectDropdown label="Store" required options={storeOptions} value={rackForm.storeId} onChange={event => setRackForm(current => ({ ...current, storeId: event.target.value }))} />
          <FormInput label="Rack Code" required value={rackForm.rackCode} onChange={event => setRackForm(current => ({ ...current, rackCode: event.target.value }))} placeholder="RACK-A01" />
          <FormInput label="Rack Name" required value={rackForm.rackName} onChange={event => setRackForm(current => ({ ...current, rackName: event.target.value }))} />
          <FormInput label="Rack Location Note" value={rackForm.location} onChange={event => setRackForm(current => ({ ...current, location: event.target.value }))} placeholder="Left aisle / Ground floor" />
          <FormInput label="Capacity" value={rackForm.capacity} onChange={event => setRackForm(current => ({ ...current, capacity: event.target.value }))} />
        </FormGrid>
        <ActionButtons onSave={saveRack} onCancel={() => setRackForm(rackFormInitial)} saveLabel="Save Rack" loading={saving === 'rack'} />
        <div className="mt-5">
          <DataTable
            columns={[
              { key: 'storeName', label: 'Store' },
              { key: 'rackCode', label: 'Rack Code' },
              { key: 'rackName', label: 'Rack Name' },
              { key: 'location', label: 'Location Note' },
              { key: 'capacity', label: 'Capacity' },
              statusColumn,
            ]}
            data={racks}
          />
        </div>
      </SectionCard>

      <SectionCard title="Bin Master" icon={PackageOpen} defaultOpen>
        <FormGrid cols={3}>
          <SelectDropdown label="Rack" required options={rackOptions} value={binForm.rackId} onChange={event => setBinForm(current => ({ ...current, rackId: event.target.value }))} />
          <FormInput label="Bin Code" required value={binForm.binCode} onChange={event => setBinForm(current => ({ ...current, binCode: event.target.value }))} placeholder="BIN-001" />
          <FormInput label="Bin Name" required value={binForm.binName} onChange={event => setBinForm(current => ({ ...current, binName: event.target.value }))} />
          <FormInput label="Bin Location Note" value={binForm.location} onChange={event => setBinForm(current => ({ ...current, location: event.target.value }))} placeholder="Shelf 1 / Level 2" />
        </FormGrid>
        <ActionButtons onSave={saveBin} onCancel={() => setBinForm(binFormInitial)} saveLabel="Save Bin" loading={saving === 'bin'} />
        <div className="mt-5">
          <DataTable
            columns={[
              { key: 'rackName', label: 'Rack' },
              { key: 'binCode', label: 'Bin Code' },
              { key: 'binName', label: 'Bin Name' },
              { key: 'location', label: 'Location Note' },
              statusColumn,
            ]}
            data={bins}
          />
        </div>
      </SectionCard>
    </PageContainer>
  )
}
