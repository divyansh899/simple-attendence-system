import '../styles/globals.css';
import Layout from '../components/Layout';
import { useEffect } from 'react';

function MyApp({ Component, pageProps }) {
  useEffect(() => {
    // Polyfill for older browsers that might not support certain features
    // needed by face-api.js
    if (typeof window !== 'undefined') {
      // Polyfill for TextEncoder for IE
      if (typeof window.TextEncoder === 'undefined') {
        console.log('Polyfilling TextEncoder');
        import('text-encoding').then(() => {
          console.log('TextEncoder polyfill loaded');
        });
      }
    }
  }, []);
  
  return (
    <Layout>
      <Component {...pageProps} />
    </Layout>
  );
}

export default MyApp; 