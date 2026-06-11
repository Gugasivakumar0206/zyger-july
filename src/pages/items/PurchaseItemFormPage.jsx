import { useParams } from 'react-router-dom'
import ItemMasterForm from '../../components/forms/ItemMasterForm'

export default function PurchaseItemFormPage() {
  const { id } = useParams()
  return (
    <ItemMasterForm
      title={id ? 'Edit Purchasable Item' : 'New Purchasable Item'}
      subtitle="Inventory -> Items -> Purchasable Item"
      showSections="all"
      initialData={id ? { id, itemType: 'Purchasable Item', groupType: 'Purchasable Item' } : { itemType: 'Purchasable Item', groupType: 'Purchasable Item' }}
    />
  )
}
