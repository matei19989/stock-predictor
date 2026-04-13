import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router';
import { Toaster } from 'sonner';
import { AuthProvider } from '@/contexts/AuthContext';
import { SidebarProvider } from '@/contexts/SidebarContext';
import App from './App';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {/* BrowserRouter wraps AuthProvider so useNavigate() works inside the context */}
    <BrowserRouter>
      <AuthProvider>
        <SidebarProvider>
          <App />
          <Toaster position="bottom-right" richColors closeButton />
        </SidebarProvider>
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>
);
