import React from 'react';
import { Zap, LogOut } from 'lucide-react';
import { Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export const Layout: React.FC = () => {
  const { signOut } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    try {
      await signOut();
      navigate('/login');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  return (
    <div className="min-h-screen bg-elfag-bg">
      <header className="bg-elfag-dark text-white px-6 py-4 shadow-lg">
        <div className="container mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            {/* Logo */}
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="w-10 h-10 bg-elfag-light rounded-lg flex items-center justify-center">
                  <Zap className="w-6 h-6 text-white" />
                </div>
                <div className="absolute -top-1 -right-1 w-4 h-4 bg-elfag-accent rounded-full flex items-center justify-center">
                  <div className="w-2 h-2 bg-white rounded-full"></div>
                </div>
              </div>
              <div>
                <h1 className="text-xl font-bold">Elfag</h1>
                <p className="text-xs text-elfag-light font-medium">Ressursdeling</p>
              </div>
            </div>
          </div>
          
          <button
            onClick={handleSignOut}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white hover:bg-elfag-light hover:bg-opacity-20 rounded-md transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Logg ut
          </button>
        </div>
      </header>
      
      <main className="container mx-auto px-6 py-8">
        <Outlet />
      </main>
      
      <footer className="bg-elfag-dark text-white px-6 py-6 mt-auto">
        <div className="container mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="text-sm">
              © {new Date().getFullYear()} Elfag Ressursdeling - En trygg plattform for ressursdeling
            </div>
            <div className="flex items-center gap-4 text-xs text-elfag-light">
              <span>Anonymt & Sikkert</span>
              <span>•</span>
              <span>Sanntidsoppdateringer</span>
              <span>•</span>
              <span>Kun for Elfag-bedrifter</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};