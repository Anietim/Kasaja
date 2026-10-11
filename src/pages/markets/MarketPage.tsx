import { useParams, Navigate } from 'react-router-dom'
export default function MarketPage() {
  const { id } = useParams()
  return <Navigate to={`/markets/${id ?? ''}`} replace />
}
