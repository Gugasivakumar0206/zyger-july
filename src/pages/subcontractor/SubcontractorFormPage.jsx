import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Banknote, Building2, ClipboardList, FileCheck, MapPin, Plus, Save, Trash2, UserRound } from 'lucide-react'
import { ActionButtons, Checkbox, DatePicker, FormGrid, FormInput, PageContainer, SelectDropdown, Textarea } from '../../components/ui'
import {
  createSubcontractor,
  getNextSubcontractorNumber,
  getSubcontractorById,
  updateSubcontractor,
} from '../../lib/api'

const STEPS = [
  { key: 'basic', label: 'SubContractor', icon: UserRound },
  { key: 'address', label: 'Address', icon: MapPin },
  { key: 'tax', label: 'Tax Classification', icon: ClipboardList },
  { key: 'registration', label: 'Registration', icon: FileCheck },
  { key: 'bank', label: 'Bank', icon: Banknote },
]

const INDUSTRY_TYPES = ['Manufacturing', 'Machining', 'Fabrication', 'Heat Treatment', 'Painting', 'Assembly', 'Electrical', 'Civil', 'Service']
const TAX_CATEGORIES = ['IN_STATE_CUST', 'INTER_STATE_CUST', 'INTL_CUST(EOU)', 'INTL_CUST(EXPORT)', 'INTL_CUST(MCUST)', 'SISTER_CONCERN']
const TAX_SUB_CATEGORIES = ['CT-3', 'Form C', 'Form H']
const ACCOUNT_TYPES = ['Current', 'Savings', 'Cash Credit', 'OD', 'Term Loan']
const ADDRESS_TYPES = ['Billing', 'Shipping', 'Factory', 'Branch', 'Registered Office']
const DOCUMENT_TYPES = ['GST Certificate', 'PAN', 'MSME', 'Agreement', 'Bank Proof', 'Other']

function today() {
  return new Date().toISOString().slice(0, 10)
}

function blankAddress() {
  return {
    addressType: 'Billing',
    unitNumber: '',
    addressLine1: '',
    addressLine2: '',
    country: 'India',
    state: '',
    city: '',
    zipCode: '',
    distance: '',
    branchName: '',
  }
}

function blankContact() {
  return { name: '', mobile: '', email: '', designation: '' }
}

function blankAttachment() {
  return { fileName: '', documentType: '', remarks: '' }
}

const initialForm = {
  gstNumber: '',
  code: '',
  name: '',
  shortName: '',
  industryType: '',
  contactPerson: '',
  attentionPerson: '',
  priority: '',
  enableTcs: false,
  tcsAmount: '',
  enableTds: false,
  tdsMinAmount: '',
  tdsPercentage: '',
  generalRemarks: '',
  visibleTo: '',
  active: true,
  addresses: [blankAddress()],
  billingContacts: [blankContact()],
  shippingContacts: [blankContact()],
  taxClassification: {
    taxCategory: '',
    taxSubCategory: '',
    dateValidFrom: today(),
    dateValidTo: today(),
  },
  registration: {
    panNo: '',
    cinNo: '',
    msmeNo: '',
    pfNo: '',
    esiNo: '',
    tanNo: '',
    registrationNo: '',
    registrationDate: today(),
  },
  bank: {
    accountHolderName: '',
    accountNo: '',
    accountType: '',
    bankName: '',
    branchName: '',
    ifscCode: '',
    swiftCode: '',
    micrCode: '',
  },
  attachments: [blankAttachment()],
}

function WizardSteps({ activeStep, setActiveStep }) {
  return (
    <div className="card p-5 mb-5" style={{ border: '1px solid #dbeafe' }}>
      <div style={{ display: 'grid', gridTemplateColumns: `repeat(${STEPS.length}, 1fr)`, gap: '0', position: 'relative' }}>
        <div style={{ position: 'absolute', top: '20px', left: '7%', right: '7%', height: '7px', background: '#f1f5f9', borderRadius: '999px' }} />
        {STEPS.map((step, index) => {
          const Icon = step.icon
          const active = activeStep === index
          const done = activeStep > index
          return (
            <button
              key={step.key}
              type="button"
              onClick={() => setActiveStep(index)}
              style={{ position: 'relative', zIndex: 2, display: 'grid', justifyItems: 'center', gap: '9px', background: 'transparent', border: 0, cursor: 'pointer' }}
            >
              <div style={{
                width: '42px',
                height: '42px',
                borderRadius: '50%',
                display: 'grid',
                placeItems: 'center',
                background: active || done ? '#0176d3' : '#fff',
                color: active || done ? '#fff' : '#0176d3',
                border: active || done ? '3px solid #0176d3' : '4px solid #e5e7eb',
                fontWeight: 900,
                boxShadow: active ? '0 10px 24px rgba(1, 118, 211, 0.26)' : 'none',
              }}>
                {active ? index + 1 : <Icon size={15} />}
              </div>
              <div style={{ fontSize: '11px', fontWeight: 900, color: active ? '#0f172a' : '#64748b' }}>{step.label}</div>
            </button>
          )
        })}
      </div>
    </div>
  )
}

function SmallTable({ columns, rows, onChange, onAdd, onRemove }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr>
            {columns.map(column => <th key={column.key} className="table-th" style={{ minWidth: column.width || 150 }}>{column.label}</th>)}
            <th className="table-th" style={{ width: 90 }}>Action</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={index} className="table-row">
              {columns.map(column => (
                <td key={column.key} className="table-td">
                  {column.type === 'select' ? (
                    <select className="form-select" value={row[column.key] || ''} onChange={event => onChange(index, column.key, event.target.value)}>
                      <option value="">{column.placeholder || 'Please Select'}</option>
                      {(column.options || []).map(option => <option key={option} value={option}>{option}</option>)}
                    </select>
                  ) : (
                    <input className="form-input" value={row[column.key] || ''} onChange={event => onChange(index, column.key, event.target.value)} placeholder={column.placeholder || column.label} />
                  )}
                </td>
              ))}
              <td className="table-td">
                <div className="flex gap-2 justify-center">
                  <button type="button" className="btn-primary" style={{ padding: '7px 9px' }} onClick={onAdd}><Plus size={13} /></button>
                  <button type="button" className="btn-danger" style={{ padding: '7px 9px' }} onClick={() => onRemove(index)}><Trash2 size={13} /></button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default function SubcontractorFormPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const isEdit = Boolean(id)
  const [activeStep, setActiveStep] = useState(0)
  const [form, setForm] = useState(initialForm)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  useEffect(() => {
    async function load() {
      try {
        setError('')
        if (isEdit) {
          const row = await getSubcontractorById(id)
          setForm({
            ...initialForm,
            ...row,
            addresses: row.addresses?.length ? row.addresses : [blankAddress()],
            billingContacts: row.billingContacts?.length ? row.billingContacts : [blankContact()],
            shippingContacts: row.shippingContacts?.length ? row.shippingContacts : [blankContact()],
            attachments: row.attachments?.length ? row.attachments : [blankAttachment()],
            taxClassification: { ...initialForm.taxClassification, ...(row.taxClassification || {}) },
            registration: { ...initialForm.registration, ...(row.registration || {}) },
            bank: { ...initialForm.bank, ...(row.bank || {}) },
          })
          return
        }
        const next = await getNextSubcontractorNumber()
        setForm(current => ({ ...current, code: next.nextNumber || 'SUB-0001' }))
      } catch (err) {
        setError(err.message || 'Unable to load SubContractor.')
      }
    }
    load()
  }, [id, isEdit])

  const title = useMemo(() => {
    if (isEdit && form.name) return `Edit ${form.name}`
    return 'Create SubContractor'
  }, [form.name, isEdit])

  const set = (key, value) => setForm(current => ({ ...current, [key]: value }))
  const setNested = (group, key, value) => setForm(current => ({ ...current, [group]: { ...current[group], [key]: value } }))
  const updateArray = (group, index, key, value) => setForm(current => ({
    ...current,
    [group]: current[group].map((row, rowIndex) => rowIndex === index ? { ...row, [key]: value } : row),
  }))
  const addArray = (group, blank) => setForm(current => ({ ...current, [group]: [...current[group], blank()] }))
  const removeArray = (group, blank, index) => setForm(current => ({
    ...current,
    [group]: current[group].length === 1 ? [blank()] : current[group].filter((_, rowIndex) => rowIndex !== index),
  }))

  function loadDemoSubcontractor() {
    setForm(current => ({
      ...current,
      gstNumber: '33ABCDE1234F1Z5',
      name: 'XYZ Machining Works',
      shortName: 'XYZ Machining',
      industryType: 'Machining',
      contactPerson: 'Ramesh Kumar',
      attentionPerson: 'Quality Head',
      priority: '1',
      enableTcs: false,
      tcsAmount: '',
      enableTds: true,
      tdsMinAmount: '30000',
      tdsPercentage: '2',
      generalRemarks: 'Demo subcontractor for outside machining process.',
      visibleTo: 'Stores, Purchase, Production',
      active: true,
      addresses: [{
        addressType: 'Billing',
        unitNumber: '12/4',
        addressLine1: 'Industrial Estate Main Road',
        addressLine2: 'Near Foundry Cluster',
        country: 'India',
        state: 'Tamil Nadu',
        city: 'Coimbatore',
        zipCode: '641004',
        distance: '18 KM',
        branchName: 'Peelamedu Branch',
      }],
      billingContacts: [{ name: 'Ramesh Kumar', mobile: '9876543210', email: 'ramesh@xyzmachining.in', designation: 'Owner' }],
      shippingContacts: [{ name: 'Suresh', mobile: '9876501234', email: 'stores@xyzmachining.in', designation: 'Stores Incharge' }],
      taxClassification: {
        taxCategory: 'IN_STATE_CUST',
        taxSubCategory: 'CT-3',
        dateValidFrom: today(),
        dateValidTo: today(),
      },
      registration: {
        panNo: 'ABCDE1234F',
        cinNo: '',
        msmeNo: 'UDYAM-TN-03-0000001',
        pfNo: '',
        esiNo: '',
        tanNo: '',
        registrationNo: 'REG-DEMO-001',
        registrationDate: today(),
      },
      bank: {
        accountHolderName: 'XYZ Machining Works',
        accountNo: '123456789012',
        accountType: 'Current',
        bankName: 'State Bank Of India',
        branchName: 'Peelamedu Main Branch',
        ifscCode: 'SBIN0001206',
        swiftCode: 'SBININBB556',
        micrCode: '641002010',
      },
      attachments: [{ fileName: 'gst-certificate-demo.pdf', documentType: 'GST Certificate', remarks: 'Demo attachment reference' }],
    }))
    setSuccess('Demo SubContractor master data loaded. Review and save.')
    setError('')
  }

  async function handleSave() {
    if (!form.gstNumber.trim() || !form.code.trim() || !form.name.trim() || !form.shortName.trim()) {
      setError('GST Number, Code, SubContractor Name and Short Name are mandatory.')
      setActiveStep(0)
      return
    }

    try {
      setSaving(true)
      setError('')
      setSuccess('')
      const result = isEdit
        ? await updateSubcontractor(id, form)
        : await createSubcontractor(form)
      setSuccess(result.message || 'SubContractor saved successfully.')
      if (!isEdit) navigate(`/subcontractor/${result.subcontractor.id}`)
    } catch (err) {
      setError(err.message || 'Unable to save SubContractor.')
    } finally {
      setSaving(false)
    }
  }

  const actions = (
    <div className="flex gap-2 flex-wrap">
      <button type="button" className="btn-secondary" onClick={loadDemoSubcontractor}>Load Demo</button>
      {!isEdit && <button type="button" className="btn-secondary" onClick={() => navigate('/subcontractor/new')}>Create</button>}
      <button type="button" className="btn-secondary" onClick={() => navigate('/subcontractor')}>List</button>
      <ActionButtons onSave={handleSave} saveLabel={saving ? 'Saving...' : isEdit ? 'Update' : 'Save'} loading={saving} />
    </div>
  )

  return (
    <PageContainer title={title} subtitle="SubContractor master -> address -> tax classification -> registration -> bank" actions={actions} showBackButton backPath="/subcontractor">
      <WizardSteps activeStep={activeStep} setActiveStep={setActiveStep} />
      {error && <div className="card p-3 mb-4 text-sm font-bold text-red-600 bg-red-50 border border-red-100">{error}</div>}
      {success && <div className="card p-3 mb-4 text-sm font-bold text-green-700 bg-green-50 border border-green-100">{success}</div>}

      {activeStep === 0 && (
        <div className="section-card">
          <div className="section-header"><h3 style={{ color: '#fff', fontSize: 14, fontWeight: 800 }}>SubContractor Information</h3></div>
          <div className="section-body">
            <FormGrid cols={2}>
              <FormInput label="GST Number" required value={form.gstNumber} onChange={event => set('gstNumber', event.target.value.toUpperCase())} placeholder="Enter GST Number" />
              <FormInput label="Code" required value={form.code} onChange={event => set('code', event.target.value.toUpperCase())} placeholder="SUB-0001" />
              <FormInput label="SubContractor Name" required value={form.name} onChange={event => set('name', event.target.value)} placeholder="Enter SubContractor" />
              <FormInput label="Short Name" required value={form.shortName} onChange={event => set('shortName', event.target.value)} placeholder="Short Name of SubContractor" />
              <SelectDropdown label="Industry Type" value={form.industryType} onChange={event => set('industryType', event.target.value)} options={INDUSTRY_TYPES} placeholder="Please Select" />
              <FormInput label="Contact Person" value={form.contactPerson} onChange={event => set('contactPerson', event.target.value)} placeholder="Contact Person Name" />
              <FormInput label="Attention Person" value={form.attentionPerson} onChange={event => set('attentionPerson', event.target.value)} placeholder="Attention Person Name" />
              <FormInput label="Priority (Numbers Only)" type="number" value={form.priority} onChange={event => set('priority', event.target.value)} placeholder="Enter priority" />
              <Checkbox label="Enable TCS" checked={form.enableTcs} onChange={value => set('enableTcs', value)} />
              <FormInput label="TCS Amount" type="number" value={form.tcsAmount} onChange={event => set('tcsAmount', event.target.value)} placeholder="TCS Minimum Amount" />
              <Checkbox label="Enable TDS" checked={form.enableTds} onChange={value => set('enableTds', value)} />
              <FormInput label="TDS Min Amount" type="number" value={form.tdsMinAmount} onChange={event => set('tdsMinAmount', event.target.value)} placeholder="TDS Minimum Amount" />
              <FormInput label="TDS Percentage" type="number" value={form.tdsPercentage} onChange={event => set('tdsPercentage', event.target.value)} placeholder="TDS Percentage" />
              <FormInput label="Visible To" value={form.visibleTo} onChange={event => set('visibleTo', event.target.value)} placeholder="Please Select" />
              <Checkbox label="Active" checked={form.active} onChange={value => set('active', value)} />
              <Textarea label="General Remarks" rows={2} value={form.generalRemarks} onChange={event => set('generalRemarks', event.target.value)} placeholder="Please enter general remarks" />
            </FormGrid>
            <div className="mt-5">
              <h3 className="text-sm font-black text-slate-700 mb-3">Attachment</h3>
              <SmallTable
                columns={[
                  { key: 'fileName', label: 'File / Path', placeholder: 'Choose file / paste path', width: 220 },
                  { key: 'documentType', label: 'Document Type', type: 'select', options: DOCUMENT_TYPES, width: 180 },
                  { key: 'remarks', label: 'Remarks', width: 240 },
                ]}
                rows={form.attachments}
                onChange={(index, key, value) => updateArray('attachments', index, key, value)}
                onAdd={() => addArray('attachments', blankAttachment)}
                onRemove={index => removeArray('attachments', blankAttachment, index)}
              />
            </div>
          </div>
        </div>
      )}

      {activeStep === 1 && (
        <div className="section-card">
          <div className="section-header"><h3 style={{ color: '#fff', fontSize: 14, fontWeight: 800 }}>Address Details</h3></div>
          <div className="section-body">
            <h3 className="text-sm font-black text-slate-700 mb-3">Billing Address</h3>
            <SmallTable
              columns={[
                { key: 'addressType', label: 'Address Type', type: 'select', options: ADDRESS_TYPES, width: 160 },
                { key: 'unitNumber', label: 'Unit Number', placeholder: 'Door Number', width: 150 },
                { key: 'addressLine1', label: 'Address Line1', placeholder: 'Lane Name', width: 180 },
                { key: 'addressLine2', label: 'Address Line2', placeholder: 'Land Mark', width: 180 },
                { key: 'country', label: 'Country', width: 140 },
                { key: 'state', label: 'State', width: 150 },
                { key: 'city', label: 'City', width: 150 },
                { key: 'zipCode', label: 'ZipCode', placeholder: 'PinCode', width: 130 },
                { key: 'distance', label: 'Distance', width: 130 },
                { key: 'branchName', label: 'Branch Name', width: 170 },
              ]}
              rows={form.addresses}
              onChange={(index, key, value) => updateArray('addresses', index, key, value)}
              onAdd={() => addArray('addresses', blankAddress)}
              onRemove={index => removeArray('addresses', blankAddress, index)}
            />
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mt-6">
              <div>
                <h3 className="text-sm font-black text-slate-700 mb-3">Billing Contact</h3>
                <SmallTable
                  columns={[
                    { key: 'name', label: 'Name', width: 160 },
                    { key: 'mobile', label: 'Mobile', width: 150 },
                    { key: 'email', label: 'Email', width: 190 },
                  ]}
                  rows={form.billingContacts}
                  onChange={(index, key, value) => updateArray('billingContacts', index, key, value)}
                  onAdd={() => addArray('billingContacts', blankContact)}
                  onRemove={index => removeArray('billingContacts', blankContact, index)}
                />
              </div>
              <div>
                <h3 className="text-sm font-black text-slate-700 mb-3">Shipping Contact</h3>
                <SmallTable
                  columns={[
                    { key: 'name', label: 'Name', width: 160 },
                    { key: 'mobile', label: 'Mobile', width: 150 },
                    { key: 'email', label: 'Email', width: 190 },
                  ]}
                  rows={form.shippingContacts}
                  onChange={(index, key, value) => updateArray('shippingContacts', index, key, value)}
                  onAdd={() => addArray('shippingContacts', blankContact)}
                  onRemove={index => removeArray('shippingContacts', blankContact, index)}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {activeStep === 2 && (
        <div className="section-card">
          <div className="section-header"><h3 style={{ color: '#fff', fontSize: 14, fontWeight: 800 }}>Tax Classification</h3></div>
          <div className="section-body">
            <FormGrid cols={2}>
              <SelectDropdown label="Tax Category" value={form.taxClassification.taxCategory} onChange={event => setNested('taxClassification', 'taxCategory', event.target.value)} options={TAX_CATEGORIES} placeholder="Please Select" />
              <SelectDropdown label="Tax SubCategory" value={form.taxClassification.taxSubCategory} onChange={event => setNested('taxClassification', 'taxSubCategory', event.target.value)} options={TAX_SUB_CATEGORIES} placeholder="Please Select" />
              <DatePicker label="Date Valid From" required value={form.taxClassification.dateValidFrom} onChange={event => setNested('taxClassification', 'dateValidFrom', event.target.value)} />
              <DatePicker label="Date Valid To" required value={form.taxClassification.dateValidTo} onChange={event => setNested('taxClassification', 'dateValidTo', event.target.value)} />
            </FormGrid>
          </div>
        </div>
      )}

      {activeStep === 3 && (
        <div className="section-card">
          <div className="section-header"><h3 style={{ color: '#fff', fontSize: 14, fontWeight: 800 }}>Registration</h3></div>
          <div className="section-body">
            <FormGrid cols={2}>
              <FormInput label="PAN No" value={form.registration.panNo} onChange={event => setNested('registration', 'panNo', event.target.value.toUpperCase())} placeholder="PAN Number" />
              <FormInput label="CIN No" value={form.registration.cinNo} onChange={event => setNested('registration', 'cinNo', event.target.value)} placeholder="CIN Number" />
              <FormInput label="MSME No" value={form.registration.msmeNo} onChange={event => setNested('registration', 'msmeNo', event.target.value)} placeholder="MSME Number" />
              <FormInput label="PF No" value={form.registration.pfNo} onChange={event => setNested('registration', 'pfNo', event.target.value)} placeholder="PF Number" />
              <FormInput label="ESI No" value={form.registration.esiNo} onChange={event => setNested('registration', 'esiNo', event.target.value)} placeholder="ESI Number" />
              <FormInput label="TAN No" value={form.registration.tanNo} onChange={event => setNested('registration', 'tanNo', event.target.value)} placeholder="TAN Number" />
              <FormInput label="Registration No" value={form.registration.registrationNo} onChange={event => setNested('registration', 'registrationNo', event.target.value)} placeholder="Registration Number" />
              <DatePicker label="Registration Date" value={form.registration.registrationDate} onChange={event => setNested('registration', 'registrationDate', event.target.value)} />
            </FormGrid>
          </div>
        </div>
      )}

      {activeStep === 4 && (
        <div className="section-card">
          <div className="section-header"><h3 style={{ color: '#fff', fontSize: 14, fontWeight: 800 }}>Bank</h3></div>
          <div className="section-body">
            <FormGrid cols={2}>
              <FormInput label="Account Holder Name" required value={form.bank.accountHolderName} onChange={event => setNested('bank', 'accountHolderName', event.target.value)} placeholder="Account Holder Name" />
              <FormInput label="Account No" required value={form.bank.accountNo} onChange={event => setNested('bank', 'accountNo', event.target.value)} placeholder="SubContractor Bank Account Number" />
              <SelectDropdown label="Account Type" value={form.bank.accountType} onChange={event => setNested('bank', 'accountType', event.target.value)} options={ACCOUNT_TYPES} placeholder="Please Select" />
              <FormInput label="Bank Name" required value={form.bank.bankName} onChange={event => setNested('bank', 'bankName', event.target.value)} placeholder="Ex: State Bank Of India" />
              <FormInput label="Branch Name" required value={form.bank.branchName} onChange={event => setNested('bank', 'branchName', event.target.value)} placeholder="Ex: Peelamedu Main Branch" />
              <FormInput label="IFSC Code" value={form.bank.ifscCode} onChange={event => setNested('bank', 'ifscCode', event.target.value.toUpperCase())} placeholder="Ex: ICIC0001206" />
              <FormInput label="SWIFT Code" value={form.bank.swiftCode} onChange={event => setNested('bank', 'swiftCode', event.target.value.toUpperCase())} placeholder="Ex: SBININBB556" />
              <FormInput label="MICR Code" value={form.bank.micrCode} onChange={event => setNested('bank', 'micrCode', event.target.value)} placeholder="MICR Code" />
            </FormGrid>
          </div>
        </div>
      )}

      <div className="flex justify-between items-center mt-5">
        <button type="button" className="btn-secondary" disabled={activeStep === 0} onClick={() => setActiveStep(step => Math.max(0, step - 1))}>Previous</button>
        <div className="flex gap-2">
          {activeStep < STEPS.length - 1 && <button type="button" className="btn-primary" onClick={() => setActiveStep(step => Math.min(STEPS.length - 1, step + 1))}>Next</button>}
          <button type="button" className="btn-primary" onClick={handleSave} disabled={saving}>
            <Save size={14} /> {saving ? 'Saving...' : isEdit ? 'Update' : 'Save'}
          </button>
        </div>
      </div>
    </PageContainer>
  )
}
