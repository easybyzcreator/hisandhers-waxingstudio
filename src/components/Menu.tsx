import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, onSnapshot, addDoc, serverTimestamp, query, orderBy } from 'firebase/firestore';
import { Product, Order, Settings, Category, CartItem, Side } from '../types';
import { Plus, Minus, ShoppingBag, X, Clock } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { DEFAULT_LOGO } from '../constants';
import { getTodayInSouthCarolina, getDayOfWeekFromDateString, formatDateInSC, formatTimeInSC } from '../lib/dateTime';

const translations = {
  pt: {
    cartTitle: 'Seu Agendamento',
    emptyCart: 'Sua lista está vazia',
    total: 'Total',
    next: 'Próximo: Seus Dados',
    back: 'Voltar',
    finish: 'Finalizar Agendamento',
    firstName: 'Nome',
    lastName: 'Sobrenome',
    phone: 'Telefone',
    instagram: 'Instagram',
    email: 'E-mail',
    birthday: 'Aniversário (Mês/Dia/Ano)',
    birthdayPlaceholder: 'MM/DD/AAAA',
    street: 'Rua/Avenida',
    number: 'Nº/Apto',
    zipCode: 'CEP',
    city: 'Cidade',
    observation: 'Observação',
    orderDetails: 'Detalhes do Agendamento',
    customCakeTitle: 'Personalizar Serviço',
    chooseSides: 'Escolha os Extras',
    excludeIngredients: 'Remover Itens',
    limitReached: 'Limite atingido',
    addToCart: 'Adicionar',
    whatsappOrder: 'Agendamento',
    whatsappData: 'Dados da Cliente',
    whatsappItems: 'Serviços Escolhidos',
    whatsappTotal: 'Total',
    whatsappDate: 'Data',
    whatsappAt: 'às',
    pickupDate: 'Data da Sessão',
    pickupDatePlaceholder: 'DD/MM/AAAA',
    appointmentTime: 'Horário',
    consultMessage: 'Existem itens com valores a consultar. Aguarde confirmação.',
    readMore: 'Saiba mais',
    requiredFieldsWarning: 'Preencha todos os campos obrigatórios para finalizar',
    estimatedTime: 'Tempo Estimado',
    sessionDate: 'Data da Sessão',
    viewDetails: 'VIEW DETAILS',
    aboutProcedure: 'ABOUT THIS PROCEDURE',
    startingAt: 'STARTING AT',
    scheduleService: 'SCHEDULE THIS SERVICE',
    studioClosedOnDay: 'Estúdio Fechado',
    studioClosedMsg: 'Não há atendimento neste dia da semana. Por favor, escolha outra data.',
    businessHoursMsg: 'Horário de atendimento:',
    outsideHoursMsg: 'O horário selecionado está fora do expediente de atendimento'
  },
  en: {
    cartTitle: 'Your Appointment',
    emptyCart: 'Your list is empty',
    total: 'Total',
    next: 'Next: Your Details',
    back: 'Back',
    finish: 'Finish Appointment',
    firstName: 'First Name',
    lastName: 'Last Name',
    phone: 'Phone',
    instagram: 'Instagram',
    email: 'E-mail',
    birthday: 'Birthday (Month/Day/Year)',
    birthdayPlaceholder: 'MM/DD/YYYY',
    street: 'Street/Avenue',
    number: 'No./Apt',
    zipCode: 'Zip Code',
    city: 'City',
    observation: 'Observation',
    orderDetails: 'Appointment Details',
    customCakeTitle: 'Customize Service',
    chooseSides: 'Choose Extras',
    excludeIngredients: 'Remove Items',
    limitReached: 'Limit reached',
    addToCart: 'Add',
    whatsappOrder: 'Appointment',
    whatsappData: 'Customer Data',
    whatsappItems: 'Selected Services',
    whatsappTotal: 'Total',
    whatsappDate: 'Date',
    whatsappAt: 'at',
    pickupDate: 'Session Date',
    pickupDatePlaceholder: 'MM/DD/YYYY',
    appointmentTime: 'Time',
    consultMessage: 'There are items with values to be consulted. Please wait for confirmation.',
    readMore: 'Read more',
    requiredFieldsWarning: 'Fill in all required fields to finish',
    estimatedTime: 'Estimated Time',
    sessionDate: 'Session Date',
    viewDetails: 'VIEW DETAILS',
    aboutProcedure: 'ABOUT THIS PROCEDURE',
    startingAt: 'STARTING AT',
    scheduleService: 'SCHEDULE THIS SERVICE',
    studioClosedOnDay: 'Studio Closed',
    studioClosedMsg: 'No appointments on this day of the week. Please select another date.',
    businessHoursMsg: 'Business hours:',
    outsideHoursMsg: 'The selected time is outside business hours'
  },
  es: {
    cartTitle: 'Tu Cita',
    emptyCart: 'Tu lista está vacía',
    total: 'Total',
    next: 'Siguiente: Tus Datos',
    back: 'Volver',
    finish: 'Finalizar Cita',
    firstName: 'Nombre',
    lastName: 'Apellido',
    phone: 'Teléfono',
    instagram: 'Instagram',
    email: 'Correo electrónico',
    birthday: 'Cumpleaños (Mes/Día/Año)',
    birthdayPlaceholder: 'MM/DD/AAAA',
    street: 'Calle/Avenida',
    number: 'Nº/Apto',
    zipCode: 'Código Postal',
    city: 'Ciudad',
    observation: 'Observación',
    orderDetails: 'Detalles de la Cita',
    customCakeTitle: 'Personalizar Servicio',
    chooseSides: 'Elegir Extras',
    excludeIngredients: 'Eliminar Artículos',
    limitReached: 'Límite alcanzado',
    addToCart: 'Añadir',
    whatsappOrder: 'Cita',
    whatsappData: 'Datos de la Cliente',
    whatsappItems: 'Servicios Seleccionados',
    whatsappTotal: 'Total',
    whatsappDate: 'Fecha',
    whatsappAt: 'a las',
    pickupDate: 'Fecha de la Sesión',
    pickupDatePlaceholder: 'MM/DD/AAAA',
    appointmentTime: 'Hora',
    consultMessage: 'Hay artículos con valores a consultar. Espere confirmación.',
    readMore: 'Saber más',
    requiredFieldsWarning: 'Complete todos los campos obligatorios para finalizar',
    estimatedTime: 'Tiempo Estimado',
    sessionDate: 'Fecha de la Sesión',
    viewDetails: 'VIEW DETAILS',
    aboutProcedure: 'ABOUT THIS PROCEDURE',
    startingAt: 'STARTING AT',
    scheduleService: 'SCHEDULE THIS SERVICE',
    studioClosedOnDay: 'Estudio Cerrado',
    studioClosedMsg: 'No hay atención en este día de la semana. Por favor, elija otra fecha.',
    businessHoursMsg: 'Horario de atención:',
    outsideHoursMsg: 'La hora seleccionada está fuera del horario de atención'
  }
};

export default function Menu({ settings }: { settings: Settings }) {
  const [currentLang, setCurrentLang] = useState<'pt' | 'en' | 'es'>(settings.language || 'pt');
  const t = translations[currentLang];
  const currencySymbol = settings.currency === 'USD' ? '$' : 'R$';
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [sides, setSides] = useState<Side[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isCustomModalOpen, setIsCustomModalOpen] = useState(false);
  const [selectedProductForCustom, setSelectedProductForCustom] = useState<Product | null>(null);
  const [mealSelections, setMealSelections] = useState<{
    removals: string[];
    sides: Side[];
  }>({
    removals: [],
    sides: []
  });
  const [checkoutStep, setCheckoutStep] = useState<'summary' | 'form'>('summary');
  const [genderFilter, setGenderFilter] = useState<'feminino' | 'masculino' | null>(null);
  const [showWelcome, setShowWelcome] = useState(true);
  const [showDescriptionModal, setShowDescriptionModal] = useState<Product | null>(null);
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    telefone: '',
    instagram: '',
    endereco: '',
    street: '',
    number: '',
    zipCode: '',
    city: '',
    aniversario: '',
    observacao: '',
    email: '',
    appointmentDate: '',
    appointmentTime: ''
  });
  const [existingCustomers, setExistingCustomers] = useState<any[]>([]);
  const [customerSearch, setCustomerSearch] = useState('');
  const [showCustomerResults, setShowCustomerResults] = useState(false);

  useEffect(() => {
    setLoading(true);
    
    const unsubProducts = onSnapshot(query(collection(db, 'produtos'), orderBy('title')), (snapshot) => {
      const fetchedProducts = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Product));
      setProducts(fetchedProducts);
      setLoading(false);
    }, (error) => {
      console.error('Menu: Erro ao carregar produtos:', error);
      setLoading(false);
    });

    const unsubCategories = onSnapshot(query(collection(db, 'categorias'), orderBy('order', 'asc')), (snapshot) => {
      const fetchedCategories = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Category));
      setCategories(fetchedCategories);
    }, (error) => {
      console.error('Menu: Erro ao carregar categorias:', error);
    });

    const unsubSides = onSnapshot(collection(db, 'acompanhamentos'), (snapshot) => {
      const fetchedSides = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Side));
      setSides(fetchedSides);
    });

    const unsubOrders = onSnapshot(query(collection(db, 'pedidos'), orderBy('createdAt', 'desc')), (snapshot) => {
      const customerMap = new Map();
      snapshot.docs.forEach(doc => {
        const data = doc.data();
        const key = data.phone || data.email || data.customerName;
        if (!customerMap.has(key)) {
          customerMap.set(key, {
            nome: data.customerName,
            telefone: data.phone,
            instagram: data.instagram || '',
            email: data.email || '',
            aniversario: data.birthday || '',
            street: data.street || '',
            number: data.number || '',
            city: data.city || '',
            zipCode: data.zipCode || ''
          });
        }
      });
      setExistingCustomers(Array.from(customerMap.values()));
    });

    return () => {
      unsubProducts();
      unsubCategories();
      unsubSides();
      unsubOrders();
    };
  }, []);

  // Load form data from local storage
  useEffect(() => {
    const saved = localStorage.getItem('his_and_hers_customer_data');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        // Only load if firstName is there as a signal of valid data
        if (parsed.firstName) {
          setFormData(prev => ({ 
            ...prev, 
            ...parsed,
            appointmentDate: '', // Don't persist dates
            appointmentTime: '' 
          }));
        }
      } catch (e) {
        console.error('Error loading form data:', e);
      }
    }
  }, []);

  // Save form data to local storage (excluding appointment info)
  useEffect(() => {
    const { appointmentDate, appointmentTime, ...rest } = formData;
    localStorage.setItem('his_and_hers_customer_data', JSON.stringify(rest));
  }, [formData]);

  const addToCart = (product: Product) => {
    if (product.isMeal) {
      setSelectedProductForCustom(product);
      setMealSelections({
        removals: [],
        sides: []
      });
      setIsCustomModalOpen(true);
      return;
    }

    setCart(prev => {
      const existing = prev.find(item => item.productId === product.id && !item.mealOptions);
      if (existing) {
        return prev.map(item => item === existing ? { ...item, quantity: item.quantity + 1 } : item);
      }
      return [...prev, { id: Math.random().toString(36).substr(2, 9), productId: product.id, quantity: 1 }];
    });
  };

  const addMealToCart = () => {
    if (!selectedProductForCustom) return;
    
    setCart(prev => [
      ...prev, 
      { 
        id: Math.random().toString(36).substr(2, 9), 
        productId: selectedProductForCustom.id, 
        quantity: 1,
        mealOptions: { ...mealSelections }
      }
    ]);
    setIsCustomModalOpen(false);
    setSelectedProductForCustom(null);
  };

  const removeFromCart = (cartItemId: string) => {
    setCart(prev => {
      const existing = prev.find(item => item.id === cartItemId);
      if (existing && existing.quantity > 1) {
        return prev.map(item => item.id === cartItemId ? { ...item, quantity: item.quantity - 1 } : item);
      }
      return prev.filter(item => item.id !== cartItemId);
    });
  };

  const cartItemsCount = cart.reduce((total, item) => total + item.quantity, 0);
  const cartTotal = cart.reduce((total, item) => {
    const product = products.find(p => p.id === item.productId);
    const basePrice = (product?.price && product.price > 0) ? product.price : (product?.oldPrice || 0);
    let itemPrice = basePrice;
    if (item.mealOptions?.sides) {
      itemPrice += item.mealOptions.sides.reduce((sum, s) => sum + s.price, 0);
    }
    return total + itemPrice * item.quantity;
  }, 0);

  const totalDuration = cart.reduce((total, item) => {
    const product = products.find(p => p.id === item.productId);
    return total + (product?.duration || 0) * item.quantity;
  }, 0);

  const getDaySchedule = (dateStr: string) => {
    if (!dateStr || !settings?.businessHours) return null;
    const dayOfWeek = getDayOfWeekFromDateString(dateStr);
    const dayKeys = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'] as const;
    const dayKey = dayKeys[dayOfWeek];
    const dayNames = {
      pt: ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'],
      en: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
      es: ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']
    };
    const dayLabel = dayNames[currentLang as keyof typeof dayNames]?.[dayOfWeek] || dayNames.pt[dayOfWeek];
    const schedule = settings.businessHours[dayKey];
    return {
      dayKey,
      dayLabel,
      schedule: schedule || null
    };
  };

  const parseTimeToMinutes = (timeStr: string) => {
    if (!timeStr) return null;
    const clean = timeStr.trim().toUpperCase();
    const isPM = clean.includes('PM');
    const isAM = clean.includes('AM');
    const nums = clean.replace(/[^\d:]/g, '').split(':');
    if (nums.length < 2) return null;
    let hours = parseInt(nums[0], 10);
    const minutes = parseInt(nums[1], 10);
    if (isNaN(hours) || isNaN(minutes)) return null;
    if (isPM && hours < 12) hours += 12;
    if (isAM && hours === 12) hours = 0;
    return hours * 60 + minutes;
  };

  const selectedDayInfo = getDaySchedule(formData.appointmentDate);
  const isStudioClosed = Boolean(selectedDayInfo?.schedule && selectedDayInfo.schedule.isOpen === false);

  const isOutsideHours = (() => {
    if (!selectedDayInfo?.schedule || !selectedDayInfo.schedule.isOpen) return false;
    if (!formData.appointmentTime || formData.appointmentTime.trim() === '' || formData.appointmentTime.startsWith('00:00')) return false;
    const userMinutes = parseTimeToMinutes(formData.appointmentTime);
    const openMinutes = parseTimeToMinutes(selectedDayInfo.schedule.openTime);
    const closeMinutes = parseTimeToMinutes(selectedDayInfo.schedule.closeTime);
    if (userMinutes === null || openMinutes === null || closeMinutes === null) return false;
    return userMinutes < openMinutes || userMinutes > closeMinutes;
  })();

  const handleFinalizar = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const hasConsultItems = cart.some(item => products.find(p => p.id === item.productId)?.priceType === 'consult');
    
    const orderItems = cart.map(item => {
      const product = products.find(p => p.id === item.productId)!;
      const basePrice = (product.price && product.price > 0) ? product.price : (product.oldPrice || 0);
      let itemPrice = basePrice;
      if (item.mealOptions?.sides) {
        itemPrice += item.mealOptions.sides.reduce((sum, s) => sum + s.price, 0);
      }
      return {
        title: product.title,
        quantity: item.quantity,
        price: itemPrice,
        priceType: product.priceType || 'fixed',
        mealOptions: item.mealOptions || null
      };
    });

    const orderData: Omit<Order, 'id'> = {
      customerName: `${formData.firstName} ${formData.lastName}`.trim(),
      firstName: formData.firstName,
      lastName: formData.lastName,
      phone: formData.telefone,
      address: `${formData.street}, ${formData.number || 'S/N'} - ${formData.city} (${formData.zipCode})`,
      street: formData.street,
      number: formData.number || '',
      zipCode: formData.zipCode,
      city: formData.city,
      birthday: formData.aniversario || '',
      observation: formData.observacao || '',
      email: formData.email || '',
      appointmentDate: formData.appointmentDate,
      appointmentTime: formData.appointmentTime,
      instagram: formData.instagram,
      status: 'pending',
      paymentStatus: 'pending',
      items: orderItems,
      total: cartTotal,
      createdAt: serverTimestamp(),
      orderLanguage: currentLang
    };

    try {
      await addDoc(collection(db, 'pedidos'), orderData);
      
      const now = new Date();
      const timeStr = now.toLocaleTimeString(currentLang === 'en' ? 'en-US' : 'pt-BR', { timeZone: 'America/New_York', hour: '2-digit', minute: '2-digit' });
      const dateStr = now.toLocaleDateString(currentLang === 'en' ? 'en-US' : 'pt-BR', { timeZone: 'America/New_York' });

      let message = `*${t.whatsappOrder} - ${settings.brandName || settings.slug}*\n`;
      message += `*${t.whatsappDate}:* ${dateStr} ${t.whatsappAt} ${timeStr}\n\n`;
      
      message += `*--- ${t.whatsappData} ---*\n`;
      message += `*${t.firstName}:* ${formData.firstName}\n`;
      message += `*${t.lastName}:* ${formData.lastName}\n`;
      message += `*${t.phone}:* ${formData.telefone}\n`;
      if (formData.instagram) message += `*Instagram:* @${formData.instagram}\n`;
      message += `*${t.email}:* ${formData.email}\n`;
      message += `*${t.birthday}:* ${formData.aniversario}\n`;
      message += `*${t.pickupDate}:* ${formData.appointmentDate}\n`;
      message += `*${t.appointmentTime}:* ${formData.appointmentTime}\n`;
      message += `*${t.observation}:* ${formData.observacao || '-'}\n\n`;

      message += `*--- ${t.whatsappItems} ---*\n`;
      orderItems.forEach(item => {
        if (item.priceType === 'consult') {
          message += `• ${item.quantity}x ${item.title} - (Valor a Consultar)\n`;
        } else {
          const prefix = item.priceType === 'starting' ? 'A partir de ' : '';
          message += `• ${item.quantity}x ${item.title} - ${prefix}${currencySymbol} ${(item.price * item.quantity).toFixed(2).replace('.', ',')}\n`;
        }
        if (item.mealOptions) {
          if (item.mealOptions.removals.length > 0) {
            message += `  (Remover: ${item.mealOptions.removals.join(', ')})\n`;
          }
          if (item.mealOptions.sides.length > 0) {
            message += `  (Acompanhamentos: ${item.mealOptions.sides.map(s => s.name).join(', ')})\n`;
          }
        }
      });

      message += `\n*${t.whatsappTotal}:* ${currencySymbol} ${cartTotal.toFixed(2).replace('.', ',')}\n`;
      
      if (hasConsultItems) {
        message += `\n⚠️ *${t.consultMessage}*\n`;
      }
      
      const ClosingMessage = settings.whatsappClosingMessage || (currentLang === 'en' ? 'Thank you for your order, we will contact you shortly for confirmation!' : 'Obrigada pelo pedido, aguarde que entraremos em contato para confirmação!');
      message += `\n${ClosingMessage}`;

      const encodedMessage = encodeURIComponent(message);
      const countryCode = settings.whatsappCountryCode?.replace(/\D/g, '') || '55';
      let whatsappNumber = settings.whatsappNumber?.replace(/\D/g, '') || '';
      
      if (whatsappNumber.startsWith(countryCode)) {
        whatsappNumber = whatsappNumber.slice(countryCode.length);
      }
      
      if (!whatsappNumber) {
        alert('Erro: Número de WhatsApp não configurado corretamente no painel administrativo.');
        return;
      }

      const whatsappUrl = `https://wa.me/${countryCode}${whatsappNumber}?text=${encodedMessage}`;
      
      setCart([]);
        setIsModalOpen(false);
        setFormData({ 
          firstName: '',
          lastName: '',
          telefone: '', 
          endereco: '', 
          street: '',
          number: '',
          zipCode: '',
          city: '',
          aniversario: '', 
          observacao: '', 
          email: '',
          instagram: '',
          appointmentDate: '',
          appointmentTime: ''
        });

      // Robust redirect for iOS / Mobile
      const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
      if (isMobile) {
        window.location.assign(whatsappUrl);
      } else {
        try {
          const win = window.open(whatsappUrl, '_blank');
          if (!win || win.closed || typeof win.closed === 'undefined') {
            window.location.assign(whatsappUrl);
          }
        } catch (e) {
          window.location.assign(whatsappUrl);
        }
      }
    } catch (error) {
      console.error("Erro ao salvar pedido:", error);
      alert('Erro ao finalizar pedido. Por favor, tente novamente.');
    }
  };

  const formatDuration = (minutes: number) => {
    if (!minutes) return '';
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    if (h > 0 && m > 0) return `${h}h ${m}min`;
    if (h > 0) return `${h}h`;
    return `${m}min`;
  };

  if (loading) return null;

  return (
    <div className="flex-grow flex flex-col items-center p-4 w-full overflow-x-hidden">
      <AnimatePresence mode="wait">
        {showWelcome ? (
          <motion.div 
            key="welcome"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex-grow flex flex-col items-center justify-center p-6 text-center min-h-[70vh] w-full max-w-4xl"
          >
            <div className="w-32 h-32 rounded-full bg-white p-1 shadow-xl mb-6 overflow-hidden flex items-center justify-center">
              <img src={settings.logo || DEFAULT_LOGO} alt="Logo" className="w-full h-full object-cover rounded-full" referrerPolicy="no-referrer" />
            </div>
            <h2 className="text-xl font-serif font-bold mb-2 whitespace-pre-wrap" style={{ color: settings.primaryColor }}>
              {settings.brandName || 'HIS & HERS'}
            </h2>
            <p className="text-sm font-medium mb-12 max-w-xs opacity-70" style={{ color: settings.textColor }}>
              {settings.welcomeSlogan || 'Bem-vindo ao seu momento de cuidado. Escolha como deseja começar:'}
            </p>

            <div className="grid grid-cols-2 gap-8 w-full max-w-md">
              <button 
                onClick={() => { setGenderFilter('masculino'); setShowWelcome(false); }}
                className="flex flex-col items-center gap-4 group"
              >
                <div className="w-full aspect-square rounded-3xl overflow-hidden shadow-2xl border-4 border-white/50 bg-white/10 backdrop-blur-md transition-transform group-hover:scale-105">
                  <img src="https://i.ibb.co/fb3nRGQ/homem.png" alt="HIS" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                </div>
                <span className="text-2xl font-serif font-bold tracking-widest opacity-80 group-hover:opacity-100" style={{ color: settings.textColor }}>HIS</span>
              </button>

              <button 
                onClick={() => { setGenderFilter('feminino'); setShowWelcome(false); }}
                className="flex flex-col items-center gap-4 group"
              >
                <div className="w-full aspect-square rounded-3xl overflow-hidden shadow-2xl border-4 border-white/50 bg-white/10 backdrop-blur-md transition-transform group-hover:scale-105">
                  <img src="https://i.ibb.co/zt2sPNj/mulher.png" alt="HERS" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                </div>
                <span className="text-2xl font-serif font-bold tracking-widest opacity-80 group-hover:opacity-100" style={{ color: settings.textColor }}>HERS</span>
              </button>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="menu"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full flex flex-col items-center pb-32"
          >
            <div className="mt-8 mb-4 relative flex flex-col items-center">
              <div className="absolute top-0 right-[-100px] flex gap-2">
                {['pt', 'en', 'es'].map(lang => {
                  const isSelected = currentLang === lang;
                  return (
                    <button 
                      key={lang} 
                      type="button"
                      onClick={() => setCurrentLang(lang as any)} 
                      className={cn(
                        "w-8 h-8 rounded-full border-2 flex items-center justify-center text-[10px] font-bold transition-all shadow-xs cursor-pointer", 
                        isSelected ? "bg-black !text-white border-black shadow-md" : "bg-white text-black border-gray-200 hover:border-gray-400"
                      )}
                      style={{
                        backgroundColor: isSelected ? '#000000' : '#ffffff',
                        color: isSelected ? '#ffffff' : '#111827'
                      }}
                    >
                      {lang.toUpperCase()}
                    </button>
                  );
                })}
              </div>
              <div className="w-40 h-40 rounded-full bg-white p-1 shadow-2xl overflow-hidden flex items-center justify-center border-4 border-white">
                <img 
                  src={settings.logo || DEFAULT_LOGO} 
                  alt="Logo" 
                  className="w-full h-full object-cover rounded-full"
                  referrerPolicy="no-referrer"
                />
              </div>
            </div>

            <h1 className="text-2xl font-serif font-bold mb-2 text-center tracking-tight whitespace-pre-wrap" style={{ color: settings.primaryColor }}>
              {settings.brandName || 'HIS & HERS'}
            </h1>
            <p className="font-medium mb-12 text-center whitespace-pre-wrap" style={{ color: settings.textColor || '#3f2b1b' }}>
              {settings.slogan || 'O sabor que você merece, a um clique de distância.'}
            </p>

      <div className="w-full max-w-2xl space-y-12">
        {categories.length > 0 ? (
          categories.map((category) => {
            const categoryProducts = products
              .filter(p => 
                p.categoryId === category.id && 
                p.isActive !== false &&
                (!genderFilter || p.gender === 'ambos' || p.gender === genderFilter || !p.gender)
              )
              .sort((a, b) => (a.order ?? 9999) - (b.order ?? 9999));
            if (categoryProducts.length === 0) return null;

            return (
              <div key={category.id} className="space-y-6">
                <div className="border-b border-white/20 pb-2">
                  <h2 className="text-2xl font-serif font-bold italic" style={{ color: settings.primaryColor }}>
                    {category.title}
                  </h2>
                </div>
                <div className="space-y-4">
                  {categoryProducts.map((product) => (
                    <motion.div 
                      key={product.id}
                      initial={{ opacity: 0, y: 20 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      className="glass rounded-2xl p-4 flex gap-4 items-center"
                    >
                      <div className="w-24 h-24 rounded-xl overflow-hidden flex-shrink-0 bg-white/50">
                        <img src={product.image} alt={product.title} className="w-full h-full object-cover" />
                      </div>
                      <div className="flex-grow text-black">
                        <div className="flex justify-between items-start">
                          <h3 className="text-xl font-serif font-bold mb-1 text-black">{product.title}</h3>
                          {product.duration && <span className="text-[10px] opacity-40 font-bold">{formatDuration(product.duration)}</span>}
                        </div>
                        <p className="text-sm line-clamp-2 mb-1 text-black">{product.description}</p>
                        {product.description && product.description.trim() !== '' && (
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              setShowDescriptionModal(product);
                            }}
                            className="text-[10px] uppercase font-bold tracking-wider underline hover:opacity-80 transition-opacity mb-2 cursor-pointer inline-block text-black"
                          >
                            {t.viewDetails || 'VIEW DETAILS'}
                          </button>
                        )}
                        <div className="flex flex-col items-end">
                          {Number(product.price) > 0 && Number(product.oldPrice) > 0 && (
                            <span className="text-xs line-through opacity-40">
                              {currencySymbol} {Number(product.oldPrice).toFixed(2).replace('.', ',')}
                            </span>
                          )}
                          <p className="text-lg font-bold" style={{ color: settings.primaryColor }}>
                            {currencySymbol} {(Number(product.price) > 0 ? Number(product.price) : (Number(product.oldPrice) || 0)).toFixed(2).replace('.', ',')}
                          </p>
                        </div>
                      </div>
                      <div className="flex flex-col items-center gap-2">
                        {cart.filter(item => item.productId === product.id).length > 0 && (
                          <div className="flex flex-col items-center gap-2">
                            <button 
                              onClick={() => addToCart(product)}
                              className="p-2 rounded-full text-white shadow-lg"
                              style={{ backgroundColor: settings.primaryColor }}
                            >
                              <Plus size={20} />
                            </button>
                            <span className="font-bold">
                              {cart.filter(item => item.productId === product.id).reduce((sum, item) => sum + item.quantity, 0)}
                            </span>
                            <button 
                              onClick={() => {
                                const item = cart.find(i => i.productId === product.id);
                                if (item) removeFromCart(item.id);
                              }}
                              className="p-2 rounded-full bg-white shadow-md border border-gray-200"
                              style={{ color: '#000000' }}
                            >
                              <Minus size={20} style={{ color: '#000000' }} />
                            </button>
                          </div>
                        )}
                        {cart.filter(item => item.productId === product.id).length === 0 && (
                          <button 
                            onClick={() => addToCart(product)}
                            className="p-3 rounded-full text-white shadow-lg"
                            style={{ backgroundColor: settings.primaryColor }}
                          >
                            <Plus size={24} />
                          </button>
                        )}
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            );
          })
        ) : (
          <div className="text-center p-12 opacity-60 glass rounded-2xl">
            Nenhum produto encontrado.
          </div>
        )}
      </div>

      <AnimatePresence>
        {cartItemsCount > 0 && (
          <motion.div 
            initial={{ y: 100 }}
            animate={{ y: 0 }}
            exit={{ y: 100 }}
            className="fixed bottom-6 left-4 right-4 max-w-2xl mx-auto z-40"
          >
            <button 
              onClick={() => setIsModalOpen(true)}
              className="w-full h-16 rounded-2xl shadow-2xl flex items-center justify-between px-6 text-white font-bold text-lg transition-transform active:scale-95"
              style={{ backgroundColor: settings.primaryColor }}
            >
              <div className="flex items-center gap-3">
                <ShoppingBag size={24} className="shrink-0" />
                <span>{t.cartTitle}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="bg-white/20 px-2 py-1 rounded-lg text-sm">{cartItemsCount} {currentLang === 'pt' ? 'itens' : 'items'}</span>
                <span>{currencySymbol} {cartTotal.toFixed(2).replace('.', ',')}</span>
              </div>
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => {
                setIsModalOpen(false);
                setCheckoutStep('summary');
              }}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative w-full max-w-lg bg-[#ffffff] rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
            >
              <div className="p-6 border-b border-gray-200 flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-serif font-bold" style={{ color: '#000000' }}>
                    {checkoutStep === 'summary' ? t.cartTitle : t.finish}
                  </h2>
                  {totalDuration > 0 && (
                    <p className="text-[10px] uppercase font-bold opacity-40">{t.estimatedTime}: {formatDuration(totalDuration)}</p>
                  )}
                </div>
                <button 
                  onClick={() => {
                    setIsModalOpen(false);
                    setCheckoutStep('summary');
                  }} 
                  className="p-2 hover:bg-gray-100 rounded-full"
                  style={{ color: '#000000' }}
                >
                  <X size={24} />
                </button>
              </div>
              
              <div className="p-6 overflow-y-auto">
                {checkoutStep === 'summary' ? (
                  <div className="space-y-6">
                    <div className="space-y-4">
                      {totalDuration > 0 && (
                        <div className="flex items-center gap-2 text-xs font-bold px-3 py-2 rounded-xl bg-gray-50 border border-gray-100 mb-2">
                          <span className="opacity-40 uppercase tracking-wider">Tempo Total Estimado:</span>
                          <span style={{ color: settings.primaryColor }}>{formatDuration(totalDuration)}</span>
                        </div>
                      )}
                      {cart.map((item) => {
                        const product = products.find(p => p.id === item.productId);
                        if (!product) return null;
                        return (
                          <div key={item.id} className="flex items-center gap-4 bg-white/40 p-3 rounded-2xl border border-white/20">
                            {product.image ? (
                              <img src={product.image} alt={product.title} className="w-12 h-12 rounded-lg object-cover" />
                            ) : (
                              <div className="w-12 h-12 rounded-lg bg-gray-100 flex items-center justify-center shrink-0">
                                <ShoppingBag className="opacity-20" size={24} />
                              </div>
                            )}
                            <div className="flex-grow">
                              <div className="flex justify-between items-start">
                                <h4 className="font-bold text-sm" style={{ color: '#000000' }}>{product.title}</h4>
                                {product.duration && <span className="text-[10px] opacity-40">{formatDuration(product.duration)}</span>}
                              </div>
                              {item.mealOptions && (
                                <div className="text-[10px] leading-tight" style={{ color: 'rgba(0, 0, 0, 0.6)' }}>
                                  {item.mealOptions.removals.length > 0 && `${t.excludeIngredients}: ${item.mealOptions.removals.join(', ')}`}
                                  {item.mealOptions.removals.length > 0 && item.mealOptions.sides.length > 0 && ' • '}
                                  {item.mealOptions.sides.length > 0 && `${t.chooseSides}: ${item.mealOptions.sides.map(s => s.name).join(', ')}`}
                                </div>
                              )}
                              <div className="flex flex-col items-end">
                                {product.price > 0 && product.oldPrice && product.oldPrice > 0 && (
                                  <span className="text-[10px] line-through opacity-40">
                                    {currencySymbol} {product.oldPrice.toFixed(2).replace('.', ',')}
                                  </span>
                                )}
                                <p className="text-xs font-bold" style={{ color: settings.primaryColor }}>
                                  {currencySymbol} {(((product.price > 0 ? product.price : (product.oldPrice || 0)) + (item.mealOptions?.sides.reduce((sum, s) => sum + s.price, 0) || 0)) * item.quantity).toFixed(2).replace('.', ',')}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-3">
                              <button 
                                onClick={() => removeFromCart(item.id)}
                                className="w-8 h-8 rounded-full bg-white flex items-center justify-center opacity-80 shadow-sm border border-gray-100"
                                style={{ color: '#000000' }}
                              >
                                <Minus size={16} style={{ color: '#000000' }} />
                              </button>
                              <span className="font-bold text-sm" style={{ color: '#000000' }}>{item.quantity}</span>
                              <button 
                                onClick={() => {
                                  setCart(prev => prev.map(i => i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i));
                                }}
                                className="w-8 h-8 rounded-full text-white flex items-center justify-center shadow-sm"
                                style={{ backgroundColor: settings.primaryColor }}
                              >
                                <Plus size={16} />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    
                    <button 
                      onClick={() => setIsModalOpen(false)}
                      className="w-full py-3 border-2 border-dashed border-gray-200 rounded-2xl text-[10px] font-bold opacity-40 hover:opacity-100 transition-opacity flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <Plus size={14} className="shrink-0" />
                      ADICIONAR MAIS SERVIÇOS
                    </button>
                    
                    <div className="pt-4 border-t border-gray-200 flex flex-col gap-2">
                      <div className="flex items-center justify-between">
                        <span className="text-lg font-bold" style={{ color: '#000000' }}>{t.total}</span>
                        <span className="text-2xl font-bold" style={{ color: settings.primaryColor }}>
                          {currencySymbol} {cartTotal.toFixed(2).replace('.', ',')}
                        </span>
                      </div>
                      {cart.some(item => products.find(p => p.id === item.productId)?.priceType === 'consult') && (
                        <div className="p-3 rounded-xl bg-yellow-50 border border-yellow-100 text-[10px] text-yellow-800 font-medium">
                          {t.consultMessage}
                        </div>
                      )}
                    </div>

                    <button 
                      onClick={() => setCheckoutStep('form')}
                      className="w-full py-4 rounded-xl text-white font-bold text-base sm:text-lg shadow-xl transition-transform active:scale-95 flex items-center justify-center gap-2 cursor-pointer"
                      style={{ backgroundColor: settings.primaryColor }}
                    >
                      {t.next}
                    </button>
                  </div>
                ) : (
                  <div className="space-y-6">
                    <div className="text-center space-y-1">
                      <h3 className="text-xl font-serif font-bold" style={{ color: '#000000' }}>{t.orderDetails}</h3>
                      {settings.checkoutTitle && (
                        <p className="text-sm font-medium italic leading-relaxed px-4" style={{ color: '#000000' }}>
                          {settings.checkoutTitle}
                        </p>
                      )}
                    </div>

                    {(settings.infoBlock1Title || settings.infoBlock1Text || settings.infoBlock2Title || settings.infoBlock2Text) && (
                      <div className="grid grid-cols-1 gap-3">
                        {settings.infoBlock1Title && (
                          <div className="bg-white/50 p-4 rounded-2xl border border-white/20 shadow-sm">
                            <h4 className="text-[10px] font-bold uppercase tracking-wider mb-1" style={{ color: '#000000' }}>{settings.infoBlock1Title}</h4>
                            <p className="text-[10px] leading-relaxed" style={{ color: '#000000' }}>{settings.infoBlock1Text}</p>
                          </div>
                        )}
                        {settings.infoBlock2Title && (
                          <div className="bg-white/50 p-4 rounded-2xl border border-white/20 shadow-sm">
                            <h4 className="text-[10px] font-bold uppercase tracking-wider mb-1" style={{ color: '#000000' }}>{settings.infoBlock2Title}</h4>
                            <p className="text-[10px] leading-relaxed" style={{ color: '#000000' }}>{settings.infoBlock2Text}</p>
                          </div>
                        )}
                      </div>
                    )}

                    <form onSubmit={handleFinalizar} className="space-y-4">
                      {(!formData.firstName || !formData.lastName || !formData.telefone || !formData.email || formData.aniversario.length < 10 || !formData.appointmentDate || !formData.appointmentTime) && (
                        <div className="p-3 bg-red-50 border border-red-100 rounded-xl text-[10px] font-bold text-red-600 uppercase text-center animate-pulse">
                          {t.requiredFieldsWarning}
                        </div>
                      )}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <label className="text-xs font-bold uppercase text-black">{t.firstName} *</label>
                          <input 
                            required
                            type="text" 
                            className="w-full p-3 rounded-xl border border-gray-300 focus:ring-2 outline-none text-black"
                            style={{ '--tw-ring-color': settings.primaryColor } as any}
                            value={formData.firstName}
                            onChange={e => setFormData({...formData, firstName: e.target.value})}
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-xs font-bold uppercase text-black">{t.lastName} *</label>
                          <input 
                            required
                            type="text" 
                            className="w-full p-3 rounded-xl border border-gray-300 focus:ring-2 outline-none text-black"
                            style={{ '--tw-ring-color': settings.primaryColor } as any}
                            value={formData.lastName}
                            onChange={e => setFormData({...formData, lastName: e.target.value})}
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <label className="text-xs font-bold uppercase text-black">{t.phone} *</label>
                          <input 
                            required
                            type="tel" 
                            className="w-full p-3 rounded-xl border border-gray-300 focus:ring-2 outline-none text-black"
                            style={{ '--tw-ring-color': settings.primaryColor } as any}
                            value={formData.telefone}
                            onChange={e => {
                              let val = e.target.value.replace(/\D/g, '');
                              const countryCode = settings.whatsappCountryCode || '+55';
                              if (countryCode === '+1') {
                                if (val.length > 10) val = val.slice(0, 10);
                                if (val.length > 6) val = `(${val.slice(0, 3)}) ${val.slice(3, 6)}-${val.slice(6)}`;
                                else if (val.length > 3) val = `(${val.slice(0, 3)}) ${val.slice(3)}`;
                              } else {
                                if (val.length > 11) val = val.slice(0, 11);
                                if (val.length > 7) val = `(${val.slice(0, 2)}) ${val.slice(2, 7)}-${val.slice(7)}`;
                                else if (val.length > 2) val = `(${val.slice(0, 2)}) ${val.slice(2)}`;
                              }
                              setFormData({...formData, telefone: val});
                            }}
                            placeholder={settings.whatsappCountryCode === '+1' ? '(999) 999-9999' : '(99) 99999-9999'}
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-xs font-bold uppercase text-black">{t.instagram} *</label>
                          <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">@</span>
                            <input 
                              required
                              type="text" 
                              className="w-full p-3 pl-8 rounded-xl border border-gray-300 focus:ring-2 outline-none text-black"
                              style={{ '--tw-ring-color': settings.primaryColor } as any}
                              value={formData.instagram}
                              onChange={e => setFormData({...formData, instagram: e.target.value.replace('@', '')})}
                            />
                          </div>
                        </div>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <label className="text-xs font-bold uppercase text-black">
                            {t.birthday} *
                          </label>
                          <input 
                            required
                            type="text" 
                            placeholder={t.birthdayPlaceholder}
                            className="w-full p-3 rounded-xl border border-gray-300 focus:ring-2 outline-none text-black"
                            style={{ '--tw-ring-color': settings.primaryColor } as any}
                            value={formData.aniversario}
                            onChange={e => {
                              let val = e.target.value.replace(/\D/g, '');
                              if (val.length > 8) val = val.slice(0, 8);
                              if (val.length > 4) val = val.slice(0, 2) + '/' + val.slice(2, 4) + '/' + val.slice(4);
                              else if (val.length > 2) val = val.slice(0, 2) + '/' + val.slice(2);
                              setFormData({...formData, aniversario: val});
                            }}
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-xs font-bold uppercase text-black">{t.email} *</label>
                          <input 
                            required
                            type="email" 
                            className="w-full p-3 rounded-xl border border-gray-300 focus:ring-2 outline-none text-black"
                            style={{ '--tw-ring-color': settings.primaryColor } as any}
                            value={formData.email}
                            onChange={e => setFormData({...formData, email: e.target.value})}
                          />
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <label className="text-xs font-bold uppercase text-black">{t.pickupDate}</label>
                          <input 
                            required
                            type="date" 
                            min={getTodayInSouthCarolina()}
                            className="w-full p-3 rounded-xl border border-gray-300 focus:ring-2 outline-none text-black"
                            style={{ '--tw-ring-color': settings.primaryColor } as any}
                            value={formData.appointmentDate}
                            onChange={e => setFormData({...formData, appointmentDate: e.target.value})}
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-xs font-bold uppercase text-black">{t.appointmentTime}</label>
                          <div className="flex flex-wrap sm:flex-nowrap gap-2">
                            <input 
                              required
                              type="text" 
                              placeholder="00:00"
                              className="flex-grow p-3 rounded-xl border border-gray-300 focus:ring-2 outline-none text-black min-w-[100px]"
                              style={{ '--tw-ring-color': settings.primaryColor } as any}
                              value={formData.appointmentTime.split(' ')[0] || ''}
                              onChange={e => {
                                let val = e.target.value.replace(/\D/g, '');
                                if (val.length > 4) val = val.slice(0, 4);
                                if (val.length > 2) val = val.slice(0, 2) + ':' + val.slice(2);
                                const period = formData.appointmentTime.split(' ')[1] || 'AM';
                                setFormData({...formData, appointmentTime: `${val} ${period}`});
                              }}
                            />
                            <select 
                              className="w-20 p-3 rounded-xl border border-gray-300 focus:ring-2 outline-none text-black bg-white"
                              style={{ '--tw-ring-color': settings.primaryColor } as any}
                              value={formData.appointmentTime.split(' ')[1] || 'AM'}
                              onChange={e => {
                                const time = formData.appointmentTime.split(' ')[0] || '00:00';
                                setFormData({...formData, appointmentTime: `${time} ${e.target.value}`});
                              }}
                            >
                              <option value="AM">AM</option>
                              <option value="PM">PM</option>
                            </select>
                          </div>
                        </div>
                      </div>

                      {/* Business Hours warnings and feedback */}
                      {isStudioClosed && (
                        <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs font-bold text-red-700 flex items-center gap-2">
                          <Clock size={16} className="shrink-0 text-red-600" />
                          <span>⚠️ {t.studioClosedOnDay} ({selectedDayInfo?.dayLabel}). {t.studioClosedMsg}</span>
                        </div>
                      )}

                      {!isStudioClosed && selectedDayInfo?.schedule?.isOpen && (
                        <div className="p-2.5 bg-neutral-100 border border-neutral-200 rounded-xl text-xs font-medium text-neutral-700 flex items-center gap-2">
                          <Clock size={15} className="shrink-0 text-neutral-600" />
                          <span>{t.businessHoursMsg} <strong className="text-black font-bold">{selectedDayInfo.schedule.openTime} - {selectedDayInfo.schedule.closeTime}</strong> ({selectedDayInfo.dayLabel})</span>
                        </div>
                      )}

                      {!isStudioClosed && isOutsideHours && (
                        <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs font-bold text-red-700 flex items-center gap-2">
                          <Clock size={16} className="shrink-0 text-red-600" />
                          <span>⚠️ {t.outsideHoursMsg} ({selectedDayInfo?.schedule?.openTime} - {selectedDayInfo?.schedule?.closeTime}).</span>
                        </div>
                      )}

                      <div className="space-y-1">
                        <label className="text-xs font-bold uppercase text-black">{t.observation}</label>
                        <textarea 
                          rows={2}
                          className="w-full p-3 rounded-xl border border-gray-300 focus:ring-2 outline-none text-black"
                          style={{ '--tw-ring-color': settings.primaryColor } as any}
                          value={formData.observacao}
                          onChange={e => setFormData({...formData, observacao: e.target.value})}
                        />
                      </div>

                      <div className="flex gap-2 sm:gap-3 pt-4">
                        <button 
                          type="button"
                          onClick={() => setCheckoutStep('summary')}
                          className="px-5 sm:px-6 py-3.5 sm:py-4 rounded-xl bg-white border border-gray-200 font-bold text-sm sm:text-base cursor-pointer hover:bg-neutral-50 flex items-center justify-center gap-2 transition-all"
                          style={{ color: '#000000' }}
                        >
                          {t.back}
                        </button>
                        <button 
                          type="submit"
                          disabled={!formData.firstName || !formData.lastName || !formData.telefone || !formData.email || formData.aniversario.length < 10 || !formData.appointmentDate || !formData.appointmentTime || !formData.instagram || isStudioClosed || isOutsideHours}
                          className="flex-grow py-3.5 sm:py-4 px-4 rounded-xl text-white font-bold text-sm sm:text-base shadow-xl transition-transform active:scale-95 flex items-center justify-center gap-2 leading-tight disabled:opacity-50 disabled:grayscale disabled:cursor-not-allowed cursor-pointer"
                          style={{ backgroundColor: settings.primaryColor }}
                        >
                          {t.finish}
                        </button>
                      </div>
                      {(!formData.firstName || !formData.lastName || !formData.telefone || !formData.email || formData.aniversario.length < 10 || !formData.appointmentDate || !formData.appointmentTime || !formData.instagram || isStudioClosed || isOutsideHours) && (
                        <p className="text-[10px] text-center opacity-50 uppercase font-bold mt-2">
                          {isStudioClosed 
                            ? `${t.studioClosedOnDay} (${selectedDayInfo?.dayLabel})` 
                            : isOutsideHours 
                              ? t.outsideHoursMsg 
                              : t.requiredFieldsWarning}
                        </p>
                      )}
                    </form>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isCustomModalOpen && selectedProductForCustom && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsCustomModalOpen(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-md"
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative w-full max-w-lg bg-[#ece6db] rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
            >
              <div className="p-6 border-b border-gray-200 flex items-center justify-between bg-white/30">
                <h2 className="text-2xl font-serif font-bold" style={{ color: '#000000' }}>{t.customCakeTitle}</h2>
                <button 
                  onClick={() => setIsCustomModalOpen(false)} 
                  className="p-2 hover:bg-white/50 rounded-full transition-colors"
                  style={{ color: '#000000' }}
                >
                  <X size={24} />
                </button>
              </div>
              
              <div className="p-6 overflow-y-auto space-y-8 custom-scrollbar">
                {selectedProductForCustom.ingredients && (
                  <div className="space-y-4">
                    <h3 className="text-sm font-bold uppercase tracking-wider" style={{ color: '#000000' }}>{t.excludeIngredients}</h3>
                    <div className="flex flex-wrap gap-2">
                      {selectedProductForCustom.ingredients.split(',').map((ingredient, idx) => {
                        const name = ingredient.trim();
                        const isSelected = mealSelections.removals.includes(name);
                        return (
                          <button 
                            key={idx}
                            onClick={() => {
                              if (isSelected) {
                                setMealSelections({
                                  ...mealSelections,
                                  removals: mealSelections.removals.filter(r => r !== name)
                                });
                              } else {
                                setMealSelections({
                                  ...mealSelections,
                                  removals: [...mealSelections.removals, name]
                                });
                              }
                            }}
                            className={cn(
                              "px-4 py-2 rounded-full border-2 font-bold transition-all text-sm",
                              isSelected 
                                ? "bg-red-500 border-red-500 text-white shadow-md" 
                                : "bg-white/50 border-transparent text-black"
                            )}
                          >
                            {name}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {selectedProductForCustom.allowedSides && selectedProductForCustom.allowedSides.length > 0 && (
                  <div className="space-y-4">
                    <h3 className="text-sm font-bold uppercase tracking-wider" style={{ color: '#000000' }}>{t.chooseSides}</h3>
                    <div className="grid grid-cols-1 gap-2">
                      {selectedProductForCustom.allowedSides.map(sideId => {
                        const side = sides.find(s => s.id === sideId);
                        if (!side) return null;
                        const isSelected = mealSelections.sides.some(s => s.id === side.id);
                        return (
                          <button 
                            key={side.id}
                            onClick={() => {
                              if (isSelected) {
                                setMealSelections({
                                  ...mealSelections,
                                  sides: mealSelections.sides.filter(s => s.id !== side.id)
                                });
                              } else {
                                setMealSelections({
                                  ...mealSelections,
                                  sides: [...mealSelections.sides, side]
                                });
                              }
                            }}
                            className={cn(
                              "p-4 rounded-xl border-2 font-bold transition-all flex justify-between items-center",
                              isSelected 
                                ? "bg-white border-blue-500 text-blue-600 shadow-md" 
                                : "bg-white/50 border-transparent text-black"
                            )}
                          >
                            <span>{side.name}</span>
                            <span className="text-xs opacity-60">
                              {side.price > 0 ? `+ ${currencySymbol} ${side.price.toFixed(2).replace('.', ',')}` : 'Grátis'}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              <div className="p-6 bg-white/30 border-t border-gray-200">
                <button 
                  onClick={addMealToCart}
                  className="w-full py-4 rounded-2xl text-white font-bold text-lg shadow-xl transition-transform active:scale-95"
                  style={{ backgroundColor: settings.primaryColor }}
                >
                  {t.addToCart}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
          </motion.div>
        )}
        {/* Modal de Descrição Completa */}
        {showDescriptionModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              onClick={() => setShowDescriptionModal(null)}
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative w-full max-w-md bg-white rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]"
            >
              <div className="relative h-72 shrink-0">
                <img 
                  src={showDescriptionModal.image} 
                  className="w-full h-full object-cover" 
                  alt={showDescriptionModal.title}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-black/15" />
                
                {/* Close Button */}
                <button 
                  onClick={() => setShowDescriptionModal(null)}
                  className="absolute top-4 right-4 w-9 h-9 flex items-center justify-center rounded-full bg-black/40 hover:bg-black/60 text-white border border-white/20 hover:border-white/40 transition-all focus:outline-none"
                >
                  <X size={18} />
                </button>

                {/* Title & Duration Overlay */}
                <div className="absolute bottom-5 left-5 right-5 text-white">
                  <h2 className="text-2xl font-serif font-bold leading-tight text-white">{showDescriptionModal.title}</h2>
                  {showDescriptionModal.duration && (
                    <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-white/90 mt-1.5">
                      <Clock size={12} className="opacity-80" />
                      <span>{formatDuration(showDescriptionModal.duration)}</span>
                    </div>
                  )}
                </div>
              </div>
              
              <div className="p-6 overflow-y-auto">
                <div className="space-y-4">
                  <h3 className="font-bold text-gray-400 uppercase text-[10px] tracking-widest">
                    {t.aboutProcedure || 'ABOUT THIS PROCEDURE'}
                  </h3>
                  <p className="text-gray-700 leading-relaxed font-serif text-sm italic whitespace-pre-wrap">
                    {showDescriptionModal.description}
                  </p>
                </div>
                
                <hr className="border-t border-black/10 my-6" />

                <div className="flex flex-col items-center justify-center text-center">
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">
                    {t.startingAt || 'STARTING AT'}
                  </span>
                  <span className="text-3xl font-extrabold text-black font-sans">
                    {currencySymbol} {showDescriptionModal.price.toFixed(2).replace('.', ',')}
                  </span>
                  
                  <button 
                    onClick={() => {
                      addToCart(showDescriptionModal);
                      setShowDescriptionModal(null);
                    }}
                    className="w-full py-4 rounded-xl text-white font-bold text-sm tracking-wider uppercase mt-6 transition-all flex items-center justify-center gap-2 active:scale-[0.98] cursor-pointer hover:brightness-110"
                    style={{ backgroundColor: settings.primaryColor || '#865d39' }}
                  >
                    {t.scheduleService || 'SCHEDULE THIS SERVICE'}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
