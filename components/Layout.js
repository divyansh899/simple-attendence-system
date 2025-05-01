import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import FaceRecognitionPreloader from './FaceRecognitionPreloader';

export default function Layout({ children, title = 'Attendance System' }) {
  const router = useRouter();
  
  const navItems = [
    { path: '/', label: 'Home' },
    { path: '/register', label: 'Register Student' },
    { path: '/take-attendance', label: 'Take Attendance' },
  ];
  
  const isActive = (path) => router.pathname === path;
  
  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <FaceRecognitionPreloader />
      
      <Head>
        <title>{title}</title>
        <meta name="description" content="Student attendance system with facial recognition" />
      </Head>
      
      <header className="bg-white shadow-sm">
        <div className="container mx-auto px-4">
          <nav className="flex items-center justify-between py-4">
            <Link href="/" className="text-xl font-bold text-blue-600">
              Attendance System
            </Link>
            
            <ul className="flex space-x-8">
              {navItems.map((item) => (
                <li key={item.path}>
                  <Link
                    href={item.path}
                    className={`${
                      isActive(item.path)
                        ? 'text-blue-600 font-medium'
                        : 'text-gray-600 hover:text-blue-600'
                    } transition-colors`}
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>
      </header>
      
      <main className="flex-grow">
        {children}
      </main>
      
      <footer className="bg-white border-t border-gray-200 py-6">
        <div className="container mx-auto px-4 text-center text-gray-500">
          <p>© {new Date().getFullYear()} Student Attendance System with Face Recognition</p>
        </div>
      </footer>
    </div>
  );
} 