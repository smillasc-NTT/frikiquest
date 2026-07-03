import { useContext } from 'react'
import { AppContext } from '../context/AppContext'

export default function Toast() {
  const { toasts } = useContext(AppContext)
  return (
    <div className="toasts-container">
      {toasts.map(toast => (
        <div key={toast.id} className={'toast toast-' + toast.type}>
          {toast.message}
        </div>
      ))}
    </div>
  )
}
