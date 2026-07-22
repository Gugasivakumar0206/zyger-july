import { useEffect, useMemo, useState } from 'react'
import { Factory, FileCheck2, PackageCheck, ShieldCheck, TableProperties, XCircle } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

import { ActionButtons, FormGrid, FormInput, PageContainer, SectionCard, SelectDropdown, Textarea } from '../../components/ui/index'
import {
  createInwardInspection,
  getCurrentUser,
  getInwardInspectionSourceDetail,
  getInwardInspectionSources,
  getNextInwardInspectionNumber,
  getStores,
} from '../../lib/api'

function todayValue() {
  return new Date().toISOString().slice(0, 10)
}

function formatDate(value) {
  if (!value) return '-'
  return new Date(value).toLocaleDateString('en-GB')
}

function decimalValue(value) {
  return Number(value || 0)
}

function formatQty(value) {
  return Number(value || 0).toLocaleString('en-IN', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })
}

export default function InwardInspectionFormPage() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [bootLoading, setBootLoading] = useState(true)
  const [sourceLoading, setSourceLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [sourceHeaders, setSourceHeaders] = useState([])
  const [sourceHeader, setSourceHeader] = useState(null)
  const [sourceCatalog, setSourceCatalog] = useState([])
  const [sourceItems, setSourceItems] = useState([])
  const [storeOptions, setStoreOptions] = useState([])
  const [currentUserName, setCurrentUserName] = useState('')

  const [form, setForm] = useState({
    inspectionNo: '',
    inspectionDate: todayValue(),
    inwardType: 'PO',
    purchaseInwardId: '',
    companyName: '',
    remarks: '',
  })

  useEffect(() => {
    async function bootstrap() {
      try {
        setBootLoading(true)
        setError('')

        const [numberResult, currentUser, stores] = await Promise.all([
          getNextInwardInspectionNumber(),
          getCurrentUser(),
          getStores(),
        ])

        setForm((current) => ({
          ...current,
          inspectionNo: numberResult.inspection_no || '',
        }))

        setCurrentUserName(currentUser?.full_name || currentUser?.email || '')

        setStoreOptions(
          (Array.isArray(stores) ? stores : [])
            .filter((store) => store.isActive !== false)
            .map((store) => ({
              value: store.storeName,
              key: store.storeCode || store.storeName,
              label: [store.storeCode, store.storeName, store.location].filter(Boolean).join(' - '),
            }))
        )
      } catch (bootError) {
        setError(bootError.message || 'Unable to prepare inward inspection form.')
      } finally {
        setBootLoading(false)
      }
    }

    bootstrap()
  }, [])

  useEffect(() => {
    async function loadSourceHeaders() {
      try {
        setSourceLoading(true)
        setError('')
        setSourceHeader(null)
        setSourceCatalog([])
        setSourceItems([])
        setForm((current) => ({ ...current, purchaseInwardId: '', companyName: '' }))

        const result = await getInwardInspectionSources(form.inwardType)
        setSourceHeaders(result.rows || [])
      } catch (loadError) {
        setError(loadError.message || 'Unable to load inward numbers.')
        setSourceHeaders([])
      } finally {
        setSourceLoading(false)
      }
    }

    loadSourceHeaders()
  }, [form.inwardType])

  useEffect(() => {
    async function loadSourceDetail() {
      if (!form.purchaseInwardId) return

      try {
        setSourceLoading(true)
        setError('')

        const result = await getInwardInspectionSourceDetail(form.purchaseInwardId)

        setSourceHeader(result.header || null)
        setSourceCatalog(result.items || [])
        setSourceItems(
          (result.items || []).map((item) => ({
            source_item_id: item.source_item_id,
            item_id: String(item.item_id),
            item_name: item.item_name,
            item_code: item.item_code,
            tolerance: '0',
            uom: item.uom || '-',
            received_qty: String(item.qty ?? '0'),
            accepted_qty: String(item.qty ?? '0'),
            rejected_qty: '0',
            rework_qty: '0',
            hold_qty: '0',
            hold_number: '',
            idle_stock_qty: '0',
            testing: 'QUALITY CHECK',
            location: result.header?.extra_data?.location || '',
            batch_number: '',
            remark: '',
            attachment: '',
            rejection_reason: '',
          }))
        )

        setForm((current) => ({
          ...current,
          companyName: result.header?.company_name || '',
        }))
      } catch (loadError) {
        setError(loadError.message || 'Unable to load inward item details.')
        setSourceHeader(null)
        setSourceCatalog([])
        setSourceItems([])
      } finally {
        setSourceLoading(false)
      }
    }

    loadSourceDetail()
  }, [form.purchaseInwardId])

  const inwardTypeOptions = [
    { value: 'PO', label: 'PO Inward' },
    { value: 'LO', label: 'LO Inward' },
    { value: 'JO', label: 'JO / Customer Job Work Inward' },
    { value: 'GRN', label: 'General Inward' },
  ]

  const inwardNumberOptions = useMemo(
    () =>
      sourceHeaders.map((row) => ({
        value: String(row.id),
        label: `${row.inward_no} - ${row.company_name}${row.supplier_gstin ? ` - GST ${row.supplier_gstin}` : ''}`,
      })),
    [sourceHeaders]
  )

  const itemSourceOptions = useMemo(
    () =>
      sourceCatalog.map((item) => ({
        value: String(item.source_item_id),
        label: `${item.item_code} - ${item.item_name}`,
      })),
    [sourceCatalog]
  )

  function updateField(key, value) {
    setForm((current) => ({ ...current, [key]: value }))
  }

  function updateItemRow(index, key, value) {
    setSourceItems((current) =>
      current.map((row, rowIndex) => {
        if (rowIndex !== index) return row

        if (key === 'source_item_id') {
          const selected = sourceCatalog.find((item) => String(item.source_item_id) === String(value))
          if (!selected) return row

          return {
            ...row,
            source_item_id: selected.source_item_id,
            item_id: String(selected.item_id),
            item_name: selected.item_name,
            item_code: selected.item_code,
            uom: selected.uom || '-',
            received_qty: String(selected.qty ?? '0'),
            accepted_qty: String(selected.qty ?? '0'),
            rejected_qty: '0',
            rework_qty: '0',
            hold_qty: '0',
            hold_number: '',
            idle_stock_qty: '0',
            rejection_reason: '',
          }
        }

        const nextRow = { ...row, [key]: value }
        const received = decimalValue(nextRow.received_qty)
        const rejected = decimalValue(nextRow.rejected_qty)
        const rework = decimalValue(nextRow.rework_qty)
        const hold = decimalValue(nextRow.hold_qty)
        const idle = decimalValue(nextRow.idle_stock_qty)
        const accepted = Math.max(received - rejected - rework - hold - idle, 0)

        nextRow.accepted_qty = String(accepted)
        return nextRow
      })
    )
  }

  const totals = useMemo(() => {
    return sourceItems.reduce(
      (acc, row) => {
        acc.received += decimalValue(row.received_qty)
        acc.accepted += decimalValue(row.accepted_qty)
        acc.rejected += decimalValue(row.rejected_qty)
        acc.rework += decimalValue(row.rework_qty)
        acc.hold += decimalValue(row.hold_qty)
        acc.idle += decimalValue(row.idle_stock_qty)
        return acc
      },
      { received: 0, accepted: 0, rejected: 0, rework: 0, hold: 0, idle: 0 }
    )
  }, [sourceItems])

  const rejectedRows = useMemo(
    () => sourceItems.filter((row) => decimalValue(row.rejected_qty) > 0 || decimalValue(row.rework_qty) > 0),
    [sourceItems]
  )

  async function handleSave() {
    if (!form.inspectionDate || !form.inwardType || !form.purchaseInwardId || sourceItems.length === 0) {
      setSuccess('')
      setError('Inspection date, inward type, inward number, and item details are required.')
      return
    }

    if (sourceItems.some((row) => decimalValue(row.accepted_qty) < 0)) {
      setSuccess('')
      setError('Accepted quantity cannot be negative.')
      return
    }

    if (sourceItems.some((row) => !String(row.location || '').trim())) {
      setSuccess('')
      setError('Store / location is required for every inspected item.')
      return
    }

    try {
      setLoading(true)
      setError('')
      setSuccess('')

      const result = await createInwardInspection({
        inspection_date: form.inspectionDate,
        inward_type: form.inwardType,
        purchase_inward_id: Number(form.purchaseInwardId),
        company_name: form.companyName,
        created_by: currentUserName,
        remarks: form.remarks,
        items: sourceItems.map((row) => ({
          source_item_id: Number(row.source_item_id),
          item_id: Number(row.item_id),
          tolerance: row.tolerance || '0',
          received_qty: row.received_qty || '0',
          rejected_qty: row.rejected_qty || '0',
          rework_qty: row.rework_qty || '0',
          hold_qty: row.hold_qty || '0',
          hold_number: row.hold_number || '',
          idle_stock_qty: row.idle_stock_qty || '0',
          testing: row.testing || 'QUALITY CHECK',
          location: row.location || '',
          batch_number: row.batch_number || '',
          remark: row.rejection_reason || row.remark || '',
          attachment: row.attachment || '',
        })),
      })

      setSuccess(result.message || 'Inward inspection saved successfully.')

      if (result.inspection?.id) {
        setTimeout(() => navigate(`/quality/inward-inspection/${result.inspection.id}`), 700)
      }
    } catch (saveError) {
      setError(saveError.message || 'Unable to save inward inspection.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <PageContainer
      title="New Inward Inspection"
      subtitle="Master -> Quality -> Inward Inspection -> Create new inspection entry"
      actions={<ActionButtons onSave={handleSave} onCancel={() => navigate('/quality/inward-inspection')} saveLabel="Save Inspection" loading={loading} />}
    >
      {error && (
        <div style={{ marginBottom: '16px', padding: '12px 14px', borderRadius: '10px', background: '#fee2e2', color: '#991b1b', fontSize: '13px', fontWeight: '700' }}>
          {error}
        </div>
      )}

      {success && (
        <div style={{ marginBottom: '16px', padding: '12px 14px', borderRadius: '10px', background: '#dcfce7', color: '#166534', fontSize: '13px', fontWeight: '700' }}>
          {success}
        </div>
      )}

      {(bootLoading || sourceLoading) && (
        <div style={{ marginBottom: '16px', padding: '12px 14px', borderRadius: '10px', background: '#eef2ff', color: '#4338ca', fontSize: '13px', fontWeight: '700' }}>
          Loading inward inspection details...
        </div>
      )}

      <SectionCard title="Inward Inspection Information" icon={ShieldCheck} defaultOpen>
        <FormGrid cols={3}>
          <FormInput label="Inward Inspection Number" required value={form.inspectionNo} readOnly />
          <FormInput label="Company Name" required value={form.companyName} readOnly placeholder="Auto from inward selection" />
          <FormInput label="Inward Inspection Date" required type="date" value={form.inspectionDate} onChange={(event) => updateField('inspectionDate', event.target.value)} />
        </FormGrid>
      </SectionCard>

      <SectionCard title="Inward Information" icon={Factory} defaultOpen>
        <FormGrid cols={3}>
          <SelectDropdown
            label="Inward Type"
            required
            value={form.inwardType}
            onChange={(event) => updateField('inwardType', event.target.value)}
            options={inwardTypeOptions}
            placeholder="Select inward type"
          />
          <SelectDropdown
            label="Inward Number"
            required
            value={form.purchaseInwardId}
            onChange={(event) => updateField('purchaseInwardId', event.target.value)}
            options={inwardNumberOptions}
            placeholder={sourceHeaders.length ? 'Select inward number' : `No ${form.inwardType} inward available`}
          />
          <FormInput label="Invoice Date" value={sourceHeader?.inward_date || ''} readOnly />
          <FormInput label="Source Inward Date" value={sourceHeader?.inward_date || ''} readOnly />
          <FormInput label="Invoice No" value={sourceHeader?.invoice_no || ''} readOnly />
          <FormInput label="Created By" value={currentUserName} readOnly />
          <FormInput label="Supplier Code" value={sourceHeader?.supplier_code || '-'} readOnly />
          <FormInput label="Supplier GSTIN" value={sourceHeader?.supplier_gstin || '-'} readOnly />
          <FormInput label="Supplier Contact" value={sourceHeader?.supplier_mobile || sourceHeader?.supplier_email || '-'} readOnly />
        </FormGrid>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
          <div className="card !p-4">
            <p className="text-xs text-slate-500">Selected Inward No</p>
            <p className="text-base font-semibold text-slate-800">{sourceHeader?.inward_no || '-'}</p>
          </div>
          <div className="card !p-4">
            <p className="text-xs text-slate-500">Company</p>
            <p className="text-base font-semibold text-slate-800">{sourceHeader?.company_name || '-'}</p>
          </div>
          <div className="card !p-4">
            <p className="text-xs text-slate-500">Inward Date</p>
            <p className="text-base font-semibold text-slate-800">{formatDate(sourceHeader?.inward_date)}</p>
          </div>
        </div>
      </SectionCard>

      <SectionCard title="Product Information" icon={TableProperties} defaultOpen>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-primary-700 text-white">
              <tr>
                <th className="px-3 py-3 text-left">S No</th>
                <th className="px-3 py-3 text-left">Item</th>
                <th className="px-3 py-3 text-left">Tolerance</th>
                <th className="px-3 py-3 text-left">UoM</th>
                <th className="px-3 py-3 text-left">Received Qty</th>
              </tr>
            </thead>
            <tbody>
              {sourceItems.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-6 text-center text-slate-500">
                    Select PO inward or LO inward number to load item rows.
                  </td>
                </tr>
              ) : sourceItems.map((row, index) => (
                <tr key={row.source_item_id} className="border-b border-slate-100 align-top">
                  <td className="px-3 py-3">{index + 1}</td>
                  <td className="px-3 py-3 min-w-56">
                    <select className="form-select min-w-56" value={row.source_item_id} onChange={(event) => updateItemRow(index, 'source_item_id', event.target.value)}>
                      {itemSourceOptions.map((option) => (
                        <option key={option.value} value={option.value}>{option.label}</option>
                      ))}
                    </select>
                    <div className="text-slate-500 text-xs mt-1">{row.item_code}</div>
                  </td>
                  <td className="px-3 py-3">
                    <input className="form-input min-w-24" value={row.tolerance} onChange={(event) => updateItemRow(index, 'tolerance', event.target.value)} />
                  </td>
                  <td className="px-3 py-3">{row.uom}</td>
                  <td className="px-3 py-3 font-semibold text-slate-800">{formatQty(row.received_qty)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </SectionCard>

      <SectionCard title="Approved / Inspection Result" icon={PackageCheck} defaultOpen>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-green-700 text-white">
              <tr>
                <th className="px-3 py-3 text-left">S No</th>
                <th className="px-3 py-3 text-left">Item</th>
                <th className="px-3 py-3 text-left">Accepted Qty</th>
                <th className="px-3 py-3 text-left">Testing</th>
                <th className="px-3 py-3 text-left">Store / Location</th>
                <th className="px-3 py-3 text-left">Batch Number</th>
              </tr>
            </thead>
            <tbody>
              {sourceItems.map((row, index) => (
                <tr key={`approved-${row.source_item_id}`} className="border-b border-slate-100 align-top">
                  <td className="px-3 py-3">{index + 1}</td>
                  <td className="px-3 py-3 min-w-52">
                    <div className="font-semibold text-slate-800">{row.item_code}</div>
                    <div className="text-slate-600">{row.item_name}</div>
                  </td>
                  <td className="px-3 py-3">
                    <input className="form-input min-w-24 bg-green-50" value={row.accepted_qty} readOnly />
                  </td>
                  <td className="px-3 py-3">
                    <input className="form-input min-w-32" value={row.testing} onChange={(event) => updateItemRow(index, 'testing', event.target.value)} />
                  </td>
                  <td className="px-3 py-3">
                    <select className="form-select min-w-36" value={row.location} onChange={(event) => updateItemRow(index, 'location', event.target.value)}>
                      <option value="">Select rack / store</option>
                      {storeOptions.map((store) => (
                        <option key={store.key} value={store.value}>{store.label}</option>
                      ))}
                    </select>
                  </td>
                  <td className="px-3 py-3">
                    <input className="form-input min-w-28" value={row.batch_number} onChange={(event) => updateItemRow(index, 'batch_number', event.target.value)} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </SectionCard>

      <SectionCard title="Rejected Details" icon={XCircle} defaultOpen>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-red-700 text-white">
              <tr>
                <th className="px-3 py-3 text-left">S No</th>
                <th className="px-3 py-3 text-left">Item</th>
                <th className="px-3 py-3 text-left">Rejected Qty</th>
                <th className="px-3 py-3 text-left">Rework Qty</th>
                <th className="px-3 py-3 text-left">Lot Hold Qty</th>
                <th className="px-3 py-3 text-left">Hold Number</th>
                <th className="px-3 py-3 text-left">Idle Stock Qty</th>
                <th className="px-3 py-3 text-left">Store / Location</th>
                <th className="px-3 py-3 text-left">Rejection Reason</th>
                <th className="px-3 py-3 text-left">Attachment</th>
              </tr>
            </thead>
            <tbody>
              {sourceItems.map((row, index) => (
                <tr key={`rejected-${row.source_item_id}`} className="border-b border-slate-100 align-top">
                  <td className="px-3 py-3">{index + 1}</td>
                  <td className="px-3 py-3 min-w-52">
                    <div className="font-semibold text-slate-800">{row.item_code}</div>
                    <div className="text-slate-600">{row.item_name}</div>
                  </td>
                  <td className="px-3 py-3">
                    <input className="form-input min-w-24" type="number" min="0" step="0.01" value={row.rejected_qty} onChange={(event) => updateItemRow(index, 'rejected_qty', event.target.value)} />
                  </td>
                  <td className="px-3 py-3">
                    <input className="form-input min-w-24" type="number" min="0" step="0.01" value={row.rework_qty} onChange={(event) => updateItemRow(index, 'rework_qty', event.target.value)} />
                  </td>
                  <td className="px-3 py-3">
                    <input className="form-input min-w-24" type="number" min="0" step="0.01" value={row.hold_qty} onChange={(event) => updateItemRow(index, 'hold_qty', event.target.value)} />
                  </td>
                  <td className="px-3 py-3">
                    <input className="form-input min-w-32" value={row.hold_number} onChange={(event) => updateItemRow(index, 'hold_number', event.target.value)} placeholder="Lot hold no" />
                  </td>
                  <td className="px-3 py-3">
                    <input className="form-input min-w-24" type="number" min="0" step="0.01" value={row.idle_stock_qty} onChange={(event) => updateItemRow(index, 'idle_stock_qty', event.target.value)} />
                  </td>
                  <td className="px-3 py-3">
                    <select className="form-select min-w-36" value={row.location} onChange={(event) => updateItemRow(index, 'location', event.target.value)}>
                      <option value="">Select rack / store</option>
                      {storeOptions.map((store) => (
                        <option key={store.key} value={store.value}>{store.label}</option>
                      ))}
                    </select>
                  </td>
                  <td className="px-3 py-3">
                    <input className="form-input min-w-40" value={row.rejection_reason} onChange={(event) => updateItemRow(index, 'rejection_reason', event.target.value)} placeholder="Enter rejection reason" />
                  </td>
                  <td className="px-3 py-3">
                    <input className="form-input min-w-36" value={row.attachment} onChange={(event) => updateItemRow(index, 'attachment', event.target.value)} placeholder="Attachment path / note" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-4 grid grid-cols-1 md:grid-cols-5 gap-4">
          <div className="card !p-4">
            <p className="text-xs text-slate-500">Rejected Item Rows</p>
            <p className="text-xl font-bold text-red-600">{rejectedRows.length}</p>
          </div>
          <div className="card !p-4">
            <p className="text-xs text-slate-500">Total Rejected Qty</p>
            <p className="text-xl font-bold text-red-600">{formatQty(totals.rejected)}</p>
          </div>
          <div className="card !p-4">
            <p className="text-xs text-slate-500">Total Rework Qty</p>
            <p className="text-xl font-bold text-amber-600">{formatQty(totals.rework)}</p>
          </div>
          <div className="card !p-4">
            <p className="text-xs text-slate-500">Lot Hold Qty</p>
            <p className="text-xl font-bold text-indigo-600">{formatQty(totals.hold)}</p>
          </div>
          <div className="card !p-4">
            <p className="text-xs text-slate-500">Idle Stock Qty</p>
            <p className="text-xl font-bold text-slate-700">{formatQty(totals.idle)}</p>
          </div>
        </div>
      </SectionCard>

      <SectionCard title="Inspection Remark" icon={FileCheck2} defaultOpen>
        <Textarea
          label="General Remarks"
          rows={4}
          value={form.remarks}
          onChange={(event) => updateField('remarks', event.target.value)}
          placeholder="Enter overall inward inspection note, quality decision, or rejection reason..."
        />
      </SectionCard>

      <SectionCard title="Inspection Summary" icon={PackageCheck} defaultOpen={false}>
        <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
          <div className="card !p-4">
            <p className="text-xs text-slate-500">Received Qty</p>
            <p className="text-xl font-bold text-slate-800">{formatQty(totals.received)}</p>
          </div>
          <div className="card !p-4">
            <p className="text-xs text-slate-500">Accepted Qty</p>
            <p className="text-xl font-bold text-green-700">{formatQty(totals.accepted)}</p>
          </div>
          <div className="card !p-4">
            <p className="text-xs text-slate-500">Rejected Qty</p>
            <p className="text-xl font-bold text-red-600">{formatQty(totals.rejected)}</p>
          </div>
          <div className="card !p-4">
            <p className="text-xs text-slate-500">Rework Qty</p>
            <p className="text-xl font-bold text-amber-600">{formatQty(totals.rework)}</p>
          </div>
          <div className="card !p-4">
            <p className="text-xs text-slate-500">Lot Hold Qty</p>
            <p className="text-xl font-bold text-indigo-600">{formatQty(totals.hold)}</p>
          </div>
          <div className="card !p-4">
            <p className="text-xs text-slate-500">Idle Stock Qty</p>
            <p className="text-xl font-bold text-slate-700">{formatQty(totals.idle)}</p>
          </div>
        </div>
      </SectionCard>
    </PageContainer>
  )
}
