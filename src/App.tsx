import React, { useState, useEffect } from 'react';
import { supabase } from './supabase';
import {
  LayoutDashboard,
  Package,
  PlusCircle,
  ShoppingCart,
  TrendingUp,
  Search,
  RefreshCw,
  LogOut,
  LogIn,
  AlertCircle,
  CheckCircle2,
  BarChart3,
  Eye,
  EyeOff,
  Trash2,
  Database,
  ChevronLeft,
  ChevronRight,
  Pencil,
  X,
  Check
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  ScatterChart,
  Scatter,
  ZAxis
} from 'recharts';
import { format, subDays, startOfDay, endOfDay, endOfWeek, isSameDay, subMonths, startOfMonth, isSameMonth, subYears, startOfYear, isSameYear, startOfWeek, addDays } from 'date-fns';
import { it } from 'date-fns/locale';

// Types
interface Item {
  code: string;
  name: string;
  price: number;
  quantity: number;
  size?: string;
  color?: string;
}

interface Sale {
  id: string;
  itemCode: string;
  itemName: string;
  price: number;
  quantity: number;
  total: number;
  timestamp: any;
}

// Logo Component to render external PNG with fallback to text
const Logo = ({ className = "", size = "normal" }: { className?: string, size?: "normal" | "large" }) => {
  const [imgError, setImgError] = useState(false);

  return (
    <div className={`flex flex-col items-center justify-center text-center select-none ${className}`}>
      {!imgError ? (
        <img
          src="/logo.png"
          alt="Novum Store"
          className={`object-contain transition-all duration-500 drop-shadow-[0_0_25px_rgba(255,255,255,0.2)] mix-blend-screen grayscale contrast-[2] brightness-125 ${size === 'large' ? 'w-[300px] sm:w-[400px] md:w-[600px] max-w-[90vw]' : 'w-full max-w-[280px]'}`}
          onError={() => setImgError(true)}
        />
      ) : (
        <>
          <h1
            className={`font-script text-white leading-[0.8] drop-shadow-[0_0_15px_rgba(255,255,255,0.1)] whitespace-nowrap ${size === 'large' ? 'text-[4.5rem] md:text-[7rem]' : 'text-4xl md:text-[3.5rem]'}`}
            style={{ textShadow: '1px 1px 3px rgba(0,0,0,0.8)' }}
          >
            Novum Store
          </h1>
          <p
            className={`font-sans text-white uppercase tracking-[0.5em] md:tracking-[0.8em] font-bold ${size === 'large' ? 'mt-3 text-[10px] md:text-sm' : 'mt-2 text-[8px] md:text-[10px]'}`}
            style={{ wordSpacing: '0.3em' }}
          >
            Abbigliamento
          </p>
        </>
      )}
    </div>
  );
};

// Autocomplete Input Component
const CodeAutocomplete = ({ value, onChange, placeholder, className, items }: { value: string, onChange: (val: string) => void, placeholder: string, className: string, items: Item[] }) => {
  const [show, setShow] = useState(false);
  const filtered = items.filter(i =>
    i.code.toLowerCase().includes(value.toLowerCase().trim()) &&
    value.trim() !== '' &&
    i.code.toLowerCase() !== value.toLowerCase().trim()
  );

  return (
    <div className="relative w-full">
      <input
        type="text"
        value={value}
        onChange={e => { onChange(e.target.value); setShow(true); }}
        onFocus={() => setShow(true)}
        onBlur={() => setTimeout(() => setShow(false), 200)}
        className={className}
        placeholder={placeholder}
        required
      />
      {show && filtered.length > 0 && (
        <div className="absolute top-full left-0 w-full mt-2 bg-[#111] border border-white/10 rounded-2xl overflow-hidden z-50 shadow-[0_10px_40px_rgba(0,0,0,0.8)]">
          {filtered.slice(0, 5).map(item => (
            <div
              key={item.code}
              className="px-6 py-4 hover:bg-white/10 cursor-pointer flex justify-between items-center transition-colors border-b border-white/5 last:border-0"
              onMouseDown={(e) => {
                e.preventDefault();
                onChange(item.code);
                setShow(false);
              }}
            >
              <span className="text-xs font-bold tracking-widest uppercase">{item.code}</span>
              <span className="text-[10px] text-white/50 tracking-widest uppercase truncate max-w-[120px]">{item.name}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default function App() {
  const [items, setItems] = useState<Item[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'inventory' | 'sales' | 'analytics'>('dashboard');
  const [salesView, setSalesView] = useState<'daily' | 'monthly' | 'annual'>('daily');
  const [chartView, setChartView] = useState<'daily' | 'monthly' | 'annual'>('daily');
  const [showApp, setShowApp] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [showEarnings, setShowEarnings] = useState(true);

  // Form states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const [newItem, setNewItem] = useState({ code: '', name: '', price: '', quantity: '', size: '', color: '' });
  const [restock, setRestock] = useState({ code: '', quantity: '' });
  const [sale, setSale] = useState({ code: '', quantity: '1' });
  const [message, setMessage] = useState<{ text: string, type: 'success' | 'error' } | null>(null);
  const [saleConfirmation, setSaleConfirmation] = useState<{ item: Item; quantity: number; total: number } | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [introDismissed, setIntroDismissed] = useState(false);
  const [editingItem, setEditingItem] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<Item>>({});
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [saleDeleteConfirm, setSaleDeleteConfirm] = useState<string | null>(null);
  const [editingSale, setEditingSale] = useState<Sale | null>(null);
  const [editSaleForm, setEditSaleForm] = useState({ quantity: '', price: '' });
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [analysisDate, setAnalysisDate] = useState(new Date());
  const [semesterOffset, setSemesterOffset] = useState(() => {
    const now = new Date();
    return now.getFullYear() * 2 + (now.getMonth() < 6 ? 0 : 1);
  });
  const [weekOffset, setWeekOffset] = useState(0);

  // Sync analysis window with selected global date
  useEffect(() => {
    setAnalysisDate(selectedDate);
  }, [selectedDate]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setIsAuthenticated(true);
        setShowApp(true);
      }
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        setIsAuthenticated(true);
        setShowApp(true);
      } else {
        setIsAuthenticated(false);
        setShowApp(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchItems = async () => {
    const { data, error } = await supabase.from('items').select('*').order('code');
    if (data && !error) setItems(data as Item[]);
  };

  const fetchSales = async () => {
    const startOfYearDate = new Date(new Date().getFullYear(), 0, 1).toISOString();
    const { data, error } = await supabase.from('sales').select('*').gte('timestamp', startOfYearDate).order('timestamp', { ascending: false });
    if (data && !error) {
      const mappedSales = data.map((s: any) => ({
        id: s.id,
        itemCode: s.item_code,
        itemName: s.item_name,
        price: s.price,
        quantity: s.quantity,
        total: s.total,
        timestamp: {
          toDate: () => new Date(s.timestamp),
          toMillis: () => new Date(s.timestamp).getTime()
        }
      }));
      setSales(mappedSales);
    }
  };

  useEffect(() => {
    if (!isAuthenticated) return;

    fetchItems();
    fetchSales();

    const itemsSub = supabase
      .channel('public:items')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'items' }, () => {
        fetchItems();
      })
      .subscribe();

    const salesSub = supabase
      .channel('public:sales')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'sales' }, () => {
        fetchSales();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(itemsSub);
      supabase.removeChannel(salesSub);
    };
  }, [isAuthenticated]);

  const showMessage = (text: string, type: 'success' | 'error') => {
    setMessage({ text, type });
    setTimeout(() => setMessage(null), 3000);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) throw error;
    } catch (error: any) {
      console.error("Auth error:", error);
      setAuthError(error.message || "Credenziali non valide o errore di rete");
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  const handleSaveEdit = async () => {
    if (!editingItem) return;
    try {
      const parsedPrice = typeof editForm.price === 'string' ? parseFloat(editForm.price.replace(/[eE€\s]/g, '').replace(',', '.')) : editForm.price;
      if (parsedPrice !== undefined && (isNaN(parsedPrice) || parsedPrice < 0)) {
        showMessage('Prezzo non valido', 'error');
        return;
      }

      const updateData = {
        name: editForm.name?.trim().toUpperCase(),
        size: editForm.size?.trim() ? editForm.size.trim().toUpperCase() : null,
        color: editForm.color?.trim() ? editForm.color.trim().toUpperCase() : null,
        price: parsedPrice
      };

      const { error } = await supabase.from('items').update(updateData).eq('code', editingItem);
      if (error) throw error;

      showMessage('Articolo aggiornato', 'success');
      setEditingItem(null);
      fetchItems();
    } catch (e: any) {
      console.error(e);
      showMessage(`Errore: ${e.message}`, 'error');
    }
  };

  const handleUpdateAttribute = async (code: string, field: 'size' | 'color', value: string) => {
    try {
      const finalVal = value.trim() ? value.trim().toUpperCase() : null;
      const { error } = await supabase.from('items').update({ [field]: finalVal }).eq('code', code);
      if (error) throw error;
      fetchItems();
      showMessage('Attributo salvato', 'success');
    } catch (e) {
      console.error(e);
      showMessage(`Errore: impossibile salvare ${field}`, 'error');
    }
  };

  const handleDeleteSale = async (id: string) => {
    try {
      const saleToDelete = sales.find(s => s.id === id);
      if (!saleToDelete) return;

      const { data: item, error: fetchErr } = await supabase.from('items').select('quantity').eq('code', saleToDelete.itemCode).single();
      if (fetchErr || !item) throw new Error('Articolo non trovato');

      const { error: stockErr } = await supabase.from('items').update({
        quantity: Number(item.quantity) + Number(saleToDelete.quantity)
      }).eq('code', saleToDelete.itemCode);
      if (stockErr) throw stockErr;

      const { error: saleErr } = await supabase.from('sales').delete().eq('id', id);
      if (saleErr) throw saleErr;

      showMessage('Vendita annullata e stock ripristinato', 'success');
      setSaleDeleteConfirm(null);
      fetchItems();
      fetchSales();
    } catch (error: any) {
      console.error("Delete sale error:", error);
      showMessage(`Errore: ${error.message}`, 'error');
    }
  };

  const handleEditSale = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSale) return;

    try {
      const newQty = Number(editSaleForm.quantity);
      const newPrice = parseFloat(editSaleForm.price.replace(/[eE€\s]/g, '').replace(',', '.'));

      if (isNaN(newQty) || newQty <= 0 || isNaN(newPrice) || newPrice < 0) {
        showMessage('Dati non validi', 'error');
        return;
      }

      const diff = newQty - editingSale.quantity;
      const { data: item, error: fetchErr } = await supabase.from('items').select('quantity').eq('code', editingSale.itemCode).single();
      if (fetchErr || !item) throw new Error('Articolo non trovato');

      if (diff > 0 && item.quantity < diff) {
        showMessage('Stock insufficiente per la modifica', 'error');
        return;
      }

      const { error: stockErr } = await supabase.from('items').update({
        quantity: Number(item.quantity) - diff
      }).eq('code', editingSale.itemCode);
      if (stockErr) throw stockErr;

      const { error: saleErr } = await supabase.from('sales').update({
        quantity: newQty,
        price: newPrice,
        total: newQty * newPrice
      }).eq('id', editingSale.id);
      if (saleErr) throw saleErr;

      showMessage('Vendita aggiornata', 'success');
      setEditingSale(null);
      fetchItems();
      fetchSales();
    } catch (error: any) {
      console.error("Edit sale error:", error);
      showMessage(`Errore: ${error.message}`, 'error');
    }
  };

  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (!newItem.code || !newItem.name || !newItem.price || !newItem.quantity) {
        showMessage('Dati mancanti', 'error');
        return;
      }

      const parsedPrice = parseFloat(newItem.price.replace(/[eE€\s]/g, '').replace(',', '.'));

      if (isNaN(parsedPrice) || parsedPrice < 0) {
        showMessage('Formato prezzo non valido', 'error');
        return;
      }

      const itemCode = newItem.code.toUpperCase().trim();
      const { error } = await supabase.from('items').upsert({
        code: itemCode,
        name: newItem.name.trim(),
        price: parsedPrice,
        quantity: Number(newItem.quantity),
        size: newItem.size ? newItem.size.trim() : null,
        color: newItem.color ? newItem.color.trim() : null,
      });

      if (error) throw error;

      showMessage('Articolo aggiunto', 'success');
      setNewItem({ code: '', name: '', price: '', quantity: '', size: '', color: '' });
      fetchItems();
    } catch (error) {
      console.error("Add item error:", error);
      showMessage('Errore durante il salvataggio', 'error');
    }
  };

  const handleRestock = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (!restock.code || !restock.quantity) {
        showMessage('Dati mancanti', 'error');
        return;
      }
      const code = restock.code.toUpperCase().trim();

      const { data: item, error: fetchErr } = await supabase.from('items').select('quantity').eq('code', code).single();
      if (fetchErr || !item) {
        showMessage('Articolo non trovato', 'error');
        return;
      }

      const { error: updateErr } = await supabase.from('items').update({
        quantity: Number(item.quantity) + Number(restock.quantity)
      }).eq('code', code);

      if (updateErr) throw updateErr;

      showMessage('Stock aggiornato', 'success');
      setRestock({ code: '', quantity: '' });
      fetchItems();
    } catch (error) {
      console.error("Restock error:", error);
      showMessage('Errore durante l\'aggiornamento', 'error');
    }
  };

  const handleDeleteItem = async (code: string) => {
    try {
      const { error } = await supabase.from('items').delete().eq('code', code);
      if (error) throw error;

      showMessage('Articolo eliminato', 'success');
      setDeleteConfirm(null);
      fetchItems();
    } catch (error) {
      console.error("Delete error:", error);
      showMessage('Errore durante l\'eliminazione', 'error');
    }
  };

  const startSaleFromInventory = (item: Item) => {
    setSale({ code: item.code, quantity: '1' });
    setActiveTab('dashboard');
    setTimeout(() => {
      const form = document.getElementById('quick-sale-form');
      form?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  const handleSale = (e: React.FormEvent) => {
    e.preventDefault();
    const item = items.find(i => i.code.toUpperCase() === sale.code.toUpperCase());
    if (!item) {
      showMessage('Articolo non trovato', 'error');
      return;
    }
    const qty = parseInt(sale.quantity);
    if (isNaN(qty) || qty <= 0) {
      showMessage('Quantità non valida', 'error');
      return;
    }
    if (qty > item.quantity) {
      showMessage('Stock insufficiente', 'error');
      return;
    }
    setSaleConfirmation({
      item,
      quantity: qty,
      total: item.price * qty
    });
  };

  const confirmSale = async () => {
    if (!saleConfirmation) return;
    try {
      const code = saleConfirmation.item.code;
      const qty = saleConfirmation.quantity;

      // 1. Check current stock directly on DB
      const { data: itemData, error: itemError } = await supabase.from('items').select('*').eq('code', code).single();
      if (itemError || !itemData) {
        showMessage('Articolo non trovato in DB', 'error');
        return;
      }

      const currentStock = Number(itemData.quantity);

      if (isNaN(currentStock) || currentStock < qty) {
        showMessage(`Quantità insufficiente: solo ${currentStock} PZ nel DB`, 'error');
        return;
      }

      // 2. Decrement stock
      const { error: updateError } = await supabase.from('items').update({
        quantity: itemData.quantity - qty
      }).eq('code', code);

      if (updateError) throw updateError;

      // 3. Insert sale record
      const { error: insertError } = await supabase.from('sales').insert({
        item_code: code,
        item_name: itemData.name,
        price: itemData.price,
        quantity: qty,
        total: saleConfirmation.total
      });

      if (insertError) throw insertError;

      showMessage(`Venduto! €${saleConfirmation.total.toFixed(2)}`, 'success');
      setSale({ code: '', quantity: '1' });
      setSaleConfirmation(null);
      fetchItems();
      fetchSales();
    } catch (error: any) {
      console.error("Sale error:", error);
      showMessage(`Errore: ${error.message || 'Transazione fallita. Controlla la console.'}`, 'error');
    }
  };

  const getFilteredSales = (period: 'daily' | 'monthly' | 'annual') => {
    const now = selectedDate;
    return sales.filter(s => {
      const date = s.timestamp?.toDate();
      if (!date) return false;

      if (period === 'daily') {
        return date.toDateString() === now.toDateString();
      }
      if (period === 'monthly') {
        return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
      }
      if (period === 'annual') {
        return date.getFullYear() === now.getFullYear();
      }
      return true;
    });
  };

  const getDaySales = (date: Date) => {
    return sales.filter(s => {
      const sDate = s.timestamp?.toDate();
      return sDate && isSameDay(sDate, date);
    });
  };

  const dailySales = getDaySales(selectedDate);
  const monthlySales = getFilteredSales('monthly');
  const annualSales = getFilteredSales('annual');

  const dailyEarnings = dailySales.reduce((acc, sale) => acc + sale.total, 0);
  const monthlyEarnings = monthlySales.reduce((acc, sale) => acc + sale.total, 0);
  const annualEarnings = annualSales.reduce((acc, sale) => acc + sale.total, 0);

  const getChartData = () => {
    if (chartView === 'daily') {
      const currentMonday = startOfWeek(new Date(), { weekStartsOn: 1 });
      const weekStart = addDays(currentMonday, weekOffset * 7);

      return Array.from({ length: 7 }).map((_, i) => {
        const date = addDays(weekStart, i);
        const dayTotal = sales
          .filter(s => {
            const sDate = s.timestamp?.toDate();
            return sDate && isSameDay(sDate, date);
          })
          .reduce((acc, s) => acc + s.total, 0);

        return {
          name: format(date, 'EEE', { locale: it }),
          total: dayTotal,
          fullDate: format(date, 'dd MMM yyyy', { locale: it }),
          rawDate: date
        };
      });
    } else if (chartView === 'monthly') {
      const year = Math.floor(semesterOffset / 2);
      const isSecondHalf = semesterOffset % 2 !== 0;
      const startMonth = isSecondHalf ? 6 : 0;

      return Array.from({ length: 6 }).map((_, i) => {
        const date = new Date(year, startMonth + i, 1);
        const monthTotal = sales
          .filter(s => {
            const sDate = s.timestamp?.toDate();
            return sDate && sDate.getFullYear() === year && sDate.getMonth() === (startMonth + i);
          })
          .reduce((acc, s) => acc + s.total, 0);

        return {
          name: format(date, 'MMM', { locale: it }),
          total: monthTotal,
          fullDate: format(date, 'MMMM yyyy', { locale: it }),
          rawDate: date
        };
      });
    } else {
      const currentYear = new Date().getFullYear();
      const yearsCount = Math.max(5, currentYear - 2025 + 1);

      return Array.from({ length: yearsCount }).map((_, i) => {
        const date = new Date(2025 + i, 0, 1);
        const yearTotal = sales
          .filter(s => {
            const sDate = s.timestamp?.toDate();
            return sDate && isSameYear(sDate, date);
          })
          .reduce((acc, s) => acc + s.total, 0);

        return {
          name: format(date, 'yyyy'),
          total: yearTotal,
          fullDate: format(date, 'yyyy'),
          rawDate: date
        };
      });
    }
  };

  const chartData = getChartData();

  const getTop3BestSellers = () => {
    const now = new Date();
    const twentyFourHoursAgo = subDays(now, 1);

    const last24hSales = sales.filter(s => {
      const sDate = s.timestamp?.toDate();
      return sDate && sDate >= twentyFourHoursAgo;
    });

    const grouped = last24hSales.reduce((acc, s) => {
      acc[s.itemCode] = (acc[s.itemCode] || 0) + s.quantity;
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(grouped)
      .map(([code, qty]): { code: string, name: string, quantity: number } | null => {
        const item = items.find(i => i.code === code);
        if (!item) return null;
        return { code, name: item.name, quantity: qty as number };
      })
      .filter((i): i is { code: string, name: string, quantity: number } => i !== null)
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 3);
  };

  // Costanti per l'Analisi Taglie
  const SIZES_ORDER = ['40', '41', '42', '43', '44', '45', '46', 'XXS', 'XS', 'S', 'M', 'L', 'XL', 'XXL', '3XL', 'UNI'];

  const getSizeAnalysisData = () => {
    const sizeMap: Record<string, Record<string, number>> = {};

    // Settimana fissa LUN-DOM basata su analysisDate
    const startDate = startOfWeek(analysisDate, { weekStartsOn: 1 });
    const endDate = endOfWeek(analysisDate, { weekStartsOn: 1 });

    sales.forEach(s => {
      const date = s.timestamp?.toDate();
      if (!date || date < startDate || date > endDate) return;

      const item = items.find(i => i.code === s.itemCode);
      if (!item) return; // Se il prodotto è stato eliminato dal magazzino, lo ignoriamo

      let size = (item.size || 'UNI').toUpperCase();

      const dayKey = format(date, 'yyyy-MM-dd');
      if (!sizeMap[size]) sizeMap[size] = {};
      sizeMap[size][dayKey] = (sizeMap[size][dayKey] || 0) + s.quantity;
    });

    const data: { size: string, yIndex: number, day: number, dateObj: Date, dayName: string, quantity: number, isSelected: boolean }[] = [];

    // Generiamo i 7 giorni (LUN-DOM)
    for (let i = 0; i < 7; i++) {
      const currentDay = addDays(startDate, i);
      const dayKey = format(currentDay, 'yyyy-MM-dd');

      Object.entries(sizeMap).forEach(([size, days]) => {
        if (days[dayKey]) {
          data.push({
            size,
            yIndex: SIZES_ORDER.indexOf(size) !== -1 ? SIZES_ORDER.indexOf(size) : SIZES_ORDER.length,
            day: i, // 0 (Lun) a 6 (Dom)
            dateObj: currentDay,
            dayName: format(currentDay, 'EEE', { locale: it }),
            quantity: days[dayKey],
            isSelected: isSameDay(currentDay, selectedDate)
          });
        }
      });
    }

    return data;
  };

  const getSizeInsight = () => {
    const data = getSizeAnalysisData();
    if (data.length === 0) return "Fai qualche vendita per vedere i trend delle taglie!";

    const top = [...data].sort((a, b) => b.quantity - a.quantity)[0];
    const brand = items.find(i => i.code === top.size)?.name.split(' ')[0] || "nella tua selezione";

    const dayNameLong = format(top.dateObj, 'EEEE', { locale: it });
    return `La taglia ${top.size} viene venduta maggiormente il ${dayNameLong}.`;
  };
  if (!introDismissed) {
    return (
      <AnimatePresence mode="wait">
        <motion.div
          key="intro"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, scale: 1.05, filter: "blur(10px)" }}
          transition={{ duration: 0.8, ease: "easeInOut" }}
          className="min-h-screen flex flex-col items-center justify-center bg-black relative overflow-hidden"
        >
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[40%] h-[40%] bg-white/5 rounded-full blur-[100px]" />

          <motion.div
            initial={{ opacity: 0, scale: 0.95, filter: "blur(10px)" }}
            animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
            transition={{ duration: 1.2, ease: "easeOut" }}
            className="z-10"
          >
            <Logo size="large" />
          </motion.div>

          <div className="absolute bottom-20 z-10 flex flex-col items-center h-12 justify-center">
            {loading ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: [0, 1, 0.3] }}
                transition={{ duration: 2, repeat: Infinity, ease: "easeInOut", delay: 0.8 }}
                className="text-white/40 font-sans tracking-[0.4em] text-[10px] uppercase"
              >
                Connessione in corso...
              </motion.div>
            ) : (
              <motion.button
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                onClick={() => setIntroDismissed(true)}
                className="px-10 py-4 border border-white/20 rounded-full text-white font-sans tracking-[0.3em] text-xs uppercase hover:bg-white hover:text-black transition-all duration-300"
              >
                Entra
              </motion.button>
            )}
          </div>
        </motion.div>
      </AnimatePresence>
    );
  }

  // Login Interface
  if (!showApp) {
    return (
      <motion.div
        key="login"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="min-h-screen bg-black flex flex-col items-center justify-center p-6 overflow-hidden relative"
      >
        <div className="relative z-10 flex flex-col items-center w-full max-w-md">
          <motion.div
            initial={{ opacity: 0, filter: "blur(8px)" }}
            animate={{ opacity: 1, filter: "blur(0px)" }}
            transition={{ duration: 1.2, ease: "easeOut" }}
            className="mb-12"
          >
            <Logo size="large" />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3, ease: "easeOut" }}
            className="flex flex-col items-center gap-10 w-full"
          >
            <form onSubmit={handleLogin} className="flex flex-col gap-5 w-full max-w-[300px]">
              <input
                type="email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-6 py-4 bg-white/5 border border-white/10 rounded-2xl outline-none focus:border-white text-[11px] tracking-widest transition-all"
              />
              <input
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full px-6 py-4 bg-white/5 border border-white/10 rounded-2xl outline-none focus:border-white text-[11px] tracking-widest transition-all"
              />
              <button
                type="submit"
                className="group relative mt-2 px-10 py-4 border border-white/10 text-white font-sans text-[11px] font-bold tracking-[0.5em] uppercase rounded-full overflow-hidden transition-all hover:border-white/40 hover:scale-105 active:scale-95 text-center"
              >
                <span className="relative z-10 transition-colors duration-500 group-hover:text-black">
                  Accedi
                </span>
                <div className="absolute inset-0 bg-white translate-y-full group-hover:translate-y-0 transition-transform duration-700 cubic-bezier(0.19, 1, 0.22, 1)" />
              </button>
              {authError && (
                <p className="text-amber-500 text-[9px] tracking-widest uppercase text-center mt-2">{authError}</p>
              )}
            </form>

            <motion.div
              animate={{ opacity: [0.1, 0.3, 0.1] }}
              transition={{ duration: 4, repeat: Infinity }}
              className="flex flex-col items-center gap-6"
            >
              <div className="max-w-[350px] text-center px-4">
                <p className="text-[10px] text-white-500/70 tracking-[0.1em] leading-relaxed uppercase font-bold">
                  Questo software è ad uso puramente gestionale interno e non sostituisce l'emissione dello scontrino fiscale tramite registratore di cassa certificato
                </p>
              </div>
              <p className="text-white/20 text-[9px] tracking-[0.4em] uppercase font-light">
                Novum Store Management System
              </p>
            </motion.div>
          </motion.div>
        </div>

        {/* Interactive Background Elements */}
        <div className="fixed inset-0 pointer-events-none z-0">
          <motion.div
            animate={{
              scale: [1, 1.1, 1],
              opacity: [0.03, 0.07, 0.03]
            }}
            transition={{ duration: 15, repeat: Infinity, ease: "easeInOut" }}
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[1000px] h-[1000px] bg-white rounded-full blur-[150px]"
          />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,black_100%)]" />
        </div>
      </motion.div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white flex flex-col md:flex-row font-sans selection:bg-white selection:text-black">
      {/* Sidebar Desktop (md+) */}
      <aside className="hidden md:flex flex-col w-64 lg:w-80 bg-[#0A0A0A] border-r border-white/5 sticky top-0 h-screen z-40">
        <div className="p-10">
          <Logo />
        </div>
        
        <nav className="flex-1 px-6 space-y-1">
          {[
            { id: 'dashboard', icon: LayoutDashboard, label: 'Dashboard' },
            { id: 'analytics', icon: BarChart3, label: 'Analytics' },
            { id: 'inventory', icon: Package, label: 'Inventario' },
            { id: 'sales', icon: ShoppingCart, label: 'Cronologia' }
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id as any)}
              className={`w-full flex items-center gap-4 px-6 py-4 rounded-2xl transition-all duration-300 group ${
                activeTab === item.id 
                  ? 'bg-white text-black shadow-[0_0_20px_rgba(255,255,255,0.1)]' 
                  : 'text-white/40 hover:text-white hover:bg-white/5'
              }`}
            >
              <item.icon size={18} className={`${activeTab === item.id ? '' : 'group-hover:scale-110 transition-transform'}`} />
              <span className="text-[10px] font-bold tracking-[0.2em] uppercase">{item.label}</span>
            </button>
          ))}
        </nav>
        
        <div className="p-8 mt-auto">
          <button 
            onClick={handleLogout}
            className="w-full flex items-center gap-4 px-6 py-4 text-white/20 hover:text-red-500 hover:bg-red-500/5 rounded-2xl transition-all group"
          >
            <LogOut size={18} className="group-hover:rotate-12 transition-transform" />
            <span className="text-[10px] font-bold tracking-[0.2em] uppercase">Disconnetti</span>
          </button>
        </div>
      </aside>

      {/* Navigation Mobile (Below md) */}
      <header className="md:hidden bg-black/80 backdrop-blur-xl border-b border-white/5 px-6 py-4 sticky top-0 z-50 flex items-center justify-between">
        <div className="scale-75 origin-left">
          <Logo />
        </div>
        <div className="flex gap-2">
          {[
            { id: 'dashboard', icon: LayoutDashboard },
            { id: 'analytics', icon: BarChart3 },
            { id: 'inventory', icon: Package },
            { id: 'sales', icon: ShoppingCart }
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id as any)}
              className={`p-3 rounded-xl transition-all ${
                activeTab === item.id ? 'bg-white text-black' : 'text-white/40'
              }`}
            >
              <item.icon size={18} />
            </button>
          ))}
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 min-w-0 md:h-screen overflow-y-auto bg-black p-4 md:p-10 lg:p-14">
        <AnimatePresence mode="wait">
          {message && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className={`fixed top-10 right-10 z-50 flex items-center gap-4 px-8 py-5 rounded-2xl shadow-2xl backdrop-blur-xl border ${message.type === 'success' ? 'bg-white/90 text-black border-white' : 'bg-red-950/90 text-white border-red-500/50'}`}
            >
              {message.type === 'success' ? <CheckCircle2 className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
              <span className="font-sans text-xs font-bold tracking-widest uppercase">{message.text}</span>
            </motion.div>
          )}
        </AnimatePresence>

        {activeTab === 'dashboard' && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-6xl mx-auto space-y-12 select-none"
          >
            <header className="flex flex-col md:flex-row md:items-end justify-between gap-8 mb-12">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <h1 className="text-5xl font-sans font-bold tracking-tighter">Dashboard</h1>
                  {!isSameDay(selectedDate, new Date()) && (
                    <button
                      onClick={() => setSelectedDate(new Date())}
                      className="px-3 py-1 bg-amber-500/10 border border-amber-500/20 text-amber-500 text-[9px] font-bold tracking-widest uppercase rounded-full hover:bg-amber-500 hover:text-black transition-all flex items-center gap-2"
                    >
                      <RefreshCw size={10} />
                      Torna a Oggi
                    </button>
                  )}
                </div>
                <p className="text-white/40 font-sans text-xs tracking-[0.3em] uppercase">Riepilogo e Statistiche</p>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-right">
                  <p className="text-white/40 text-[10px] tracking-widest uppercase mb-1">Data</p>
                  <p className="font-sans font-bold text-sm tracking-widest">{selectedDate.toLocaleDateString('it-IT', { day: '2-digit', month: 'long', year: 'numeric' })}</p>
                </div>
              </div>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {[
                {
                  label: isSameDay(selectedDate, new Date()) ? 'Guadagno Oggi' : `Guadagno ${format(selectedDate, 'dd/MM/yy', { locale: it })}`,
                  value: dailyEarnings,
                  icon: TrendingUp,
                  isToday: isSameDay(selectedDate, new Date())
                },
                { label: 'Guadagno Mese', value: monthlyEarnings, icon: TrendingUp },
                { label: 'Guadagno Anno', value: annualEarnings, icon: TrendingUp }
              ].map((stat, i) => (
                <div key={i} className={`bg-white/5 p-8 rounded-[32px] border transition-all group relative overflow-hidden ${!stat.isToday && i === 0 ? 'border-amber-500/30' : 'border-white/5 hover:border-white/20'}`}>
                  <div className="flex justify-between items-start mb-6">
                    <stat.icon className="w-6 h-6 text-white/40 group-hover:scale-110 transition-transform" />
                    <button
                      onClick={() => setShowEarnings(!showEarnings)}
                      className="p-2 hover:bg-white/10 rounded-full transition-colors text-white/20 hover:text-white"
                      title={showEarnings ? "Nascondi" : "Mostra"}
                    >
                      {showEarnings ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                  </div>
                  <p className="text-white/40 text-[10px] tracking-[0.3em] uppercase mb-2">{stat.label}</p>
                  <div className="relative h-10 flex items-center">
                    <AnimatePresence mode="wait">
                      {showEarnings ? (
                        <motion.h2
                          key="visible"
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -10 }}
                          className="text-3xl font-sans font-bold tracking-tighter text-white"
                        >
                          €{stat.value.toFixed(2)}
                        </motion.h2>
                      ) : (
                        <motion.div
                          key="hidden"
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -10 }}
                          className="flex gap-1"
                        >
                          {[1, 2, 3, 4, 5].map(dot => (
                            <div key={dot} className="w-2 h-2 bg-white/20 rounded-full animate-pulse" style={{ animationDelay: `${dot * 0.1}s` }} />
                          ))}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  {/* Decorative background element */}
                  <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-white/5 rounded-full blur-2xl group-hover:bg-white/10 transition-all" />
                </div>
              ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
              {/* Quick Sale */}
              {isSameDay(selectedDate, new Date()) ? (
                <div className="bg-white/5 p-10 rounded-[40px] border border-white/5">
                  <h3 className="text-xs font-bold tracking-[0.4em] uppercase mb-10 text-white/60">Registra Vendita</h3>
                  <form id="quick-sale-form" onSubmit={handleSale} className="space-y-8">
                    <div className="space-y-2">
                      <label className="text-[10px] tracking-widest uppercase text-white/40 ml-4">Codice Articolo</label>
                      <div className="relative">
                        <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20 z-10 pointer-events-none" />
                        <CodeAutocomplete
                          items={items}
                          value={sale.code}
                          onChange={(val: string) => setSale({ ...sale, code: val })}
                          placeholder="Cerca codice..."
                          className="w-full pl-14 pr-6 py-5 bg-white/5 border border-white/10 rounded-3xl focus:border-white outline-none transition-all font-sans text-sm tracking-widest uppercase"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] tracking-widest uppercase text-white/40 ml-4">Quantità</label>
                      <input
                        type="number"
                        required
                        min="1"
                        value={sale.quantity}
                        onChange={e => setSale({ ...sale, quantity: e.target.value })}
                        className="w-full px-6 py-5 bg-white/5 border border-white/10 rounded-3xl focus:border-white outline-none transition-all font-sans text-sm tracking-widest"
                      />
                    </div>
                    <button type="submit" className="w-full bg-white text-black font-sans font-bold tracking-[0.3em] uppercase py-6 rounded-3xl transition-all hover:scale-[1.02] active:scale-[0.98] shadow-2xl">
                      Conferma Transazione
                    </button>
                  </form>
                </div>
              ) : (
                <div className="bg-white/2 p-10 rounded-[40px] border border-white/5 flex flex-col items-center justify-center text-center space-y-4 opacity-50 grayscale">
                  <div className="p-4 bg-white/5 rounded-full mb-2">
                    <PlusCircle className="w-10 h-10 text-white/20" />
                  </div>
                  <h3 className="text-xs font-bold tracking-[0.4em] uppercase text-white/40">Sola Lettura</h3>
                  <p className="text-[10px] tracking-widest uppercase text-white/20 px-8">Non è possibile registrare vendite per date passate.</p>
                </div>
              )}

              {/* Recent Sales */}
              <div className="bg-white/5 p-10 rounded-[40px] border border-white/5 flex flex-col">
                <h3 className="text-xs font-bold tracking-[0.4em] uppercase mb-10 text-white/60">Ultime Transazioni</h3>
                <div className="flex-1 space-y-4 overflow-auto pr-2 custom-scrollbar">
                  {sales.length === 0 ? (
                    <div className="h-full flex items-center justify-center">
                      <p className="text-white/20 text-[10px] tracking-widest uppercase italic">Nessuna attività registrata</p>
                    </div>
                  ) : (
                    dailySales.map(s => (
                      <div key={s.id} className="group flex items-center gap-4 p-4 sm:p-6 bg-white/[0.02] border border-white/5 rounded-3xl hover:bg-white/[0.04] transition-all">
                        <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center text-lg font-script text-white/40 group-hover:scale-110 transition-transform">
                          {s.itemName.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="text-[10px] font-bold tracking-widest uppercase truncate">{s.itemName}</h4>
                          <p className="text-[9px] text-white/20 tracking-widest uppercase mt-0.5">
                            {format(s.timestamp?.toDate(), 'dd MMM', { locale: it })} • 
                            {s.timestamp?.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>

                        {/* Actions Container with Safety Padding */}
                        <div className="flex items-center gap-2 pl-4">
                          {isSameDay(selectedDate, new Date()) && (
                            <button
                              onClick={() => setSaleDeleteConfirm(s.id)}
                              className="p-3 bg-red-500/10 text-red-500 rounded-xl hover:bg-red-500 hover:text-black transition-all"
                              title="Annulla vendita"
                            >
                              <Trash2 size={16} />
                            </button>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {activeTab === 'inventory' && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-6xl mx-auto space-y-12"
          >
            <header className="border-b border-white/10 pb-8 flex items-end justify-between">
              <div>
                <h1 className="text-5xl font-sans font-bold tracking-tighter mb-2">Inventario</h1>
                <p className="text-white/40 font-sans text-xs tracking-[0.3em] uppercase">Gestione Capi e Stock</p>
              </div>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
              <div className="lg:col-span-1 space-y-8">
                <div className="bg-white/5 p-8 rounded-[40px] border border-white/5">
                  <h3 className="text-[10px] font-bold tracking-[0.4em] uppercase mb-8 text-white/60">Nuovo Articolo</h3>
                  <form onSubmit={handleAddItem} className="space-y-4">
                    <input
                      type="text" placeholder="CODICE" required
                      value={newItem.code} onChange={e => setNewItem({ ...newItem, code: e.target.value.toUpperCase() })}
                      className="w-full px-6 py-4 bg-white/5 border border-white/10 rounded-2xl outline-none focus:border-white text-xs tracking-widest uppercase"
                    />
                    <input
                      type="text" placeholder="NOME" required
                      value={newItem.name} onChange={e => setNewItem({ ...newItem, name: e.target.value })}
                      className="w-full px-6 py-4 bg-white/5 border border-white/10 rounded-2xl outline-none focus:border-white text-xs tracking-widest uppercase"
                    />
                    <div className="flex gap-4">
                      <input
                        type="text" placeholder="TAGLIA"
                        value={newItem.size} onChange={e => setNewItem({ ...newItem, size: e.target.value })}
                        className="w-1/2 px-6 py-4 bg-white/5 border border-white/10 rounded-2xl outline-none focus:border-white text-xs tracking-widest uppercase"
                      />
                      <input
                        type="text" placeholder="COLORE"
                        value={newItem.color} onChange={e => setNewItem({ ...newItem, color: e.target.value })}
                        className="w-1/2 px-6 py-4 bg-white/5 border border-white/10 rounded-2xl outline-none focus:border-white text-xs tracking-widest uppercase"
                      />
                    </div>
                    <input
                      type="text" placeholder="PREZZO" required
                      value={newItem.price} onChange={e => setNewItem({ ...newItem, price: e.target.value })}
                      className="w-full px-6 py-4 bg-white/5 border border-white/10 rounded-2xl outline-none focus:border-white text-xs tracking-widest uppercase"
                    />
                    <input
                      type="number" placeholder="STOCK INIZIALE" required min="1"
                      value={newItem.quantity} onChange={e => setNewItem({ ...newItem, quantity: e.target.value })}
                      className="w-full px-6 py-4 bg-white/5 border border-white/10 rounded-2xl outline-none focus:border-white text-xs tracking-widest uppercase"
                    />
                    <button type="submit" className="w-full bg-white text-black font-sans font-bold tracking-[0.2em] uppercase py-5 rounded-2xl hover:scale-[1.02] transition-all">
                      Aggiungi
                    </button>
                  </form>
                </div>

                <div className="bg-white/5 p-8 rounded-[40px] border border-white/5">
                  <h3 className="text-[10px] font-bold tracking-[0.4em] uppercase mb-8 text-white/60">Restock Rapido</h3>
                  <form onSubmit={handleRestock} className="space-y-4">
                    <CodeAutocomplete
                      items={items}
                      value={restock.code}
                      onChange={(val: string) => setRestock({ ...restock, code: val })}
                      placeholder="CODICE"
                      className="w-full px-6 py-4 bg-white/5 border border-white/10 rounded-2xl outline-none focus:border-white text-xs tracking-widest uppercase"
                    />
                    <input
                      type="number" placeholder="QUANTITÀ" required
                      value={restock.quantity} onChange={e => setRestock({ ...restock, quantity: e.target.value })}
                      className="w-full px-6 py-4 bg-white/5 border border-white/10 rounded-2xl outline-none focus:border-white text-xs tracking-widest uppercase"
                    />
                    <button type="submit" className="w-full border border-white/20 text-white font-sans font-bold tracking-[0.2em] uppercase py-5 rounded-2xl hover:bg-white hover:text-black transition-all">
                      Aggiorna
                    </button>
                  </form>
                </div>
              </div>

              <div className="lg:col-span-2 flex flex-col gap-6">

                {/* Smart Category Filters */}
                {items.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => setSelectedCategory(null)}
                      className={`px-4 py-2 rounded-xl text-[10px] font-bold tracking-widest uppercase transition-all border ${!selectedCategory ? 'bg-white text-black border-white' : 'bg-transparent text-white/50 border-white/10 hover:border-white/30 hover:text-white'}`}
                    >
                      TUTTI
                    </button>
                    {Array.from(new Set(items.map(item => item.name.split(' ')[0].toUpperCase()))).sort().map(cat => (
                      <button
                        key={cat}
                        onClick={() => setSelectedCategory(cat)}
                        className={`px-4 py-2 rounded-xl text-[10px] font-bold tracking-widest uppercase transition-all border ${selectedCategory === cat ? 'bg-white text-black border-white' : 'bg-transparent text-white/50 border-white/10 hover:border-white/30 hover:text-white'}`}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>
                )}

                {/* Mobile View (sm only) */}
                <div className="md:hidden flex flex-col gap-4 px-2">
                  {items.filter(i => !selectedCategory || i.name.toUpperCase().includes(selectedCategory)).map(item => (
                    <div key={item.code} className="bg-white/5 border border-white/10 rounded-3xl p-6 relative overflow-hidden group">
                      <div className="flex justify-between items-start mb-6">
                        <div>
                          <p className="text-[9px] text-white/30 tracking-widest uppercase mb-1 font-bold">{item.code}</p>
                          <h4 className="text-sm font-bold tracking-tight uppercase leading-tight">{item.name}</h4>
                        </div>
                        <p className="text-xl font-sans font-bold tracking-tighter text-amber-500">€{item.price.toFixed(2)}</p>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4 mb-8">
                        <div className="bg-black/20 p-3 rounded-2xl border border-white/5">
                          <p className="text-[8px] text-white/30 tracking-widest uppercase mb-1">Taglia</p>
                          <p className="text-xs font-bold font-mono tracking-widest">{item.size || 'UNI'}</p>
                        </div>
                        <div className="bg-black/20 p-3 rounded-2xl border border-white/5">
                          <p className="text-[8px] text-white/30 tracking-widest uppercase mb-1">Colore</p>
                          <p className="text-xs font-bold font-mono tracking-widest">{item.color || '-'}</p>
                        </div>
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="flex flex-col">
                          <p className="text-[8px] text-white/30 tracking-widest uppercase mb-1 font-bold">In Stock</p>
                          <p className={`text-xl font-sans font-bold tracking-tight ${item.quantity <= 2 ? 'text-red-500' : 'text-white'}`}>
                            {item.quantity} PZ
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <button onClick={() => startSaleFromInventory(item)} className="p-4 bg-white text-black rounded-2xl hover:scale-105 active:scale-95 transition-all">
                            <ShoppingCart size={18} />
                          </button>
                          <button onClick={() => { setEditingItem(item.code); setEditForm(item); }} className="p-4 bg-white/5 border border-white/10 text-white/40 rounded-2xl hover:text-white transition-all">
                            <Pencil size={18} />
                          </button>
                          <button onClick={() => setDeleteConfirm(item.code)} className="p-4 bg-red-500/10 text-red-500 rounded-2xl hover:bg-red-500 hover:text-black transition-all">
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Desktop/Tablet View (md+) */}
                <div className="hidden md:block bg-white/5 border border-white/10 rounded-[40px] overflow-hidden backdrop-blur-xl">
                  <table className="w-full text-left">
                      <thead>
                        <tr className="text-white/40 text-[10px] tracking-[0.3em] uppercase border-b border-white/10">
                          <th className="px-2 lg:px-3 py-4">Codice</th>
                          <th className="px-2 lg:px-3 py-4">Articolo</th>
                          <th className="px-2 lg:px-3 py-4 text-center">Taglia</th>
                          <th className="px-2 lg:px-3 py-4 text-center">Colore</th>
                          <th className="px-2 lg:px-3 py-4">Prezzo</th>
                          <th className="px-2 lg:px-3 py-4 text-center">Stock</th>
                          <th className="px-2 lg:px-3 py-4 text-center">Stato</th>
                          <th className="px-2 lg:px-3 py-4 text-center">Azioni</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                        {items.length === 0 ? (
                          <tr>
                            <td colSpan={8} className="px-2 py-10 text-center">
                              <p className="text-white/20 text-[10px] tracking-widest uppercase italic">Nessun articolo in inventario</p>
                            </td>
                          </tr>
                        ) : (
                          (selectedCategory ? items.filter(i => i.name.toUpperCase().startsWith(selectedCategory)) : items).map(item => (
                            editingItem === item.code ? (
                              <tr key={`edit-${item.code}`} className="bg-white/10 shadow-inner">
                                <td className="px-2 lg:px-3 py-4 text-[10px] font-bold tracking-widest text-white/40">{item.code}</td>
                                <td className="px-2 lg:px-3 py-4">
                                  <input type="text" value={editForm.name || ''} onChange={e => setEditForm({ ...editForm, name: e.target.value })} className="w-full bg-black/50 border border-white/20 rounded px-2 py-1 text-xs uppercase outline-none focus:border-white" />
                                </td>
                                <td className="px-2 lg:px-3 py-4">
                                  <input type="text" placeholder="TG" value={editForm.size || ''} onChange={e => setEditForm({ ...editForm, size: e.target.value })} className="w-10 bg-black/50 border border-white/20 rounded px-2 py-1 text-xs uppercase text-center outline-none focus:border-white mx-auto block" />
                                </td>
                                <td className="px-2 lg:px-3 py-4">
                                  <input type="text" placeholder="COL" value={editForm.color || ''} onChange={e => setEditForm({ ...editForm, color: e.target.value })} className="w-12 bg-black/50 border border-white/20 rounded px-2 py-1 text-xs uppercase text-center outline-none focus:border-white mx-auto block" />
                                </td>
                                <td className="px-2 lg:px-3 py-4">
                                  <input type="text" value={editForm.price || ''} onChange={e => setEditForm({ ...editForm, price: e.target.value as any })} className="w-14 bg-black/50 border border-white/20 rounded px-2 py-1 text-xs outline-none focus:border-white" />
                                </td>
                                <td className="px-2 lg:px-3 py-4 text-sm font-bold text-center text-white/50">{item.quantity}</td>
                                <td className="px-2 lg:px-3 py-4 text-center text-white/20">-</td>
                                <td className="px-2 lg:px-3 py-4 text-center">
                                  <div className="flex justify-center gap-1">
                                    <button onClick={handleSaveEdit} className="p-1.5 bg-emerald-500/20 hover:bg-emerald-500 text-emerald-400 hover:text-white rounded-lg transition-colors border border-emerald-500/30" title="Salva"><Check size={14} /></button>
                                    <button onClick={() => setEditingItem(null)} className="p-1.5 bg-white/10 hover:bg-white/20 rounded-lg text-white/60 hover:text-white transition-colors border border-white/10" title="Annulla"><X size={14} /></button>
                                  </div>
                                </td>
                              </tr>
                            ) : (
                              <tr key={item.code} className="hover:bg-white/5 transition-colors group">
                                <td className="px-2 lg:px-3 py-4 text-[10px] font-bold tracking-widest text-white/60 truncate max-w-[80px]">{item.code}</td>
                                <td className="px-2 lg:px-3 py-4 text-[10px] font-bold tracking-widest uppercase truncate max-w-[120px]">{item.name}</td>
                                <td className="px-2 lg:px-3 py-4 text-[10px] tracking-widest uppercase text-white/50 text-center">
                                  {item.size ? item.size : (
                                    <input
                                      type="text"
                                      placeholder="TG"
                                      className="w-10 px-1 py-1 bg-white/5 border border-white/10 rounded text-center outline-none focus:bg-white/10 transition-colors uppercase placeholder:normal-case placeholder:text-white/20"
                                      onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur(); }}
                                      onBlur={(e) => { if (e.currentTarget.value.trim()) handleUpdateAttribute(item.code, 'size', e.currentTarget.value); }}
                                    />
                                  )}
                                </td>
                                <td className="px-2 lg:px-3 py-4 text-[10px] tracking-widest uppercase text-white/50 text-center">
                                  {item.color ? item.color : (
                                    <input
                                      type="text"
                                      placeholder="COL"
                                      className="w-12 px-1 py-1 bg-white/5 border border-white/10 rounded text-center outline-none focus:bg-white/10 transition-colors uppercase placeholder:normal-case placeholder:text-white/20"
                                      onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur(); }}
                                      onBlur={(e) => { if (e.currentTarget.value.trim()) handleUpdateAttribute(item.code, 'color', e.currentTarget.value); }}
                                    />
                                  )}
                                </td>
                                <td className="px-2 lg:px-3 py-4 text-xs tracking-tighter">€{item.price.toFixed(2)}</td>
                                <td className="px-2 lg:px-3 py-4 text-sm font-bold text-center">{item.quantity}</td>
                                <td className="px-2 lg:px-3 py-4">
                                  <div className={`w-2 h-2 mx-auto rounded-full shadow-[0_0_10px_rgba(255,255,255,0.2)] ${item.quantity > 0 ? 'bg-emerald-500' : 'bg-red-500'}`} />
                                </td>
                                <td className="px-2 lg:px-3 py-4 text-center">
                                  <div className="flex justify-center gap-1 lg:opacity-0 transition-opacity lg:group-hover:opacity-100">
                                    <button
                                      onClick={() => startSaleFromInventory(item)}
                                      className="p-1.5 bg-white/5 hover:bg-white/10 rounded-lg text-white/40 hover:text-white transition-colors"
                                      title="Vendi"
                                    >
                                      <ShoppingCart size={14} />
                                    </button>
                                    <button
                                      onClick={() => {
                                        setEditingItem(item.code);
                                        setEditForm({ name: item.name, size: item.size || '', color: item.color || '', price: item.price });
                                      }}
                                      className="p-1.5 bg-blue-500/10 hover:bg-blue-500/20 rounded-lg text-blue-400/60 hover:text-blue-400 transition-colors"
                                      title="Modifica"
                                    >
                                      <Pencil size={14} />
                                    </button>
                                    <button
                                      onClick={() => setDeleteConfirm(item.code)}
                                      className="p-1.5 bg-red-500/10 hover:bg-red-500/20 rounded-lg text-red-500/40 hover:text-red-500 transition-colors"
                                      title="Elimina"
                                    >
                                      <Trash2 size={14} />
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            )
                          ))
                        )}
                      </tbody>
                    </table>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {activeTab === 'analytics' && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-6xl mx-auto space-y-12"
          >
            <header className="border-b border-white/10 pb-8">
              <h1 className="text-5xl font-sans font-bold tracking-tighter mb-2">Analytics</h1>
              <p className="text-white/40 font-sans text-xs tracking-[0.3em] uppercase">Insight e Trend di Vendita</p>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Best Seller Box */}
              <div className="lg:col-span-1 bg-white/5 p-8 rounded-[40px] border border-white/5 relative overflow-hidden group">
                <div className="relative z-10">
                  <h3 className="text-[10px] font-bold tracking-[0.4em] uppercase mb-8 text-white/60">Top 3 Best Seller (24h)</h3>
                  <div className="space-y-6">
                    {getTop3BestSellers().length === 0 ? (
                      <p className="text-white/20 text-[10px] tracking-widest uppercase italic">Nessun prodotto venduto oggi</p>
                    ) : (
                      getTop3BestSellers().map((item, idx) => (
                        <div key={item.code} className="flex items-center justify-between group/item">
                          <div className="flex items-center gap-4">
                            <span className="text-2xl font-sans font-black text-white/10 group-hover/item:text-white/40 transition-colors">0{idx + 1}</span>
                            <div>
                              <p className="text-xs font-bold tracking-widest uppercase mb-0.5">{item.name}</p>
                              <p className="text-[9px] text-white/30 tracking-widest uppercase">{item.code}</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-bold tracking-tighter">{item.quantity} PZ</p>
                            <p className="text-[8px] text-emerald-500/60 font-bold uppercase tracking-widest">In voga</p>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
                <TrendingUp className="absolute -right-4 -bottom-4 w-32 h-32 text-white/[0.02] -rotate-12 group-hover:scale-110 transition-transform" />
              </div>

              {/* Sales Chart (Moved from Dashboard) */}
              <div className="lg:col-span-2 bg-white/5 p-8 rounded-[40px] border border-white/5 select-none hover:border-white/10 transition-all">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-white/10 rounded-2xl">
                      <BarChart3 className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h3 className="text-xs font-bold tracking-[0.4em] uppercase text-white/60">Andamento Vendite</h3>
                      <p className="text-[10px] text-white/30 tracking-widest uppercase">Analisi ricavi</p>
                    </div>
                  </div>

                  <div className="flex bg-black/40 p-1 rounded-2xl border border-white/10">
                    {['daily', 'monthly', 'annual'].map((p) => (
                      <button
                        key={p}
                        onClick={(e) => { e.stopPropagation(); setChartView(p as any); }}
                        className={`px-4 py-2 rounded-xl text-[9px] font-bold tracking-widest uppercase transition-all ${chartView === p ? 'bg-white text-black' : 'text-white/40 hover:text-white'}`}
                      >
                        {p === 'daily' ? 'Settimana' : p === 'monthly' ? 'Mesi' : 'Anni'}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="h-[280px] sm:h-[300px] w-full relative group select-none overflow-hidden rounded-3xl bg-white/[0.02] border border-white/5">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={chartData}
                      margin={{ top: 20, right: 10, left: 0, bottom: 10 }}
                      onClick={(state: any) => {
                        if (chartView === 'daily' && state && state.activeTooltipIndex !== undefined) {
                          const entry = chartData[state.activeTooltipIndex];
                          if (entry && entry.rawDate) {
                            setSelectedDate(entry.rawDate);
                            showMessage(`Visualizzazione per il giorno: ${format(entry.rawDate, 'eeee dd MMMM', { locale: it })}`, 'success');
                          }
                        }
                      }}
                    >
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                      <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: 'rgba(255,255,255,0.2)', fontSize: 10, fontWeight: 'bold' }} dy={10} />
                      <YAxis hide />
                      <Tooltip
                        cursor={{ fill: 'rgba(255,255,255,0.05)', radius: 16 }}
                        content={({ active, payload }) => {
                          if (active && payload && payload.length) {
                            return (
                              <div className="bg-[#0A0A0A] border border-white/10 p-4 rounded-2xl shadow-2xl backdrop-blur-md">
                                <p className="text-[10px] font-bold tracking-widest uppercase text-white/40 mb-1">{payload[0].payload.fullDate}</p>
                                <p className="text-xl font-sans font-bold tracking-tighter">€{payload[0].value.toFixed(2)}</p>
                                {chartView === 'daily' && (
                                  <div className="mt-2 py-1 px-2 bg-amber-500/10 rounded-lg">
                                    <p className="text-[8px] text-amber-500 font-bold uppercase tracking-widest text-center animate-pulse">CLICCA PER SELEZIONARE</p>
                                  </div>
                                )}
                              </div>
                            );
                          }
                          return null;
                        }}
                      />
                      <Bar dataKey="total" radius={[16, 16, 16, 16]} isAnimationActive={false}>
                        {chartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={isSameDay(entry.rawDate, selectedDate) ? '#ffffff' : 'rgba(255,255,255,0.1)'} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            {/* Selected Day Summary (New System) */}
            <AnimatePresence>
              {!isSameDay(selectedDate, new Date()) && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="bg-white/5 p-10 rounded-[40px] border border-amber-500/20 overflow-hidden relative"
                >
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-8">
                    <div>
                      <div className="flex items-center gap-4 mb-4">
                        <div className="p-3 bg-amber-500/10 rounded-2xl">
                          <Eye className="w-5 h-5 text-amber-500" />
                        </div>
                        <h3 className="text-xs font-bold tracking-[0.4em] uppercase text-amber-500/80">Focus Giorno Selezionato</h3>
                      </div>
                      <p className="text-2xl font-sans font-bold tracking-tighter mb-4">
                        {format(selectedDate, 'eeee dd MMMM yyyy', { locale: it })}
                      </p>
                      <button
                        onClick={() => {
                          setSelectedDate(new Date());
                          showMessage('Ripristinato alla data odierna', 'success');
                        }}
                        className="flex items-center gap-2 px-4 py-2 bg-white text-black rounded-xl text-[10px] font-bold tracking-widest uppercase hover:bg-white/90 transition-all shadow-lg active:scale-95"
                      >
                        <RefreshCw size={12} className="animate-spin-slow" />
                        Ripristina a oggi
                      </button>
                    </div>

                    <div className="grid grid-cols-2 gap-8 md:gap-12 text-right md:text-left">
                      <div>
                        <p className="text-white/20 text-[10px] tracking-widest uppercase mb-1">Guadagno</p>
                        <p className="text-3xl font-sans font-bold tracking-tighter text-emerald-500">
                          €{sales.filter(s => {
                            const date = s.timestamp?.toDate();
                            return date && isSameDay(date, selectedDate);
                          }).reduce((acc, s) => acc + s.total, 0).toFixed(2)}
                        </p>
                      </div>
                      <div>
                        <p className="text-white/20 text-[10px] tracking-widest uppercase mb-1">Transazioni</p>
                        <p className="text-3xl font-sans font-bold tracking-tighter">
                          {sales.filter(s => {
                            const date = s.timestamp?.toDate();
                            return date && isSameDay(date, selectedDate);
                          }).length}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="mt-10 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {sales.filter(s => {
                      const date = s.timestamp?.toDate();
                      return date && isSameDay(date, selectedDate);
                    }).slice(0, 3).map(s => (
                      <div key={s.id} className="p-4 bg-white/5 rounded-2xl border border-white/5">
                        <p className="text-[11px] font-bold tracking-widest uppercase truncate">{s.itemName}</p>
                        <p className="text-[9px] text-white/40 tracking-widest uppercase">{s.quantity} PZ • €{s.total.toFixed(2)}</p>
                      </div>
                    ))}
                    {sales.filter(s => {
                      const date = s.timestamp?.toDate();
                      return date && isSameDay(date, selectedDate);
                    }).length > 3 && (
                        <button
                          onClick={() => setActiveTab('sales')}
                          className="flex items-center justify-center p-4 bg-white/5 border border-white/10 rounded-2xl text-[10px] font-bold tracking-widest uppercase hover:bg-white hover:text-black transition-all h-full"
                        >
                          Vedi tutte le vendite
                        </button>
                      )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Size Analysis Section */}
            <div className="bg-white/5 p-10 rounded-[40px] border border-white/5">
              <div className="flex flex-col md:flex-row items-center justify-between gap-8 mb-10">
                <div className="flex flex-col gap-4">
                  <div>
                    <h3 className="text-xs font-bold tracking-[0.4em] uppercase mb-2 text-white/60">Analisi Taglie</h3>
                    <p className="text-[10px] text-amber-500/80 font-bold tracking-widest uppercase bg-amber-500/10 px-4 py-2 rounded-full border border-amber-500/20 inline-block">
                      {getSizeInsight()}
                    </p>
                  </div>

                  {/* Week Navigator */}
                  <div className="flex items-center gap-3 bg-black/40 p-1.5 rounded-2xl border border-white/10 w-fit">
                    <button
                      onClick={() => setAnalysisDate(subDays(analysisDate, 7))}
                      className="p-2 hover:bg-white/10 rounded-xl text-white/40 hover:text-white transition-all uppercase text-[9px] font-bold flex items-center gap-2"
                    >
                      <ChevronLeft size={14} />
                    </button>
                    <div className="px-3 py-1 flex flex-col items-center min-w-[140px]">
                      <span className="text-[10px] font-bold tracking-[0.2em] uppercase">Settimana</span>
                      <span className="text-[9px] text-white/40 tracking-widest uppercase mt-0.5">
                        {format(startOfWeek(analysisDate, { weekStartsOn: 1 }), 'dd/MM')} - {format(endOfWeek(analysisDate, { weekStartsOn: 1 }), 'dd/MM')}
                      </span>
                    </div>
                    <button
                      onClick={() => setAnalysisDate(addDays(analysisDate, 7))}
                      className="p-2 hover:bg-white/10 rounded-xl text-white/40 hover:text-white transition-all uppercase text-[9px] font-bold flex items-center gap-2"
                    >
                      <ChevronRight size={14} />
                    </button>
                  </div>
                </div>
                <div className="text-right hidden md:block">
                  <p className="text-[9px] text-white/20 tracking-widest uppercase">Distribuzione Vendite per Taglia/Giorno</p>
                </div>
              </div>

              <div className="h-[400px] w-full bg-white/[0.02] rounded-3xl p-6 border border-white/5">
                <ResponsiveContainer width="100%" height="100%">
                  <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                    <XAxis
                      type="number"
                      dataKey="day"
                      name="Giorno"
                      domain={[0, 6]}
                      ticks={[0, 1, 2, 3, 4, 5, 6]}
                      tickFormatter={(val) => {
                        const startDate = startOfWeek(analysisDate, { weekStartsOn: 1 });
                        return format(addDays(startDate, val), 'EEE', { locale: it });
                      }}
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 10, fontWeight: 'bold' }}
                    />
                    <YAxis
                      type="number"
                      dataKey="yIndex"
                      name="Taglia"
                      domain={[0, SIZES_ORDER.length - 1]}
                      ticks={Array.from(new Set(getSizeAnalysisData().map(d => d.yIndex))).filter(y => y < SIZES_ORDER.length).sort((a, b) => a - b)}
                      tickFormatter={(val) => SIZES_ORDER[val] || ''}
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 10, fontWeight: 'bold' }}
                    />
                    <ZAxis type="number" dataKey="quantity" range={[50, 400]} />
                    <Tooltip
                      cursor={{ strokeDasharray: '3 3' }}
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const data = payload[0].payload;
                          const days = ['Domenica', 'Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì', 'Sabato'];
                          return (
                            <div className="bg-[#0A0A0A] border border-white/10 p-4 rounded-2xl shadow-2xl backdrop-blur-md">
                              <p className="text-[10px] font-bold tracking-widest uppercase text-white/40 mb-1">
                                {format(data.dateObj, 'eeee dd MMMM', { locale: it })}
                              </p>
                              <p className="text-sm font-sans font-bold tracking-tight mb-1">Taglia: {data.size}</p>
                              <p className="text-xl font-sans font-bold tracking-tighter">Vendite: {data.quantity}</p>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Scatter
                      name="Vendite"
                      data={getSizeAnalysisData()}
                      xDataKey="day"
                      yDataKey="yIndex"
                      zDataKey="quantity"
                    >
                      {getSizeAnalysisData().map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={entry.isSelected ? '#fbbf24' : (entry.quantity > 5 ? '#ffffff' : entry.quantity > 2 ? 'rgba(255,255,255,0.6)' : 'rgba(255,255,255,0.3)')}
                          opacity={entry.isSelected ? 1 : 0.6}
                        />
                      ))}
                    </Scatter>
                  </ScatterChart>
                </ResponsiveContainer>
              </div>
            </div>
          </motion.div>
        )}

        {activeTab === 'sales' && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-6xl mx-auto space-y-12"
          >
            <header className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-white/10 pb-8">
              <div>
                <h1 className="text-5xl font-sans font-bold tracking-tighter mb-2">Vendite</h1>
                <p className="text-white/40 font-sans text-xs tracking-[0.3em] uppercase">Registro Transazioni</p>
              </div>

              <div className="flex bg-white/5 p-1 rounded-2xl border border-white/10">
                {['daily', 'monthly', 'annual'].map((p) => (
                  <button
                    key={p}
                    onClick={() => setSalesView(p as any)}
                    className={`px-6 py-2 rounded-xl text-[10px] font-bold tracking-widest uppercase transition-all ${salesView === p ? 'bg-white text-black' : 'text-white/40 hover:text-white'}`}
                  >
                    {p === 'daily' ? 'Oggi' : p === 'monthly' ? 'Mese' : 'Anno'}
                  </button>
                ))}
              </div>
            </header>

            <div className="bg-white/5 rounded-[40px] border border-white/5 overflow-hidden">
              {/* Vista tabellare desktop */}
              <div className="overflow-x-auto hidden md:block">
                <table className="w-full text-left">
                  <thead>
                    <tr className="text-white/40 text-[10px] tracking-[0.3em] uppercase border-b border-white/10">
                      <th className="px-8 py-6">Data / Orario</th>
                      <th className="px-8 py-6">Articolo</th>
                      <th className="px-8 py-6">Prezzo</th>
                      <th className="px-8 py-6">Qty</th>
                      <th className="px-8 py-6">Totale</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {getFilteredSales(salesView).map(s => (
                      <tr key={s.id} className="hover:bg-white/5 transition-colors">
                        <td className="px-8 py-6 text-[10px] tracking-widest text-white/40">
                          {s.timestamp?.toDate().toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit' })} • {s.timestamp?.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </td>
                        <td className="px-8 py-6">
                          <p className="text-xs font-bold tracking-widest uppercase">{s.itemName}</p>
                          <p className="text-[9px] text-white/30 tracking-widest uppercase">{s.itemCode}</p>
                        </td>
                        <td className="px-8 py-6 text-xs text-white/60">€{s.price?.toFixed(2)}</td>
                        <td className="px-8 py-6 text-xs font-bold">{s.quantity}</td>
                        <td className="px-8 py-6 text-sm font-bold tracking-tighter">€{s.total?.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-white text-black">
                    <tr>
                      <td colSpan={4} className="px-8 py-8 text-right text-[10px] font-bold tracking-[0.4em] uppercase">
                        Totale {salesView === 'daily' ? 'Giornaliero' : salesView === 'monthly' ? 'Mensile' : 'Annuale'}:
                      </td>
                      <td className="px-8 py-8 text-2xl font-sans font-bold tracking-tighter">
                        €{(salesView === 'daily' ? dailyEarnings : salesView === 'monthly' ? monthlyEarnings : annualEarnings).toFixed(2)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              {/* Lista compatta mobile */}
              <div className="md:hidden divide-y divide-white/5">
                {getFilteredSales(salesView).length === 0 ? (
                  <div className="px-4 py-8 text-center">
                    <p className="text-white/20 text-[10px] tracking-widest uppercase italic">Nessuna vendita registrata</p>
                  </div>
                ) : (
                  getFilteredSales(salesView).map(s => (
                    <div key={s.id} className="px-4 py-5 flex flex-col gap-3">
                      <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-[11px] font-bold tracking-widest uppercase truncate">{s.itemName}</p>
                          <p className="text-[9px] text-white/40 tracking-[0.3em] uppercase truncate">{s.itemCode}</p>
                        </div>
                        <div className="text-right text-[9px] text-white/40">
                          <p>{s.timestamp?.toDate().toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit' })}</p>
                          <p>{s.timestamp?.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                        </div>
                      </div>

                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-4 text-[10px] text-white/60">
                          <span>€{s.price?.toFixed(2)} cad.</span>
                          <span className="font-bold">{s.quantity} PZ</span>
                        </div>
                        <p className="text-sm font-bold tracking-tighter">€{s.total?.toFixed(2)}</p>
                      </div>
                    </div>
                  ))
                )}

                <div className="bg-white text-black px-4 py-5 flex items-center justify-between text-[11px] font-bold tracking-[0.25em] uppercase">
                  <span>Totale {salesView === 'daily' ? 'Giorno' : salesView === 'monthly' ? 'Mese' : 'Anno'}</span>
                  <span className="text-lg font-sans tracking-tight">
                    €{(salesView === 'daily' ? dailyEarnings : salesView === 'monthly' ? monthlyEarnings : annualEarnings).toFixed(2)}
                  </span>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </main>

      <AnimatePresence>
        {saleConfirmation && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSaleConfirmation(null)}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-md bg-[#0A0A0A] border border-white/10 rounded-[40px] p-10 shadow-2xl overflow-hidden"
            >
              <div className="absolute top-0 left-0 w-full h-1 bg-white/20" />

              <h3 className="text-xs font-bold tracking-[0.4em] uppercase mb-8 text-white/40">Conferma Vendita</h3>

              <div className="space-y-6 mb-10">
                <div className="flex justify-between items-end border-b border-white/5 pb-4">
                  <div>
                    <p className="text-[10px] tracking-widest uppercase text-white/30 mb-1">Articolo</p>
                    <p className="text-lg font-sans font-bold tracking-tight">{saleConfirmation.item.name}</p>
                    <p className="text-[10px] tracking-widest uppercase text-white/40">{saleConfirmation.item.code}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] tracking-widest uppercase text-white/30 mb-1">Quantità</p>
                    <p className="text-lg font-sans font-bold">{saleConfirmation.quantity} PZ</p>
                  </div>
                </div>

                <div className="flex justify-between items-center pt-4">
                  <p className="text-xs font-bold tracking-[0.2em] uppercase text-white/60">Totale Transazione</p>
                  <p className="text-4xl font-sans font-bold tracking-tighter">€{saleConfirmation.total.toFixed(2)}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <button
                  onClick={() => setSaleConfirmation(null)}
                  className="py-5 border border-white/10 text-white/40 font-sans text-[10px] font-bold tracking-widest uppercase rounded-2xl hover:text-white hover:bg-white/5 transition-all"
                >
                  Annulla
                </button>
                <button
                  onClick={confirmSale}
                  className="py-5 bg-white text-black font-sans text-[10px] font-bold tracking-widest uppercase rounded-2xl hover:scale-[1.02] active:scale-[0.98] transition-all shadow-[0_0_30px_rgba(255,255,255,0.2)]"
                >
                  Conferma
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {deleteConfirm && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/80 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-[#0a0a0a] border border-red-500/20 p-10 rounded-[40px] max-w-md w-full text-center space-y-8 shadow-2xl"
            >
              <div className="w-20 h-20 bg-red-500/10 rounded-full flex items-center justify-center mx-auto">
                <Trash2 className="w-8 h-8 text-red-500" />
              </div>
              <div>
                <h3 className="text-2xl font-sans font-bold tracking-tight mb-2">Elimina Articolo</h3>
                <p className="text-white/40 text-xs tracking-widest uppercase">Sei sicuro di voler eliminare l'articolo {deleteConfirm}?</p>
              </div>
              <div className="flex gap-4">
                <button
                  onClick={() => setDeleteConfirm(null)}
                  className="flex-1 px-8 py-4 border border-white/10 text-white/40 text-[10px] font-bold tracking-widest uppercase rounded-2xl hover:text-white hover:bg-white/5 transition-all"
                >
                  Annulla
                </button>
                <button
                  onClick={() => handleDeleteItem(deleteConfirm)}
                  className="flex-1 px-8 py-4 bg-red-500 text-white text-[10px] font-bold tracking-widest uppercase rounded-2xl hover:bg-red-600 transition-all"
                >
                  Elimina
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {/* Sale Delete Confirmation */}
        {saleDeleteConfirm && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/80 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-[#0a0a0a] border border-red-500/20 p-10 rounded-[40px] max-w-md w-full text-center space-y-8 shadow-2xl"
            >
              <div className="w-20 h-20 bg-red-500/10 rounded-full flex items-center justify-center mx-auto">
                <RefreshCw className="w-8 h-8 text-red-500" />
              </div>
              <div>
                <h3 className="text-2xl font-sans font-bold tracking-tight mb-2">Annulla Transazione</h3>
                <p className="text-white/40 text-xs tracking-widest uppercase mb-2">Questa operazione eliminerà il record della vendita.</p>
                <p className="text-emerald-500/60 text-[10px] font-bold tracking-widest uppercase">Lo stock dell'articolo verrà ripristinato automaticamente.</p>
              </div>
              <div className="flex gap-4">
                <button
                  onClick={() => setSaleDeleteConfirm(null)}
                  className="flex-1 px-8 py-4 border border-white/10 text-white/40 text-[10px] font-bold tracking-widest uppercase rounded-2xl hover:text-white hover:bg-white/5 transition-all"
                >
                  Indietro
                </button>
                <button
                  onClick={() => handleDeleteSale(saleDeleteConfirm)}
                  className="flex-1 px-8 py-4 bg-red-500 text-white text-[10px] font-bold tracking-widest uppercase rounded-2xl hover:bg-red-600 transition-all shadow-[0_0_20px_rgba(239,68,68,0.2)]"
                >
                  Conferma Annullamento
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {/* Sale Edit Modal */}
        {editingSale && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/80 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-[#0a0a0a] border border-white/10 p-10 rounded-[40px] max-w-md w-full space-y-8 shadow-2xl"
            >
              <div>
                <h3 className="text-xs font-bold tracking-[0.4em] uppercase mb-2 text-white/40">Modifica Vendita</h3>
                <h4 className="text-xl font-sans font-bold tracking-tight">{editingSale.itemName}</h4>
                <p className="text-[10px] text-white/30 tracking-widest uppercase">{editingSale.itemCode}</p>
              </div>

              <form onSubmit={handleEditSale} className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] tracking-widest uppercase text-white/40 ml-2">Quantità Venduta</label>
                  <input
                    type="number" required min="1"
                    value={editSaleForm.quantity}
                    onChange={e => setEditSaleForm({ ...editSaleForm, quantity: e.target.value })}
                    className="w-full px-6 py-4 bg-white/5 border border-white/10 rounded-2xl outline-none focus:border-white text-sm"
                  />
                  <p className="text-[9px] text-white/20 italic ml-2">* Lo stock verrà regolato in base alla differenza</p>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] tracking-widest uppercase text-white/40 ml-2">Prezzo Unitario (€)</label>
                  <input
                    type="text" required
                    value={editSaleForm.price}
                    onChange={e => setEditSaleForm({ ...editSaleForm, price: e.target.value })}
                    className="w-full px-6 py-4 bg-white/5 border border-white/10 rounded-2xl outline-none focus:border-white text-sm"
                  />
                </div>

                <div className="flex gap-4 pt-4">
                  <button
                    type="button"
                    onClick={() => setEditingSale(null)}
                    className="flex-1 px-8 py-4 border border-white/10 text-white/40 text-[10px] font-bold tracking-widest uppercase rounded-2xl hover:text-white transition-all"
                  >
                    Annulla
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-8 py-4 bg-white text-black text-[10px] font-bold tracking-widest uppercase rounded-2xl hover:scale-[1.02] active:scale-[0.98] transition-all"
                  >
                    Salva Modifiche
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.2); }
      `}</style>
    </div>
  );
}
