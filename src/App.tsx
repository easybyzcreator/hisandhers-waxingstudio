import React, { useState, useEffect } from 'react';
import Menu from './components/Menu';
import Admin from './components/Admin';
import Footer from './components/Footer';
import { db } from './firebase';
import { doc, onSnapshot } from 'firebase/firestore';
import { Settings } from './types';
import { Toaster } from 'sonner';

import { DEFAULT_LOGO, DEFAULT_BACKGROUND } from './constants';

export default function App() {
  const [isAdmin, setIsAdmin] = useState(false);
  const [settings, setSettings] = useState<Settings>({
    logo: DEFAULT_LOGO,
    primaryColor: '#865d39',
    whatsappNumber: '',
    whatsappCountryCode: '+55',
    slug: 'easy-waxing',
    brandName: 'HIS & HERS',
    slogan: 'O sabor que você merece, a um clique de distância.',
    whatsappClosingMessage: 'Obrigada pelo pedido, aguarde que entraremos em contato para confirmação!',
    backgroundImage: DEFAULT_BACKGROUND,
    glassColor: 'rgba(255, 255, 255, 0.4)',
    textColor: '#000000',
    language: 'pt',
    currency: 'BRL'
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const path = window.location.pathname;
    const hash = window.location.hash;
    if (path === '/admin' || hash === '#/admin' || hash === '#admin') {
      setIsAdmin(true);
    }

    const unsub = onSnapshot(doc(db, 'configuracoes', 'geral'), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data() as Settings;
        setSettings(data);
        setLoading(false);

        if (data.brandName) {
          document.title = data.brandName;
        }

        const themeColorMeta = document.getElementById('theme-color');
        if (themeColorMeta) {
          themeColorMeta.setAttribute('content', data.primaryColor || '#865d39');
        }

        const glassColor = data.glassColor || 'rgba(255, 255, 255, 0.4)';
        const finalGlassColor = (glassColor.startsWith('#') && glassColor.length === 7) 
          ? `${glassColor}66` 
          : glassColor;
        document.documentElement.style.setProperty('--glass-color', finalGlassColor);

        if (data.textColor) {
          document.documentElement.style.setProperty('--text-color', data.textColor);
        }
      } else {
        setLoading(false);
      }
    });

    return () => unsub();
  }, []);

  const glassColor = settings?.glassColor || 'rgba(255, 255, 255, 0.4)';
  const finalGlassColor = (glassColor.startsWith('#') && glassColor.length === 7) 
    ? `${glassColor}66` 
    : glassColor;

  if (loading) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-[#ffffff]">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-[#d1d5db] border-t-transparent rounded-full animate-spin" />
          <p className="text-[#d1d5db] font-medium animate-pulse">Carregando...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen w-full overflow-x-hidden">
      <Toaster position="top-center" richColors />
      <div 
        className="fixed inset-0 z-[-2] bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: `url("${settings?.backgroundImage || 'https://i.ibb.co/X0vYy7L/cakes.png'}")` }}
      />
      
      <div 
        className="fixed inset-0 z-[-1] pointer-events-none" 
        style={{ 
          backgroundColor: finalGlassColor,
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)'
        }}
      />

      <div className="relative z-0 flex flex-col min-h-screen">
        {isAdmin ? (
          <Admin settings={settings} setSettings={setSettings} setIsAdmin={setIsAdmin} />
        ) : (
          <Menu settings={settings} />
        )}
        <Footer />
      </div>
    </div>
  );
}
