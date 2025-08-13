import React, { useState } from 'react';
import { Menu, LogOut, ChevronLeft, ChevronRight, AlertCircle } from 'lucide-react';
import Login from './components/Login';
import PasswordReset from './components/PasswordReset';
import Articles from './components/Articles';

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [showPasswordReset, setShowPasswordReset] = useState(false);
  const [providerData, setProviderData] = useState<{ proveedor: number; nombre: string } | null>(null);
  const [activeTab, setActiveTab] = useState('articles');
  const [menuOpen, setMenuOpen] = useState(false);
  const [sidebarVisible, setSidebarVisible] = useState(true);

  // Check URL for password reset
  React.useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('token');
    const email = urlParams.get('email');
    
    if (token && email) {
      setShowPasswordReset(true);
    }
  }, []);

  const handleLogin = (data: { proveedor: number; nombre: string }) => {
    setProviderData(data);
    setIsLoggedIn(true);
    setActiveTab('articles');
    setShowPasswordReset(false);
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    setProviderData(null);
  };

  const handleBackToLogin = () => {
    setShowPasswordReset(false);
    // Clear URL parameters
    window.history.replaceState({}, document.title, window.location.pathname);
  };

  const toggleMenu = () => {
    setMenuOpen(!menuOpen);
  };

  const toggleSidebar = () => {
    setSidebarVisible(!sidebarVisible);
  };

  return (
    <div className="app-container">
      {showPasswordReset ? (
        <PasswordReset onBack={handleBackToLogin} />
      ) : !isLoggedIn ? (
        <Login onLogin={handleLogin} onShowPasswordReset={() => setShowPasswordReset(true)} />
      ) : (
        <div className="app-layout">
          {/* Header */}
          <header className="header">
            <div className="header-container">
              <div className="flex items-center space-x-4">
                <button 
                  onClick={toggleMenu} 
                  className="menu-button md:hidden"
                >
                  <Menu size={24} />
                </button>
                <div className="logo-container">
                  <img 
                    src="https://img.sygemat.com.ar/Imagenes/logo_negativo.png" 
                    alt="Sygemat Logo" 
                    className="logo-image" 
                  />
                </div>
                <h1 className="header-title">Portal de Proveedores</h1>
              </div>
              <div className="flex items-center space-x-4">
                <span className="header-user hidden md:block">{providerData?.nombre}</span>
                <button 
                  onClick={handleLogout}
                  className="header-button"
                >
                  <LogOut size={16} />
                  <span className="hidden md:inline">Cerrar sesión</span>
                </button>
              </div>
            </div>
          </header>

          {/* Mobile Menu Overlay */}
          <div className={`mobile-menu-overlay ${menuOpen ? 'active' : ''}`} onClick={toggleMenu}></div>

          {/* Sidebar and Content */}
          <div className="content-wrapper">
            {/* Sidebar - Desktop always visible, mobile slide from left */}
            <aside className={`sidebar ${!sidebarVisible ? 'sidebar-hidden' : ''} ${menuOpen ? 'mobile-sidebar-visible' : ''}`}>
              <div className="mobile-sidebar-header md:hidden">
                <button onClick={toggleMenu} className="mobile-close-button">
                  <Menu size={24} />
                </button>
                <span className="mobile-user-name">{providerData?.nombre}</span>
              </div>
              <nav className="sidebar-nav">
                <ul className="sidebar-nav-list">
                  <li>
                    <button
                      onClick={() => {
                        setActiveTab('articles');
                        setMenuOpen(false);
                      }}
                      className={`sidebar-nav-button ${activeTab === 'articles' ? 'active' : ''}`}
                    >
                      Artículos
                    </button>
                  </li>
                  <li>
                    <button
                      onClick={() => {
                        setActiveTab('sales');
                        setMenuOpen(false);
                      }}
                      className={`sidebar-nav-button ${activeTab === 'sales' ? 'active' : ''}`}
                      disabled
                    >
                      Evolución de la venta
                      <span className="coming-soon-badge">
                        <AlertCircle size={14} />
                        Próximamente
                      </span>
                    </button>
                  </li>
                </ul>
              </nav>
            </aside>

            {/* Main Content */}
            <main className="main-content">
              {activeTab === 'articles' && providerData && (
                <Articles 
                  providerId={providerData.proveedor} 
                  isAdmin={providerData.proveedor === 9999999}
                />
              )}
              {activeTab === 'sales' && (
                <div className="coming-soon-container">
                  <h2 className="coming-soon-title">Evolución de la venta</h2>
                  <p className="coming-soon-text">Esta funcionalidad estará disponible próximamente.</p>
                </div>
              )}
            </main>

            {/* Sidebar Toggle Button (only visible on desktop) */}
            <button 
              className="sidebar-toggle hidden md:flex"
              onClick={toggleSidebar}
              aria-label={sidebarVisible ? "Ocultar menú" : "Mostrar menú"}
            >
              {sidebarVisible ? <ChevronLeft size={20} /> : <ChevronRight size={20} />}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;