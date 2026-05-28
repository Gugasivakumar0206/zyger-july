import { useEffect, useMemo } from 'react'
import { useParams } from 'react-router-dom'
import logo from '../../assets/zyger-logo.svg'
import { MOCK_DC } from '../../data/mockData'
import { COMPANY_PROFILE } from '../print/companyProfile'

function formatDate(value) {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleDateString('en-GB')
}

export default function LabourDCPrintPage() {
  const { id } = useParams()

  useEffect(() => {
    const timer = window.setTimeout(() => window.print(), 400)
    return () => window.clearTimeout(timer)
  }, [])

  const record = useMemo(() => {
    return MOCK_DC.find((row) => String(row.id) === String(id)) || MOCK_DC[0]
  }, [id])

  return (
    <>
      <style>{`
        @page { size: A4 portrait; margin: 10mm; }
        body { margin: 0; background: #f3f4f6; font-family: Arial, sans-serif; }
        @media print {
          body { background: white; }
          .print-toolbar { display: none !important; }
          .print-shell { margin: 0 !important; box-shadow: none !important; }
        }
      `}</style>

      <div className="print-toolbar" style={{ display: 'flex', justifyContent: 'center', gap: '12px', padding: '16px' }}>
        <button onClick={() => window.print()} style={{ padding: '10px 16px', borderRadius: '8px', border: 'none', background: '#0f766e', color: 'white', fontWeight: 700, cursor: 'pointer' }}>
          Print / Save PDF
        </button>
      </div>

      <div className="print-shell" style={{ width: '840px', margin: '0 auto 24px', background: 'white', boxShadow: '0 12px 40px rgba(15,23,42,0.15)', border: '1px solid #d1d5db' }}>
        <div style={{ padding: '18px 22px' }}>
          <div style={{ border: '1px solid #4b5563' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '88px 1fr', gap: '14px', alignItems: 'center', padding: '14px', borderBottom: '1px solid #4b5563' }}>
              <div style={{ width: '76px', height: '76px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <img src={logo} alt={COMPANY_PROFILE.logoAlt} style={{ width: '68px', height: '68px', objectFit: 'contain' }} />
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '28px', fontWeight: 800 }}>{COMPANY_PROFILE.name}</div>
                <div style={{ fontSize: '13px', marginTop: '4px' }}>{COMPANY_PROFILE.address}</div>
                <div style={{ fontSize: '13px', marginTop: '6px', fontWeight: 700 }}>
                  PAN No: {COMPANY_PROFILE.pan} , GSTIN: {COMPANY_PROFILE.gstin}
                </div>
                <div style={{ fontSize: '13px', marginTop: '4px' }}>
                  Email id: {COMPANY_PROFILE.email} &nbsp;&nbsp; Phone No: {COMPANY_PROFILE.phone}
                </div>
              </div>
            </div>
            <div style={{ background: '#bde7f3', borderBottom: '1px solid #4b5563', textAlign: 'center', fontSize: '20px', fontWeight: 800, padding: '6px 0' }}>
              LABOUR DC
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1.15fr 0.85fr', borderBottom: '1px solid #4b5563' }}>
              <div style={{ borderRight: '1px solid #4b5563', padding: '10px 12px', minHeight: '130px' }}>
                <div style={{ fontSize: '16px', fontWeight: 800, marginBottom: '8px' }}>To</div>
                <div><strong>M/s</strong> {record.customer || '-'}</div>
                <div style={{ marginTop: '8px' }}>Address : -</div>
                <div style={{ marginTop: '8px' }}>Vendor Code : -</div>
                <div style={{ marginTop: '8px' }}>e-way Bill-No : -</div>
              </div>
              <div style={{ padding: 0 }}>
                {[
                  ['DC No.', record.dcNumber],
                  ['DC Date', formatDate(record.dcDate)],
                  ['Ref Po No', record.referenceNumber || '-'],
                  ['Ref Po Date', formatDate(record.dcDate)],
                  ['Mode of Transport', 'By Road'],
                  ['Vehicle No', '-'],
                ].map(([label, value]) => (
                  <div key={label} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', borderBottom: '1px solid #4b5563' }}>
                    <div style={{ padding: '10px 12px', fontWeight: 700, borderRight: '1px solid #4b5563' }}>{label}</div>
                    <div style={{ padding: '10px 12px', fontWeight: 700, color: label === 'DC No.' || label === 'DC Date' ? '#dc2626' : '#111827' }}>{value}</div>
                  </div>
                ))}
              </div>
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#bde7f3' }}>
                  {['S.No', 'Particulars', 'HSN', 'SAC', 'Ref DC(Qty):Dt.', 'Qty', 'Remarks'].map((label) => (
                    <th key={label} style={{ border: '1px solid #4b5563', padding: '8px 6px', fontSize: '13px', fontWeight: 800 }}>{label}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td style={{ border: '1px solid #4b5563', padding: '8px 6px', textAlign: 'center' }}>1</td>
                  <td style={{ border: '1px solid #4b5563', padding: '8px 6px' }}>{record.referenceNumber || record.dcNumber}</td>
                  <td style={{ border: '1px solid #4b5563', padding: '8px 6px', textAlign: 'center' }}>-</td>
                  <td style={{ border: '1px solid #4b5563', padding: '8px 6px', textAlign: 'center' }}>-</td>
                  <td style={{ border: '1px solid #4b5563', padding: '8px 6px', textAlign: 'center' }}>{record.referenceNumber || '-'}</td>
                  <td style={{ border: '1px solid #4b5563', padding: '8px 6px', textAlign: 'right' }}>1.00 NOS</td>
                  <td style={{ border: '1px solid #4b5563', padding: '8px 6px' }}>BY ROAD</td>
                </tr>
                <tr>
                  <td colSpan="5" style={{ border: '1px solid #4b5563', padding: '8px 6px', textAlign: 'right', fontWeight: 800 }}>Total Qty</td>
                  <td style={{ border: '1px solid #4b5563', padding: '8px 6px', textAlign: 'right', fontWeight: 800 }}>1.00</td>
                  <td style={{ border: '1px solid #4b5563' }} />
                </tr>
              </tbody>
            </table>
            <div style={{ borderBottom: '1px solid #4b5563', minHeight: '120px', padding: '10px 12px' }}>
              <div style={{ fontWeight: 800 }}>Terms and Conditions:</div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', minHeight: '150px' }}>
              <div style={{ borderRight: '1px solid #4b5563', padding: '10px 12px', fontSize: '13px', lineHeight: 1.7 }}>
                <div><strong>OUR GSTIN :</strong> {COMPANY_PROFILE.gstin}</div>
                <div><strong>OUR PAN :</strong> {COMPANY_PROFILE.pan}</div>
                <div><strong>Party&apos;s GSTIN :</strong> -</div>
                <div><strong>Party&apos;s PAN :</strong> -</div>
              </div>
              <div style={{ borderRight: '1px solid #4b5563', padding: '10px 12px', textAlign: 'center', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                <div style={{ fontWeight: 800 }}>Received Items in Good Condition</div>
                <div>
                  <div style={{ fontWeight: 700 }}>Receiver&apos;s Signature</div>
                  <div style={{ marginTop: '10px', fontSize: '12px' }}>This is Computer Generated DC</div>
                </div>
              </div>
              <div style={{ padding: '10px 12px', textAlign: 'center', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                <div style={{ fontWeight: 800 }}>For {COMPANY_PROFILE.name}</div>
                <div style={{ fontWeight: 700 }}>Authorised Signatory</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
