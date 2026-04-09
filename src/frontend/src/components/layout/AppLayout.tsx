import { Outlet } from 'react-router';
import Navbar from './Navbar';
import Sidebar from './Sidebar';
import ErrorBoundary from '@/components/common/ErrorBoundary';

export default function AppLayout() {
  return (
    <div className="flex h-screen flex-col overflow-hidden">
      <Navbar />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <main className="flex-1 overflow-y-auto p-6">
          <ErrorBoundary>
            <Outlet />
          </ErrorBoundary>
        </main>
      </div>
    </div>
  );
}
