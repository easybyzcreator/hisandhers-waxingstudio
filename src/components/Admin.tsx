import React, { useState, useEffect, useMemo, useRef } from 'react';
import { db, auth } from '../firebase';
import { 
  collection, onSnapshot, addDoc, updateDoc, deleteDoc, doc, setDoc, 
  query, orderBy 
} from 'firebase/firestore';
import { signInAnonymously } from 'firebase/auth';
import { Product, Order, Settings, Category, Side, BusinessHours } from '../types';
import { 
  Settings as SettingsIcon, Package, History, LogOut, Plus, Trash2, Edit2, 
  Save, X, Copy, CheckCircle2, Loader2, Layers, Image as ImageIcon,
  ArrowUp, ArrowDown, ArrowUpDown, MessageCircle, Calendar, Printer, Cake, Eye, EyeOff,
  DollarSign, Coins, ChevronDown, ChevronUp, ChevronLeft, ChevronRight, Search, Users, Clock
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { QRCodeSVG } from 'qrcode.react';
import { cn } from '../lib/utils';
import { toast } from 'sonner';
import { DEFAULT_LOGO } from '../constants';
import { formatDateTimeInSC, formatDateInSC } from '../lib/dateTime';

export default function Admin({ settings, setSettings, setIsAdmin }: { 
  settings: Settings, 
  setSettings: React.Dispatch<React.SetStateAction<Settings>>,
  setIsAdmin: React.Dispatch<React.SetStateAction<boolean>>
}) {
  const mainRef = useRef<HTMLElement>(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [password, setPassword] = useState('');
  const [activeTab, setActiveTab] = useState<'settings' | 'menu' | 'orders' | 'categories' | 'sides' | 'customers' | 'sorting'>('orders');
  const [sortGender, setSortGender] = useState<'feminino' | 'masculino' | 'ambos'>('feminino');
  const [sortCategoryId, setSortCategoryId] = useState<string>('');
  const [sides, setSides] = useState<Side[]>([]);
  const [newSide, setNewSide] = useState<Partial<Side>>({ name: '', price: 0 });
  const [isEditingSide, setIsEditingSide] = useState<Side | null>(null);
  const [sidePriceInput, setSidePriceInput] = useState('');
  
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const [isEditingProduct, setIsEditingProduct] = useState<Product | null>(null);
  const [newProduct, setNewProduct] = useState<Omit<Product, 'id'>>({
    title: '',
    description: '',
    price: 0,
    oldPrice: 0,
    priceType: 'fixed',
    duration: 0,
    gender: 'feminino',
    image: '',
    categoryId: '',
    isMeal: false,
    ingredients: '',
    allowedSides: [],
    isActive: true
  });
  const [priceInput, setPriceInput] = useState('');

  const [isEditingCategory, setIsEditingCategory] = useState<Category | null>(null);
  const [newCategory, setNewCategory] = useState({ title: '', order: 0 });

  const [copied, setCopied] = useState(false);
  const [orderSearch, setOrderSearch] = useState('');
  const [customerSearch, setCustomerSearch] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [showBirthdaysOnly, setShowBirthdaysOnly] = useState(false);
  const [showBatchSummary, setShowBatchSummary] = useState(false);
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'completed'>('pending');
  const [paymentFilter, setPaymentFilter] = useState<'all' | 'pending' | 'paid'>('all');
  const [isEditingOrder, setIsEditingOrder] = useState<Order | null>(null);
  const [isEditingCustomer, setIsEditingCustomer] = useState<any | null>(null);
  const [editCustomerForm, setEditCustomerForm] = useState<any>({});
  const [editOrderForm, setEditOrderForm] = useState<Partial<Order>>({});
  const [oldPriceInput, setOldPriceInput] = useState('');
  const [expandedOrders, setExpandedOrders] = useState<string[]>([]);
  const [isAttendingOrder, setIsAttendingOrder] = useState<Order | null>(null);
  const [attendingStep, setAttendingStep] = useState(1);
  const [showGiftVoucher, setShowGiftVoucher] = useState(false);
  const [calendarReferenceDate, setCalendarReferenceDate] = useState<Date>(() => new Date());
  const [calendarSearch, setCalendarSearch] = useState<string>('');
  const [selectedCalendarOrder, setSelectedCalendarOrder] = useState<Order | null>(null);
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {}
  });

  const uniqueCustomers = useMemo(() => {
    const customerMap = new Map<string, {
      name: string;
      phone: string;
      instagram?: string;
      email: string;
      birthday: string;
      address: string;
      orderLanguage?: string;
      lastOrder: any;
      totalOrders: number;
      totalSpent: number;
    }>();

    orders.forEach(order => {
      const key = order.phone || order.email || order.customerName;
      if (!customerMap.has(key)) {
        customerMap.set(key, {
          name: order.customerName,
          phone: order.phone,
          instagram: order.instagram,
          email: order.email,
          birthday: order.birthday,
          address: order.address,
          orderLanguage: order.orderLanguage,
          lastOrder: order.createdAt,
          totalOrders: 1,
          totalSpent: order.total || 0
        });
      } else {
        const existing = customerMap.get(key)!;
        existing.totalOrders += 1;
        existing.totalSpent += (order.total || 0);
        if (order.createdAt?.toDate && existing.lastOrder?.toDate) {
          if (order.createdAt.toDate() > existing.lastOrder.toDate()) {
            existing.lastOrder = order.createdAt;
            existing.name = order.customerName;
            existing.instagram = order.instagram;
            existing.birthday = order.birthday;
            existing.address = order.address;
            existing.orderLanguage = order.orderLanguage;
          }
        }
      }
    });

    return Array.from(customerMap.values());
  }, [orders]);

  const getOrderDateKey = (order: Order): string | null => {
    const raw = order.appointmentDate || order.pickupDate;
    if (raw) {
      const iso = raw.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
      if (iso) {
        const y = iso[1];
        const m = iso[2].padStart(2, '0');
        const d = iso[3].padStart(2, '0');
        return `${y}-${m}-${d}`;
      }
      const slash = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
      if (slash) {
        let p1 = parseInt(slash[1]);
        let p2 = parseInt(slash[2]);
        let y = slash[3];
        let m = p1;
        let d = p2;
        if (p1 > 12) {
          d = p1;
          m = p2;
        } else if (order.orderLanguage === 'en' || settings.language === 'en') {
          m = p1;
          d = p2;
        }
        return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      }
    }
    if (order.createdAt) {
      let dt: Date | null = null;
      if (typeof order.createdAt.toDate === 'function') {
        dt = order.createdAt.toDate();
      } else if (order.createdAt instanceof Date) {
        dt = order.createdAt;
      } else if (typeof order.createdAt === 'string') {
        dt = new Date(order.createdAt);
      }
      if (dt && !isNaN(dt.getTime())) {
        const y = dt.getFullYear();
        const m = String(dt.getMonth() + 1).padStart(2, '0');
        const d = String(dt.getDate()).padStart(2, '0');
        return `${y}-${m}-${d}`;
      }
    }
    return null;
  };

  const handleResendWhatsApp = (order: Order) => {
    const lang = order.orderLanguage || settings.language || 'pt';
    const localizedMsgs = {
      pt: { hello: 'Olá', summary: 'segue o resumo do seu agendamento para', total: 'Total', items: 'Serviços:' },
      en: { hello: 'Hello', summary: 'here is the summary of your appointment for', total: 'Total', items: 'Services:' },
      es: { hello: 'Hola', summary: 'aquí está el resumen de su cita para', total: 'Total', items: 'Servicios:' }
    };
    const t = localizedMsgs[lang as keyof typeof localizedMsgs] || localizedMsgs.pt;

    let m = `*${t.hello} ${order.customerName}*, ${t.summary} *${order.appointmentDate || order.pickupDate}* às *${order.appointmentTime || ''}*.\n\n`;
    m += `*${t.items}*\n`;
    (order.items || []).forEach(item => {
      m += `- ${item.title} (${currencySymbol} ${item.price.toFixed(2)})\n`;
    });
    m += `\n*${t.total}: ${currencySymbol} ${order.total?.toFixed(2)}*`;

    const cleanPhone = (order.phone || '').replace(/\D/g, '');
    const url = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(m)}`;

    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    if (isMobile) {
      window.location.assign(url);
    } else {
      window.open(url, '_blank');
    }
  };

  const currentWeekDays = useMemo(() => {
    const ref = new Date(calendarReferenceDate);
    const dayOfWeek = ref.getDay(); // 0 is Sunday, 6 is Saturday
    const sunday = new Date(ref);
    sunday.setDate(ref.getDate() - dayOfWeek);
    sunday.setHours(0, 0, 0, 0);

    const days: { date: Date; dateStr: string; dayName: string; formattedDate: string; isToday: boolean }[] = [];
    const dayNames = ['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SÁB'];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (let i = 0; i < 7; i++) {
      const d = new Date(sunday);
      d.setDate(sunday.getDate() + i);
      const isToday = d.getFullYear() === today.getFullYear() && 
                      d.getMonth() === today.getMonth() && 
                      d.getDate() === today.getDate();
      
      const dd = String(d.getDate()).padStart(2, '0');
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const yyyy = d.getFullYear();

      days.push({
        date: d,
        dateStr: `${yyyy}-${mm}-${dd}`,
        dayName: dayNames[i],
        formattedDate: `${dd}/${mm}`,
        isToday
      });
    }
    return days;
  }, [calendarReferenceDate]);

  const weekRangeTitle = useMemo(() => {
    if (currentWeekDays.length < 7) return '';
    const start = currentWeekDays[0].date;
    const end = currentWeekDays[6].date;
    const monthsPt = [
      'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
      'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
    ];
    if (start.getMonth() === end.getMonth()) {
      return `Semana de ${start.getDate()} a ${end.getDate()} de ${monthsPt[end.getMonth()]} de ${end.getFullYear()}`;
    } else {
      return `Semana de ${start.getDate()} de ${monthsPt[start.getMonth()]} a ${end.getDate()} de ${monthsPt[end.getMonth()]} de ${end.getFullYear()}`;
    }
  }, [currentWeekDays]);

  const ordersByDayKey = useMemo(() => {
    const map = new Map<string, Order[]>();
    orders.forEach(order => {
      if (calendarSearch.trim()) {
        const q = calendarSearch.toLowerCase();
        const nameMatch = (order.customerName || '').toLowerCase().includes(q);
        const phoneMatch = (order.phone || '').includes(q);
        const serviceMatch = (order.items || []).some(it => it.title.toLowerCase().includes(q));
        if (!nameMatch && !phoneMatch && !serviceMatch) return;
      }
      const key = getOrderDateKey(order);
      if (key) {
        const list = map.get(key) || [];
        list.push(order);
        map.set(key, list);
      }
    });
    return map;
  }, [orders, calendarSearch, settings.language]);

  const totalOrdersInWeek = useMemo(() => {
    let count = 0;
    currentWeekDays.forEach(d => {
      const list = ordersByDayKey.get(d.dateStr) || [];
      count += list.length;
    });
    return count;
  }, [currentWeekDays, ordersByDayKey]);

  const slugify = (text: string) => {
    return text
      .toString()
      .toLowerCase()
      .trim()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/\s+/g, '-')
      .replace(/[^\w-]+/g, '')
      .replace(/--+/g, '-');
  };

  const handleBrandNameChange = (name: string) => {
    setSettings(prev => ({
      ...prev,
      brandName: name,
      slug: slugify(name)
    }));
  };

  const handleWhatsappChange = (value: string) => {
    const digits = value.replace(/\D/g, '');
    let formatted = digits;
    
    if (settings.whatsappCountryCode === '+55') {
      // BR: (XX) XXXXX-XXXX
      if (digits.length <= 11) {
        formatted = digits.replace(/^(\d{2})(\d)/g, '($1) $2');
        formatted = formatted.replace(/(\d{5})(\d)/, '$1-$2');
      } else {
        formatted = digits.slice(0, 11).replace(/^(\d{2})(\d)/g, '($1) $2');
        formatted = formatted.replace(/(\d{5})(\d)/, '$1-$2');
      }
    } else if (settings.whatsappCountryCode === '+1') {
      // USA: (XXX) XXX-XXXX
      if (digits.length <= 10) {
        formatted = digits.replace(/^(\d{3})(\d)/g, '($1) $2');
        formatted = formatted.replace(/(\d{3})(\d)/, '$1-$2');
      } else {
        formatted = digits.slice(0, 10).replace(/^(\d{3})(\d)/g, '($1) $2');
        formatted = formatted.replace(/(\d{3})(\d)/, '$1-$2');
      }
    }
    
    setSettings(prev => ({ ...prev, whatsappNumber: formatted }));
  };

  useEffect(() => {
    if (!isLoggedIn) return;
    setLoading(true);

    const unsubProducts = onSnapshot(query(collection(db, 'produtos'), orderBy('title')), (snapshot) => {
      setProducts(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Product)));
      setLoading(false);
    });

    const unsubCategories = onSnapshot(query(collection(db, 'categorias'), orderBy('order', 'asc')), (snapshot) => {
      setCategories(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Category)));
    });

    const unsubOrders = onSnapshot(query(collection(db, 'pedidos'), orderBy('createdAt', 'desc')), (snapshot) => {
      setOrders(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Order)));
    });

    const unsubSides = onSnapshot(collection(db, 'acompanhamentos'), (snapshot) => {
      setSides(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Side)));
    });

    return () => {
      unsubProducts();
      unsubCategories();
      unsubOrders();
      unsubSides();
    };
  }, [isLoggedIn]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const correctPassword = 'admin123';
    if (password === correctPassword) {
      try {
        await signInAnonymously(auth);
        setIsLoggedIn(true);
        toast.success('Login realizado com sucesso!');
      } catch (error) {
        console.error('Erro ao autenticar com Firebase:', error);
        toast.error('Erro ao conectar com o servidor. Tente novamente.');
      }
    } else {
      toast.error('Senha incorreta!');
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, callback: (base64: string) => void, isGallery: boolean = false) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const img = new Image();
        img.src = reader.result as string;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;
          const MAX_WIDTH = isGallery ? 800 : 1200;
          const MAX_HEIGHT = isGallery ? 800 : 1200;
          if (width > height) {
            if (width > MAX_WIDTH) {
              height *= MAX_WIDTH / width;
              width = MAX_WIDTH;
            }
          } else {
            if (height > MAX_HEIGHT) {
              width *= MAX_HEIGHT / height;
              height = MAX_HEIGHT;
            }
          }
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, width, height);
          const compressedBase64 = canvas.toDataURL('image/jpeg', isGallery ? 0.5 : 0.7);
          callback(compressedBase64);
        };
      };
      reader.readAsDataURL(file);
    }
  };

  const saveSettings = async () => {
    if (isSaving) return;
    setIsSaving(true);
    try {
      await setDoc(doc(db, 'configuracoes', 'geral'), settings);
      toast.success('Configurações salvas com sucesso!');
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      console.error('Erro ao salvar configurações:', err);
      toast.error('Erro ao salvar configurações.');
    } finally {
      setTimeout(() => setIsSaving(false), 500);
    }
  };

  const handlePriceChange = (value: string) => {
    const digits = value.replace(/\D/g, '');
    if (!digits) {
      setPriceInput('0,00');
      setNewProduct(prev => ({ ...prev, price: 0 }));
      return;
    }
    const numericValue = parseInt(digits) / 100;
    const formatted = numericValue.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    setPriceInput(formatted);
    setNewProduct(prev => ({ ...prev, price: numericValue }));
  };

  const handleOldPriceChange = (value: string) => {
    const digits = value.replace(/\D/g, '');
    if (!digits) {
      setOldPriceInput('0,00');
      setNewProduct(prev => ({ ...prev, oldPrice: 0 }));
      return;
    }
    const numericValue = parseInt(digits) / 100;
    const formatted = numericValue.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    setOldPriceInput(formatted);
    setNewProduct(prev => ({ ...prev, oldPrice: numericValue }));
  };

  const handleAddProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (!newProduct.title || !newProduct.categoryId) {
        toast.error(settings.language === 'en' ? 'Please fill in the title and category.' : 'Por favor, preencha o título e a categoria.');
        return;
      }
      if (isEditingProduct) {
        await updateDoc(doc(db, 'produtos', isEditingProduct.id), newProduct);
        setIsEditingProduct(null);
        toast.success(settings.language === 'en' ? 'Service updated successfully!' : 'Serviço atualizado com sucesso!');
      } else {
        await addDoc(collection(db, 'produtos'), { ...newProduct, isActive: true });
        toast.success(settings.language === 'en' ? 'Service added successfully!' : 'Serviço adicionado com sucesso!');
      }
      setNewProduct({ 
        title: '', description: '', price: 0, image: '', categoryId: '', isMeal: false,
        ingredients: '', allowedSides: [], isActive: true, oldPrice: 0, duration: 0,
        gender: 'feminino'
      });
      setPriceInput('');
      setOldPriceInput('');
    } catch (err) {
      toast.error(settings.language === 'en' ? 'Error saving service.' : 'Erro ao salvar serviço.');
    }
  };

  const toggleProductStatus = async (product: Product) => {
    try {
      await updateDoc(doc(db, 'produtos', product.id), { isActive: product.isActive === false ? true : false });
    } catch (err) {
      alert('Erro ao alterar status do produto.');
    }
  };

  const moveCategory = async (id: string, direction: 'up' | 'down') => {
    const index = categories.findIndex(c => c.id === id);
    if (index === -1) return;
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === categories.length - 1) return;
    const otherIndex = direction === 'up' ? index - 1 : index + 1;
    const current = categories[index];
    const other = categories[otherIndex];
    const currentOrder = current.order ?? index;
    const otherOrder = other.order ?? otherIndex;
    let newCurrentOrder = otherOrder;
    let newOtherOrder = currentOrder;
    if (newCurrentOrder === newOtherOrder) {
      newCurrentOrder = direction === 'up' ? newOtherOrder - 1 : newOtherOrder + 1;
    }
    await updateDoc(doc(db, 'categorias', current.id), { order: newCurrentOrder });
    await updateDoc(doc(db, 'categorias', other.id), { order: newOtherOrder });
  };

  const moveProductInSort = async (prodId: string, direction: 'up' | 'down', currentFilteredList: Product[]) => {
    const idx = currentFilteredList.findIndex(p => p.id === prodId);
    if (idx === -1) return;
    const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (targetIdx < 0 || targetIdx >= currentFilteredList.length) return;

    const reordered = [...currentFilteredList];
    const itemA = reordered[idx];
    const itemB = reordered[targetIdx];
    reordered[idx] = itemB;
    reordered[targetIdx] = itemA;

    const updates = reordered.map((item, index) => ({
      id: item.id,
      order: index + 1
    }));

    setProducts(prev => {
      return prev.map(p => {
        const found = updates.find(u => u.id === p.id);
        if (found) {
          return { ...p, order: found.order };
        }
        return p;
      });
    });

    try {
      await Promise.all(
        updates.map(u => updateDoc(doc(db, 'produtos', u.id), { order: u.order }))
      );
      toast.success('Ordem atualizada!');
    } catch (err) {
      toast.error('Erro ao salvar ordenação');
    }
  };

  const handleAddSide = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSide.name) return;
    try {
      if (isEditingSide) {
        await updateDoc(doc(db, 'acompanhamentos', isEditingSide.id), newSide);
        toast.success('Acompanhamento atualizado!');
      } else {
        await addDoc(collection(db, 'acompanhamentos'), newSide);
        toast.success('Acompanhamento adicionado!');
      }
      setNewSide({ name: '', price: 0 });
      setSidePriceInput('');
      setIsEditingSide(null);
    } catch (error) {
      toast.error('Erro ao salvar acompanhamento');
    }
  };

  const deleteSide = (id: string) => {
    setConfirmModal({
      isOpen: true,
      title: 'Excluir Acompanhamento',
      message: 'Tem certeza que deseja excluir este acompanhamento?',
      onConfirm: async () => {
        try {
          await deleteDoc(doc(db, 'acompanhamentos', id));
          toast.success('Acompanhamento excluído!');
          setConfirmModal(prev => ({ ...prev, isOpen: false }));
        } catch (error) {
          toast.error('Erro ao excluir');
        }
      }
    });
  };

  const handleSidePriceChange = (val: string) => {
    setSidePriceInput(val);
    const numeric = parseFloat(val.replace(',', '.'));
    if (!isNaN(numeric)) setNewSide({ ...newSide, price: numeric });
  };

  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (!newCategory.title) {
        toast.error(settings.language === 'en' ? 'Please fill in the category title.' : 'Por favor, preencha o título da categoria.');
        return;
      }
      if (isEditingCategory) {
        await updateDoc(doc(db, 'categorias', isEditingCategory.id), { title: newCategory.title });
        setIsEditingCategory(null);
        toast.success(settings.language === 'en' ? 'Category updated successfully!' : 'Categoria atualizada com sucesso!');
      } else {
        const maxOrder = categories.reduce((max, c) => Math.max(max, c.order || 0), 0);
        await addDoc(collection(db, 'categorias'), { title: newCategory.title, order: maxOrder + 1 });
        toast.success(settings.language === 'en' ? 'Category added successfully!' : 'Categoria adicionada com sucesso!');
      }
      setNewCategory({ title: '', order: 0 });
    } catch (err: any) {
      toast.error('Erro ao salvar categoria.');
    }
  };

  const deleteProduct = async (id: string) => {
    setConfirmModal({
      isOpen: true,
      title: 'Excluir Produto',
      message: 'Deseja realmente excluir este produto?',
      onConfirm: async () => {
        try {
          await deleteDoc(doc(db, 'produtos', id));
          setConfirmModal(prev => ({ ...prev, isOpen: false }));
        } catch (err) {
          alert('Erro ao excluir produto.');
        }
      }
    });
  };

  const deleteCategory = async (id: string) => {
    setConfirmModal({
      isOpen: true,
      title: 'Excluir Categoria',
      message: 'Deseja realmente excluir esta categoria?',
      onConfirm: async () => {
        try {
          await deleteDoc(doc(db, 'categorias', id));
          setConfirmModal(prev => ({ ...prev, isOpen: false }));
        } catch (err) {
          alert('Erro ao excluir categoria.');
        }
      }
    });
  };

  const deleteOrder = async (id: string) => {
    setConfirmModal({
      isOpen: true,
      title: 'Excluir Pedido',
      message: 'Deseja realmente excluir este pedido?',
      onConfirm: async () => {
        try {
          await deleteDoc(doc(db, 'pedidos', id));
          setConfirmModal(prev => ({ ...prev, isOpen: false }));
        } catch (err) {
          alert('Erro ao excluir pedido.');
        }
      }
    });
  };

  const deleteCustomer = async (customer: any) => {
    const customerId = customer.phone || customer.email || customer.name;
    const customerOrders = orders.filter(o => (o.phone || o.email || o.customerName) === customerId);
    try {
      setIsSaving(true);
      for (const order of customerOrders) await deleteDoc(doc(db, 'pedidos', order.id));
      toast.success('Cliente e seus pedidos excluídos com sucesso!');
    } catch (error) {
      toast.error('Erro ao excluir cliente');
    } finally {
      setIsSaving(false);
      setConfirmModal(prev => ({ ...prev, isOpen: false }));
    }
  };

  const updateCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    const originalId = isEditingCustomer.phone || isEditingCustomer.email || isEditingCustomer.name;
    const customerOrders = orders.filter(o => (o.phone || o.email || o.customerName) === originalId);
    try {
      setIsSaving(true);
      for (const order of customerOrders) {
        await updateDoc(doc(db, 'pedidos', order.id), {
          customerName: editCustomerForm.name, phone: editCustomerForm.phone, email: editCustomerForm.email,
          birthday: editCustomerForm.birthday, address: editCustomerForm.address
        });
      }
      toast.success('Informações do cliente atualizadas!');
      setIsEditingCustomer(null);
    } catch (error) {
      toast.error('Erro ao atualizar cliente');
    } finally {
      setIsSaving(false);
    }
  };

  const handleEditOrder = (e?: React.FormEvent, sendWhatsApp: boolean = false) => {
    if (e) e.preventDefault();
    if (!isEditingOrder || !editOrderForm) return;
    try {
      const updatedOrder = { ...editOrderForm };
      
      // Auto-set payment status based on pending amount
      if (updatedOrder.pendingAmount && updatedOrder.pendingAmount > 0) {
        updatedOrder.paymentStatus = 'pending';
      } else if (updatedOrder.paymentStatus === 'pending' && (!updatedOrder.pendingAmount || updatedOrder.pendingAmount === 0)) {
        updatedOrder.paymentStatus = 'paid';
      }

      updateDoc(doc(db, 'pedidos', isEditingOrder.id), updatedOrder)
        .then(() => {
          toast.success('Agendamento atualizado!');
        })
        .catch(err => {
          console.error(err);
          toast.error('Erro ao atualizar agendamento.');
        });

      if (sendWhatsApp) {
        const order = updatedOrder;
        const lang = order.orderLanguage || settings.language || 'pt';
        const localizedMsgs = {
          pt: { update: 'houve uma atualização no seu agendamento para', items: 'Serviços:' },
          en: { update: 'there is an update to your appointment for', items: 'Services:' },
          es: { update: 'hay una actualización en su cita para', items: 'Servicios:' }
        };
        const t = localizedMsgs[lang as keyof typeof localizedMsgs] || localizedMsgs.pt;

        let msg = `Olá *${order.customerName}*, ${t.update} *${order.appointmentDate}* às *${order.appointmentTime}*.\n\n`;
        msg += `*${t.items}*\n`;
        (order.items || []).forEach((item: any) => {
          msg += `- ${item.title} (${currencySymbol} ${item.price.toFixed(2)})\n`;
        });
        msg += `\nTotal: *${currencySymbol} ${order.total?.toFixed(2)}*`;
        
        const url = `https://wa.me/${order.phone?.replace(/\D/g, '')}?text=${encodeURIComponent(msg)}`;
        
        // Robust redirect for iOS (completely synchronous in user's click thread)
        const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
        if (isMobile) {
          window.location.assign(url);
        } else {
          window.open(url, '_blank');
        }
      }

      setIsEditingOrder(null);
    } catch (err) {
      console.error(err);
      toast.error('Erro ao processar agendamento.');
    }
  };

  const toggleOrder = (orderId: string) => {
    setExpandedOrders(prev => prev.includes(orderId) ? prev.filter(id => id !== orderId) : [...prev, orderId]);
  };

  const copyLink = () => {
    const url = `${window.location.origin}/?slug=${settings?.slug || 'easy-menu'}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const printOrder = (order: Order) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    const dateStr = order.createdAt ? formatDateTimeInSC(order.createdAt, 'en-US') : (order.appointmentDate || 'N/A');
    let itemsHtml = order.items.map(item => `
      <div style="display: flex; justify-content: space-between; border-bottom: 1px dashed #ccc; padding: 4px 0;">
        <span>${item.quantity}x ${item.title}</span>
        <span>${currencySymbol} ${(item.price * item.quantity).toFixed(2).replace('.', ',')}</span>
      </div>
      ${item.mealOptions ? `
        <div style="font-size: 10px; color: #666; margin-left: 10px; margin-bottom: 4px;">
          ${item.mealOptions.removals.length > 0 ? `<div>Remover: ${item.mealOptions.removals.join(', ')}</div>` : ''}
          ${item.mealOptions.sides.length > 0 ? `<div>Acompanhamentos: ${item.mealOptions.sides.map(s => s.name).join(', ')}</div>` : ''}
        </div>
      ` : ''}
    `).join('');
    printWindow.document.write(`
      <html>
        <head>
          <title>Comanda - ${order.customerName}</title>
          <style>
            body { font-family: 'Courier New', Courier, monospace; width: 80mm; padding: 5mm; margin: 0; }
            .header { text-align: center; border-bottom: 2px solid #000; padding-bottom: 10px; margin-bottom: 10px; }
            .section { margin-bottom: 10px; }
            .label { font-weight: bold; font-size: 12px; }
            .value { font-size: 12px; }
            .total { text-align: right; font-weight: bold; font-size: 16px; border-top: 2px solid #000; padding-top: 10px; margin-top: 10px; }
          </style>
        </head>
        <body>
          <div class="header"><h2>${settings.brandName}</h2><p>${dateStr}</p></div>
          <div class="section"><div class="label">CLIENTE:</div><div class="value">${order.customerName}</div></div>
          <div class="section"><div class="label">TELEFONE:</div><div class="value">${order.phone}</div></div>
          <div class="section"><div class="label">ENDEREÇO:</div><div class="value">${order.address}</div></div>
          <div class="section"><div class="label">ITENS:</div><div>${itemsHtml}</div></div>
          <div class="total">TOTAL: ${currencySymbol} ${order.total.toFixed(2).replace('.', ',')}</div>
          <script>window.onload = () => { window.print(); window.onafterprint = () => window.close(); };</script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const isBirthdayThisWeek = (birthdayStr: string, orderLanguage?: string) => {
    if (!birthdayStr) return false;
    const parts = birthdayStr.split('/');
    if (parts.length < 2) return false;
    const lang = orderLanguage || settings.language;
    let day, month;
    if (lang === 'en') {
      month = parseInt(parts[0]) - 1; day = parseInt(parts[1]);
      if (month > 11) { day = parseInt(parts[0]); month = parseInt(parts[1]) - 1; }
    } else {
      day = parseInt(parts[0]); month = parseInt(parts[1]) - 1;
      if (month > 11) { month = parseInt(parts[0]) - 1; day = parseInt(parts[1]); }
    }
    if (isNaN(day) || isNaN(month) || month < 0 || month > 11) return false;
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const bdayThisYear = new Date(today.getFullYear(), month, day);
    const diffDays = Math.ceil((bdayThisYear.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays >= 0 && diffDays <= 7) return true;
    const bdayNextYear = new Date(today.getFullYear() + 1, month, day);
    const diffDaysNext = Math.ceil((bdayNextYear.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    return diffDaysNext >= 0 && diffDaysNext <= 7;
  };

  const filteredOrders = orders.filter(order => {
    const matchesSearch = order.customerName.toLowerCase().includes(orderSearch.toLowerCase());
    const matchesStatus = statusFilter === 'all' || order.status === statusFilter;
    const matchesPayment = paymentFilter === 'all' || 
      order.paymentStatus === paymentFilter || 
      (paymentFilter === 'pending' && (order.pendingAmount || 0) > 0);
    const parseDateString = (str: string, lang: string) => {
      if (!str || !str.includes('/')) return null;
      const parts = str.split('/');
      if (parts.length !== 3) return null;
      let d, m, y;
      if (lang === 'en') { m = parseInt(parts[0]); d = parseInt(parts[1]); y = parseInt(parts[2]); }
      else { d = parseInt(parts[0]); m = parseInt(parts[1]); y = parseInt(parts[2]); }
      if (!d || !m || !y || m > 12) return null;
      const date = new Date(y, m - 1, d); date.setHours(0, 0, 0, 0);
      return date;
    };
    let matchesDate = true;
    if (startDate || endDate) {
      let orderDate = order.pickupDate ? parseDateString(order.pickupDate, order.orderLanguage || settings.language || 'pt') : null;
      if (!orderDate && order.createdAt?.toDate) { orderDate = order.createdAt.toDate(); orderDate.setHours(0, 0, 0, 0); }
      if (orderDate) {
        if (startDate) { const start = parseDateString(startDate, settings.language || 'pt'); if (start && orderDate < start) matchesDate = false; }
        if (endDate) { const end = parseDateString(endDate, settings.language || 'pt'); if (end && orderDate > end) matchesDate = false; }
      } else matchesDate = false;
    }
    return matchesSearch && matchesDate && matchesStatus && matchesPayment;
  });

  const batchSummary = useMemo(() => {
    const summary: { [key: string]: number } = {};
    const sidesSummary: { [key: string]: number } = {};
    filteredOrders.forEach(order => {
      order.items.forEach(item => {
        summary[item.title] = (summary[item.title] || 0) + item.quantity;
        if (item.mealOptions?.sides) item.mealOptions.sides.forEach(side => sidesSummary[side.name] = (sidesSummary[side.name] || 0) + item.quantity);
      });
    });
    return { items: summary, sides: sidesSummary };
  }, [filteredOrders]);

  const currencySymbol = settings?.currency === 'USD' ? '$' : 'R$';

  if (!isLoggedIn) {
    return (
      <div className="flex-grow flex items-center justify-center p-4">
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="glass p-8 rounded-3xl w-full max-w-md shadow-2xl">
          <div className="flex flex-col items-center mb-8">
            <div className="h-24 w-24 flex items-center justify-center mb-4 rounded-full overflow-hidden border-2 border-white shadow-md bg-white">
              <img src={settings?.logo || DEFAULT_LOGO} alt="Logo" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
            </div>
            <h1 className="text-2xl font-serif font-bold opacity-90">Painel adm - HIS & HERS</h1>
          </div>
          <form onSubmit={handleLogin} className="space-y-4">
            <input type="password" placeholder="Senha de acesso" className="w-full p-4 rounded-xl border border-gray-300 focus:ring-2 outline-none" value={password} onChange={e => setPassword(e.target.value)} />
            <button type="submit" className="w-full py-4 rounded-xl text-white font-bold text-lg shadow-lg" style={{ backgroundColor: settings?.primaryColor || '#865d39' }}>Entrar</button>
          </form>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="flex-grow flex flex-col md:flex-row w-full overflow-x-hidden">
      <div className="w-full md:w-64 glass border-r border-white/20 p-4 md:p-6 flex flex-col gap-4 shrink-0">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 flex items-center justify-center rounded-full overflow-hidden border border-white/50 bg-white shadow-sm">
            <img src={settings?.logo || DEFAULT_LOGO} alt="Logo" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
          </div>
          <span className="font-serif font-bold text-lg opacity-90">{settings?.brandName || 'Easy Waxing'}</span>
        </div>
        <nav className="flex flex-col gap-2">
          {[
            { id: 'orders', icon: History, label: 'Agendamentos' },
            { id: 'customers', icon: Users, label: 'Clientes' },
            { id: 'categories', icon: Layers, label: 'Categorias' },
            { id: 'menu', icon: Package, label: 'Catálogo' },
            { id: 'sorting', icon: ArrowUpDown, label: 'Organizar Itens' },
            { id: 'settings', icon: SettingsIcon, label: 'Configurações' }
          ].map(tab => {
            const isActive = activeTab === tab.id;
            return (
              <button 
                key={tab.id} 
                type="button"
                onClick={() => setActiveTab(tab.id as any)} 
                className={cn(
                  "flex items-center gap-3 p-3 rounded-xl transition-all font-semibold cursor-pointer", 
                  isActive ? "!text-white shadow-lg font-bold" : "text-neutral-800 hover:bg-white/30"
                )} 
                style={isActive ? { backgroundColor: settings?.primaryColor || '#865d39', color: '#ffffff' } : {}}
              >
                <tab.icon size={20} className={isActive ? "!text-white shrink-0" : "shrink-0"} /> 
                <span className={isActive ? "!text-white" : ""}>{tab.label}</span>
              </button>
            );
          })}
        </nav>
        <button onClick={() => { setIsLoggedIn(false); setIsAdmin(false); window.history.pushState({}, '', '/'); }} className="mt-auto flex items-center gap-3 p-3 rounded-xl hover:bg-red-50 text-red-600 transition-all font-bold">
          <LogOut size={20} /> Sair
        </button>
      </div>

      <main ref={mainRef} className="flex-grow p-4 md:p-10 overflow-y-auto overflow-x-hidden min-w-0">
        {activeTab === 'settings' && (
          <div className="max-w-3xl space-y-8 pb-10">
            <h2 className="text-3xl font-serif font-bold">Configurações</h2>
            <div className="glass p-6 rounded-2xl space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-sm font-bold uppercase opacity-60">Logo</label>
                  <div className="flex items-center gap-4">
                    <div className="w-20 h-20 rounded-full bg-white p-1 border border-gray-200 flex items-center justify-center overflow-hidden shadow-sm">
                      <img src={settings?.logo} alt="Preview" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    </div>
                    <div className="flex flex-col gap-2">
                      <div className="flex gap-2">
                        <input type="file" id="logo-upload" accept="image/*" onChange={e => handleFileChange(e, (b64) => setSettings({...settings, logo: b64}))} className="hidden" />
                        <label htmlFor="logo-upload" className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-xs font-bold cursor-pointer hover:bg-gray-50 text-black">Selecionar</label>
                        <button 
                          onClick={() => setSettings({...settings, logo: DEFAULT_LOGO})}
                          className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-xs font-bold hover:bg-gray-50 text-black"
                        >
                          Voltar imagem padrão
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold uppercase opacity-60">Cor Primária</label>
                  <div className="flex items-center gap-3">
                    <input type="color" value={settings?.primaryColor || '#865d39'} onChange={e => setSettings({...settings, primaryColor: e.target.value})} className="w-12 h-12 p-1 rounded-lg cursor-pointer border border-gray-200" />
                    <input type="text" className="flex-grow p-3 rounded-xl border border-gray-300 font-mono text-sm bg-white/50" value={settings?.primaryColor || ''} onChange={e => setSettings({...settings, primaryColor: e.target.value})} />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-sm font-bold uppercase opacity-60">Nome da Marca</label>
                  <textarea 
                    rows={2}
                    className="w-full p-3 rounded-xl border border-gray-300 resize-none" 
                    value={settings?.brandName || ''} 
                    onChange={e => handleBrandNameChange(e.target.value)} 
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold uppercase opacity-60">Slug (URL)</label>
                  <input type="text" className="w-full p-3 rounded-xl border border-gray-300" value={settings?.slug || ''} onChange={e => setSettings({...settings, slug: slugify(e.target.value)})} />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="grid grid-cols-3 gap-2">
                  <div className="space-y-2 col-span-1">
                    <label className="text-sm font-bold uppercase opacity-60">DDI</label>
                    <select className="w-full p-3 rounded-xl border border-gray-300 bg-white" value={settings?.whatsappCountryCode || ''} onChange={e => {
                      const newDdi = e.target.value;
                      setSettings(prev => ({ ...prev, whatsappCountryCode: newDdi }));
                      // Re-mask existing number with new DDI
                      if (settings.whatsappNumber) {
                        const digits = settings.whatsappNumber.replace(/\D/g, '');
                        let formatted = digits;
                        if (newDdi === '+55') {
                          if (digits.length <= 11) {
                            formatted = digits.replace(/^(\d{2})(\d)/g, '($1) $2');
                            formatted = formatted.replace(/(\d{5})(\d)/, '$1-$2');
                          } else {
                            formatted = digits.slice(0, 11).replace(/^(\d{2})(\d)/g, '($1) $2');
                            formatted = formatted.replace(/(\d{5})(\d)/, '$1-$2');
                          }
                        } else if (newDdi === '+1') {
                          if (digits.length <= 10) {
                            formatted = digits.replace(/^(\d{3})(\d)/g, '($1) $2');
                            formatted = formatted.replace(/(\d{3})(\d)/, '$1-$2');
                          } else {
                            formatted = digits.slice(0, 10).replace(/^(\d{3})(\d)/g, '($1) $2');
                            formatted = formatted.replace(/(\d{3})(\d)/, '$1-$2');
                          }
                        }
                        setSettings(prev => ({ ...prev, whatsappNumber: formatted, whatsappCountryCode: newDdi }));
                      }
                    }}>
                      <option value="+55">BR (+55)</option>
                      <option value="+1">USA (+1)</option>
                    </select>
                  </div>
                  <div className="space-y-2 col-span-2">
                    <label className="text-sm font-bold uppercase opacity-60">WhatsApp</label>
                    <input type="text" className="w-full p-3 rounded-xl border border-gray-300" value={settings?.whatsappNumber || ''} onChange={e => handleWhatsappChange(e.target.value)} />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold uppercase opacity-60">Idioma</label>
                  <select className="w-full p-3 rounded-xl border border-gray-300 bg-white" value={settings?.language} onChange={e => setSettings({...settings, language: e.target.value as any})}>
                    <option value="pt">Português</option>
                    <option value="en">Inglês</option>
                    <option value="es">Espanhol</option>
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold uppercase opacity-60">Slogan</label>
                <textarea rows={2} className="w-full p-3 rounded-xl border border-gray-300" value={settings?.slogan || ''} onChange={e => setSettings({...settings, slogan: e.target.value})} />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold uppercase opacity-60">Slogan do Pop-up de Boas Vindas</label>
                <textarea 
                  rows={2} 
                  className="w-full p-3 rounded-xl border border-gray-300" 
                  value={settings?.welcomeSlogan || ''} 
                  placeholder="Bem-vindo ao seu momento de cuidado. Escolha como deseja começar:"
                  onChange={e => setSettings({...settings, welcomeSlogan: e.target.value})} 
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold uppercase opacity-60">Mensagem Final WhatsApp (Pós-Venda)</label>
                <textarea rows={4} className="w-full p-3 rounded-xl border border-gray-300" value={settings?.whatsappClosingMessage || ''} onChange={e => setSettings({...settings, whatsappClosingMessage: e.target.value})} />
                <p className="text-[10px] opacity-40">Esta mensagem será enviada logo após o resumo do pedido no WhatsApp (Checkout Cliente).</p>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold uppercase opacity-60">Mensagem de Conclusão (WhatsApp)</label>
                <textarea rows={4} className="w-full p-3 rounded-xl border border-gray-300" value={settings?.whatsappCompletionMessage || ''} onChange={e => setSettings({...settings, whatsappCompletionMessage: e.target.value})} />
                <p className="text-[10px] opacity-40">Esta mensagem opcional pode ser usada ao finalizar um agendamento no painel.</p>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold uppercase opacity-60">Imagem de Fundo</label>
                <div className="flex items-center gap-4">
                  {settings?.backgroundImage && (
                    <div className="w-20 h-12 rounded-lg bg-gray-100 border border-gray-200 flex items-center justify-center overflow-hidden shadow-sm">
                      <img src={settings?.backgroundImage} alt="Preview" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    </div>
                  )}
                  <input type="file" id="bg-upload" accept="image/*" onChange={e => handleFileChange(e, (b64) => setSettings({...settings, backgroundImage: b64}))} className="hidden" />
                  <label htmlFor="bg-upload" className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-xs font-bold cursor-pointer hover:bg-gray-50 text-black">Selecionar Imagem</label>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-sm font-bold uppercase opacity-60">Moeda</label>
                  <select className="w-full p-3 rounded-xl border border-gray-300 bg-white" value={settings?.currency} onChange={e => setSettings({...settings, currency: e.target.value as any})}>
                    <option value="BRL">Real (R$)</option>
                    <option value="USD">Dólar ($)</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold uppercase opacity-60">Senha Administrativa</label>
                  <input type="text" className="w-full p-3 rounded-xl border border-gray-300" value={settings?.adminPassword || ''} onChange={e => setSettings({...settings, adminPassword: e.target.value})} />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold uppercase opacity-60">Título do Checkout</label>
                <textarea rows={2} className="w-full p-3 rounded-xl border border-gray-300" value={settings?.checkoutTitle || ''} onChange={e => setSettings({...settings, checkoutTitle: e.target.value})} />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-sm font-bold uppercase opacity-60">Bloco Info 1 (Título)</label>
                  <input type="text" className="w-full p-3 rounded-xl border border-gray-300" value={settings?.infoBlock1Title || ''} onChange={e => setSettings({...settings, infoBlock1Title: e.target.value})} />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold uppercase opacity-60">Bloco Info 1 (Texto)</label>
                  <textarea rows={2} className="w-full p-3 rounded-xl border border-gray-300" value={settings?.infoBlock1Text || ''} onChange={e => setSettings({...settings, infoBlock1Text: e.target.value})} />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-sm font-bold uppercase opacity-60">Bloco Info 2 (Título)</label>
                  <input type="text" className="w-full p-3 rounded-xl border border-gray-300" value={settings?.infoBlock2Title || ''} onChange={e => setSettings({...settings, infoBlock2Title: e.target.value})} />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold uppercase opacity-60">Bloco Info 2 (Texto)</label>
                  <textarea rows={2} className="w-full p-3 rounded-xl border border-gray-300" value={settings?.infoBlock2Text || ''} onChange={e => setSettings({...settings, infoBlock2Text: e.target.value})} />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-sm font-bold uppercase opacity-60">Cor do Vidro (RGBA)</label>
                  <div className="flex items-center gap-3">
                    <input type="color" value={settings?.glassColor?.startsWith('#') ? settings.glassColor : '#ffffff'} onChange={e => setSettings({...settings, glassColor: e.target.value})} className="w-12 h-12 p-1 rounded-lg cursor-pointer border border-gray-200" />
                    <input type="text" className="flex-grow p-3 rounded-xl border border-gray-300 font-mono text-sm bg-white/50" value={settings?.glassColor || ''} onChange={e => setSettings({...settings, glassColor: e.target.value})} />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold uppercase opacity-60">Cor do Texto</label>
                  <select className="w-full p-3 rounded-xl border border-gray-300 bg-white" value={settings?.textColor || '#000000'} onChange={e => setSettings({...settings, textColor: e.target.value})}>
                    <option value="#000000">Preto</option>
                    <option value="#ffffff">Branco</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-2">
                  <label className="text-sm font-bold uppercase opacity-60">Zelle QR</label>
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-lg bg-white p-1 border border-gray-200 flex items-center justify-center overflow-hidden shadow-sm">
                      {settings?.zelleQR ? (
                        <img src={settings.zelleQR} alt="Zelle QR" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                      ) : (
                        <div className="text-[10px] text-center opacity-40">Sem QR</div>
                      )}
                    </div>
                    <div className="flex flex-col gap-1">
                      <input type="file" id="zelle-upload" accept="image/*" onChange={e => handleFileChange(e, (b64) => setSettings({...settings, zelleQR: b64}))} className="hidden" />
                      <label htmlFor="zelle-upload" className="px-3 py-1.5 bg-white border border-gray-300 rounded-lg text-[10px] font-bold cursor-pointer hover:bg-gray-50 text-black">Selecionar</label>
                      {settings?.zelleQR && (
                        <button onClick={() => setSettings({...settings, zelleQR: ''})} className="text-[10px] text-red-500 font-bold hover:underline">Remover</button>
                      )}
                    </div>
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold uppercase opacity-60">Venmo QR</label>
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-lg bg-white p-1 border border-gray-200 flex items-center justify-center overflow-hidden shadow-sm">
                      {settings?.venmoQR ? (
                        <img src={settings.venmoQR} alt="Venmo QR" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                      ) : (
                        <div className="text-[10px] text-center opacity-40">Sem QR</div>
                      )}
                    </div>
                    <div className="flex flex-col gap-1">
                      <input type="file" id="venmo-upload" accept="image/*" onChange={e => handleFileChange(e, (b64) => setSettings({...settings, venmoQR: b64}))} className="hidden" />
                      <label htmlFor="venmo-upload" className="px-3 py-1.5 bg-white border border-gray-300 rounded-lg text-[10px] font-bold cursor-pointer hover:bg-gray-50 text-black">Selecionar</label>
                      {settings?.venmoQR && (
                        <button onClick={() => setSettings({...settings, venmoQR: ''})} className="text-[10px] text-red-500 font-bold hover:underline">Remover</button>
                      )}
                    </div>
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold uppercase opacity-60">PayPal QR</label>
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-lg bg-white p-1 border border-gray-200 flex items-center justify-center overflow-hidden shadow-sm">
                      {settings?.paypalQR ? (
                        <img src={settings.paypalQR} alt="PayPal QR" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                      ) : (
                        <div className="text-[10px] text-center opacity-40">Sem QR</div>
                      )}
                    </div>
                    <div className="flex flex-col gap-1">
                      <input type="file" id="paypal-upload" accept="image/*" onChange={e => handleFileChange(e, (b64) => setSettings({...settings, paypalQR: b64}))} className="hidden" />
                      <label htmlFor="paypal-upload" className="px-3 py-1.5 bg-white border border-gray-300 rounded-lg text-[10px] font-bold cursor-pointer hover:bg-gray-50 text-black">Selecionar</label>
                      {settings?.paypalQR && (
                        <button onClick={() => setSettings({...settings, paypalQR: ''})} className="text-[10px] text-red-500 font-bold hover:underline">Remover</button>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-4 pt-4 border-t border-black/10">
                <div className="flex items-center gap-2">
                  <Clock size={20} className="opacity-70" />
                  <h3 className="text-xl font-serif font-bold">Horários de Atendimento (Por Dia da Semana)</h3>
                </div>
                <p className="text-xs opacity-60">
                  Defina os horários de funcionamento do estúdio para cada dia. O cliente será impedido no checkout de agendar em dias fechados ou fora do expediente.
                </p>
                <div className="space-y-3">
                  {[
                    { key: 'monday' as const, label: 'Segunda-feira (Mon)' },
                    { key: 'tuesday' as const, label: 'Terça-feira (Tue)' },
                    { key: 'wednesday' as const, label: 'Quarta-feira (Wed)' },
                    { key: 'thursday' as const, label: 'Quinta-feira (Thu)' },
                    { key: 'friday' as const, label: 'Sexta-feira (Fri)' },
                    { key: 'saturday' as const, label: 'Sábado (Sat)' },
                    { key: 'sunday' as const, label: 'Domingo (Sun)' }
                  ].map(({ key, label }) => {
                    const schedule = settings?.businessHours?.[key] ?? {
                      isOpen: key !== 'sunday',
                      openTime: '09:00 AM',
                      closeTime: key === 'saturday' ? '05:00 PM' : '06:00 PM'
                    };

                    return (
                      <div key={key} className="p-4 bg-white rounded-xl border border-gray-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs">
                        <div className="flex items-center gap-3">
                          <button
                            type="button"
                            onClick={() => {
                              const current = settings.businessHours || {};
                              setSettings({
                                ...settings,
                                businessHours: {
                                  ...current,
                                  [key]: {
                                    isOpen: !schedule.isOpen,
                                    openTime: schedule.openTime || '09:00 AM',
                                    closeTime: schedule.closeTime || '06:00 PM'
                                  }
                                }
                              });
                            }}
                            className={cn(
                              "px-3 py-1.5 rounded-lg text-xs font-bold transition-all",
                              schedule.isOpen ? "bg-green-600 text-white" : "bg-neutral-200 text-neutral-600"
                            )}
                          >
                            {schedule.isOpen ? 'ABERTO' : 'FECHADO'}
                          </button>
                          <span className="font-bold text-sm text-black">{label}</span>
                        </div>

                        {schedule.isOpen ? (
                          <div className="flex items-center gap-2 text-xs flex-wrap">
                            <span className="opacity-60 text-black">Abertura:</span>
                            <input
                              type="text"
                              placeholder="09:00 AM"
                              className="w-24 p-2 rounded-lg border text-center font-bold text-black bg-white"
                              value={schedule.openTime || '09:00 AM'}
                              onChange={e => {
                                const current = settings.businessHours || {};
                                setSettings({
                                  ...settings,
                                  businessHours: {
                                    ...current,
                                    [key]: { ...schedule, openTime: e.target.value }
                                  }
                                });
                              }}
                            />
                            <span className="opacity-60 text-black">até</span>
                            <input
                              type="text"
                              placeholder="06:00 PM"
                              className="w-24 p-2 rounded-lg border text-center font-bold text-black bg-white"
                              value={schedule.closeTime || '06:00 PM'}
                              onChange={e => {
                                const current = settings.businessHours || {};
                                setSettings({
                                  ...settings,
                                  businessHours: {
                                    ...current,
                                    [key]: { ...schedule, closeTime: e.target.value }
                                  }
                                });
                              }}
                            />
                          </div>
                        ) : (
                          <span className="text-xs text-red-500 font-bold bg-red-50 px-3 py-1.5 rounded-lg border border-red-100">
                            Fechado (Sem atendimentos neste dia)
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="glass rounded-3xl p-6 sm:p-8 space-y-6">
                <div>
                  <h3 className="text-2xl font-serif font-medium">Link do Cardápio & QR Code</h3>
                  <p className="text-xs opacity-60 mt-1">Compartilhe o link direto com clientes ou disponibilize o QR Code para leitura com a câmera.</p>
                </div>

                <div className="flex flex-col sm:flex-row items-center gap-6 p-6 bg-white rounded-2xl border border-gray-200 shadow-sm">
                  <div className="p-3 bg-white border border-gray-200 rounded-2xl shadow-xs flex items-center justify-center shrink-0">
                    <QRCodeSVG 
                      value={`${window.location.origin}/?slug=${settings?.slug || 'easy-menu'}`} 
                      size={150} 
                      level="H" 
                      includeMargin 
                    />
                  </div>
                  <div className="space-y-3 text-center sm:text-left flex-1 min-w-0 w-full">
                    <h4 className="font-bold text-base text-black">QR Code do Cardápio do Cliente</h4>
                    <p className="text-xs opacity-60 text-black">
                      Ao mirar a câmera do celular no QR Code, o cliente será direcionado diretamente para a página de serviços e agendamentos.
                    </p>
                    <div className="p-3 bg-gray-50 border rounded-xl font-mono text-xs break-all text-neutral-800">
                      {`${window.location.origin}/?slug=${settings?.slug || 'easy-menu'}`}
                    </div>
                    <div className="flex flex-wrap gap-2 justify-center sm:justify-start pt-1">
                      <button 
                        type="button" 
                        onClick={copyLink} 
                        className="px-4 py-2 bg-black text-white rounded-xl text-xs font-bold hover:bg-black/80 flex items-center gap-2 transition-all cursor-pointer"
                      >
                        <Copy size={14} /> {copied ? 'COPIADO!' : 'COPIAR LINK'}
                      </button>
                      <a 
                        href={`${window.location.origin}/?slug=${settings?.slug || 'easy-menu'}`} 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        className="px-4 py-2 bg-neutral-100 text-black border border-neutral-300 rounded-xl text-xs font-bold hover:bg-neutral-200 flex items-center gap-2 transition-all"
                      >
                        <Eye size={14} /> ABRIR CARDÁPIO
                      </a>
                    </div>
                  </div>
                </div>
              </div>

              <button onClick={saveSettings} disabled={isSaving} className="flex items-center gap-2 px-8 py-3 rounded-xl !text-white font-bold shadow-lg disabled:opacity-50 cursor-pointer" style={{ backgroundColor: settings?.primaryColor || '#865d39', color: '#ffffff' }}>
                {isSaving ? <Loader2 className="animate-spin text-white" size={20} /> : <Save className="text-white" size={20} />} <span className="text-white">Salvar</span>
              </button>
            </div>
          </div>
        )}

        {activeTab === 'menu' && (
          <div className="space-y-8">
            <h2 className="text-3xl font-serif font-bold">Catálogo</h2>
            <form onSubmit={handleAddProduct} className="glass p-4 sm:p-8 rounded-2xl space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <input type="text" placeholder="Título" className="w-full p-3 rounded-xl border border-gray-300" value={newProduct.title} onChange={e => setNewProduct({...newProduct, title: e.target.value})} />
                  <textarea placeholder="Descrição" className="w-full p-3 rounded-xl border border-gray-300" rows={3} value={newProduct.description} onChange={e => setNewProduct({...newProduct, description: e.target.value})} />
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <input type="text" placeholder="Preço" className="w-full p-3 rounded-xl border border-gray-300" value={priceInput} onChange={e => handlePriceChange(e.target.value)} />
                    <input type="text" placeholder="Preço Promocional" className="w-full p-3 rounded-xl border border-gray-300" value={oldPriceInput} onChange={e => handleOldPriceChange(e.target.value)} />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="flex items-center gap-2">
                      <input 
                        type="number" 
                        placeholder="Horas" 
                        className="w-full p-3 rounded-xl border border-gray-300" 
                        value={Math.floor((newProduct.duration || 0) / 60) || ''} 
                        onChange={e => {
                          const h = parseInt(e.target.value) || 0;
                          const m = (newProduct.duration || 0) % 60;
                          setNewProduct({...newProduct, duration: h * 60 + m});
                        }} 
                      />
                      <span className="text-xs font-bold">h</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <input 
                        type="number" 
                        placeholder="Minutos" 
                        className="w-full p-3 rounded-xl border border-gray-300" 
                        value={(newProduct.duration || 0) % 60 || ''} 
                        onChange={e => {
                          const h = Math.floor((newProduct.duration || 0) / 60);
                          const m = parseInt(e.target.value) || 0;
                          setNewProduct({...newProduct, duration: h * 60 + m});
                        }} 
                      />
                      <span className="text-xs font-bold">min</span>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 gap-4">
                    <select className="w-full p-3 rounded-xl border border-gray-300 bg-white" value={newProduct.gender || 'ambos'} onChange={e => setNewProduct({...newProduct, gender: e.target.value as any})}>
                      <option value="ambos">Ambos</option>
                      <option value="feminino">Feminino</option>
                      <option value="masculino">Masculino</option>
                    </select>
                  </div>
                </div>
                <div className="space-y-4">
                  <select className="w-full p-3 rounded-xl border border-gray-300 bg-white" value={newProduct.categoryId} onChange={e => setNewProduct({...newProduct, categoryId: e.target.value})}>
                    <option value="">Categoria...</option>
                    {categories.map(cat => <option key={cat.id} value={cat.id}>{cat.title}</option>)}
                  </select>
                  <div className="flex items-center gap-4">
                    <div className="w-24 h-24 rounded-xl bg-white border border-gray-200 flex items-center justify-center overflow-hidden shrink-0">
                      {newProduct.image ? <img src={newProduct.image} className="w-full h-full object-cover" /> : <ImageIcon className="text-gray-300" size={32} />}
                    </div>
                    <div className="flex flex-col gap-2">
                      <input type="file" id="product-image" accept="image/*" onChange={e => handleFileChange(e, (b64) => setNewProduct({...newProduct, image: b64}))} className="hidden" />
                      <label htmlFor="product-image" className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-xs font-bold cursor-pointer text-black text-center">Imagem</label>
                    </div>
                  </div>
                </div>
              </div>
              <div className="flex gap-3">
                <button type="submit" className="w-full sm:w-auto px-8 py-3 rounded-xl !text-white font-bold shadow-lg cursor-pointer" style={{ backgroundColor: settings?.primaryColor || '#865d39', color: '#ffffff' }}>
                  <span className="text-white">{isEditingProduct ? 'Salvar' : 'Adicionar'}</span>
                </button>
                {isEditingProduct && (
                  <button 
                    type="button" 
                    onClick={() => {
                      setIsEditingProduct(null);
                      setNewProduct({
                        title: '',
                        description: '',
                        price: 0,
                        oldPrice: 0,
                        priceType: 'fixed',
                        duration: 0,
                        gender: 'feminino',
                        image: '',
                        categoryId: '',
                        isMeal: false,
                        ingredients: '',
                        allowedSides: [],
                        isActive: true,
                        order: 0
                      });
                      setPriceInput('');
                      setOldPriceInput('');
                    }} 
                    className="px-6 py-3 rounded-xl bg-gray-200 font-bold text-black hover:bg-gray-300"
                  >
                    Cancelar
                  </button>
                )}
              </div>
            </form>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {products.map(product => (
                <div key={product.id} className={cn("glass rounded-2xl overflow-hidden flex flex-col border", product.isActive === false ? "opacity-50 grayscale" : "border-white/20")}>
                  <div className="h-48 relative">
                    <img src={product.image} className="w-full h-full object-cover" />
                    <div className="absolute top-3 right-3 flex gap-2">
                      <button onClick={() => toggleProductStatus(product)} className="p-2 bg-white/90 rounded-full shadow-sm">{product.isActive === false ? <Eye size={18} /> : <EyeOff size={18} />}</button>
                      <button onClick={() => { 
                        setIsEditingProduct(product); 
                        setNewProduct(product); 
                        setPriceInput(product.price.toString()); 
                        setOldPriceInput(product.oldPrice?.toString() || '');
                        mainRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                      }} className="p-2 bg-white/90 rounded-full shadow-sm text-blue-600"><Edit2 size={18} /></button>
                      <button onClick={() => deleteProduct(product.id)} className="p-2 bg-white/90 rounded-full shadow-sm text-red-600"><Trash2 size={18} /></button>
                    </div>
                  </div>
                  <div className="p-5">
                    <h4 className="font-bold">{product.title}</h4>
                    <p className="text-sm opacity-60">{currencySymbol} {product.price.toFixed(2)}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'categories' && (
          <div className="max-w-2xl space-y-6">
            <div>
              <h2 className="text-3xl font-serif font-bold">Categorias</h2>
              <p className="text-sm opacity-60 mt-1">
                Cadastre e organize as categorias de serviços do seu estúdio.
              </p>
            </div>

            {/* Category creation / edit card */}
            <div className="bg-white/90 backdrop-blur-md p-6 rounded-2xl border border-neutral-200/90 shadow-xs space-y-3">
              <label className="text-xs font-bold uppercase tracking-wider text-neutral-500">
                {isEditingCategory ? 'Editar Categoria' : 'Nova Categoria'}
              </label>
              <form onSubmit={handleAddCategory} className="flex flex-col sm:flex-row gap-3">
                <input 
                  type="text" 
                  placeholder="Nome da categoria (ex: Facial, Corporal...)" 
                  className="flex-grow p-3.5 rounded-xl border border-neutral-300 bg-white text-sm focus:ring-2 focus:ring-black/20 outline-none" 
                  value={newCategory.title} 
                  onChange={e => setNewCategory({...newCategory, title: e.target.value})} 
                />
                <div className="flex gap-2">
                  <button 
                    type="submit" 
                    className="flex-1 sm:flex-none px-6 py-3.5 rounded-xl !text-white font-bold shadow-md flex items-center justify-center gap-2 hover:opacity-90 transition-opacity cursor-pointer shrink-0" 
                    style={{ backgroundColor: settings?.primaryColor || '#000000', color: '#ffffff' }}
                  >
                    {isEditingCategory ? (
                      <>
                        <Save size={18} className="text-white" />
                        <span className="text-white text-sm">Salvar</span>
                      </>
                    ) : (
                      <>
                        <Plus size={18} className="text-white" />
                        <span className="text-white text-sm">Adicionar</span>
                      </>
                    )}
                  </button>
                  {isEditingCategory && (
                    <button
                      type="button"
                      onClick={() => {
                        setIsEditingCategory(null);
                        setNewCategory({ title: '', order: 0 });
                      }}
                      className="px-4 py-3.5 rounded-xl bg-neutral-200 text-neutral-800 font-bold text-sm hover:bg-neutral-300 transition-colors"
                    >
                      Cancelar
                    </button>
                  )}
                </div>
              </form>
            </div>

            {/* List of categories in individual cards */}
            <div className="space-y-3">
              <div className="flex items-center justify-between px-1">
                <span className="text-xs font-bold uppercase tracking-wider text-neutral-500">
                  Categorias cadastradas ({categories.length})
                </span>
                <span className="text-xs text-neutral-400">
                  Use as setas para reordenar
                </span>
              </div>

              {categories.length === 0 ? (
                <div className="bg-white/80 rounded-2xl p-8 text-center border border-neutral-200">
                  <p className="font-bold text-neutral-600">Nenhuma categoria cadastrada ainda.</p>
                  <p className="text-xs text-neutral-400 mt-1">Crie a primeira categoria no campo acima.</p>
                </div>
              ) : (
                categories.map((cat, idx) => (
                  <div 
                    key={cat.id} 
                    className="bg-white/90 backdrop-blur-md p-4 sm:p-5 rounded-2xl border border-neutral-200 shadow-xs flex items-center justify-between gap-4 hover:shadow-md hover:border-neutral-300 transition-all"
                  >
                    <div className="flex items-center gap-3 sm:gap-4 min-w-0">
                      {/* Reorder arrows in integrated pill container */}
                      <div className="flex flex-col bg-neutral-100 rounded-xl p-1 border border-neutral-200/60 shrink-0">
                        <button 
                          type="button"
                          onClick={() => moveCategory(cat.id, 'up')} 
                          disabled={idx === 0} 
                          title="Subir posição"
                          className="p-1 rounded-md text-neutral-700 hover:bg-white hover:text-black hover:shadow-xs disabled:opacity-20 disabled:hover:bg-transparent transition-all cursor-pointer"
                        >
                          <ArrowUp size={14} />
                        </button>
                        <button 
                          type="button"
                          onClick={() => moveCategory(cat.id, 'down')} 
                          disabled={idx === categories.length - 1} 
                          title="Descer posição"
                          className="p-1 rounded-md text-neutral-700 hover:bg-white hover:text-black hover:shadow-xs disabled:opacity-20 disabled:hover:bg-transparent transition-all cursor-pointer"
                        >
                          <ArrowDown size={14} />
                        </button>
                      </div>

                      <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                        <span className="text-xs font-mono font-bold text-neutral-400 shrink-0">
                          #{idx + 1}
                        </span>
                        <span className="font-bold text-base text-neutral-900 truncate">
                          {cat.title}
                        </span>
                      </div>
                    </div>

                    {/* Actions in neat badges */}
                    <div className="flex items-center gap-2 shrink-0">
                      <button 
                        type="button"
                        onClick={() => { 
                          setIsEditingCategory(cat); 
                          setNewCategory(cat); 
                          mainRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
                          window.scrollTo({ top: 0, behavior: 'smooth' });
                        }} 
                        title="Editar categoria"
                        className="p-2.5 rounded-xl bg-blue-50 text-blue-600 hover:bg-blue-100 hover:text-blue-700 transition-colors border border-blue-100 cursor-pointer flex items-center justify-center shadow-xs"
                      >
                        <Edit2 size={16} />
                      </button>
                      <button 
                        type="button"
                        onClick={() => deleteCategory(cat.id)} 
                        title="Excluir categoria"
                        className="p-2.5 rounded-xl bg-red-50 text-red-600 hover:bg-red-100 hover:text-red-700 transition-colors border border-red-100 cursor-pointer flex items-center justify-center shadow-xs"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {activeTab === 'sorting' && (
          <div className="max-w-4xl space-y-6">
            <div>
              <h2 className="text-3xl font-serif font-bold">Organizar Itens do Cardápio</h2>
              <p className="text-sm opacity-60 mt-1">
                Defina a ordem exata em que cada serviço aparecerá no cardápio do cliente, separado por cardápio (Feminino / Masculino) e por categoria.
              </p>
            </div>

            <div className="glass p-6 rounded-2xl space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold uppercase opacity-60">Cardápio / Público</label>
                  <div className="flex bg-gray-100 p-1 rounded-xl">
                    <button
                      type="button"
                      onClick={() => setSortGender('feminino')}
                      className={cn("flex-1 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer", sortGender === 'feminino' ? "bg-black !text-white shadow-xs" : "hover:bg-gray-200 text-black")}
                      style={{ color: sortGender === 'feminino' ? '#ffffff' : '#111827' }}
                    >
                      Feminino
                    </button>
                    <button
                      type="button"
                      onClick={() => setSortGender('masculino')}
                      className={cn("flex-1 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer", sortGender === 'masculino' ? "bg-black !text-white shadow-xs" : "hover:bg-gray-200 text-black")}
                      style={{ color: sortGender === 'masculino' ? '#ffffff' : '#111827' }}
                    >
                      Masculino
                    </button>
                    <button
                      type="button"
                      onClick={() => setSortGender('ambos')}
                      className={cn("flex-1 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer", sortGender === 'ambos' ? "bg-black !text-white shadow-xs" : "hover:bg-gray-200 text-black")}
                      style={{ color: sortGender === 'ambos' ? '#ffffff' : '#111827' }}
                    >
                      Ambos / Geral
                    </button>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold uppercase opacity-60">Filtrar por Categoria</label>
                  <select
                    className="w-full p-2.5 rounded-xl border border-gray-300 bg-white text-sm font-medium"
                    value={sortCategoryId}
                    onChange={e => setSortCategoryId(e.target.value)}
                  >
                    <option value="">Todas as Categorias</option>
                    {categories.map(cat => (
                      <option key={cat.id} value={cat.id}>{cat.title}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* List of items to reorder */}
            <div className="space-y-3">
              {(() => {
                const filtered = products
                  .filter(p => {
                    const matchGender = sortGender === 'ambos' 
                      ? true 
                      : (p.gender === sortGender || p.gender === 'ambos' || !p.gender);
                    const matchCat = sortCategoryId ? p.categoryId === sortCategoryId : true;
                    return matchGender && matchCat;
                  })
                  .sort((a, b) => (a.order ?? 9999) - (b.order ?? 9999));

                if (filtered.length === 0) {
                  return (
                    <div className="p-12 text-center glass rounded-2xl space-y-2">
                      <p className="font-bold opacity-60">Nenhum serviço encontrado para este filtro.</p>
                      <p className="text-xs opacity-40">Selecione outra categoria ou cardápio acima.</p>
                    </div>
                  );
                }

                return filtered.map((product, idx) => {
                  const categoryName = categories.find(c => c.id === product.categoryId)?.title || 'Sem Categoria';

                  return (
                    <div 
                      key={product.id}
                      className="bg-white p-4 rounded-2xl border border-neutral-200 shadow-xs flex items-center justify-between gap-4 transition-all hover:border-black/40"
                    >
                      <div className="flex items-center gap-4 min-w-0">
                        {/* Position Badge */}
                        <div className="w-9 h-9 rounded-xl bg-neutral-100 border border-neutral-200 flex items-center justify-center font-bold text-xs text-neutral-800 shrink-0">
                          #{idx + 1}
                        </div>

                        {/* Arrows */}
                        <div className="flex flex-col gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={() => moveProductInSort(product.id, 'up', filtered)}
                            disabled={idx === 0}
                            className="p-1.5 rounded-lg border hover:bg-neutral-100 disabled:opacity-20 disabled:cursor-not-allowed transition-all cursor-pointer"
                            title="Mover para cima"
                          >
                            <ArrowUp size={14} />
                          </button>
                          <button
                            type="button"
                            onClick={() => moveProductInSort(product.id, 'down', filtered)}
                            disabled={idx === filtered.length - 1}
                            className="p-1.5 rounded-lg border hover:bg-neutral-100 disabled:opacity-20 disabled:cursor-not-allowed transition-all cursor-pointer"
                            title="Mover para baixo"
                          >
                            <ArrowDown size={14} />
                          </button>
                        </div>

                        {/* Thumbnail */}
                        <div className="w-12 h-12 rounded-xl bg-neutral-100 overflow-hidden border border-neutral-200 shrink-0 flex items-center justify-center">
                          {product.image ? (
                            <img src={product.image} alt={product.title} className="w-full h-full object-cover" />
                          ) : (
                            <ImageIcon size={18} className="opacity-30" />
                          )}
                        </div>

                        {/* Info */}
                        <div className="min-w-0">
                          <h4 className="font-bold text-sm truncate text-black">{product.title}</h4>
                          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                            <span className="text-[10px] px-2 py-0.5 rounded-md bg-neutral-100 text-neutral-700 font-bold uppercase">
                              {categoryName}
                            </span>
                            <span className="text-[10px] opacity-60 text-black">
                              {currencySymbol} {product.price?.toFixed(2)}
                            </span>
                            {product.gender && (
                              <span className="text-[10px] opacity-50 uppercase font-semibold text-black">
                                • {product.gender}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Status */}
                      <div className="shrink-0">
                        {product.isActive === false ? (
                          <span className="text-[10px] bg-red-50 text-red-600 px-2.5 py-1 rounded-full font-bold">Inativo</span>
                        ) : (
                          <span className="text-[10px] bg-green-50 text-green-700 px-2.5 py-1 rounded-full font-bold">Ativo</span>
                        )}
                      </div>
                    </div>
                  );
                });
              })()}
            </div>
          </div>
        )}

        {activeTab === 'customers' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <h2 className="text-3xl font-serif font-bold">Clientes</h2>
              <button onClick={() => setShowBirthdaysOnly(!showBirthdaysOnly)} className={cn("px-4 py-2 rounded-xl font-bold text-sm w-full sm:w-auto", showBirthdaysOnly ? "bg-pink-500 text-white" : "bg-white border")}>Aniversariantes</button>
            </div>
            <input type="text" placeholder="Buscar cliente..." className="w-full p-3 rounded-xl border" value={customerSearch} onChange={e => setCustomerSearch(e.target.value)} />
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {uniqueCustomers.filter(c => {
                  const matchesSearch = c.name.toLowerCase().includes(customerSearch.toLowerCase()) || c.phone.includes(customerSearch);
                  return showBirthdaysOnly ? matchesSearch && isBirthdayThisWeek(c.birthday, c.orderLanguage) : matchesSearch;
                }).map((customer, idx) => (
                  <div key={idx} className="bg-white p-6 rounded-3xl space-y-4 relative group border border-black/20 hover:border-black transition-all shadow-xs">
                    <div className="flex justify-between items-start">
                      <div className="flex-grow pr-4">
                        <h3 className="font-bold text-lg leading-tight">{customer.name}</h3>
                        <p className="text-sm opacity-60 flex items-center gap-1 mt-1"><MessageCircle size={12} /> {customer.phone}</p>
                        {customer.instagram && <p className="text-xs text-blue-600 flex items-center gap-1">@{customer.instagram}</p>}
                        {customer.email && <p className="text-[10px] opacity-40 break-all">{customer.email}</p>}
                      </div>
                      <div className="flex flex-col gap-2 shrink-0">
                        <button onClick={() => { setIsEditingCustomer(customer); setEditCustomerForm(customer); }} className="p-2 text-blue-600 bg-white rounded-lg shadow-sm border border-gray-100 hover:bg-blue-50"><Edit2 size={16} /></button>
                        <button onClick={() => { setConfirmModal({ isOpen: true, title: 'Excluir Cliente', message: `Excluir ${customer.name} e seus pedidos?`, onConfirm: () => deleteCustomer(customer) }); }} className="p-2 text-red-600 bg-white rounded-lg shadow-sm border border-gray-100 hover:bg-red-50"><Trash2 size={16} /></button>
                      </div>
                    </div>
                    <div className="flex justify-between items-end border-t border-black/5 pt-4">
                      {customer.birthday ? (
                        <div className="text-xs text-pink-600 font-bold flex items-center gap-1"><Cake size={12} /> {customer.birthday}</div>
                      ) : <div />}
                      <div className="flex flex-col items-end gap-1">
                        <div className="text-[10px] bg-white/50 px-2 py-1 rounded-full font-bold uppercase opacity-60">{customer.totalOrders} pedidos</div>
                        <div className="text-xs bg-green-50 text-green-700 px-2 py-1 rounded-full font-bold">
                          {currencySymbol} {customer.totalSpent?.toFixed(2)}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
          </div>
        )}

        {activeTab === 'orders' && (
          <div className="space-y-8">
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
              <h2 className="text-3xl font-serif font-bold">Agendamentos</h2>
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 w-full lg:w-auto">
                <div className="flex bg-white rounded-xl border p-1 w-full sm:w-auto overflow-x-auto">
                  <button onClick={() => setStatusFilter('pending')} className={cn("px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer", statusFilter === 'pending' ? "bg-black !text-white" : "text-black hover:bg-gray-100")} style={{ color: statusFilter === 'pending' ? '#ffffff' : '#111827' }}>Pendentes</button>
                  <button onClick={() => setStatusFilter('completed')} className={cn("px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer", statusFilter === 'completed' ? "bg-black !text-white" : "text-black hover:bg-gray-100")} style={{ color: statusFilter === 'completed' ? '#ffffff' : '#111827' }}>Finalizados</button>
                  <button onClick={() => setStatusFilter('all')} className={cn("px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer", statusFilter === 'all' ? "bg-black !text-white" : "text-black hover:bg-gray-100")} style={{ color: statusFilter === 'all' ? '#ffffff' : '#111827' }}>Todos</button>
                </div>
                <div className="flex bg-white rounded-xl border p-1 w-full sm:w-auto overflow-x-auto">
                  <button onClick={() => setPaymentFilter('pending')} className={cn("px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all whitespace-nowrap cursor-pointer", paymentFilter === 'pending' ? "bg-yellow-500 !text-white" : "text-black hover:bg-gray-100")} style={{ color: paymentFilter === 'pending' ? '#ffffff' : '#111827' }}>Pagamento Pendente</button>
                  <button onClick={() => setPaymentFilter('paid')} className={cn("px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all whitespace-nowrap cursor-pointer", paymentFilter === 'paid' ? "bg-green-600 !text-white" : "text-black hover:bg-gray-100")} style={{ color: paymentFilter === 'paid' ? '#ffffff' : '#111827' }}>Totalmente Pago</button>
                  <button onClick={() => setPaymentFilter('all')} className={cn("px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all whitespace-nowrap cursor-pointer", paymentFilter === 'all' ? "bg-gray-200 text-black" : "text-black hover:bg-gray-100")}>Todos</button>
                </div>
                <div className="flex gap-2 w-full sm:w-auto">
                  <input type="text" placeholder="Início" className="flex-1 sm:flex-none p-2 rounded-xl border text-sm w-full sm:w-28" value={startDate} onChange={e => setStartDate(e.target.value)} />
                  <input type="text" placeholder="Fim" className="flex-1 sm:flex-none p-2 rounded-xl border text-sm w-full sm:w-28" value={endDate} onChange={e => setEndDate(e.target.value)} />
                  <button onClick={() => setShowBatchSummary(!showBatchSummary)} className={cn("px-4 py-2 rounded-xl font-bold text-sm whitespace-nowrap", showBatchSummary ? "bg-blue-600 text-white" : "bg-white border")}>Resumo</button>
                </div>
              </div>
            </div>
          {showBatchSummary ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="glass p-6 rounded-2xl space-y-4">
                  <h3 className="font-bold border-b pb-2">Serviços</h3>
                  {Object.entries(batchSummary.items).map(([title, qty]) => <div key={title} className="flex justify-between"><span>{title}</span><span className="font-bold">{qty}x</span></div>)}
                </div>
                <div className="glass p-6 rounded-2xl space-y-4">
                  <h3 className="font-bold border-b pb-2">Extras</h3>
                  {Object.entries(batchSummary.sides).map(([name, qty]) => <div key={name} className="flex justify-between"><span>{name}</span><span className="font-bold">{qty}x</span></div>)}
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Calendar of Appointments (Image 4) */}
                <div className="bg-white/95 backdrop-blur-md rounded-3xl p-5 sm:p-7 border border-black/15 shadow-xs space-y-5">
                  <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100 shadow-xs shrink-0">
                        <Calendar size={24} />
                      </div>
                      <div>
                        <h3 className="text-xl sm:text-2xl font-serif font-bold text-neutral-900 leading-tight">
                          Cronograma de Agendamentos
                        </h3>
                        <p className="text-[10px] sm:text-[11px] font-bold tracking-wider uppercase text-neutral-400">
                          Visualização dinâmica dos agendamentos
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
                      {/* View indicator */}
                      <div className="hidden sm:flex bg-neutral-100 rounded-xl p-1 border border-neutral-200">
                        <span className="px-3 py-1.5 rounded-lg bg-white text-black font-bold text-xs shadow-xs">
                          Semana (7 Colunas)
                        </span>
                      </div>

                      {/* Navigation controls */}
                      <div className="flex items-center bg-neutral-100 rounded-xl p-1 border border-neutral-200">
                        <button 
                          type="button" 
                          onClick={() => setCalendarReferenceDate(prev => { const n = new Date(prev); n.setDate(n.getDate() - 7); return n; })}
                          title="Semana anterior"
                          className="p-1.5 rounded-lg hover:bg-white text-neutral-700 hover:text-black transition-colors cursor-pointer"
                        >
                          <ChevronLeft size={16} />
                        </button>
                        <button 
                          type="button" 
                          onClick={() => setCalendarReferenceDate(new Date())}
                          className="px-3 py-1 rounded-lg hover:bg-white text-neutral-800 font-bold text-xs transition-colors cursor-pointer"
                        >
                          Hoje
                        </button>
                        <button 
                          type="button" 
                          onClick={() => setCalendarReferenceDate(prev => { const n = new Date(prev); n.setDate(n.getDate() + 7); return n; })}
                          title="Próxima semana"
                          className="p-1.5 rounded-lg hover:bg-white text-neutral-700 hover:text-black transition-colors cursor-pointer"
                        >
                          <ChevronRight size={16} />
                        </button>
                      </div>

                      {/* Search in calendar */}
                      <div className="relative flex-1 sm:w-56">
                        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
                        <input 
                          type="text" 
                          placeholder="Filtrar cliente..." 
                          value={calendarSearch} 
                          onChange={e => setCalendarSearch(e.target.value)} 
                          className="w-full pl-8 pr-3 py-2 rounded-xl border border-neutral-200 bg-white text-xs text-neutral-800 placeholder-neutral-400 focus:outline-none focus:ring-1 focus:ring-black"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Subheader banner */}
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 pt-3 border-t border-neutral-100">
                    <span className="font-serif font-bold text-base sm:text-lg text-neutral-900">
                      {weekRangeTitle}
                    </span>
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200">
                      <span className="w-2 h-2 rounded-full bg-blue-600"></span> 
                      {totalOrdersInWeek} {totalOrdersInWeek === 1 ? 'AGENDAMENTO NO PERÍODO' : 'AGENDAMENTOS NO PERÍODO'}
                    </span>
                  </div>

                  {/* 7 Columns Grid */}
                  <div className="overflow-x-auto pb-2">
                    <div className="grid grid-cols-7 gap-3 min-w-[980px]">
                      {currentWeekDays.map(day => {
                        const dayOrders = ordersByDayKey.get(day.dateStr) || [];
                        return (
                          <div key={day.dateStr} className="flex flex-col space-y-2">
                            {/* Day Column Header */}
                            <div className={cn(
                              "flex flex-col items-center justify-center p-2.5 rounded-2xl border text-center transition-all",
                              day.isToday ? "bg-blue-50/70 border-blue-200" : "bg-neutral-100/70 border-neutral-200/80"
                            )}>
                              <span className={cn("text-xs font-bold uppercase tracking-wider", day.isToday ? "text-blue-700" : "text-neutral-600")}>
                                {day.dayName}
                              </span>
                              <div className="my-1">
                                {day.isToday ? (
                                  <span className="px-3 py-0.5 rounded-full bg-blue-600 text-white font-bold text-[11px] shadow-xs tracking-wide">
                                    {day.formattedDate} HOJE
                                  </span>
                                ) : (
                                  <span className="px-2.5 py-0.5 rounded-full bg-white text-neutral-800 font-bold text-[11px] border border-neutral-200">
                                    {day.formattedDate}
                                  </span>
                                )}
                              </div>
                              <span className="text-[10px] text-neutral-400">
                                {dayOrders.length} {dayOrders.length === 1 ? 'pedido' : 'pedidos'}
                              </span>
                            </div>

                            {/* Column Content */}
                            <div className="min-h-[280px] p-2 bg-neutral-50/60 rounded-2xl border border-neutral-200/80 flex flex-col gap-2">
                              {dayOrders.length === 0 ? (
                                <div className="flex-1 flex flex-col items-center justify-center text-neutral-300 py-10">
                                  <Clock size={18} className="opacity-40 mb-1" />
                                  <span className="text-[11px] opacity-70">Sem pedidos</span>
                                </div>
                              ) : (
                                dayOrders.map(order => (
                                  <div 
                                    key={order.id}
                                    onClick={() => setSelectedCalendarOrder(order)}
                                    className="bg-white rounded-xl p-3 border border-black/15 shadow-xs hover:shadow-md hover:border-black/50 transition-all cursor-pointer space-y-2 text-left group"
                                  >
                                    <div className="flex items-center justify-between gap-1">
                                      {order.status === 'completed' ? (
                                        <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-emerald-600 text-white">✓ ATENDIDO</span>
                                      ) : order.status === 'confirmed' ? (
                                        <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-blue-600 text-white">✓ CONFIRMADO</span>
                                      ) : (
                                        <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-amber-500 text-white">🕒 PENDENTE</span>
                                      )}
                                    </div>
                                    <div className="flex items-center gap-1 text-[11px] font-bold text-neutral-700">
                                      <Clock size={12} className="text-neutral-400 shrink-0" />
                                      <span>{order.appointmentTime || 'Horário a definir'}</span>
                                    </div>
                                    <div>
                                      <h5 className="font-bold text-xs text-neutral-900 uppercase truncate group-hover:text-black">
                                        {order.customerName}
                                      </h5>
                                      <p className="text-[10px] text-neutral-500 line-clamp-2 mt-0.5 leading-tight">
                                        {order.items?.map(it => `${it.quantity}x ${it.title}`).join(', ')}
                                      </p>
                                    </div>
                                    <div className="pt-2 border-t border-neutral-100 flex items-center justify-between text-[11px]">
                                      {order.paymentStatus === 'paid' ? (
                                        <span className="text-[9px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                                          Pago
                                        </span>
                                      ) : (
                                        <span className="text-[9px] font-bold text-red-700 bg-red-50 px-1.5 py-0.5 rounded border border-red-200">
                                          Pendente
                                        </span>
                                      )}
                                      <span className="font-bold text-xs text-neutral-900">
                                        {currencySymbol} {order.total?.toFixed(2)}
                                      </span>
                                    </div>
                                  </div>
                                ))
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* List of individual appointments with discreet border */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between px-1">
                    <span className="text-xs font-bold uppercase tracking-wider text-neutral-500">
                      Todos os Agendamentos Cadastrados ({filteredOrders.length})
                    </span>
                  </div>

                  {filteredOrders.map(order => (
                    <div key={order.id} className="bg-white/95 backdrop-blur-md p-6 rounded-2xl space-y-4 border border-black/15 shadow-xs hover:border-black/30 transition-all">
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="text-xl font-bold text-neutral-900">{order.customerName}</h3>
                            {isBirthdayThisWeek(order.birthday, order.orderLanguage) && <span className="bg-pink-100 text-pink-600 text-[10px] px-2 py-0.5 rounded-full font-bold">Aniversariante!</span>}
                          </div>
                          <p className="text-sm opacity-60 text-neutral-700">{order.phone}</p>
                          <p className="text-xs font-bold opacity-75 text-neutral-800">{order.appointmentDate || order.pickupDate || 'N/A'} {order.appointmentTime || ''}</p>
                          {order.createdAt && (
                            <p className="text-[10px] opacity-50 mt-0.5 text-neutral-500">Criado em: {formatDateTimeInSC(order.createdAt)} (SC)</p>
                          )}
                        </div>
                        <div className="flex flex-col sm:flex-row gap-2">
                          <button 
                            onClick={() => setIsAttendingOrder(order)} 
                            className="px-4 py-2 bg-black text-white rounded-xl text-sm font-bold inline-flex items-center justify-center gap-2 hover:bg-black/80 transition-all cursor-pointer shadow-xs"
                          >
                            <CheckCircle2 size={16} className="shrink-0" /> Atendimento
                          </button>
                          <div className="flex gap-2 justify-center">
                            <button onClick={() => printOrder(order)} className="p-2.5 sm:p-3 bg-white border border-neutral-300 rounded-xl hover:bg-neutral-50 flex items-center justify-center cursor-pointer shadow-xs" title="Imprimir Comanda"><Printer size={18} className="shrink-0" /></button>
                            <button onClick={() => { setIsEditingOrder(order); setEditOrderForm(order); }} className="p-2.5 sm:p-3 bg-white border border-neutral-300 rounded-xl text-blue-600 hover:bg-blue-50 flex items-center justify-center cursor-pointer shadow-xs" title="Editar Agendamento"><Edit2 size={18} className="shrink-0" /></button>
                            <button onClick={() => deleteOrder(order.id)} className="p-2.5 sm:p-3 bg-white border border-neutral-300 rounded-xl text-red-600 hover:bg-red-50 flex items-center justify-center cursor-pointer shadow-xs" title="Excluir"><Trash2 size={18} className="shrink-0" /></button>
                            <button onClick={() => toggleOrder(order.id)} className="p-2.5 sm:p-3 bg-white border border-neutral-300 rounded-xl flex items-center justify-center hover:bg-neutral-50 cursor-pointer shadow-xs">{expandedOrders.includes(order.id) ? <ChevronUp size={18} className="shrink-0" /> : <ChevronDown size={18} className="shrink-0" />}</button>
                          </div>
                        </div>
                      </div>
                      {expandedOrders.includes(order.id) && (
                        <div className="bg-neutral-50 rounded-xl p-4 space-y-3 border border-neutral-200">
                          {order.items.map((item, idx) => (
                            <div key={idx} className="flex justify-between border-b border-black/5 pb-2">
                              <div>
                                <div className="font-bold text-neutral-900">{item.quantity}x {item.title}</div>
                                {item.mealOptions && <div className="text-xs opacity-60">Remover: {item.mealOptions.removals.join(', ')} | Extras: {item.mealOptions.sides.map(s => s.name).join(', ')}</div>}
                              </div>
                              <span className="font-bold text-neutral-900">{currencySymbol} {(item.price * item.quantity).toFixed(2)}</span>
                            </div>
                          ))}
                            <div className="text-right flex flex-col items-end gap-2">
                              <div className="font-bold text-xl text-black">Total: {currencySymbol} {order.total.toFixed(2)}</div>
                              {order.paymentStatus === 'pending' && (
                                <div className="p-2 bg-yellow-100 text-yellow-800 rounded-lg text-[10px] font-bold">
                                  PENDENTE: {currencySymbol} {order.pendingAmount?.toFixed(2)} PARA {order.pendingDate}
                                </div>
                              )}
                              <div className="flex gap-2">
                                <button 
                                  onClick={() => handleResendWhatsApp(order)}
                                  className="px-3.5 py-2 bg-green-50 text-green-700 rounded-xl text-xs font-bold inline-flex items-center justify-center gap-1.5 hover:bg-green-100 border border-green-200 cursor-pointer transition-all"
                                >
                                  <MessageCircle size={14} className="shrink-0" /> Reenviar WhatsApp
                                </button>
                                <button 
                                  onClick={() => {
                                    setIsEditingOrder(order);
                                    setEditOrderForm(order);
                                  }}
                                  className="px-3.5 py-2 bg-blue-50 text-blue-700 rounded-xl text-xs font-bold inline-flex items-center justify-center gap-1.5 hover:bg-blue-100 border border-blue-200 cursor-pointer transition-all"
                                >
                                  <Edit2 size={14} className="shrink-0" /> Editar Agendamento
                                </button>
                              </div>
                            </div>
                          <div className="grid grid-cols-2 gap-4 text-sm mt-4">
                            <div><div className="font-bold opacity-40 uppercase text-[10px]">Observações</div><div className="p-2 bg-white/70 rounded border border-neutral-200 italic">{order.observation || '-'}</div></div>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      <AnimatePresence>
        {selectedCalendarOrder && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs">
            <div className="bg-white p-6 sm:p-8 rounded-3xl w-full max-w-2xl max-h-[90vh] overflow-y-auto space-y-6 shadow-2xl border border-neutral-300 text-neutral-900">
              {/* Header */}
              <div className="flex justify-between items-start border-b border-neutral-200 pb-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <h3 className="text-2xl font-serif font-bold text-black">{selectedCalendarOrder.customerName}</h3>
                    {isBirthdayThisWeek(selectedCalendarOrder.birthday, selectedCalendarOrder.orderLanguage) && (
                      <span className="bg-pink-100 text-pink-600 text-xs px-2.5 py-0.5 rounded-full font-bold flex items-center gap-1">
                        <Cake size={12} /> Aniversariante!
                      </span>
                    )}
                  </div>
                  <p className="text-xs font-semibold text-neutral-500">
                    Detalhes do Agendamento selecionado no calendário
                  </p>
                </div>
                <button 
                  type="button"
                  onClick={() => setSelectedCalendarOrder(null)} 
                  className="p-2 hover:bg-neutral-100 rounded-full transition-colors cursor-pointer text-neutral-500 hover:text-black"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Status and Info Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-neutral-50 p-4 rounded-2xl border border-neutral-200">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">Data e Horário</span>
                  <div className="text-sm font-bold text-neutral-900 mt-0.5 flex items-center gap-1.5">
                    <Calendar size={14} className="text-neutral-500 shrink-0" />
                    {selectedCalendarOrder.appointmentDate || selectedCalendarOrder.pickupDate || 'Data a definir'}
                    {selectedCalendarOrder.appointmentTime && ` às ${selectedCalendarOrder.appointmentTime}`}
                  </div>
                  {selectedCalendarOrder.createdAt && (
                    <span className="text-[10px] text-neutral-400 block mt-0.5">
                      Criado em: {formatDateTimeInSC(selectedCalendarOrder.createdAt)} (SC)
                    </span>
                  )}
                </div>

                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">Telefone / WhatsApp</span>
                  <div className="text-sm font-bold text-neutral-900 mt-0.5 flex items-center gap-1.5">
                    <MessageCircle size={14} className="text-emerald-600 shrink-0" />
                    {selectedCalendarOrder.phone || 'Sem telefone'}
                  </div>
                  {selectedCalendarOrder.email && (
                    <span className="text-[11px] text-neutral-500 block truncate mt-0.5">
                      {selectedCalendarOrder.email}
                    </span>
                  )}
                </div>

                {selectedCalendarOrder.instagram && (
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">Instagram</span>
                    <div className="text-sm font-medium text-blue-600 mt-0.5">
                      @{selectedCalendarOrder.instagram.replace('@', '')}
                    </div>
                  </div>
                )}

                {selectedCalendarOrder.birthday && (
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">Aniversário</span>
                    <div className="text-sm font-medium text-neutral-800 mt-0.5">
                      {selectedCalendarOrder.birthday}
                    </div>
                  </div>
                )}
              </div>

              {/* Services List */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-500">Serviços Selecionados</h4>
                <div className="space-y-2 border border-neutral-200 rounded-2xl p-4 bg-white">
                  {selectedCalendarOrder.items?.map((item, idx) => (
                    <div key={idx} className="flex justify-between items-start border-b border-neutral-100 last:border-b-0 pb-2 last:pb-0">
                      <div>
                        <div className="font-bold text-sm text-neutral-900">{item.quantity}x {item.title}</div>
                        {item.mealOptions && (
                          <div className="text-xs text-neutral-500 mt-0.5">
                            {item.mealOptions.removals?.length > 0 && `Remover: ${item.mealOptions.removals.join(', ')} `}
                            {item.mealOptions.sides?.length > 0 && `| Extras: ${item.mealOptions.sides.map(s => s.name).join(', ')}`}
                          </div>
                        )}
                      </div>
                      <span className="font-bold text-sm text-neutral-900">
                        {currencySymbol} {(item.price * item.quantity).toFixed(2)}
                      </span>
                    </div>
                  ))}
                  <div className="pt-3 border-t border-neutral-200 flex justify-between items-center text-lg font-bold">
                    <span>Total do Agendamento:</span>
                    <span className="text-xl text-black">{currencySymbol} {selectedCalendarOrder.total?.toFixed(2)}</span>
                  </div>
                  {selectedCalendarOrder.paymentStatus === 'pending' && selectedCalendarOrder.pendingAmount && (
                    <div className="p-2.5 bg-amber-50 text-amber-800 rounded-xl text-xs font-bold border border-amber-200 flex justify-between">
                      <span>Valor Pendente:</span>
                      <span>{currencySymbol} {selectedCalendarOrder.pendingAmount?.toFixed(2)} {selectedCalendarOrder.pendingDate ? `(Para ${selectedCalendarOrder.pendingDate})` : ''}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Observations */}
              {selectedCalendarOrder.observation && (
                <div className="space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">Observações do Cliente</span>
                  <div className="p-3 bg-neutral-50 rounded-xl border border-neutral-200 text-xs italic text-neutral-700">
                    "{selectedCalendarOrder.observation}"
                  </div>
                </div>
              )}

              {/* Actions toolbar matching Image 5 */}
              <div className="pt-4 border-t border-neutral-200 space-y-3">
                <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">Ações & Próximos Passos</span>
                <div className="flex flex-wrap items-center gap-2">
                  <button 
                    type="button"
                    onClick={() => {
                      const order = selectedCalendarOrder;
                      setSelectedCalendarOrder(null);
                      setIsAttendingOrder(order);
                    }} 
                    className="px-5 py-2.5 bg-black text-white rounded-xl text-sm font-bold inline-flex items-center gap-2 hover:bg-black/80 transition-all cursor-pointer shadow-md"
                  >
                    <CheckCircle2 size={16} /> Atendimento
                  </button>

                  <button 
                    type="button"
                    onClick={() => printOrder(selectedCalendarOrder)} 
                    className="p-2.5 bg-white border border-neutral-300 rounded-xl hover:bg-neutral-50 text-neutral-800 flex items-center justify-center cursor-pointer shadow-xs" 
                    title="Imprimir Comanda"
                  >
                    <Printer size={18} />
                  </button>

                  <button 
                    type="button"
                    onClick={() => {
                      const order = selectedCalendarOrder;
                      setSelectedCalendarOrder(null);
                      setIsEditingOrder(order);
                      setEditOrderForm(order);
                    }} 
                    className="p-2.5 bg-white border border-neutral-300 rounded-xl text-blue-600 hover:bg-blue-50 flex items-center justify-center cursor-pointer shadow-xs" 
                    title="Editar Agendamento"
                  >
                    <Edit2 size={18} />
                  </button>

                  <button 
                    type="button"
                    onClick={() => {
                      const orderId = selectedCalendarOrder.id;
                      setSelectedCalendarOrder(null);
                      deleteOrder(orderId);
                    }} 
                    className="p-2.5 bg-white border border-neutral-300 rounded-xl text-red-600 hover:bg-red-50 flex items-center justify-center cursor-pointer shadow-xs" 
                    title="Excluir"
                  >
                    <Trash2 size={18} />
                  </button>

                  <button 
                    type="button"
                    onClick={() => handleResendWhatsApp(selectedCalendarOrder)}
                    className="px-4 py-2.5 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 rounded-xl text-xs font-bold inline-flex items-center gap-2 cursor-pointer transition-all ml-auto"
                  >
                    <MessageCircle size={16} /> Reenviar WhatsApp
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {isEditingCustomer && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75">
            <div className="bg-white p-6 sm:p-8 rounded-3xl w-full max-w-2xl max-h-[90vh] overflow-y-auto space-y-6 shadow-2xl border border-neutral-300 text-black">
              <div className="flex justify-between items-center">
                <button 
                  onClick={() => setIsEditingCustomer(null)}
                  className="px-4 py-2 bg-black text-white rounded-xl text-xs font-bold flex items-center gap-2 hover:bg-black/80 transition-all cursor-pointer"
                >
                  <Users size={14} /> TODOS OS CLIENTES
                </button>
                <button onClick={() => setIsEditingCustomer(null)} className="p-2 hover:bg-black/5 rounded-full cursor-pointer"><X size={20} /></button>
              </div>

              <div className="space-y-6">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-full bg-neutral-100 border border-neutral-200 flex items-center justify-center text-2xl font-bold text-black">
                    {editCustomerForm.name?.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-black">{editCustomerForm.name}</h3>
                    <p className="opacity-60 text-black">{editCustomerForm.phone}</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase opacity-60 text-black">Nome</label>
                    <input type="text" className="w-full p-3 rounded-xl border border-neutral-300 bg-white text-black" value={editCustomerForm.name} onChange={e => setEditCustomerForm({...editCustomerForm, name: e.target.value})} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase opacity-60 text-black">WhatsApp</label>
                    <input type="text" className="w-full p-3 rounded-xl border border-neutral-300 bg-white text-black" value={editCustomerForm.phone} onChange={e => setEditCustomerForm({...editCustomerForm, phone: e.target.value})} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase opacity-60 text-black">Instagram</label>
                    <input type="text" className="w-full p-3 rounded-xl border border-neutral-300 bg-white text-black" value={editCustomerForm.instagram || ''} onChange={e => setEditCustomerForm({...editCustomerForm, instagram: e.target.value})} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase opacity-60 text-black">Aniversário</label>
                    <input type="text" className="w-full p-3 rounded-xl border border-neutral-300 bg-white text-black" value={editCustomerForm.birthday} onChange={e => setEditCustomerForm({...editCustomerForm, birthday: e.target.value})} />
                  </div>
                  <div className="space-y-1 sm:col-span-2">
                    <label className="text-[10px] font-bold uppercase opacity-60 text-black">Email</label>
                    <input type="text" className="w-full p-3 rounded-xl border border-neutral-300 bg-white text-black" value={editCustomerForm.email || ''} onChange={e => setEditCustomerForm({...editCustomerForm, email: e.target.value})} />
                  </div>
                  <div className="space-y-1 sm:col-span-2">
                    <label className="text-[10px] font-bold uppercase opacity-60 text-black">Endereço</label>
                    <textarea className="w-full p-3 rounded-xl border border-neutral-300 bg-white text-black" rows={2} value={editCustomerForm.address || ''} onChange={e => setEditCustomerForm({...editCustomerForm, address: e.target.value})} />
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="font-bold border-b pb-2 flex items-center gap-2 text-black">
                    <History size={18} /> Histórico de Atendimentos
                  </h4>
                  <div className="space-y-3">
                    {orders
                      .filter(o => o.phone === editCustomerForm.phone || o.customerName === editCustomerForm.name)
                      .sort((a, b) => {
                        const dateA = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(0);
                        const dateB = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(0);
                        return dateB - dateA;
                      })
                      .map((order, idx) => (
                        <div key={idx} className="p-4 bg-neutral-50 rounded-2xl border border-neutral-200 space-y-2 text-black">
                          <div className="flex justify-between items-start">
                            <div className="text-xs font-bold opacity-60 uppercase text-black">
                              {order.appointmentDate || order.pickupDate} {order.appointmentTime}
                            </div>
                            <div className={cn(
                              "text-[10px] px-2 py-0.5 rounded-full font-bold uppercase",
                              order.status === 'completed' ? "bg-green-100 text-green-600" : "bg-yellow-100 text-yellow-600"
                            )}>
                              {order.status === 'completed' ? 'Finalizado' : 'Pendente'}
                            </div>
                          </div>
                          <div className="space-y-1">
                            {order.items.map((item, i) => (
                              <div key={i} className="text-sm flex justify-between">
                                <span>{item.quantity}x {item.title}</span>
                                <span className="opacity-60">{currencySymbol} {(item.price * item.quantity).toFixed(2)}</span>
                              </div>
                            ))}
                          </div>
                          <div className="pt-2 border-t flex justify-between font-bold">
                            <span>Total</span>
                            <span>{currencySymbol} {order.total.toFixed(2)}</span>
                          </div>
                        </div>
                      ))}
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t">
                  <button 
                    onClick={updateCustomer} 
                    className="flex-1 py-3.5 px-4 rounded-xl text-white font-bold text-sm sm:text-base flex items-center justify-center gap-2 cursor-pointer shadow-sm hover:opacity-95 transition-all" 
                    style={{ backgroundColor: settings.primaryColor }}
                  >
                    <Save size={18} className="shrink-0" />
                    <span>Salvar Alterações</span>
                  </button>
                  <button 
                    onClick={() => setIsEditingCustomer(null)} 
                    className="sm:w-32 py-3.5 px-4 rounded-xl bg-neutral-100 hover:bg-neutral-200 text-neutral-800 font-bold text-sm sm:text-base flex items-center justify-center cursor-pointer transition-all"
                  >
                    Fechar
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {isEditingOrder && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75">
            <div className="bg-white p-6 sm:p-8 rounded-3xl w-full max-w-2xl max-h-[90vh] overflow-y-auto space-y-6 shadow-2xl border border-neutral-300 text-black">
              <div className="flex justify-between items-center">
                <h3 className="text-xl font-bold text-black">Editar Pedido</h3>
                <button onClick={() => setIsEditingOrder(null)} className="p-2 hover:bg-black/5 rounded-full cursor-pointer"><X size={20} /></button>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase opacity-40">Primeiro Nome</label>
                  <input type="text" className="w-full p-3 rounded-xl border" value={editOrderForm.firstName || ''} onChange={e => setEditOrderForm({...editOrderForm, firstName: e.target.value, customerName: `${e.target.value} ${editOrderForm.lastName || ''}`.trim()})} />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase opacity-40">Sobrenome</label>
                  <input type="text" className="w-full p-3 rounded-xl border" value={editOrderForm.lastName || ''} onChange={e => setEditOrderForm({...editOrderForm, lastName: e.target.value, customerName: `${editOrderForm.firstName || ''} ${e.target.value}`.trim()})} />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase opacity-40">WhatsApp</label>
                  <input type="text" className="w-full p-3 rounded-xl border" value={editOrderForm.phone} onChange={e => setEditOrderForm({...editOrderForm, phone: e.target.value})} />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase opacity-40">Data</label>
                  <input type="date" className="w-full p-3 rounded-xl border" value={editOrderForm.appointmentDate || editOrderForm.pickupDate} onChange={e => setEditOrderForm({...editOrderForm, appointmentDate: e.target.value, pickupDate: e.target.value})} />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase opacity-40">Horário</label>
                  <input type="text" className="w-full p-3 rounded-xl border" value={editOrderForm.appointmentTime} onChange={e => setEditOrderForm({...editOrderForm, appointmentTime: e.target.value})} />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase opacity-40">Valor Total ({currencySymbol})</label>
                  <input 
                    type="text" 
                    inputMode="decimal"
                    className="w-full p-3 rounded-xl border font-bold text-lg text-green-700 bg-green-50/30" 
                    value={editOrderForm.total || 0} 
                    onChange={e => {
                      const val = e.target.value.replace(',', '.');
                      if (val === '' || !isNaN(Number(val))) {
                        setEditOrderForm({...editOrderForm, total: val === '' ? 0 : parseFloat(val)});
                      }
                    }} 
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase opacity-40">Status do Pedido</label>
                  <select 
                    className="w-full p-3 rounded-xl border bg-white" 
                    value={editOrderForm.status} 
                    onChange={e => setEditOrderForm({...editOrderForm, status: e.target.value as any})}
                  >
                    <option value="pending">Pendente</option>
                    <option value="confirmed">Confirmado</option>
                    <option value="completed">Finalizado</option>
                    <option value="cancelled">Cancelado</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase opacity-40">Status do Pagamento</label>
                  <select 
                    className="w-full p-3 rounded-xl border bg-white" 
                    value={editOrderForm.paymentStatus || 'pending'} 
                    onChange={e => setEditOrderForm({...editOrderForm, paymentStatus: e.target.value as any})}
                  >
                    <option value="pending">Pagamento Pendente</option>
                    <option value="paid">Totalmente Pago</option>
                  </select>
                </div>
                {editOrderForm.paymentStatus === 'pending' && (
                  <>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold uppercase opacity-40">Valor Pendente</label>
                      <input 
                        type="text" 
                        inputMode="decimal"
                        className="w-full p-3 rounded-xl border" 
                        value={editOrderForm.pendingAmount || 0} 
                        onChange={e => {
                          const val = e.target.value.replace(',', '.');
                          if (val === '' || !isNaN(Number(val))) {
                            setEditOrderForm({...editOrderForm, pendingAmount: val === '' ? 0 : parseFloat(val)});
                          }
                        }} 
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold uppercase opacity-40">Data do Pagamento Pendente</label>
                      <input type="date" className="w-full p-3 rounded-xl border" value={editOrderForm.pendingDate || ''} onChange={e => setEditOrderForm({...editOrderForm, pendingDate: e.target.value})} />
                    </div>
                  </>
                )}
              </div>

              <div className="space-y-4">
                <h4 className="font-bold border-b pb-2">Serviços</h4>
                {editOrderForm.items?.map((item, idx) => (
                  <div key={idx} className="flex justify-between items-center p-3 bg-white/50 rounded-xl border">
                    <div className="flex-1">
                      <div className="font-bold">{item.title}</div>
                      <div className="text-xs opacity-60">{currencySymbol} {item.price.toFixed(2)}</div>
                    </div>
                    <div className="flex items-center gap-3">
                      <button type="button" onClick={() => {
                        const newItems = [...(editOrderForm.items || [])];
                        if (newItems[idx].quantity > 1) {
                          newItems[idx].quantity--;
                        } else {
                          newItems.splice(idx, 1);
                        }
                        const newTotal = newItems.reduce((acc, i) => acc + (i.price * i.quantity), 0);
                        setEditOrderForm({ ...editOrderForm, items: newItems, total: newTotal });
                      }} className="w-8 h-8 rounded-full border flex items-center justify-center">-</button>
                      <span className="font-bold">{item.quantity}</span>
                      <button type="button" onClick={() => {
                        const newItems = [...(editOrderForm.items || [])];
                        newItems[idx].quantity++;
                        const newTotal = newItems.reduce((acc, i) => acc + (i.price * i.quantity), 0);
                        setEditOrderForm({ ...editOrderForm, items: newItems, total: newTotal });
                      }} className="w-8 h-8 rounded-full border flex items-center justify-center">+</button>
                    </div>
                  </div>
                ))}
                
                <div className="flex gap-2">
                  <select 
                    className="flex-1 p-3 rounded-xl border bg-white"
                    onChange={(e) => {
                      const prod = products.find(p => p.id === e.target.value);
                      if (prod) {
                        const newItems = [...(editOrderForm.items || [])];
                        newItems.push({
                          productId: prod.id,
                          title: prod.title,
                          price: prod.price,
                          quantity: 1
                        });
                        const newTotal = newItems.reduce((acc, i) => acc + (i.price * i.quantity), 0);
                        setEditOrderForm({ ...editOrderForm, items: newItems, total: newTotal });
                        e.target.value = '';
                      }
                    }}
                  >
                    <option value="">+ Adicionar Serviço</option>
                    {products.map(p => <option key={p.id} value={p.id}>{p.title} ({currencySymbol} {p.price.toFixed(2)})</option>)}
                  </select>
                </div>
              </div>

              <div className="pt-4 border-t">
                <div className="flex justify-between items-center text-xl font-bold">
                  <span>Total Final</span>
                  <span>{currencySymbol} {editOrderForm.total?.toFixed(2)}</span>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 pt-3 border-t">
                <button 
                  type="button"
                  onClick={(e) => handleEditOrder(e)} 
                  className="flex-1 min-w-0 py-3.5 px-4 rounded-xl text-white font-bold text-sm sm:text-base inline-flex items-center justify-center gap-2 cursor-pointer shadow-sm hover:opacity-95 transition-all" 
                  style={{ backgroundColor: settings.primaryColor }}
                >
                  <Save size={18} className="shrink-0" />
                  <span className="truncate">Salvar Alterações</span>
                </button>
                <button 
                  type="button"
                  onClick={(e) => handleEditOrder(e, true)} 
                  className="flex-1 min-w-0 py-3.5 px-4 rounded-xl bg-green-600 hover:bg-green-700 text-white font-bold text-sm sm:text-base inline-flex items-center justify-center gap-2 cursor-pointer shadow-sm transition-all"
                >
                  <MessageCircle size={18} className="shrink-0" />
                  <span className="truncate">Salvar e Notificar</span>
                </button>
                <button 
                  type="button"
                  onClick={() => setIsEditingOrder(null)} 
                  className="sm:w-28 py-3.5 px-4 rounded-xl bg-neutral-100 hover:bg-neutral-200 text-neutral-800 font-bold text-sm sm:text-base inline-flex items-center justify-center cursor-pointer transition-all"
                >
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        )}

        {confirmModal.isOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/75">
            <div className="bg-white p-8 rounded-3xl w-full max-w-sm shadow-2xl text-center space-y-6 border border-neutral-300 text-black">
              <h3 className="text-xl font-bold text-black">{confirmModal.title}</h3>
              <p className="opacity-60 text-black">{confirmModal.message}</p>
              <div className="flex gap-3">
                <button onClick={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))} className="flex-1 py-3 rounded-xl bg-gray-100 font-bold text-black hover:bg-gray-200">Cancelar</button>
                <button onClick={confirmModal.onConfirm} className="flex-1 py-3 rounded-xl bg-red-600 text-white font-bold hover:bg-red-700">Excluir</button>
              </div>
            </div>
          </div>
        )}
        {isAttendingOrder && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/75">
            <div className="bg-white p-4 sm:p-8 rounded-3xl w-full max-w-2xl max-h-[95vh] overflow-y-auto space-y-8 shadow-2xl border border-neutral-300 text-black">
              <div className="flex justify-between items-start gap-4">
                <h3 className="text-xl sm:text-3xl font-serif font-bold break-words text-black">Atendimento: {isAttendingOrder.customerName}</h3>
                <button onClick={() => { setIsAttendingOrder(null); setAttendingStep(1); }} className="p-2 hover:bg-black/5 rounded-full shrink-0 cursor-pointer"><X size={24} /></button>
              </div>

              {attendingStep === 1 && (
                <div className="space-y-6">
                  <h4 className="text-xl font-bold border-b pb-2 text-black">Passo 1: Conferir Serviços</h4>
                  <div className="space-y-4">
                    {isAttendingOrder.items.map((item, idx) => (
                      <div key={idx} className="flex justify-between items-center p-4 bg-neutral-50 rounded-2xl border border-neutral-200 text-black">
                        <div>
                          <div className="font-bold text-black">{item.title}</div>
                          <div className="text-sm opacity-60 text-black">{currencySymbol} {item.price.toFixed(2)}</div>
                        </div>
                        <div className="flex items-center gap-3">
                          <button onClick={() => {
                            const newItems = [...isAttendingOrder.items];
                            if (newItems[idx].quantity > 1) {
                              newItems[idx].quantity--;
                              const newTotal = newItems.reduce((acc, i) => acc + (i.price * i.quantity), 0);
                              setIsAttendingOrder({ ...isAttendingOrder, items: newItems, total: newTotal });
                            } else {
                              newItems.splice(idx, 1);
                              const newTotal = newItems.reduce((acc, i) => acc + (i.price * i.quantity), 0);
                              setIsAttendingOrder({ ...isAttendingOrder, items: newItems, total: newTotal });
                            }
                          }} className="w-8 h-8 rounded-full border border-neutral-300 flex items-center justify-center cursor-pointer hover:bg-neutral-200">-</button>
                          <span className="font-bold text-black">{item.quantity}</span>
                          <button onClick={() => {
                            const newItems = [...isAttendingOrder.items];
                            newItems[idx].quantity++;
                            const newTotal = newItems.reduce((acc, i) => acc + (i.price * i.quantity), 0);
                            setIsAttendingOrder({ ...isAttendingOrder, items: newItems, total: newTotal });
                          }} className="w-8 h-8 rounded-full border border-neutral-300 flex items-center justify-center cursor-pointer hover:bg-neutral-200">+</button>
                        </div>
                      </div>
                    ))}

                    <div className="flex gap-2">
                      <select 
                        className="flex-1 p-3 rounded-xl border border-neutral-300 bg-white text-sm text-black"
                        onChange={(e) => {
                          const prod = products.find(p => p.id === e.target.value);
                          if (prod) {
                            const newItems = [...isAttendingOrder.items];
                            newItems.push({
                              productId: prod.id,
                              title: prod.title,
                              price: prod.price,
                              quantity: 1
                            });
                            const newTotal = newItems.reduce((acc, i) => acc + (i.price * i.quantity), 0);
                            setIsAttendingOrder({ ...isAttendingOrder, items: newItems, total: newTotal });
                            e.target.value = '';
                          }
                        }}
                      >
                        <option value="">+ Adicionar outro serviço</option>
                        {products.filter(p => p.isActive !== false).map(p => (
                          <option key={p.id} value={p.id}>{p.title} - {currencySymbol} {p.price.toFixed(2)}</option>
                        ))}
                      </select>
                    </div>

                    {!showGiftVoucher ? (
                      <button 
                        onClick={() => setShowGiftVoucher(true)}
                        className="w-full py-4 border-2 border-dashed border-neutral-300 rounded-2xl font-bold text-sm hover:border-black transition-all cursor-pointer text-black"
                      >
                        + ADICIONAR GIFT CARD OU VOUCHER
                      </button>
                    ) : (
                      <div className="p-6 bg-neutral-50 rounded-2xl border border-neutral-200 space-y-4 text-black">
                        <div className="flex justify-between items-center">
                          <label className="text-xs font-bold uppercase opacity-40">Gift Card [-]</label>
                          <div className="flex items-center gap-2">
                            <span className="font-bold">{currencySymbol}</span>
                            <input 
                              type="text" 
                              inputMode="decimal"
                              className="w-24 p-2 rounded-lg border text-right text-red-500 font-bold outline-none focus:ring-1 ring-black" 
                              value={isAttendingOrder.giftCard === 0 ? '' : isAttendingOrder.giftCard} 
                              onChange={e => {
                                const val = e.target.value.replace(',', '.');
                                if (val === '' || !isNaN(Number(val))) {
                                  setIsAttendingOrder({...isAttendingOrder, giftCard: val === '' ? 0 : parseFloat(val)});
                                }
                              }} 
                              placeholder="0.00"
                            />
                          </div>
                        </div>
                        <div className="flex justify-between items-center">
                          <label className="text-xs font-bold uppercase opacity-40">Voucher [-]</label>
                          <div className="flex items-center gap-2">
                            <span className="font-bold">{currencySymbol}</span>
                            <input 
                              type="text" 
                              inputMode="decimal"
                              className="w-24 p-2 rounded-lg border text-right text-red-500 font-bold outline-none focus:ring-1 ring-black" 
                              value={isAttendingOrder.voucher === 0 ? '' : isAttendingOrder.voucher} 
                              onChange={e => {
                                const val = e.target.value.replace(',', '.');
                                if (val === '' || !isNaN(Number(val))) {
                                  setIsAttendingOrder({...isAttendingOrder, voucher: val === '' ? 0 : parseFloat(val)});
                                }
                              }} 
                              placeholder="0.00"
                            />
                          </div>
                        </div>
                      </div>
                    )}

                    <div className="pt-6 border-t space-y-2">
                      <div className="flex justify-between text-lg">
                        <span>Subtotal</span>
                        <span>{currencySymbol} {isAttendingOrder.total.toFixed(2)}</span>
                      </div>
                      {(isAttendingOrder.giftCard || 0) > 0 && (
                        <div className="flex justify-between text-sm text-red-500">
                          <span>Gift Card</span>
                          <span>-{currencySymbol} {isAttendingOrder.giftCard?.toFixed(2)}</span>
                        </div>
                      )}
                      {(isAttendingOrder.voucher || 0) > 0 && (
                        <div className="flex justify-between text-sm text-red-500">
                          <span>Voucher</span>
                          <span>-{currencySymbol} {isAttendingOrder.voucher?.toFixed(2)}</span>
                        </div>
                      )}
                      <div className="flex justify-between text-2xl font-bold pt-2">
                        <span>Valor Total</span>
                        <span>{currencySymbol} {(isAttendingOrder.total - (isAttendingOrder.giftCard || 0) - (isAttendingOrder.voucher || 0)).toFixed(2)}</span>
                      </div>
                    </div>
                    <button onClick={() => setAttendingStep(2)} className="w-full py-3.5 px-6 rounded-2xl bg-black hover:bg-black/90 text-white font-bold text-base shadow-xl flex items-center justify-center gap-2 cursor-pointer transition-all">
                      CONFIRMAR SERVIÇOS (OK)
                    </button>
                  </div>
                </div>
              )}

              {attendingStep === 2 && (
                <div className="space-y-6">
                  <h4 className="text-xl font-bold border-b pb-2">Passo 2: Gorjeta</h4>
                  <div className="space-y-6">
                    <p className="text-center text-lg opacity-60">Gostaria de adicionar uma gorjeta?</p>
                    <div className="max-w-xs mx-auto space-y-2">
                      <label className="text-xs font-bold uppercase opacity-40">Tip / Gorjeta</label>
                      <div className="flex items-center gap-2 border-b-2 border-black pb-2">
                        <span className="text-2xl font-bold">{currencySymbol}</span>
                        <input 
                          type="text" 
                          inputMode="decimal"
                          className="w-full bg-transparent text-3xl font-bold outline-none" 
                          value={isAttendingOrder.tip === 0 ? '' : isAttendingOrder.tip} 
                          onChange={e => {
                            const val = e.target.value.replace(',', '.');
                            if (val === '' || !isNaN(Number(val))) {
                              setIsAttendingOrder({...isAttendingOrder, tip: val === '' ? 0 : parseFloat(val)});
                            }
                          }} 
                          placeholder="0.00" 
                        />
                      </div>
                    </div>
                    <div className="pt-6 border-t flex justify-between text-3xl font-bold">
                      <span>Valor Total Pago</span>
                      <span>{currencySymbol} {(isAttendingOrder.total + (isAttendingOrder.tip || 0) - (isAttendingOrder.discount || 0) - (isAttendingOrder.giftCard || 0) - (isAttendingOrder.voucher || 0)).toFixed(2)}</span>
                    </div>
                    <div className="flex gap-4">
                      <button 
                        onClick={() => setAttendingStep(1)} 
                        className="flex-1 py-3.5 px-4 rounded-2xl bg-neutral-100 hover:bg-neutral-200 text-neutral-800 font-bold text-base flex items-center justify-center cursor-pointer transition-all"
                      >
                        VOLTAR
                      </button>
                      <button 
                        onClick={() => setAttendingStep(3)} 
                        disabled={isAttendingOrder.tip === undefined}
                        className="flex-1 py-3.5 px-4 rounded-2xl bg-black hover:bg-black/90 text-white font-bold text-base shadow-xl disabled:opacity-50 flex items-center justify-center cursor-pointer transition-all"
                      >
                        PRÓXIMO
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {attendingStep === 3 && (
                <div className="space-y-6">
                  <h4 className="text-xl font-bold border-b pb-2">Passo 3: Forma de Pagamento</h4>
                  <div className="space-y-6">
                    <div className="grid grid-cols-2 gap-4">
                      {['CASH', 'VENMO', 'ZELLE', 'PAYPAL'].map(method => (
                        <button key={method} onClick={() => setIsAttendingOrder({...isAttendingOrder, paymentMethod: method})} className={cn("p-6 rounded-2xl border-2 font-bold text-lg transition-all", isAttendingOrder.paymentMethod === method ? "border-black bg-black text-white" : "border-gray-200 hover:border-black")}>
                          {method}
                        </button>
                      ))}
                    </div>

                    {isAttendingOrder.paymentMethod && isAttendingOrder.paymentMethod !== 'CASH' && (
                      <div className="p-6 bg-white rounded-3xl border flex flex-col items-center gap-4">
                        <h5 className="font-bold uppercase text-xs opacity-40">QR Code {isAttendingOrder.paymentMethod}</h5>
                        {isAttendingOrder.paymentMethod === 'ZELLE' && settings.zelleQR && <img src={settings.zelleQR} className="w-48 h-48 object-contain" />}
                        {isAttendingOrder.paymentMethod === 'VENMO' && settings.venmoQR && <img src={settings.venmoQR} className="w-48 h-48 object-contain" />}
                        {isAttendingOrder.paymentMethod === 'PAYPAL' && settings.paypalQR && <img src={settings.paypalQR} className="w-48 h-48 object-contain" />}
                      </div>
                    )}

                    <div className="flex gap-4">
                      <button 
                        onClick={() => setAttendingStep(2)} 
                        className="flex-1 py-3.5 px-4 rounded-2xl bg-neutral-100 hover:bg-neutral-200 text-neutral-800 font-bold text-base flex items-center justify-center cursor-pointer transition-all"
                      >
                        VOLTAR
                      </button>
                      <button onClick={() => {
                        try {
                          const finalTotal = isAttendingOrder.total + (isAttendingOrder.tip || 0) - (isAttendingOrder.discount || 0) - (isAttendingOrder.giftCard || 0) - (isAttendingOrder.voucher || 0);
                          
                          // Run updateDoc in background so it does not delay or break synchronous execution for Safari
                          updateDoc(doc(db, 'pedidos', isAttendingOrder.id), {
                            ...isAttendingOrder,
                            status: 'completed',
                            total: finalTotal
                          }).then(() => {
                            toast.success('Atendimento finalizado com sucesso!');
                          }).catch(err => {
                            console.error(err);
                            toast.error('Erro ao finalizar atendimento no banco de dados.');
                          });
                          
                          // Send WhatsApp
                          const lang = isAttendingOrder.orderLanguage || settings.language || 'pt';
                          const msgs = {
                            pt: {
                              title: 'RESUMO DO ATENDIMENTO',
                              hello: 'Olá',
                              summary: 'Resumo do seu atendimento:',
                              subtotal: 'Subtotal',
                              tip: 'Tip / Gorjeta',
                              discount: 'Desconto',
                              giftCard: 'Gift Card',
                              voucher: 'Voucher',
                              total: 'Total Pago',
                              method: 'Forma de Pagamento',
                              thanks: settings.whatsappCompletionMessage || '_Obrigado pela sua visita ao His & Hers Waxing Studio! 🌸_\n_Te vejo no próximo atendimento, Nathalia_'
                            },
                            en: {
                              title: 'APPOINTMENT SUMMARY',
                              hello: 'Hello',
                              summary: 'Summary of your appointment:',
                              subtotal: 'Subtotal',
                              tip: 'Tip / Gratuity',
                              discount: 'Discount',
                              giftCard: 'Gift Card',
                              voucher: 'Voucher',
                              total: 'Total Paid',
                              method: 'Payment Method',
                              thanks: settings.whatsappCompletionMessage || '_Thank you for visiting His & Hers Waxing Studio! 🌸_\n_See you at your next appointment, Nathalia_'
                            },
                            es: {
                              title: 'RESUMEN DE LA CITA',
                              hello: 'Hola',
                              summary: 'Resumen de tu cita:',
                              subtotal: 'Subtotal',
                              tip: 'Propina',
                              discount: 'Descuento',
                              giftCard: 'Tarjeta de Regalo',
                              voucher: 'Cupón',
                              total: 'Total Pago',
                              method: 'Forma de Pago',
                              thanks: settings.whatsappCompletionMessage || '_¡Gracias por visitar His & Hers Waxing Studio! 🌸_\n_Nos vemos en su próxima cita, Nathalia_'
                            }
                          };
                          const m = msgs[lang as keyof typeof msgs] || msgs.pt;

                          const message = `${m.hello} *${isAttendingOrder.customerName}*\n` +
                            `${m.summary}\n` +
                            isAttendingOrder.items.map(i => `• ${i.title} : ${currencySymbol} ${(i.price * i.quantity).toFixed(2)}`).join('\n') +
                            (isAttendingOrder.tip ? `\n*${m.tip}:* ${currencySymbol} ${isAttendingOrder.tip.toFixed(2)}` : '') +
                            (isAttendingOrder.discount ? `\n*${m.discount}:* -${currencySymbol} ${isAttendingOrder.discount.toFixed(2)}` : '') +
                            (isAttendingOrder.giftCard ? `\n*${m.giftCard}:* -${currencySymbol} ${isAttendingOrder.giftCard.toFixed(2)}` : '') +
                            (isAttendingOrder.voucher ? `\n*${m.voucher}:* -${currencySymbol} ${isAttendingOrder.voucher.toFixed(2)}` : '') +
                            `\n*${m.total}: ${currencySymbol} ${finalTotal.toFixed(2)}*` +
                            `\n\n${m.thanks}`;
                          
                          const countryCode = settings.whatsappCountryCode?.replace(/\D/g, '') || '55';
                          let whatsappNumber = isAttendingOrder.phone.replace(/\D/g, '');
                          
                          const url = `https://wa.me/${whatsappNumber.startsWith(countryCode) ? '' : countryCode}${whatsappNumber}?text=${encodeURIComponent(message)}`;
                          
                          // Robust redirect for iOS / Mobile (completely synchronous click gesture thread)
                          const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
                          if (isMobile) {
                            window.location.assign(url);
                          } else {
                            window.open(url, '_blank');
                          }
                          
                          setIsAttendingOrder(null);
                          setAttendingStep(1);
                          setShowGiftVoucher(false);
                        } catch (err) {
                          toast.error('Erro ao processar finalização.');
                        }
                      }} 
                      disabled={!isAttendingOrder.paymentMethod} 
                      className="flex-[2] py-3.5 px-6 rounded-2xl bg-green-600 hover:bg-green-700 text-white font-bold text-base shadow-xl disabled:opacity-50 inline-flex items-center justify-center gap-2 cursor-pointer transition-all"
                    >
                      <CheckCircle2 size={18} className="shrink-0" />
                      <span>FINALIZAR ATENDIMENTO</span>
                    </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
