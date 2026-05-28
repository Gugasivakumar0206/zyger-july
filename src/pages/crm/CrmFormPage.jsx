import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { AlertCircle, Save, Trash2 } from 'lucide-react'
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
  getCrmRecordById,
  getNextCrmNumber,
  updateCrmRecord,
} from '../../lib/api'
import { CRM_ENTITIES } from './crmConfig'

function today() {
  return new Date().toISOString().slice(0, 10)
}

export default function CrmFormPage({ entity }) {
  const config = CRM_ENTITIES[entity]
  const { id } = useParams()
  const navigate = useNavigate()
  const isEdit = Boolean(id)
  const [form, setForm] = useState({})
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

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
    return initial
  }, [config])

  useEffect(() => {
    async function loadForm() {
      try {
        setError('')
        if (isEdit) {
          const record = await getCrmRecordById(entity, id)
          setForm({ ...defaultForm, ...record })
          return
        }

        const result = await getNextCrmNumber(entity)
        setForm({
          ...defaultForm,
          [config.numberField]: result.next_number,
        })
      } catch (err) {
        setError(err.message)
      }
    }

    loadForm()
  }, [config.numberField, defaultForm, entity, id, isEdit])

  const updateField = (name, value) => {
    setForm(prev => ({ ...prev, [name]: value }))
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

  return (
    <PageContainer
      title={`${isEdit ? 'Edit' : 'New'} ${config.singular}`}
      subtitle={`CRM -> ${config.title}`}
      showBackButton
      backPath={`/crm/${entity}`}
      actions={
        <ActionButtons
          onSave={handleSave}
          onCancel={() => navigate(`/crm/${entity}`)}
          onDelete={isEdit ? handleDelete : null}
          saveLabel={loading ? 'Saving...' : `Save ${config.singular}`}
          loading={loading}
        />
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
              Auto number, required details and status tracking are saved to CRM database.
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
