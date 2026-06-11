import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { AlertCircle, CheckSquare, ClipboardList, History, Paperclip, Package, Plus, ReceiptText, Save, Trash2, Users } from 'lucide-react'
import {
  ActionButtons,
  DatePicker,
  FormGrid,
  FormInput,
  NumberInput,
  PageContainer,
  SectionCard,
  SelectDropdown,
  Textarea,
} from '../../components/ui'
import {
  createCrmRecord,
  deleteCrmRecord,
  getCustomers,
  getCrmCustomerLinks,
  getCrmRecordById,
  getNextCrmNumber,
  updateCrmRecord,
} from '../../lib/api'
import { CRM_ENTITIES } from './crmConfig'

function today() {
  return new Date().toISOString().slice(0, 10)
}

const CRM_DETAIL_ENTITIES = ['leads', 'enquiries', 'quotations', 'contacts']
const CUSTOMER_LINK_SECTIONS = [
  { key: 'leads', label: 'Leads' },
  { key: 'enquiries', label: 'Enquiries' },
  { key: 'quotations', label: 'Quotations' },
  { key: 'contacts', label: 'Contacts' },
]

function blankActivity() {
  return {
    task_name: '',
    employee: '',
    activity_name: '',
    activity_date: today(),
    particulars: '',
    duration: '',
    remarks: '',
    contact: '',
    followup: false,
    followup_date: '',
    followup_to: '',
    followup_task: '',
    followup_details: '',
  }
}

function blankTodo() {
  return { task_name: '', assigned_to: '', due_date: today(), priority: 'Medium', status: 'Open', remarks: '' }
}

function blankHistory() {
  return { history_date: today(), action: '', user_name: '', details: '', status: '' }
}

function blankProduct() {
  return { item_name: '', category: '', qty: '', expected_value: '', remarks: '' }
}

function blankTransaction() {
  return { transaction_date: today(), transaction_type: '', reference_no: '', amount: '', status: 'Open', remarks: '' }
}

function blankAttachment() {
  return { attachment_name: '', attachment_url: '', remarks: '' }
}

export default function CrmFormPage({ entity }) {
  const config = CRM_ENTITIES[entity]
  const { id } = useParams()
  const navigate = useNavigate()
  const isEdit = Boolean(id)
  const [form, setForm] = useState({})
  const [customers, setCustomers] = useState([])
  const [customerSearch, setCustomerSearch] = useState('')
  const [activeTab, setActiveTab] = useState('activity')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [customerLinks, setCustomerLinks] = useState(null)
  const [linksLoading, setLinksLoading] = useState(false)

  const defaultForm = useMemo(() => {
    const initial = {}
    config.fields.forEach(field => {
      if (field.type === 'number') initial[field.name] = ''
      else if (field.type === 'date') initial[field.name] = field.name === config.dateField ? today() : ''
      else initial[field.name] = ''
    })
    if (config.fields.some(field => field.name === 'status')) {
      const statusField = config.fields.find(field => field.name === 'status')
      initial.status = statusField.options?.[0] || 'Open'
    }
    if (CRM_DETAIL_ENTITIES.includes(entity)) {
      initial.todos = [blankTodo()]
      initial.history = [blankHistory()]
      initial.activities = [blankActivity()]
      initial.attachments = [blankAttachment()]
    }
    if (['leads', 'enquiries', 'quotations'].includes(entity)) {
      initial.products = [blankProduct()]
      initial.transactions = [blankTransaction()]
    }
    return initial
  }, [config, entity])

  useEffect(() => {
    const timer = setTimeout(() => {
    async function loadCustomers() {
      try {
        setCustomers(await getCustomers(customerSearch))
      } catch {
        setCustomers([])
      }
    }

    loadCustomers()
    }, 250)

    return () => clearTimeout(timer)
  }, [customerSearch])

  const loadCustomerLinks = async (customerId) => {
    if (!customerId) {
      setCustomerLinks(null)
      setLinksLoading(false)
      return
    }

    try {
      setLinksLoading(true)
      setCustomerLinks(await getCrmCustomerLinks(customerId))
    } catch {
      setCustomerLinks(null)
    } finally {
      setLinksLoading(false)
    }
  }

  useEffect(() => {
    async function loadForm() {
      try {
        setError('')
        if (isEdit) {
          const record = await getCrmRecordById(entity, id)
          setForm({ ...defaultForm, ...record })
          await loadCustomerLinks(record.customer_id)
          return
        }

        const result = await getNextCrmNumber(entity)
        setForm({
          ...defaultForm,
          [config.numberField]: result.next_number,
        })
        setCustomerLinks(null)
      } catch (err) {
        setError(err.message)
      }
    }

    loadForm()
  }, [config.numberField, defaultForm, entity, id, isEdit])

  const updateField = (name, value) => {
    setForm(prev => ({ ...prev, [name]: value }))
  }

  const updateArrayItem = (key, index, field, value) => {
    setForm(prev => ({
      ...prev,
      [key]: (prev[key] || []).map((row, rowIndex) => (
        rowIndex === index ? { ...row, [field]: value } : row
      )),
    }))
  }

  const addArrayItem = (key, factory) => {
    setForm(prev => ({ ...prev, [key]: [...(prev[key] || []), factory()] }))
  }

  const removeArrayItem = (key, index, factory) => {
    setForm(prev => {
      const nextRows = (prev[key] || []).filter((_, rowIndex) => rowIndex !== index)
      return { ...prev, [key]: nextRows.length ? nextRows : [factory()] }
    })
  }

  const applyCustomer = (customerId) => {
    const selected = customers.find(customer => String(customer.id) === String(customerId))
    loadCustomerLinks(customerId)
    setForm(prev => {
      const next = { ...prev, customer_id: customerId }
      if (!selected) return next

      const contacts = Array.isArray(selected.contacts) ? selected.contacts : []
      const firstContact = contacts[0] || {}
      const phone = selected.mobile || selected.phone || ''

      if (entity === 'leads') {
        next.company_name = selected.customer_name || ''
        next.contact_person = prev.contact_person || firstContact.name || ''
        next.phone = prev.phone || phone
        next.email = prev.email || selected.email || ''
      } else if (entity === 'enquiries') {
        next.customer_name = selected.customer_name || ''
        next.contact_person = prev.contact_person || firstContact.name || ''
        next.phone = prev.phone || phone
        next.email = prev.email || selected.email || ''
      } else if (entity === 'quotations') {
        next.customer_name = selected.customer_name || ''
      } else if (entity === 'contacts') {
        next.company_name = selected.customer_name || ''
        next.contact_name = prev.contact_name || firstContact.name || selected.customer_name || ''
        next.phone = prev.phone || phone
        next.email = prev.email || selected.email || ''
        next.city = prev.city || selected.city || ''
        next.state = prev.state || selected.state || ''
      }

      return next
    })
  }

  const renderCustomerLinks = () => {
    const selectedCustomerId = form.customer_id
    if (!CRM_DETAIL_ENTITIES.includes(entity) || !selectedCustomerId) return null

    return (
      <SectionCard title="ERP Customer Linked CRM IDs" icon={ClipboardList}>
        {linksLoading ? (
          <div className="text-sm font-semibold text-blue-700 bg-blue-50 border border-blue-100 rounded-xl px-4 py-3">
            Fetching customer linked IDs...
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
            {CUSTOMER_LINK_SECTIONS.map(section => {
              const rows = customerLinks?.links?.[section.key] || []
              return (
                <div key={section.key} className="rounded-xl border border-blue-100 bg-white p-3">
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <div className="text-xs font-black uppercase tracking-wide text-blue-700">{section.label}</div>
                    <span className="text-[11px] font-bold text-slate-500 bg-slate-100 rounded-full px-2 py-0.5">{rows.length}</span>
                  </div>
                  {rows.length ? (
                    <div className="space-y-2">
                      {rows.slice(0, 5).map(row => (
                        <Link
                          key={`${section.key}-${row.id}`}
                          to={`/crm/${section.key}/${row.id}`}
                          className="block rounded-lg border border-slate-100 bg-slate-50 px-3 py-2 hover:border-blue-300 hover:bg-blue-50 transition-colors"
                        >
                          <div className="text-sm font-extrabold text-slate-800">{row.number || `#${row.id}`}</div>
                          <div className="text-xs text-slate-500 truncate">{row.name || customerLinks?.customer?.customer_name || '-'}</div>
                          <div className="text-[11px] font-bold text-blue-700 mt-1">{row.stage || row.status || 'Open'}</div>
                        </Link>
                      ))}
                    </div>
                  ) : (
                    <div className="text-xs font-semibold text-slate-400 bg-slate-50 rounded-lg px-3 py-4 text-center">
                      No linked {section.label.toLowerCase()} yet
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </SectionCard>
    )
  }

  const handleSave = async () => {
    try {
      setLoading(true)
      setError('')
      if (isEdit) {
        await updateCrmRecord(entity, id, form)
      } else {
        await createCrmRecord(entity, form)
      }
      navigate(`/crm/${entity}`)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!isEdit || !window.confirm(`Delete this ${config.singular.toLowerCase()}?`)) return
    await deleteCrmRecord(entity, id)
    navigate(`/crm/${entity}`)
  }

  const selectedCustomer = customers.find(customer => String(customer.id) === String(form.customer_id))

  const renderField = (field) => {
    const commonProps = {
      key: field.name,
      label: field.label,
      required: field.required,
      value: form[field.name] || '',
      onChange: e => updateField(field.name, e.target.value),
      readOnly: field.readOnly,
      placeholder: field.readOnly ? 'Auto generated' : field.label,
    }

    if (field.type === 'select') {
      return (
        <SelectDropdown
          {...commonProps}
          options={field.options || []}
          placeholder={`-- Select ${field.label} --`}
        />
      )
    }

    if (field.type === 'customer-select') {
      return (
        <div key={field.name}>
          <FormInput
            label="Search ERP Customer"
            value={customerSearch}
            onChange={e => setCustomerSearch(e.target.value)}
            placeholder="Search by customer, mobile, email, GSTIN"
          />
          <div className="mt-2">
            <SelectDropdown
              {...commonProps}
              label={field.label}
              value={form.customer_id || ''}
              onChange={e => applyCustomer(e.target.value)}
              options={customers.map(customer => ({
                value: customer.id,
                label: `${customer.customer_code || 'CUS'} - ${customer.customer_name}`,
              }))}
              placeholder="-- Select ERP Customer --"
            />
            {selectedCustomer && (
              <div className="mt-2 inline-flex items-center gap-2 rounded-full border border-blue-100 bg-blue-50 px-3 py-1.5 text-xs font-black text-blue-800">
                <Users size={13} />
                {selectedCustomer.customer_code || 'CUS'} - {selectedCustomer.customer_name}
              </div>
            )}
          </div>
        </div>
      )
    }

    if (field.type === 'textarea') {
      return (
        <div key={field.name} className="md:col-span-2 lg:col-span-3">
          <Textarea {...commonProps} rows={4} />
        </div>
      )
    }

    if (field.type === 'date') {
      return <DatePicker {...commonProps} />
    }

    if (field.type === 'number') {
      return <NumberInput {...commonProps} min="0" step="0.01" />
    }

    return <FormInput {...commonProps} type={field.type || 'text'} />
  }

  const tabs = [
    { key: 'activity', label: 'Activity', icon: ClipboardList, show: CRM_DETAIL_ENTITIES.includes(entity) },
    { key: 'todo', label: 'To Do', icon: CheckSquare, show: CRM_DETAIL_ENTITIES.includes(entity) },
    { key: 'history', label: 'History', icon: History, show: CRM_DETAIL_ENTITIES.includes(entity) },
    { key: 'product', label: 'Product', icon: Package, show: ['leads', 'enquiries', 'quotations'].includes(entity) },
    { key: 'transaction', label: 'Transaction', icon: ReceiptText, show: ['leads', 'enquiries', 'quotations'].includes(entity) },
    { key: 'attachment', label: 'Attachment', icon: Paperclip, show: CRM_DETAIL_ENTITIES.includes(entity) },
  ].filter(tab => tab.show)

  return (
    <PageContainer
      title={`${isEdit ? 'Edit' : 'New'} ${config.singular}`}
      subtitle={`CRM -> ${config.title}`}
      showBackButton
      backPath={`/crm/${entity}`}
      actions={
        <>
          <button type="button" className="btn-secondary" onClick={() => navigate('/master/customer', { state: { crmLead: form } })}>
            <Users size={14} /> Create Customer
          </button>
          {entity === 'leads' && (
            <button type="button" className="btn-secondary" onClick={() => navigate('/master/customer', { state: { crmLead: form } })}>
              <Plus size={14} /> Convert Lead
            </button>
          )}
          <ActionButtons
            onSave={handleSave}
            onCancel={() => navigate(`/crm/${entity}`)}
            onDelete={isEdit ? handleDelete : null}
            saveLabel={loading ? 'Saving...' : `Save ${config.singular}`}
            loading={loading}
          />
        </>
      }
    >
      <div className="card p-0 overflow-hidden mb-4" style={{ border: '1px solid #d7e8ff' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '13px 20px', background: 'linear-gradient(135deg, #0f5cab 0%, #3b82f6 100%)' }}>
          <div style={{ width: '30px', height: '30px', borderRadius: '8px', background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Save size={15} color="#fff" />
          </div>
          <div>
            <div style={{ fontSize: '14px', fontWeight: '800', color: '#fff', fontFamily: 'Sora, sans-serif' }}>
              {config.singular} Entry
            </div>
            <div style={{ fontSize: '12px', color: '#dbeafe', fontWeight: '600', marginTop: '2px' }}>
              Current ID: {form[config.numberField] || 'Generating...'} | ERP customer links are fetched automatically.
            </div>
          </div>
        </div>
      </div>

      {error && (
        <div className="card p-3 mb-4 flex items-center gap-2 text-sm text-red-600 bg-red-50 border border-red-100">
          <AlertCircle size={16} /> {error}
        </div>
      )}

      <SectionCard title={`${config.singular} Information`} icon={Save}>
        <FormGrid cols={3}>
          {config.fields.map(renderField)}
        </FormGrid>
      </SectionCard>

      {renderCustomerLinks()}

      {tabs.length > 0 && (
        <div className="card p-0 overflow-hidden mb-4" style={{ border: '1px solid #d7e8ff' }}>
          <div className="flex flex-wrap gap-0" style={{ background: '#f8fbff' }}>
            {tabs.map(tab => {
              const Icon = tab.icon
              const active = activeTab === tab.key
              return (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setActiveTab(tab.key)}
                  className="px-4 py-3 text-sm font-bold border-r border-blue-100 flex items-center gap-2"
                  style={{
                    background: active ? 'linear-gradient(135deg, #0f5cab 0%, #3b82f6 100%)' : 'transparent',
                    color: active ? '#fff' : '#0f4c81',
                    minWidth: '130px',
                  }}
                >
                  <Icon size={15} />
                  {tab.label}
                </button>
              )
            })}
          </div>
        </div>
      )}

      {CRM_DETAIL_ENTITIES.includes(entity) && activeTab === 'activity' && (
        <SectionCard title="Activity & Follow-up" icon={ClipboardList}>
          <div className="space-y-4">
            {(form.activities || []).map((activity, index) => (
              <div key={index} className="rounded-xl border border-blue-100 bg-blue-50/40 p-4">
                <FormGrid cols={3}>
                  <FormInput label="Task Name" value={activity.task_name || ''} onChange={e => updateArrayItem('activities', index, 'task_name', e.target.value)} />
                  <FormInput label="Employee" value={activity.employee || ''} onChange={e => updateArrayItem('activities', index, 'employee', e.target.value)} />
                  <SelectDropdown label="Activity" value={activity.activity_name || ''} onChange={e => updateArrayItem('activities', index, 'activity_name', e.target.value)} options={['Call', 'Email', 'Visit', 'Demo', 'Meeting', 'Follow-up']} />
                  <DatePicker label="Date" value={activity.activity_date || ''} onChange={e => updateArrayItem('activities', index, 'activity_date', e.target.value)} />
                  <FormInput label="Duration" value={activity.duration || ''} onChange={e => updateArrayItem('activities', index, 'duration', e.target.value)} placeholder="00:30" />
                  <FormInput label="Contact" value={activity.contact || ''} onChange={e => updateArrayItem('activities', index, 'contact', e.target.value)} />
                  <div className="md:col-span-2 lg:col-span-3">
                    <Textarea label="Particulars" rows={2} value={activity.particulars || ''} onChange={e => updateArrayItem('activities', index, 'particulars', e.target.value)} />
                  </div>
                  <div className="md:col-span-2 lg:col-span-3">
                    <Textarea label="Remarks" rows={2} value={activity.remarks || ''} onChange={e => updateArrayItem('activities', index, 'remarks', e.target.value)} />
                  </div>
                  <label className="flex items-center gap-2 text-sm font-semibold text-slate-700 pt-6">
                    <input type="checkbox" checked={Boolean(activity.followup)} onChange={e => updateArrayItem('activities', index, 'followup', e.target.checked)} />
                    Follow-up Required
                  </label>
                  <DatePicker label="Follow-up Date" value={activity.followup_date || ''} onChange={e => updateArrayItem('activities', index, 'followup_date', e.target.value)} />
                  <FormInput label="Follow-up To" value={activity.followup_to || ''} onChange={e => updateArrayItem('activities', index, 'followup_to', e.target.value)} />
                  <FormInput label="Follow-up Task" value={activity.followup_task || ''} onChange={e => updateArrayItem('activities', index, 'followup_task', e.target.value)} />
                  <div className="md:col-span-2">
                    <Textarea label="Follow-up Details" rows={2} value={activity.followup_details || ''} onChange={e => updateArrayItem('activities', index, 'followup_details', e.target.value)} />
                  </div>
                </FormGrid>
                <div className="flex justify-end mt-3">
                  <button className="btn-danger" type="button" onClick={() => removeArrayItem('activities', index, blankActivity)}>
                    <Trash2 size={13} /> Remove Activity
                  </button>
                </div>
              </div>
            ))}
            <button className="btn-secondary" type="button" onClick={() => addArrayItem('activities', blankActivity)}>
              Add Activity / Follow-up
            </button>
          </div>
        </SectionCard>
      )}

      {CRM_DETAIL_ENTITIES.includes(entity) && activeTab === 'todo' && (
        <SectionCard title="To Do" icon={CheckSquare}>
          <div className="space-y-3">
            {(form.todos || []).map((todo, index) => (
              <div key={index} className="grid grid-cols-1 md:grid-cols-6 gap-3 rounded-xl border border-blue-100 bg-white p-3">
                <FormInput label="Task Name" value={todo.task_name || ''} onChange={e => updateArrayItem('todos', index, 'task_name', e.target.value)} />
                <FormInput label="Assigned To" value={todo.assigned_to || ''} onChange={e => updateArrayItem('todos', index, 'assigned_to', e.target.value)} />
                <DatePicker label="Due Date" value={todo.due_date || ''} onChange={e => updateArrayItem('todos', index, 'due_date', e.target.value)} />
                <SelectDropdown label="Priority" value={todo.priority || ''} onChange={e => updateArrayItem('todos', index, 'priority', e.target.value)} options={['Low', 'Medium', 'High', 'Urgent']} />
                <SelectDropdown label="Status" value={todo.status || ''} onChange={e => updateArrayItem('todos', index, 'status', e.target.value)} options={['Open', 'Progress', 'Completed', 'Cancelled']} />
                <div className="flex items-end gap-2">
                  <FormInput label="Remarks" value={todo.remarks || ''} onChange={e => updateArrayItem('todos', index, 'remarks', e.target.value)} />
                  <button className="btn-danger" type="button" onClick={() => removeArrayItem('todos', index, blankTodo)}>
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            ))}
            <button className="btn-secondary" type="button" onClick={() => addArrayItem('todos', blankTodo)}>
              Add To Do
            </button>
          </div>
        </SectionCard>
      )}

      {CRM_DETAIL_ENTITIES.includes(entity) && activeTab === 'history' && (
        <SectionCard title="History" icon={History}>
          <div className="space-y-3">
            {(form.history || []).map((historyRow, index) => (
              <div key={index} className="grid grid-cols-1 md:grid-cols-5 gap-3 rounded-xl border border-blue-100 bg-white p-3">
                <DatePicker label="Date" value={historyRow.history_date || ''} onChange={e => updateArrayItem('history', index, 'history_date', e.target.value)} />
                <FormInput label="Action" value={historyRow.action || ''} onChange={e => updateArrayItem('history', index, 'action', e.target.value)} />
                <FormInput label="User" value={historyRow.user_name || ''} onChange={e => updateArrayItem('history', index, 'user_name', e.target.value)} />
                <FormInput label="Status" value={historyRow.status || ''} onChange={e => updateArrayItem('history', index, 'status', e.target.value)} />
                <div className="flex items-end gap-2">
                  <FormInput label="Details" value={historyRow.details || ''} onChange={e => updateArrayItem('history', index, 'details', e.target.value)} />
                  <button className="btn-danger" type="button" onClick={() => removeArrayItem('history', index, blankHistory)}>
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            ))}
            <button className="btn-secondary" type="button" onClick={() => addArrayItem('history', blankHistory)}>
              Add History
            </button>
          </div>
        </SectionCard>
      )}

      {['leads', 'enquiries', 'quotations'].includes(entity) && activeTab === 'product' && (
        <SectionCard title="Product Interest" icon={Package}>
          <div className="space-y-3">
            {(form.products || []).map((product, index) => (
              <div key={index} className="grid grid-cols-1 md:grid-cols-5 gap-3 rounded-xl border border-blue-100 bg-white p-3">
                <FormInput label="Product / Item" value={product.item_name || ''} onChange={e => updateArrayItem('products', index, 'item_name', e.target.value)} />
                <FormInput label="Category" value={product.category || ''} onChange={e => updateArrayItem('products', index, 'category', e.target.value)} />
                <NumberInput label="Qty" value={product.qty || ''} onChange={e => updateArrayItem('products', index, 'qty', e.target.value)} />
                <NumberInput label="Expected Value" value={product.expected_value || ''} onChange={e => updateArrayItem('products', index, 'expected_value', e.target.value)} />
                <div className="flex items-end gap-2">
                  <FormInput label="Remarks" value={product.remarks || ''} onChange={e => updateArrayItem('products', index, 'remarks', e.target.value)} />
                  <button className="btn-danger mb-0" type="button" onClick={() => removeArrayItem('products', index, blankProduct)}>
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            ))}
            <button className="btn-secondary" type="button" onClick={() => addArrayItem('products', blankProduct)}>
              Add Product
            </button>
          </div>
        </SectionCard>
      )}

      {['leads', 'enquiries', 'quotations'].includes(entity) && activeTab === 'transaction' && (
        <SectionCard title="Transaction / Value History" icon={ReceiptText}>
          <div className="space-y-3">
            {(form.transactions || []).map((transaction, index) => (
              <div key={index} className="grid grid-cols-1 md:grid-cols-6 gap-3 rounded-xl border border-blue-100 bg-white p-3">
                <DatePicker label="Date" value={transaction.transaction_date || ''} onChange={e => updateArrayItem('transactions', index, 'transaction_date', e.target.value)} />
                <SelectDropdown label="Type" value={transaction.transaction_type || ''} onChange={e => updateArrayItem('transactions', index, 'transaction_type', e.target.value)} options={['Quotation', 'Order', 'Invoice', 'Advance', 'Collection', 'Other']} />
                <FormInput label="Reference No" value={transaction.reference_no || ''} onChange={e => updateArrayItem('transactions', index, 'reference_no', e.target.value)} />
                <NumberInput label="Amount" value={transaction.amount || ''} onChange={e => updateArrayItem('transactions', index, 'amount', e.target.value)} />
                <SelectDropdown label="Status" value={transaction.status || ''} onChange={e => updateArrayItem('transactions', index, 'status', e.target.value)} options={['Open', 'Progress', 'Completed', 'Cancelled']} />
                <div className="flex items-end gap-2">
                  <FormInput label="Remarks" value={transaction.remarks || ''} onChange={e => updateArrayItem('transactions', index, 'remarks', e.target.value)} />
                  <button className="btn-danger" type="button" onClick={() => removeArrayItem('transactions', index, blankTransaction)}>
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            ))}
            <button className="btn-secondary" type="button" onClick={() => addArrayItem('transactions', blankTransaction)}>
              Add Transaction
            </button>
          </div>
        </SectionCard>
      )}

      {CRM_DETAIL_ENTITIES.includes(entity) && activeTab === 'attachment' && (
        <SectionCard title="Attachments" icon={Paperclip}>
          <div className="space-y-3">
            {(form.attachments || []).map((attachment, index) => (
              <div key={index} className="grid grid-cols-1 md:grid-cols-4 gap-3 rounded-xl border border-blue-100 bg-white p-3">
                <FormInput label="Attachment Name" value={attachment.attachment_name || ''} onChange={e => updateArrayItem('attachments', index, 'attachment_name', e.target.value)} />
                <FormInput label="File / Link" value={attachment.attachment_url || ''} onChange={e => updateArrayItem('attachments', index, 'attachment_url', e.target.value)} placeholder="Paste file path or URL" />
                <FormInput label="Remarks" value={attachment.remarks || ''} onChange={e => updateArrayItem('attachments', index, 'remarks', e.target.value)} />
                <div className="flex items-end">
                  <button className="btn-danger" type="button" onClick={() => removeArrayItem('attachments', index, blankAttachment)}>
                    <Trash2 size={13} /> Remove
                  </button>
                </div>
              </div>
            ))}
            <button className="btn-secondary" type="button" onClick={() => addArrayItem('attachments', blankAttachment)}>
              Add Attachment
            </button>
          </div>
        </SectionCard>
      )}

      {isEdit && (
        <div className="card p-4 border border-red-100 bg-red-50/40">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-sm font-bold text-red-700">Delete {config.singular}</div>
              <div className="text-xs text-red-500 mt-1">Use only when this CRM record was created by mistake.</div>
            </div>
            <button className="btn-danger" onClick={handleDelete}>
              <Trash2 size={14} /> Delete
            </button>
          </div>
        </div>
      )}
    </PageContainer>
  )
}
