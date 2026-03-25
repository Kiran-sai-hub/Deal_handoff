import { Link, useLocation } from 'react-router-dom'

const links = [
  { to: '/',       label: 'Dashboard' },
  { to: '/live',   label: 'Live Feed' },
  { to: '/config', label: 'Configuration' },
]

export function NavBar() {
  const { pathname } = useLocation()

  return (
    <nav className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between">
      <div className="flex items-center gap-2">
        <span className="text-xl">🤝</span>
        <span className="font-bold text-gray-800 text-lg">Deal Handoff Agent</span>
      </div>
      <div className="flex items-center gap-1">
        {links.map(({ to, label }) => (
          <Link
            key={to}
            to={to}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              pathname === to
                ? 'bg-blue-50 text-blue-700'
                : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
            }`}
          >
            {label}
          </Link>
        ))}
      </div>
    </nav>
  )
}
