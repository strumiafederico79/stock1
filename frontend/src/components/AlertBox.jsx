export default function AlertBox({ type = 'error', children }) {
  return <div className={`alert ${type}`}>{children}</div>
}
