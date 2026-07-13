import { useEffect, useState } from 'react'
import Admin from './admin/ADMIN.jsx'
import Staff from './cashier/staff.jsx'
import LandingPage from './landing.jsx/landingpage.jsx'
import Menu from './landing.jsx/menu.jsx'

const appPageStorageKey = 'andrei-bites-current-page'
const appPages = new Set(['landing', 'admin', 'staff', 'menu'])

function App() {
  const [currentPage, setCurrentPage] = useState(() => {
    const savedPage = window.localStorage.getItem(appPageStorageKey)
    if (savedPage === 'menu') return 'landing'
    return appPages.has(savedPage) ? savedPage : 'landing'
  })

  useEffect(() => {
    window.localStorage.setItem(appPageStorageKey, currentPage === 'menu' ? 'landing' : currentPage)
  }, [currentPage])

  const goToLanding = () => {
    setCurrentPage('landing')
  }

  return currentPage === 'admin' ? (
    <Admin onSignOut={goToLanding} />
  ) : currentPage === 'staff' ? (
    <Staff onSignOut={goToLanding} />
  ) : currentPage === 'menu' ? (
    <Menu />
  ) : (
    <LandingPage
      onAdminLogin={() => setCurrentPage('admin')}
      onStaffLogin={() => setCurrentPage('staff')}
      onViewMenu={() => setCurrentPage('menu')}
    />
  )
}

export default App
