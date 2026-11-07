import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'

export default function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <div className="app-shell">
      <div className="app-bg" aria-hidden="true">
        <span className="blob b1" />
        <span className="blob b2" />
        <span className="blob b3" />
        <span className="grid" />
        <span className="grain" />
      </div>

      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="app-main">
        <header className="topbar">
          <button className="btn-icon" onClick={() => setSidebarOpen(true)} aria-label="Abrir menú">
            <i className="ti ti-menu-2" style={{ fontSize: '22px' }} aria-hidden="true" />
          </button>
          <div className="brand" style={{ padding: 0 }}>
            <span className="brand-mark" style={{ width: '28px', height: '28px', fontSize: '16px' }}>
              <i className="ti ti-bolt" aria-hidden="true" />
            </span>
            <span className="brand-name" style={{ fontSize: '16px' }}>Fit<span>Track</span></span>
          </div>
        </header>

        <main className="app-content">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
