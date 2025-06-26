import "@/styles/globals.css";
import Link from "next/link";

export default function App({ Component, pageProps }) {
  return (
    <>
      <nav style={{ 
        background: 'linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%)',
        padding: '16px 24px',
        boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
        borderBottom: '1px solid #333',
        position: 'sticky',
        top: 0,
        zIndex: 1000,
        backdropFilter: 'blur(10px)'
      }}>
        <div style={{
          maxWidth: '1200px',
          margin: '0 auto',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '32px'
          }}>
            <Link href="/forum" style={{ 
              textDecoration: 'none',
              color: '#fff',
              fontSize: '1.2rem',
              fontWeight: '700',
              letterSpacing: '-0.5px',
              transition: 'all 0.3s ease'
            }}
            onMouseOver={(e) => {
              e.target.style.color = '#e0e0e0';
              e.target.style.transform = 'translateY(-1px)';
            }}
            onMouseOut={(e) => {
              e.target.style.color = '#fff';
              e.target.style.transform = 'translateY(0)';
            }}
            >
              🏠 Forum
            </Link>
            <Link href="/login" style={{ 
              textDecoration: 'none',
              color: '#ccc',
              fontSize: '1rem',
              fontWeight: '500',
              padding: '8px 16px',
              borderRadius: '20px',
              transition: 'all 0.3s ease',
              border: '1px solid transparent'
            }}
            onMouseOver={(e) => {
              e.target.style.color = '#fff';
              e.target.style.backgroundColor = 'rgba(255,255,255,0.1)';
              e.target.style.borderColor = 'rgba(255,255,255,0.2)';
              e.target.style.transform = 'translateY(-1px)';
            }}
            onMouseOut={(e) => {
              e.target.style.color = '#ccc';
              e.target.style.backgroundColor = 'transparent';
              e.target.style.borderColor = 'transparent';
              e.target.style.transform = 'translateY(0)';
            }}
            >
              🔐 Login
            </Link>
            <Link href="/register" style={{ 
              textDecoration: 'none',
              color: '#ccc',
              fontSize: '1rem',
              fontWeight: '500',
              padding: '8px 16px',
              borderRadius: '20px',
              transition: 'all 0.3s ease',
              border: '1px solid transparent'
            }}
            onMouseOver={(e) => {
              e.target.style.color = '#fff';
              e.target.style.backgroundColor = 'rgba(255,255,255,0.1)';
              e.target.style.borderColor = 'rgba(255,255,255,0.2)';
              e.target.style.transform = 'translateY(-1px)';
            }}
            onMouseOut={(e) => {
              e.target.style.color = '#ccc';
              e.target.style.backgroundColor = 'transparent';
              e.target.style.borderColor = 'transparent';
              e.target.style.transform = 'translateY(0)';
            }}
            >
              ✨ Register
            </Link>
          </div>
          
          <div style={{
            fontSize: '0.9rem',
            color: '#888',
            fontStyle: 'italic'
          }}>
            Q&A Dashboard
          </div>
        </div>
      </nav>
      <Component {...pageProps} />
    </>
  );
}
