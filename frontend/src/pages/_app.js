import "@/styles/globals.css";
import Link from "next/link";

export default function App({ Component, pageProps }) {
  return (
    <>
      <nav style={{ padding: '12px 24px', borderBottom: '1px solid #eee', marginBottom: 24 }}>
        <Link href="/forum" style={{ marginRight: 16 }}>Forum</Link>
        <Link href="/login" style={{ marginRight: 16 }}>Login</Link>
        <Link href="/register">Register</Link>
      </nav>
      <Component {...pageProps} />
    </>
  );
}
