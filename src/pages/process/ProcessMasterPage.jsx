import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { GitBranch, Plus, Save, Settings } from 'lucide-react'
import DataTable from '../../components/tables/DataTable'
import { ActionButtons, FormGrid, FormInput, PageContainer, SectionCard, SelectDropdown, Textarea } from '../../components/ui'
import {
  createProcessMasterRecord,
  getCustomers,
  getNextProcessMasterNumber,
  getProcessMasterRecord,
  getProcessMasterRecords,
  updateProcessMasterRecord,
} from '../../lib/api'

const MASTER_CONFIG = {
  'item-catalog': {
    title: 'Item Catalog',
    createTitle: 'New Customer Item Catalog',
    codeLabel: 'Catalog Code',
    nameLabel: 'Item Catalog Name',
    path: '/master/item-catalog',
    columns: [
      { key: 'code', label: 'Catalog Code', width: 140 },
      { key: 'name', label: 'Item Catalog Name' },
      { key: 'type', label: 'Catalog Type', width: 180 },
      { key: 'customers', label: 'Customers', width: 220 },
    ],
  },
  process: {
    title: 'Item Process',
    createTitle: 'New Item Process',
    codeLabel: 'Process Code',
    nameLabel: 'Process Name',
    path: '/master/process',
    columns: [
      { key: 'code', label: 'Process Code', width: 150 },
      { key: 'name', label: 'Process Name' },
    ],
  },
  'asset-manager': {
    title: 'Asset Manager',
    createTitle: 'New Asset Manager',
    codeLabel: 'Asset Code',
    nameLabel: 'Asset Name',
    path: '/master/asset-manager',
    columns: [
      { key: 'code', label: 'Asset Code', width: 150 },
      { key: 'name', label: 'Asset Name' },
      { key: 'remarks', label: 'Remarks', width: 220 },
    ],
  },
  'process-group': {
    title: 'Process Group',
    createTitle: 'New Process Group',
    codeLabel: 'Group Code',
    nameLabel: 'Work Flow Name',
    path: '/master/process-group',
    columns: [
      { key: 'code', label: 'Group Code', width: 140 },
      { key: 'name', label: 'Work Flow Name' },
      { key: 'processFlow', label: 'Process Flow' },
      { key: 'remarks', label: 'Remarks', width: 220 },
    ],
  },
}

function emptyForm(masterType) {
  return {
    code: '',
    name: '',
    grade: '',
    catalogType: masterType === 'item-catalog' ? 'PRODUCT_CATALOG' : '',
    customerId: '',
    attributeTemplate: '',
    processFlow: [{ processName: '' }],
    remarks: '',
    isActive: true,
  }
}

export default function ProcessMasterPage({ masterType, mode = 'list' }) {
  const config = MASTER_CONFIG[masterType]
  const { id } = useParams()
  const navigate = useNavigate()
  const isForm = mode === 'form'
  const [records, setRecords] = useState([])
  const [customers, setCustomers] = useState([])
  const [search, setSearch] = useState('')
  const [form, setForm] = useState(emptyForm(masterType))
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  useEffect(() => {
    if (isForm) return
    const timer = setTimeout(async () => {
      try {
        setLoading(true)
        setError('')
        const result = await getProcessMasterRecords(masterType, search)
        setRecords(result || [])
      } catch (err) {
        setError(err.message || `Unable to load ${config.title}.`)
      } finally {
        setLoading(false)
      }
    }, 250)
    return () => clearTimeout(timer)
  }, [config.title, isForm, masterType, search])

  useEffect(() => {
    if (!isForm) return
    async function loadForm() {
      try {
        setLoading(true)
        setError('')
        const customerRows = masterType === 'item-catalog' ? await getCustomers().catch(() => []) : []
        setCustomers(customerRows || [])
        if (id) {
          const row = await getProcessMasterRecord(masterType, id)
          setForm({ ...emptyForm(masterType), ...(row.data || {}), code: row.code, name: row.name, grade: row.grade || '', remarks: row.remarks || '', isActive: row.is_active !== false })
          return
        }
        const next = await getNextProcessMasterNumber(masterType)
        setForm(current => ({ ...current, code: next.nextNumber || '' }))
      } catch (err) {
        setError(err.message || `Unable to load ${config.title}.`)
      } finally {
        setLoading(false)
      }
    }
    loadForm()
  }, [config.title, id, isForm, masterType])

  const customerOptions = customers.map(customer => ({ value: String(customer.id), label: `${customer.customer_code || 'CUS'} - ${customer.customer_name}` }))
  const rows = useMemo(() => records.map(row => ({
    id: row.id,
    code: row.code,
    name: row.name,
    grade: row.grade || '-',
    type: row.data?.catalogType || '-',
    customers: row.data?.customerName || row.data?.customerId || '-',
    processFlow: (row.data?.processFlow || []).map(item => item.processName).filter(Boolean).join(' -> ') || '-',
    remarks: row.remarks || '-',
  })), [records])

  const set = (key, value) => setForm(current => ({ ...current, [key]: value }))
  const updateProcessFlow = (index, value) => {
    setForm(current => ({
      ...current,
      processFlow: current.processFlow.map((row, rowIndex) => rowIndex === index ? { ...row, processName: value } : row),
    }))
  }

  async function handleSave() {
    if (!form.code || !form.name) {
      setError(`${config.codeLabel} and ${config.nameLabel} are required.`)
      return
    }
    try {
      setLoading(true)
      setError('')
      setSuccess('')
      const customer = customers.find(row => String(row.id) === String(form.customerId))
      const payload = { ...form, customerName: customer?.customer_name || '' }
      const result = id
        ? await updateProcessMasterRecord(masterType, id, payload)
        : await createProcessMasterRecord(masterType, payload)
      setSuccess(result.message || 'Saved successfully.')
      if (!id) navigate(`${config.path}/${result.record.id}`)
    } catch (err) {
      setError(err.message || `Unable to save ${config.title}.`)
    } finally {
      setLoading(false)
    }
  }

  if (!isForm) {
    return (
      <PageContainer title={`${config.title} List`} subtitle={`Master -> ${config.title}`} showBackButton backPath="/dashboard">
        <div className="card p-4 mb-4">
          <input className="form-input" value={search} onChange={event => setSearch(event.target.value)} placeholder={`Search ${config.title}...`} />
        </div>
        {error && <div className="card p-3 mb-4 text-sm font-bold text-red-600 bg-red-50 border border-red-100">{error}</div>}
        {loading && <div className="card p-3 mb-4 text-sm font-bold text-blue-700 bg-blue-50 border border-blue-100">Loading {config.title}...</div>}
        <DataTable columns={config.columns} data={rows} addPath={`${config.path}/new`} addLabel={`Create ${config.title}`} rowPath={config.path} />
      </PageContainer>
    )
  }

  return (
    <PageContainer
      title={id ? `Edit ${config.title}` : config.createTitle}
      subtitle={`Master -> ${config.title}`}
      showBackButton
      backPath={config.path}
      actions={<ActionButtons onSave={handleSave} onCancel={() => navigate(config.path)} saveLabel={loading ? 'Saving...' : 'Save'} loading={loading} />}
    >
      {error && <div className="card p-3 mb-4 text-sm font-bold text-red-600 bg-red-50 border border-red-100">{error}</div>}
      {success && <div className="card p-3 mb-4 text-sm font-bold text-green-700 bg-green-50 border border-green-100">{success}</div>}
      <SectionCard title={`${config.title} Information`} icon={Settings}>
        <FormGrid cols={2}>
          <FormInput label={config.codeLabel} required value={form.code} onChange={event => set('code', event.target.value)} />
          <FormInput label={config.nameLabel} required value={form.name} onChange={event => set('name', event.target.value)} placeholder={config.nameLabel} />
          {masterType === 'item-catalog' && <SelectDropdown label="Item Catalog Type" required value={form.catalogType} onChange={event => set('catalogType', event.target.value)} options={['PRODUCT_CATALOG', 'CUSTOMER_CATALOG', 'ENGINEERING_CATALOG']} />}
          {masterType === 'item-catalog' && <SelectDropdown label="Customers" value={form.customerId} onChange={event => set('customerId', event.target.value)} options={customerOptions} placeholder="Customer Name" />}
        </FormGrid>
        {masterType === 'item-catalog' && (
          <div className="mt-4">
            <Textarea label="Attribute Template" rows={5} value={form.attributeTemplate} onChange={event => set('attributeTemplate', event.target.value)} placeholder="Enter attributes like size, grade, coating, drawing revision..." />
          </div>
        )}
        {masterType === 'process-group' && (
          <div className="mt-5 rounded-xl bg-slate-50 border border-slate-100 p-5">
            <div className="flex items-center gap-3 flex-wrap">
              <div className="rounded-full bg-green-500 text-white font-black px-5 py-4">START</div>
              {form.processFlow.map((row, index) => (
                <div key={index} className="flex items-center gap-3">
                  <span className="text-slate-400 font-black">-&gt;</span>
                  <input className="form-input" value={row.processName} onChange={event => updateProcessFlow(index, event.target.value)} placeholder="Process" style={{ minWidth: '190px' }} />
                </div>
              ))}
              <button type="button" className="btn-primary" onClick={() => set('processFlow', [...form.processFlow, { processName: '' }])}><Plus size={14} /></button>
            </div>
          </div>
        )}
        {masterType !== 'process' && (
          <div className="mt-4">
            <Textarea label="Remarks" rows={3} value={form.remarks} onChange={event => set('remarks', event.target.value)} />
          </div>
        )}
        <label className="mt-4 flex items-center gap-2 text-sm font-bold text-slate-700">
          <input type="checkbox" checked={form.isActive} onChange={event => set('isActive', event.target.checked)} />
          Active
        </label>
      </SectionCard>
    </PageContainer>
  )
}
