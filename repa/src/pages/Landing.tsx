import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';

function App() {
  const navigate = useNavigate();
  const [mobileMenuActive, setMobileMenuActive] = useState(false);
  const [headerShadow, setHeaderShadow] = useState('0 2px 8px rgba(0, 0, 0, 0.05)');
  const mobileMenuRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLElement>(null);

  // Mobil menü váltása
  const toggleMobileMenu = useCallback(() => {
    setMobileMenuActive(prev => !prev);
  }, []);

  // Menü bezárása
  const closeMobileMenu = useCallback(() => {
    setMobileMenuActive(false);
  }, []);

  // Kattintás a mobil menün kívülre
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (mobileMenuActive && 
          mobileMenuRef.current && 
          !mobileMenuRef.current.contains(event.target as Node) &&
          headerRef.current && 
          !headerRef.current.contains(event.target as Node)) {
        closeMobileMenu();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [mobileMenuActive, closeMobileMenu]);

  // Görgetés hatása a fejlécre
  useEffect(() => {
    const handleScroll = () => {
      setHeaderShadow(window.scrollY > 50 ? '0 4px 12px rgba(0, 0, 0, 0.1)' : '0 2px 8px rgba(0, 0, 0, 0.05)');
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Gördülési animációk
  useEffect(() => {
    const observerOptions = {
      threshold: 0.1,
      rootMargin: '0px 0px -50px 0px'
    };

    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const element = entry.target as HTMLElement;
          element.style.opacity = '1';
          element.style.transform = 'translateY(0)';
          observer.unobserve(element);
        }
      });
    }, observerOptions);

    const animateElements = document.querySelectorAll('.feature-card, .benefit-list li, .auth-container');
    animateElements.forEach(el => {
      const element = el as HTMLElement;
      element.style.opacity = '0';
      element.style.transform = 'translateY(20px)';
      element.style.transition = 'opacity 0.6s cubic-bezier(0.4, 0, 0.2, 1), transform 0.6s cubic-bezier(0.4, 0, 0.2, 1)';
      observer.observe(element);
    });

    return () => observer.disconnect();
  }, []);

  // Sima görgetés a belső hivatkozásokhoz
  const handleScrollToSection = useCallback((e: React.MouseEvent<HTMLAnchorElement>, sectionId: string) => {
    e.preventDefault();
    closeMobileMenu();
    
    const element = document.getElementById(sectionId);
    if (element) {
      const headerOffset = 80;
      const elementPosition = element.getBoundingClientRect().top;
      const offsetPosition = elementPosition + window.pageYOffset - headerOffset;

      window.scrollTo({
        top: offsetPosition,
        behavior: 'smooth'
      });
    }
  }, [closeMobileMenu]);

  // Navigáció kezelése
  const handleNavigation = useCallback((e: React.MouseEvent<HTMLAnchorElement>, path: string) => {
    e.preventDefault();
    closeMobileMenu();
    navigate(path);
  }, [closeMobileMenu, navigate]);

  // Bejelentkezési űrlap kezelése
  const handleLoginSubmit = useCallback((e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    navigate('/dashboard');
  }, [navigate]);

  // Regisztráció kezelése
  const handleRegisterClick = useCallback((e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    closeMobileMenu();
    navigate('/register');
  }, [closeMobileMenu, navigate]);

  // Főoldalra ugrás
  const handleHomeClick = useCallback((e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    window.scrollTo({ top: 0, behavior: 'smooth' });
    closeMobileMenu();
  }, [closeMobileMenu]);

  return (
    <>
      <style>{`
        :root {
          --primary-green: #2E7D32;
          --secondary-green: #4CAF50;
          --dark-green: #1B5E20;
          --light-green: #E8F5E9;
          --accent-brown: #8D6E63;
          --light-beige: #F5F1EE;
          --background: #FFFFFF;
          --text-dark: #333333;
          --text-medium: #666666;
          --text-light: #888888;
          --border: #E0E0E0;
          --shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
          --shadow-light: 0 2px 8px rgba(0, 0, 0, 0.05);
          --radius: 8px;
          --transition: all 0.3s ease;
        }

        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        }

        html {
          scroll-behavior: smooth;
        }

        body {
          background-color: var(--background);
          color: var(--text-dark);
          line-height: 1.6;
        }

        .container {
          width: 100%;
          max-width: 1200px;
          margin: 0 auto;
          padding: 0 20px;
        }

        section {
          padding: 80px 0;
        }

        /* HEADER */
        header {
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          background-color: rgba(255, 255, 255, 0.98);
          backdrop-filter: blur(10px);
          -webkit-backdrop-filter: blur(10px);
          z-index: 1000;
          transition: var(--transition);
        }

        .header-container {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 20px 0;
        }

        .logo {
          display: flex;
          align-items: center;
          gap: 10px;
          font-weight: 700;
          font-size: 1.5rem;
          color: var(--dark-green);
          text-decoration: none;
          transition: var(--transition);
        }

        .logo:hover {
          opacity: 0.8;
        }

        .logo-icon {
          color: var(--primary-green);
          font-size: 24px;
        }

        nav ul {
          display: flex;
          list-style: none;
          gap: 30px;
          align-items: center;
        }

        nav a {
          text-decoration: none;
          color: var(--text-dark);
          font-weight: 500;
          transition: var(--transition);
          font-size: 0.95rem;
          cursor: pointer;
        }

        nav a:hover {
          color: var(--primary-green);
        }

        .btn-secondary {
          background-color: transparent;
          color: var(--primary-green);
          padding: 10px 22px;
          border-radius: 30px;
          text-decoration: none;
          font-weight: 600;
          display: inline-block;
          transition: var(--transition);
          border: 2px solid var(--primary-green);
          font-size: 0.95rem;
          cursor: pointer;
        }

        .btn-secondary:hover {
          background-color: var(--light-green);
          transform: translateY(-2px);
        }

        .nav-button {
          background-color: var(--primary-green);
          color: white !important;
          padding: 10px 22px;
          border-radius: 30px;
          font-weight: 600;
          border: 2px solid var(--primary-green);
        }

        .nav-button:hover {
          background-color: var(--dark-green);
          border-color: var(--dark-green);
          transform: translateY(-2px);
          color: white !important;
        }

        .mobile-menu-btn {
          display: none;
          font-size: 1.5rem;
          background: none;
          border: none;
          color: var(--text-dark);
          cursor: pointer;
          padding: 8px;
        }

        /* HERO SECTION */
        .hero {
          padding-top: 140px;
          padding-bottom: 100px;
          background: linear-gradient(to bottom, #f9f9f9, #ffffff);
          position: relative;
          overflow: hidden;
        }

        .hero-container {
          display: flex;
          align-items: center;
          gap: 60px;
        }

        .hero-content {
          flex: 1;
        }

        .hero-image {
          flex: 1;
          display: flex;
          justify-content: center;
          align-items: center;
        }

        .hero h1 {
          font-size: 3.2rem;
          line-height: 1.2;
          margin-bottom: 20px;
          color: var(--dark-green);
        }

        .hero-subtitle {
          font-size: 1.2rem;
          color: var(--text-medium);
          margin-bottom: 40px;
          max-width: 600px;
        }

        .hero-buttons {
          display: flex;
          gap: 20px;
        }

        .btn-primary {
          background-color: var(--primary-green);
          color: white;
          padding: 16px 32px;
          border-radius: 30px;
          text-decoration: none;
          font-weight: 600;
          display: inline-block;
          transition: var(--transition);
          border: none;
          font-size: 1rem;
          cursor: pointer;
          border: 2px solid var(--primary-green);
        }

        .btn-primary:hover {
          background-color: var(--dark-green);
          border-color: var(--dark-green);
          transform: translateY(-3px);
          box-shadow: var(--shadow);
        }

        .dashboard-mockup {
          width: 100%;
          max-width: 550px;
          border-radius: var(--radius);
          box-shadow: var(--shadow);
          overflow: hidden;
          position: relative;
        }

        /* INTRODUCTION */
        .intro {
          background-color: var(--light-beige);
          text-align: center;
        }

        .intro h2 {
          font-size: 2.2rem;
          margin-bottom: 20px;
          color: var(--dark-green);
        }

        .intro p {
          font-size: 1.2rem;
          color: var(--text-medium);
          max-width: 800px;
          margin: 0 auto 40px;
        }

        /* FEATURES */
        .features {
          background-color: var(--background);
        }

        .section-title {
          text-align: center;
          margin-bottom: 60px;
        }

        .section-title h2 {
          font-size: 2.2rem;
          color: var(--dark-green);
          margin-bottom: 15px;
        }

        .section-title p {
          color: var(--text-medium);
          max-width: 700px;
          margin: 0 auto;
          font-size: 1.1rem;
        }

        .features-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
          gap: 30px;
        }

        .feature-card {
          background-color: white;
          border-radius: var(--radius);
          padding: 30px;
          box-shadow: var(--shadow-light);
          transition: var(--transition);
          text-align: center;
          border: 1px solid var(--border);
        }

        .feature-card:hover {
          transform: translateY(-10px);
          box-shadow: var(--shadow);
          border-color: var(--primary-green);
        }

        .feature-icon {
          width: 70px;
          height: 70px;
          border-radius: 50%;
          background-color: var(--light-green);
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 0 auto 20px;
          color: var(--primary-green);
          font-size: 28px;
        }

        .feature-card h3 {
          font-size: 1.4rem;
          margin-bottom: 15px;
          color: var(--text-dark);
        }

        .feature-card p {
          color: var(--text-medium);
        }

        /* BENEFITS */
        .benefits {
          background-color: var(--light-beige);
        }

        .benefits-container {
          display: flex;
          align-items: center;
          gap: 60px;
        }

        .benefits-content {
          flex: 1;
        }

        .benefits-image {
          flex: 1;
          display: flex;
          justify-content: center;
        }

        .benefits h2 {
          font-size: 2.2rem;
          margin-bottom: 30px;
          color: var(--dark-green);
        }

        .benefit-list {
          list-style: none;
        }

        .benefit-list li {
          margin-bottom: 20px;
          display: flex;
          align-items: flex-start;
          gap: 15px;
        }

        .benefit-list i {
          color: var(--secondary-green);
          font-size: 1.2rem;
          margin-top: 3px;
          flex-shrink: 0;
        }

        .benefit-list h4 {
          font-size: 1.2rem;
          margin-bottom: 5px;
          color: var(--text-dark);
        }

        .benefit-list p {
          color: var(--text-medium);
        }

        .illustration {
          width: 100%;
          max-width: 500px;
          height: 400px;
          background-color: var(--light-green);
          border-radius: var(--radius);
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--primary-green);
          font-size: 5rem;
          position: relative;
          overflow: hidden;
        }

        .illustration:after {
          content: "";
          position: absolute;
          width: 100%;
          height: 100%;
          background: linear-gradient(135deg, rgba(46, 125, 50, 0.1) 0%, rgba(76, 175, 80, 0.05) 100%);
        }

        /* LOGIN/REGISTER */
        .auth-section {
          background-color: var(--background);
          text-align: center;
        }

        .auth-container {
          max-width: 800px;
          margin: 0 auto;
          background-color: white;
          border-radius: var(--radius);
          box-shadow: var(--shadow);
          overflow: hidden;
          display: flex;
        }

        .auth-box {
          flex: 1;
          padding: 50px 40px;
        }

        .auth-divider {
          width: 1px;
          background-color: var(--border);
        }

        .auth-box h3 {
          font-size: 1.8rem;
          margin-bottom: 25px;
          color: var(--dark-green);
        }

        .auth-form {
          display: flex;
          flex-direction: column;
          gap: 20px;
          margin-bottom: 25px;
        }

        .form-group {
          text-align: left;
        }

        .form-group label {
          display: block;
          margin-bottom: 8px;
          font-weight: 500;
          color: var(--text-dark);
        }

        .form-group input {
          width: 100%;
          padding: 14px;
          border: 1px solid var(--border);
          border-radius: var(--radius);
          font-size: 1rem;
          transition: var(--transition);
        }

        .form-group input:focus {
          outline: none;
          border-color: var(--primary-green);
          box-shadow: 0 0 0 3px rgba(46, 125, 50, 0.1);
        }

        .auth-box p {
          color: var(--text-medium);
          margin-top: 20px;
        }

        .auth-link {
          color: var(--primary-green);
          font-weight: 600;
          text-decoration: none;
        }

        .auth-link:hover {
          text-decoration: underline;
        }

        /* FOOTER */
        footer {
          background-color: var(--dark-green);
          color: white;
          padding: 60px 0 30px;
        }

        .footer-container {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
          gap: 40px;
          margin-bottom: 40px;
        }

        .footer-logo {
          display: flex;
          align-items: center;
          gap: 10px;
          font-weight: 700;
          font-size: 1.5rem;
          margin-bottom: 20px;
        }

        .footer-logo i {
          color: white;
        }

        .footer-description {
          color: rgba(255, 255, 255, 0.8);
          line-height: 1.7;
          margin-bottom: 20px;
        }

        .footer-heading {
          font-size: 1.2rem;
          margin-bottom: 20px;
          font-weight: 600;
        }

        .footer-links {
          list-style: none;
        }

        .footer-links li {
          margin-bottom: 12px;
        }

        .footer-links a {
          color: rgba(255, 255, 255, 0.8);
          text-decoration: none;
          transition: var(--transition);
          cursor: pointer;
        }

        .footer-links a:hover {
          color: white;
          padding-left: 5px;
        }

        .footer-bottom {
          text-align: center;
          padding-top: 30px;
          border-top: 1px solid rgba(255, 255, 255, 0.1);
          color: rgba(255, 255, 255, 0.7);
          font-size: 0.9rem;
        }

        /* MOBILE MENU */
        .mobile-menu {
          position: fixed;
          top: 80px;
          left: 0;
          width: 100%;
          background-color: white;
          box-shadow: var(--shadow);
          padding: 20px;
          display: flex;
          flex-direction: column;
          gap: 15px;
          transform: translateY(-100%);
          opacity: 0;
          visibility: hidden;
          transition: transform 0.3s ease, opacity 0.3s ease, visibility 0.3s ease;
          z-index: 999;
        }

        .mobile-menu.active {
          transform: translateY(0);
          opacity: 1;
          visibility: visible;
        }

        .mobile-menu a {
          text-decoration: none;
          color: var(--text-dark);
          font-weight: 500;
          transition: var(--transition);
          padding: 12px 0;
          border-bottom: 1px solid var(--border);
          cursor: pointer;
        }

        .mobile-menu a:last-child {
          border-bottom: none;
        }

        .mobile-menu .btn-secondary,
        .mobile-menu .nav-button {
          text-align: center;
          margin-top: 5px;
        }

        /* RESPONSIVE */
        @media (max-width: 992px) {
          .hero-container,
          .benefits-container {
            flex-direction: column;
            text-align: center;
          }
          
          .hero h1 {
            font-size: 2.5rem;
          }
          
          .auth-container {
            flex-direction: column;
          }
          
          .auth-divider {
            width: 100%;
            height: 1px;
          }
        }

        @media (max-width: 768px) {
          section {
            padding: 60px 0;
          }
          
          .hero {
            padding-top: 120px;
          }
          
          nav ul {
            display: none;
          }
          
          .mobile-menu-btn {
            display: block;
          }
          
          .hero-buttons {
            flex-direction: column;
            align-items: center;
          }
          
          .btn-primary, .btn-secondary {
            width: 100%;
            max-width: 300px;
            text-align: center;
          }
          
          .hero h1 {
            font-size: 2.2rem;
          }
          
          .section-title h2,
          .intro h2,
          .benefits h2 {
            font-size: 1.8rem;
          }
        }

        @media (max-width: 480px) {
          .hero h1 {
            font-size: 1.8rem;
          }
          
          .hero-subtitle {
            font-size: 1rem;
          }
          
          .feature-card {
            padding: 20px;
          }
          
          .auth-box {
            padding: 30px 20px;
          }
        }
      `}</style>

      <div className="App">
        {/* FELSŐ NAVIGÁCIÓ */}
        <header ref={headerRef} style={{ boxShadow: headerShadow }}>
          <div className="container header-container">
            <a 
              href="/" 
              className="logo" 
              onClick={handleHomeClick}
              aria-label="BB Agrár - Főoldal"
            >
              <i className="fas fa-seedling logo-icon" aria-hidden="true"></i>
              <span>BB Agrár</span>
            </a>
            
            <button 
              className="mobile-menu-btn" 
              onClick={toggleMobileMenu}
              aria-expanded={mobileMenuActive}
              aria-label={mobileMenuActive ? "Menü bezárása" : "Menü megnyitása"}
            >
              <i className={mobileMenuActive ? "fas fa-times" : "fas fa-bars"} aria-hidden="true"></i>
            </button>
            
            <nav aria-label="Fő navigáció">
              <ul id="mainMenu">
                <li><a href="#features" onClick={(e) => handleScrollToSection(e, 'features')}>Funkciók</a></li>
                <li><a href="#benefits" onClick={(e) => handleScrollToSection(e, 'benefits')}>Miért BB Agrár?</a></li>
                <li><a href="#contact" onClick={(e) => handleScrollToSection(e, 'contact')}>Kapcsolat</a></li>
                <li>
                  <a 
                    href="/login" 
                    className="btn-secondary" 
                    onClick={(e) => handleNavigation(e, '/login')}
                  >
                    Bejelentkezés
                  </a>
                </li>
                <li>
                  <a 
                    href="/register" 
                    className="nav-button" 
                    onClick={(e) => handleNavigation(e, '/register')}
                  >
                    Regisztráció
                  </a>
                </li>
              </ul>
            </nav>
          </div>
          
          {/* MOBIL MENÜ */}
          <div 
            ref={mobileMenuRef}
            className={`mobile-menu ${mobileMenuActive ? 'active' : ''}`}
            aria-hidden={!mobileMenuActive}
          >
            <a href="#features" onClick={(e) => handleScrollToSection(e, 'features')}>Funkciók</a>
            <a href="#benefits" onClick={(e) => handleScrollToSection(e, 'benefits')}>Miért BB Agrár?</a>
            <a href="#contact" onClick={(e) => handleScrollToSection(e, 'contact')}>Kapcsolat</a>
            <a 
              href="/login" 
              className="btn-secondary" 
              onClick={(e) => handleNavigation(e, '/login')}
            >
              Bejelentkezés
            </a>
            <a 
              href="/register" 
              className="nav-button" 
              onClick={(e) => handleNavigation(e, '/register')}
            >
              Regisztráció
            </a>
          </div>
        </header>
        
        {/* HERO SZEKCIÓ */}
        <section className="hero" id="hero" aria-labelledby="hero-title">
          <div className="container hero-container">
            <div className="hero-content">
              <h1 id="hero-title">Digitális megoldás a modern gazdálkodáshoz</h1>
              <p className="hero-subtitle">A BB Agrár egy átlátható, könnyen használható webalkalmazás, amely segít nyomon követni az állatállományt, földterületeket, pénzügyeket és napi feladatokat – egy helyen.</p>
              <div className="hero-buttons">
                <a href="/register" className="btn-primary" onClick={handleRegisterClick}>Ingyenes regisztráció</a>
                <a href="/login" className="btn-secondary" onClick={(e) => handleNavigation(e, '/login')}>Bejelentkezés</a>
              </div>
            </div>
            <div className="hero-image" aria-label="Dashboard előnézet">
              <div className="dashboard-mockup" role="img" aria-label="BB Agrár dashboard előnézet">
                <div style={{ background: '#1B5E20', height: '40px', display: 'flex', alignItems: 'center', padding: '0 20px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <i className="fas fa-seedling" style={{ color: 'white' }} aria-hidden="true"></i>
                    <span style={{ color: 'white', fontWeight: '600' }}>BB Agrár Dashboard</span>
                  </div>
                </div>
                <div style={{ background: '#F9F9F9', height: '300px', padding: '20px', display: 'flex', flexDirection: 'column', gap: '15px' }}>
                  <div style={{ display: 'flex', gap: '15px' }}>
                    <div style={{ flex: 1, background: 'white', borderRadius: '8px', padding: '15px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                        <div style={{ background: '#8D6E63', color: 'white', width: '40px', height: '40px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <i className="fas fa-cow" aria-hidden="true"></i>
                        </div>
                        <div>
                          <div style={{ fontSize: '0.9rem', color: '#666' }}>Állatok száma</div>
                          <div style={{ fontSize: '1.8rem', fontWeight: '700' }}>1,247</div>
                        </div>
                      </div>
                    </div>
                    <div style={{ flex: 1, background: 'white', borderRadius: '8px', padding: '15px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                        <div style={{ background: '#4CAF50', color: 'white', width: '40px', height: '40px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <i className="fas fa-tractor" aria-hidden="true"></i>
                        </div>
                        <div>
                          <div style={{ fontSize: '0.9rem', color: '#666' }}>Földterületek</div>
                          <div style={{ fontSize: '1.8rem', fontWeight: '700' }}>156 ha</div>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div style={{ flex: 1, background: 'white', borderRadius: '8px', padding: '15px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <div style={{ textAlign: 'center', color: '#666' }}>
                      <i className="fas fa-chart-bar" style={{ fontSize: '2rem', marginBottom: '10px', color: '#4CAF50' }} aria-hidden="true"></i>
                      <div>Bevétel-kiadás statisztikák</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
        
        {/* BEVEZETŐ SZEKCIÓ */}
        <section className="intro" aria-labelledby="intro-title">
          <div className="container">
            <h2 id="intro-title">Mi a BB Agrár?</h2>
            <p>A BB Agrár célja, hogy a mezőgazdasági vállalkozók egyszerűen, digitálisan és pontos adatokkal tudják irányítani gazdaságukat, papírozás és káosz nélkül.</p>
          </div>
        </section>
        
        {/* FUNKCIÓK SZEKCIÓ */}
        <section className="features" id="features" aria-labelledby="features-title">
          <div className="container">
            <div className="section-title">
              <h2 id="features-title">Minden, amire szüksége van</h2>
              <p>A BB Agrár minden eszközt biztosít a gazdálkodás hatékony kezeléséhez</p>
            </div>
            
            <div className="features-grid">
              {[
                { icon: 'fa-cow', title: 'Állatnyilvántartás', desc: 'Teljes állomány-nyilvántartás, egészségügyi információk, szaporodási ciklusok és teljesítményadatok.' },
                { icon: 'fa-tractor', title: 'Földterületek kezelése', desc: 'Parcellák digitalizálása, művelési napló, növényvédő szerek nyilvántartása, terméskövetés.' },
                { icon: 'fa-tasks', title: 'Feladatkezelő', desc: 'Napi teendők, időzített feladatok, munkafolyamatok és csapatmenedzsment eszközök.' },
                { icon: 'fa-chart-line', title: 'Pénzügyi nyilvántartás', desc: 'Bevételek, kiadások, költségvetés-tervezés, adózási előkészítés és nyereségesség elemzés.' },
                { icon: 'fa-chart-pie', title: 'Statisztikák és kimutatások', desc: 'Teljesítményjelzők, trendanalízisek, exportálható jelentések és egyéni dashboardok.' },
                { icon: 'fa-folder', title: 'Dokumentumkezelés', desc: 'Szerződések, számlák, engedélyek és egyéb dokumentumok biztonságos tárolása és kezelése.' }
              ].map((feature, index) => (
                <div key={index} className="feature-card">
                  <div className="feature-icon" aria-hidden="true">
                    <i className={`fas ${feature.icon}`}></i>
                  </div>
                  <h3>{feature.title}</h3>
                  <p>{feature.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
        
        {/* ELŐNYÖK SZEKCIÓ */}
        <section className="benefits" id="benefits" aria-labelledby="benefits-title">
          <div className="container benefits-container">
            <div className="benefits-content">
              <h2 id="benefits-title">Miért válassza a BB Agrár-t?</h2>
              <ul className="benefit-list">
                {[
                  { title: 'Átlátható rendszer', desc: 'Minden információ egy helyen, világos felületen, valós időben.' },
                  { title: 'Gazdák igényeire szabva', desc: 'Mezőgazdasági szakemberekkel együttműködve kifejlesztett megoldások.' },
                  { title: 'Időt és pénzt spórol', desc: 'Automatizált folyamatok csökkentik az adminisztrációs terheket.' },
                  { title: 'Egy helyen minden adat', desc: 'Állatok, földek, pénzügyek, dokumentumok – minden összekapcsolva.' },
                  { title: 'Kezdőknek is könnyen használható', desc: 'Intuitív felület, részletes útmutatók és magyar támogatás.' }
                ].map((benefit, index) => (
                  <li key={index}>
                    <i className="fas fa-check-circle" aria-hidden="true"></i>
                    <div>
                      <h4>{benefit.title}</h4>
                      <p>{benefit.desc}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
            <div className="benefits-image" aria-hidden="true">
              <div className="illustration">
                <i className="fas fa-leaf"></i>
              </div>
            </div>
          </div>
        </section>
        
        {/* BEJELENTKEZÉS/REGISZTRÁCIÓ SZEKCIÓ */}
        <section className="auth-section" id="auth" aria-labelledby="auth-title">
          <div className="container">
            <div className="section-title">
              <h2 id="auth-title">Kezdje el használni még ma</h2>
              <p>Csatlakozzon több mint 500 mezőgazdasági vállalkozóhoz, akik már használják a BB Agrár-t</p>
            </div>
            
            <div className="auth-container">
              <div className="auth-box">
                <h3>Bejelentkezés</h3>
                <form className="auth-form" onSubmit={handleLoginSubmit} noValidate>
                  <div className="form-group">
                    <label htmlFor="email">E-mail cím</label>
                    <input 
                      type="email" 
                      id="email" 
                      name="email"
                      placeholder="pelda@gazdasag.hu" 
                      required 
                      aria-required="true"
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="password">Jelszó</label>
                    <input 
                      type="password" 
                      id="password" 
                      name="password"
                      placeholder="••••••••" 
                      required 
                      aria-required="true"
                      minLength={6}
                    />
                  </div>
                  <button type="submit" className="btn-primary">Bejelentkezés</button>
                </form>
                <p>
                  Elfelejtetted a jelszavad?{' '}
                  <a href="/forgot-password" className="auth-link" onClick={(e) => handleNavigation(e, '/forgot-password')}>
                    Jelszó visszaállítás
                  </a>
                </p>
              </div>
              
              <div className="auth-divider" role="separator" aria-label="vagy"></div>
              
              <div className="auth-box">
                <h3>Regisztráció</h3>
                <p style={{ marginBottom: '30px' }}>Hozzon létre egy ingyenes fiókot, és próbálja ki a BB Agrár-t 14 napig díjmentesen.</p>
                <a 
                  href="/register" 
                  className="btn-primary" 
                  style={{ display: 'block', textAlign: 'center' }}
                  onClick={handleRegisterClick}
                >
                  Regisztráció
                </a>
                <p>
                  Már van fiókja?{' '}
                  <a href="/login" className="auth-link" onClick={(e) => handleNavigation(e, '/login')}>
                    Jelentkezzen be
                  </a>
                </p>
              </div>
            </div>
          </div>
        </section>
        
        {/* LÁBLÉC */}
        <footer id="contact" aria-labelledby="footer-title">
          <div className="container">
            <div className="footer-container">
              <div className="footer-about">
                <div className="footer-logo" aria-label="BB Agrár">
                  <i className="fas fa-seedling" aria-hidden="true"></i>
                  <span>BB Agrár</span>
                </div>
                <p className="footer-description">A BB Agrár egy modern webalapú megoldás mezőgazdasági vállalkozások számára, amely egyszerűsíti és digitalizálja az adminisztrációt, nyilvántartást és gazdálkodást.</p>
              </div>
              
              <div className="footer-links">
                <h4 className="footer-heading" id="footer-title">Gyors linkek</h4>
                <ul className="footer-links" aria-labelledby="footer-title">
                  <li><a href="#features" onClick={(e) => handleScrollToSection(e, 'features')}>Funkciók</a></li>
                  <li><a href="#benefits" onClick={(e) => handleScrollToSection(e, 'benefits')}>Miért BB Agrár?</a></li>
                  <li><a href="/login" onClick={(e) => handleNavigation(e, '/login')}>Bejelentkezés</a></li>
                  <li><a href="/register" onClick={(e) => handleNavigation(e, '/register')}>Regisztráció</a></li>
                </ul>
              </div>
              
              <div className="footer-contact">
                <h4 className="footer-heading">Kapcsolat</h4>
                <ul className="footer-links">
                  <li><i className="fas fa-envelope" aria-hidden="true"></i> info@bbagrar.hu</li>
                  <li><i className="fas fa-phone" aria-hidden="true"></i> +36 1 234 5678</li>
                  <li><i className="fas fa-map-marker-alt" aria-hidden="true"></i> 1234 Budapest, Agrár u. 1.</li>
                </ul>
              </div>
              
              <div className="footer-legal">
                <h4 className="footer-heading">Jogi információk</h4>
                <ul className="footer-links">
                  <li><a href="/aszf" onClick={(e) => handleNavigation(e, '/aszf')}>Általános Szerződési Feltételek</a></li>
                  <li><a href="/adatvedelem" onClick={(e) => handleNavigation(e, '/adatvedelem')}>Adatvédelmi nyilatkozat</a></li>
                  <li><a href="/cookies" onClick={(e) => handleNavigation(e, '/cookies')}>Cookie szabályzat</a></li>
                  <li><a href="/gdpr" onClick={(e) => handleNavigation(e, '/gdpr')}>GDPR tájékoztató</a></li>
                </ul>
              </div>
            </div>
            
            <div className="footer-bottom">
              <p>&copy; {new Date().getFullYear()} BB Agrár - Minden jog fenntartva.</p>
            </div>
          </div>
        </footer>
      </div>
    </>
  );
}

export default App;