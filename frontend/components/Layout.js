import Head from 'next/head';
import Link from 'next/link';

const Layout = ({ children, title = 'DealRadar - Las mejores ofertas de MercadoLibre' }) => {
  return (
    <>
      <Head>
        <title>{title}</title>
        <meta name="description" content="Descubre los mejores descuentos en tecnología, hogar, herramientas y más en MercadoLibre. Ofertas actualizadas cada hora." />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="theme-color" content="#ff6b35" />
        <link rel="icon" href="/favicon.ico" />
        <meta property="og:title" content={title} />
        <meta property="og:description" content="Las mejores ofertas de MercadoLibre" />
        <meta property="og:type" content="website" />
      </Head>

      <header className="header">
        <div className="header-content">
          <Link href="/" className="logo">
            <span className="logo-icon">📡</span>
            <span>DealRadar</span>
          </Link>
          <nav className="nav-links">
            <Link href="/" className="nav-link">Inicio</Link>
            <Link href="/ofertas" className="nav-link">Ofertas</Link>
            <Link href="/ofertas/tecnologia" className="nav-link">Tecnología</Link>
            <Link href="/ofertas/hogar" className="nav-link">Hogar</Link>
            <Link href="/ofertas/herramientas" className="nav-link">Herramientas</Link>
          </nav>
        </div>
      </header>

      <main>{children}</main>

      <footer className="footer">
        <div className="footer-content">
          <div className="footer-logo">📡 DealRadar</div>
          <div className="footer-links">
            <Link href="/" className="footer-link">Inicio</Link>
            <Link href="/ofertas" className="footer-link">Todas las ofertas</Link>
            <Link href="/ofertas/tecnologia" className="footer-link">Tecnología</Link>
            <Link href="/ofertas/hogar" className="footer-link">Hogar</Link>
            <Link href="/ofertas/herramientas" className="footer-link">Herramientas</Link>
          </div>
          <p className="footer-copyright">
            © {new Date().getFullYear()} DealRadar. Las mejores ofertas de MercadoLibre.
          </p>
        </div>
      </footer>
    </>
  );
};

export default Layout;

