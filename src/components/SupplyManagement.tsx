import React, { useState, useMemo } from 'react';
import { 
  Package, 
  PackagePlus, 
  PackageCheck, 
  PackageX, 
  QrCode, 
  Printer, 
  Download, 
  Search, 
  Filter, 
  Plus, 
  AlertTriangle, 
  TrendingUp, 
  CheckCircle2, 
  Truck, 
  ArrowDownLeft, 
  ArrowUpRight, 
  BarChart2, 
  Layers, 
  ShieldCheck, 
  Eye, 
  RefreshCw, 
  FileText, 
  X, 
  SlidersHorizontal,
  Boxes,
  Building2,
  Calendar,
  User,
  BadgeAlert,
  ArrowRightLeft,
  Sparkles,
  Check,
  Tag,
  Share2,
  Scan,
  ShieldAlert,
  ClipboardCheck,
  Wrench,
  CheckCircle,
  Clock,
  Phone,
  MapPin,
  Send,
  FileSpreadsheet,
  Award
} from 'lucide-react';
import { Soldier, Unit, PrintSettings } from '../types';

export interface SupplyItem {
  id: string;
  code: string; // e.g., SUP-2026-001
  name: string; // اسم المادة أو العتاد
  category: 'أسلحة وذخائر' | 'أجهزة إشارة واتصالات' | 'مهمات وعتاد فردي' | 'ألبسة وتجهيزات' | 'مؤن وإعاشة' | 'معدات ومركبات' | 'مستلزمات طبية';
  unitOfMeasure: 'قطعة' | 'صندوق' | 'كرتون' | 'طقم' | 'كيلوجرام' | 'جهاز' | 'برميل';
  currentStock: number;
  minStockThreshold: number; // حد الطلب لإعادة التوريد
  maxCapacity: number; // السعة التخزينية القصوى
  totalReceived: number; // إجمالي التوريد
  totalIssued: number; // إجمالي المنصرف
  supplier: string; // المورد / المخزن المركزي
  warehouseLocation: string; // موقع التخزين (مثال: مخزن التسليح الرئيسي - الرف B2)
  lastRestockDate: string;
  status: 'جاهز وفرة' | 'مخزون حرج' | 'نفذ المخزون' | 'قيد التوريد';
  condition: 'جديد بكرتونه' | 'جديد صالح' | 'مستعمل ممتازة' | 'تحت الفحص' | 'تالف للصيانة';
  batchNo?: string; // رقم الدفعة/التشغيلة
  expiryDate?: string;
  unitPrice?: number; // القيمة التقديرية بالريال
  serialNumber?: string;
  notes?: string;
}

export interface SupplyTransaction {
  id: string;
  type: 'توريد_جديد' | 'صرف_عهدة' | 'إرجاع_مخزن' | 'تسوية_مخزنية';
  itemCode: string;
  itemName: string;
  quantity: number;
  recipientOrSupplier: string; // اسم المستلم أو جهة التوريد
  militaryNo?: string;
  unitName?: string;
  date: string;
  voucherNo: string; // رقم السند / الوثيقة (REC-xxx or ISS-xxx)
  handlerName: string; // مسؤول التوريد/الصرف
  conditionAtTx?: string; // الحالة عند الحركة
  inspectionApproved?: boolean; // خضع لفحص جودة مقبولة
  notes?: string;
  status: 'مكتمل' | 'قيد المراجعة' | 'ملغى';
}

export interface SupplierInfo {
  id: string;
  name: string;
  type: 'دائرة الإمداد والتموين' | 'مستودع إستراتيجي مركزي' | 'قيادة المنطقة' | 'مورد اعتاد معتمد';
  contactPerson: string;
  phone: string;
  city: string;
  totalVouchersDelivered: number;
  rating: 'ممتاز' | 'جيد جداً';
}

interface SupplyManagementProps {
  soldiers?: Soldier[];
  units?: Unit[];
  currentUser?: { id: string; name: string; role: string; unitId?: string | null };
  printSettings?: PrintSettings;
  onAddLog?: (actionType: any, tableName?: string, details?: string) => void;
}

export default function SupplyManagement({
  soldiers = [],
  units = [],
  currentUser,
  printSettings,
  onAddLog
}: SupplyManagementProps) {
  // Mobile View Mode Switcher
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards');
  
  // Tab Navigation within Supply Management
  const [activeTab, setActiveTab] = useState<'all_stock' | 'inbound' | 'outbound' | 'suppliers' | 'inspection_qc'>('all_stock');

  // Search and Filter States
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [selectedCondition, setSelectedCondition] = useState<string>('ALL');

  // Toast Notification
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // 1. Initial Supply Inventory Items
  const [items, setItems] = useState<SupplyItem[]>([]);

  // 2. Initial Transactions Data
  const [transactions, setTransactions] = useState<SupplyTransaction[]>([]);

  // 3. Initial Suppliers Directory Data
  const [suppliersList] = useState<SupplierInfo[]>([]);

  // Modals States
  const [isAddSupplyModalOpen, setIsAddSupplyModalOpen] = useState(false);
  const [isIssueModalOpen, setIsIssueModalOpen] = useState(false);
  const [isQRScannerModalOpen, setIsQRScannerModalOpen] = useState(false);
  const [selectedItemForVoucher, setSelectedItemForVoucher] = useState<SupplyItem | null>(null);
  const [selectedVoucherTx, setSelectedVoucherTx] = useState<SupplyTransaction | null>(null);
  const [isWhatsAppModalOpen, setIsWhatsAppModalOpen] = useState(false);

  // New Supply Item Form State (معالج تسجيل التوريد)
  const [newCode, setNewCode] = useState('');
  const [newName, setNewName] = useState('');
  const [newCategory, setNewCategory] = useState<SupplyItem['category']>('أسلحة وذخائر');
  const [newUnitOfMeasure, setNewUnitOfMeasure] = useState<SupplyItem['unitOfMeasure']>('قطعة');
  const [newQty, setNewQty] = useState('50');
  const [newMinThreshold, setNewMinThreshold] = useState('15');
  const [newMaxCapacity, setNewMaxCapacity] = useState('100');
  const [newSupplier, setNewSupplier] = useState('دائرة التسليح والإمداد المركزي');
  const [newWarehouse, setNewWarehouse] = useState('مخزن التسليح A1 - رف 02');
  const [newCondition, setNewCondition] = useState<SupplyItem['condition']>('جديد بكرتونه');
  const [newBatchNo, setNewBatchNo] = useState('');
  const [newUnitPrice, setNewUnitPrice] = useState('500');
  const [newNotes, setNewNotes] = useState('');

  // Issue Form State (إصدار إذن صرف عهدة)
  const [selectedIssueItemId, setSelectedIssueItemId] = useState('');
  const [issueQty, setIssueQty] = useState('1');
  const [issueRecipientType, setIssueRecipientType] = useState<'soldier' | 'unit' | 'other'>('soldier');
  const [issueSoldierId, setIssueSoldierId] = useState('');
  const [issueUnitId, setIssueUnitId] = useState('');
  const [issueCustomRecipient, setIssueCustomRecipient] = useState('');
  const [issueNotes, setIssueNotes] = useState('');

  // Scanner Simulator State
  const [scannedCodeInput, setScannedCodeInput] = useState('');
  const [scannedResultItem, setScannedResultItem] = useState<SupplyItem | null>(null);
  const [isScanningActive, setIsScanningActive] = useState(false);

  // Filtered Items Calculation
  const filteredItems = useMemo(() => {
    return items.filter(item => {
      const matchSearch = 
        item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.supplier.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.warehouseLocation.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (item.serialNumber && item.serialNumber.toLowerCase().includes(searchTerm.toLowerCase()));

      const matchCategory = selectedCategory === 'ALL' || item.category === selectedCategory;
      const matchStatus = selectedStatus === 'ALL' || item.status === selectedStatus;
      const matchCondition = selectedCondition === 'ALL' || item.condition === selectedCondition;

      return matchSearch && matchCategory && matchStatus && matchCondition;
    });
  }, [items, searchTerm, selectedCategory, selectedStatus, selectedCondition]);

  // Filtered Transactions Calculation
  const filteredTransactions = useMemo(() => {
    return transactions.filter(tx => {
      const matchSearch = 
        tx.itemName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        tx.itemCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
        tx.voucherNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
        tx.recipientOrSupplier.toLowerCase().includes(searchTerm.toLowerCase());

      if (activeTab === 'inbound') return matchSearch && tx.type === 'توريد_جديد';
      if (activeTab === 'outbound') return matchSearch && tx.type === 'صرف_عهدة';

      return matchSearch;
    });
  }, [transactions, searchTerm, activeTab]);

  // Critical items requiring restock or inspection
  const criticalItems = useMemo(() => {
    return items.filter(i => i.currentStock <= i.minStockThreshold || i.status === 'مخزون حرج' || i.status === 'نفذ المخزون');
  }, [items]);

  // Total Metrics Summary
  const metrics = useMemo(() => {
    const totalItemsCount = items.length;
    const totalStockQty = items.reduce((sum, i) => sum + i.currentStock, 0);
    const criticalCount = criticalItems.length;
    const totalInboundQty = transactions.filter(t => t.type === 'توريد_جديد').reduce((sum, t) => sum + t.quantity, 0);
    const totalOutboundQty = transactions.filter(t => t.type === 'صرف_عهدة').reduce((sum, t) => sum + t.quantity, 0);
    const totalEstValue = items.reduce((sum, i) => sum + (i.currentStock * (i.unitPrice || 0)), 0);

    return { totalItemsCount, totalStockQty, criticalCount, totalInboundQty, totalOutboundQty, totalEstValue };
  }, [items, criticalItems, transactions]);

  // Handler: Create & Register New Supply Batch (إضافة وتسجيل توريد جديد)
  const handleCreateSupplyItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;

    const qty = parseInt(newQty) || 1;
    const minThresh = parseInt(newMinThreshold) || 10;
    const maxCap = parseInt(newMaxCapacity) || (qty * 2);
    const price = parseFloat(newUnitPrice) || 0;
    const generatedCode = newCode.trim() || `SUP-${Date.now().toString().slice(-6)}`;
    const generatedBatch = newBatchNo.trim() || `BATCH-2026-${Math.floor(100 + Math.random() * 900)}`;

    const newItem: SupplyItem = {
      id: `sup-${Date.now()}`,
      code: generatedCode,
      name: newName,
      category: newCategory,
      unitOfMeasure: newUnitOfMeasure,
      currentStock: qty,
      minStockThreshold: minThresh,
      maxCapacity: maxCap,
      totalReceived: qty,
      totalIssued: 0,
      supplier: newSupplier,
      warehouseLocation: newWarehouse,
      lastRestockDate: new Date().toISOString().split('T')[0],
      status: qty <= minThresh ? 'مخزون حرج' : 'جاهز وفرة',
      condition: newCondition,
      batchNo: generatedBatch,
      unitPrice: price,
      notes: newNotes
    };

    const newTx: SupplyTransaction = {
      id: `tx-${Date.now()}`,
      type: 'توريد_جديد',
      itemCode: generatedCode,
      itemName: newName,
      quantity: qty,
      recipientOrSupplier: newSupplier,
      date: new Date().toISOString().split('T')[0],
      voucherNo: `REC-2026-${Math.floor(1000 + Math.random() * 9000)}`,
      handlerName: currentUser?.name || 'مسؤول التموين والتوريد',
      conditionAtTx: newCondition,
      inspectionApproved: true,
      notes: `تم استلام الشحنة وتخزينها في (${newWarehouse})`,
      status: 'مكتمل'
    };

    setItems([newItem, ...items]);
    setTransactions([newTx, ...transactions]);
    setIsAddSupplyModalOpen(false);

    // Reset Form
    setNewName('');
    setNewCode('');
    setNewNotes('');

    if (onAddLog) {
      onAddLog('إضافة', 'إدارة التوريد', `تم تسجيل توريد جديد: ${newName} بكمية (${qty} ${newUnitOfMeasure}) من الجهة الموردة (${newSupplier}).`);
    }

    showToast(`تم تسجيل التوريد الجديد بنجاح وإصدار إذن الاستلام رقم ${newTx.voucherNo}`);
  };

  // Handler: Issue Item (إصدار إذن صرف عهدة)
  const handleIssueItem = (e: React.FormEvent) => {
    e.preventDefault();
    const item = items.find(i => i.id === selectedIssueItemId);
    if (!item) {
      showToast('يرجى اختيار المادة المراد صرفها من القائمة');
      return;
    }

    const qty = parseInt(issueQty) || 1;

    if (qty > item.currentStock) {
      showToast(`الكمية المطلوبة (${qty}) تتجاوز المخزون المتاح حالياً (${item.currentStock})`);
      return;
    }

    let recipientText = issueCustomRecipient;
    let milNo: string | undefined = undefined;
    let uName: string | undefined = undefined;

    if (issueRecipientType === 'soldier') {
      const soldier = soldiers.find(s => s.id === issueSoldierId);
      if (soldier) {
        recipientText = `الفرد: ${soldier.fullName} (${soldier.militaryNumber || 'بدون رقم'})`;
        milNo = soldier.militaryNumber;
        const uObj = units.find(u => u.id === soldier.unitId);
        uName = uObj ? uObj.name : undefined;
      }
    } else if (issueRecipientType === 'unit') {
      const uObj = units.find(u => u.id === issueUnitId);
      if (uObj) {
        recipientText = `الوحدة / الكتيبة: ${uObj.name}`;
        uName = uObj.name;
      }
    }

    if (!recipientText.trim()) {
      recipientText = 'جهة عسكرية ميدانية';
    }

    // Update Item Stock
    const updatedItems = items.map(i => {
      if (i.id === item.id) {
        const newStock = i.currentStock - qty;
        const newIssued = i.totalIssued + qty;
        return {
          ...i,
          currentStock: newStock,
          totalIssued: newIssued,
          status: (newStock <= 0 ? 'نفذ المخزون' : newStock <= i.minStockThreshold ? 'مخزون حرج' : 'جاهز وفرة') as SupplyItem['status']
        };
      }
      return i;
    });

    const issueTx: SupplyTransaction = {
      id: `tx-${Date.now()}`,
      type: 'صرف_عهدة',
      itemCode: item.code,
      itemName: item.name,
      quantity: qty,
      recipientOrSupplier: recipientText,
      militaryNo: milNo,
      unitName: uName,
      date: new Date().toISOString().split('T')[0],
      voucherNo: `ISS-2026-${Math.floor(1000 + Math.random() * 9000)}`,
      handlerName: currentUser?.name || 'مسؤول التوريد والصرف',
      conditionAtTx: item.condition,
      inspectionApproved: true,
      notes: issueNotes || `صرف عهدة رسمية للجهة: ${recipientText}`,
      status: 'مكتمل'
    };

    setItems(updatedItems);
    setTransactions([issueTx, ...transactions]);
    setIsIssueModalOpen(false);

    if (onAddLog) {
      onAddLog('تعديل', 'إدارة الصرف والعهدة', `تم إصدار أمر صرف للمادة (${item.name}) بكمية (${qty}) لجهة: ${recipientText}.`);
    }

    showToast(`تم اعتماد إذن الصرف بنجاح برقم سند: ${issueTx.voucherNo}`);
  };

  // Quick Restock Handler (إعادة التوريد السريع)
  const handleQuickRestock = (item: SupplyItem, addQty: number = 20) => {
    const updatedItems = items.map(i => {
      if (i.id === item.id) {
        const newStock = i.currentStock + addQty;
        return {
          ...i,
          currentStock: newStock,
          totalReceived: i.totalReceived + addQty,
          lastRestockDate: new Date().toISOString().split('T')[0],
          status: (newStock <= i.minStockThreshold ? 'مخزون حرج' : 'جاهز وفرة') as SupplyItem['status']
        };
      }
      return i;
    });

    const restockTx: SupplyTransaction = {
      id: `tx-${Date.now()}`,
      type: 'توريد_جديد',
      itemCode: item.code,
      itemName: item.name,
      quantity: addQty,
      recipientOrSupplier: item.supplier,
      date: new Date().toISOString().split('T')[0],
      voucherNo: `RESTOCK-2026-${Math.floor(1000 + Math.random() * 9000)}`,
      handlerName: currentUser?.name || 'مسؤول التوريد',
      conditionAtTx: item.condition,
      inspectionApproved: true,
      status: 'مكتمل'
    };

    setItems(updatedItems);
    setTransactions([restockTx, ...transactions]);

    showToast(`تمت إضافة توريد سريع بمقدار +${addQty} ${item.unitOfMeasure} للمادة (${item.name})`);
  };

  // Trigger Simulated Barcode Scan
  const handleSimulatedScan = (codeToScan?: string) => {
    const code = codeToScan || scannedCodeInput.trim();
    if (!code) return;

    setIsScanningActive(true);
    setTimeout(() => {
      const found = items.find(i => 
        i.code.toLowerCase() === code.toLowerCase() || 
        i.serialNumber?.toLowerCase() === code.toLowerCase() ||
        i.id === code
      ) || items[0];

      setScannedResultItem(found);
      setIsScanningActive(false);
      showToast(`تم العثور على المادة: ${found.name} (${found.code})`);
    }, 800);
  };

  return (
    <div className="space-y-5 text-right font-sans select-none" dir="rtl">
      
      {/* Floating Toast Notification */}
      {toastMessage && (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 z-50 bg-slate-900 text-white px-5 py-3 rounded-2xl shadow-2xl border border-emerald-500/50 flex items-center gap-2.5 animate-bounce">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <span className="text-xs font-black">{toastMessage}</span>
        </div>
      )}

      {/* 1. Executive Top Header Banner (Styled for Mobile & Desktop) */}
      <div className="bg-gradient-to-r from-slate-950 via-slate-900 to-emerald-950 text-white p-5 sm:p-6 rounded-3xl border border-slate-800 shadow-2xl relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(#10b981_1px,transparent_1px)] [background-size:18px_18px] opacity-20 pointer-events-none"></div>
        
        <div className="relative z-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
          <div className="space-y-2 max-w-3xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-500/20 border border-emerald-500/30 rounded-full text-emerald-300 text-xs font-black">
              <Boxes className="w-4 h-4 text-emerald-400" />
              <span>منظومة إدارة التوريد والصرف وتجهيزات العتاد الميداني</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white flex items-center gap-2.5">
              <span>إدارة التوريد والصرف اللوجستي</span>
              <span className="text-xs font-mono px-2 py-0.5 bg-emerald-900/80 text-emerald-300 border border-emerald-500/30 rounded-lg">v2.5 Pro</span>
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 font-bold leading-relaxed">
              تتبع شحنات التوريد الواردة، إدارة المخازن والعهدة العسكرية، إذن الصرف الميداني الفردي والجماعي، ماسح الأكواد والـ QR Code، وإشعارات الفحص الفني.
            </p>
          </div>

          {/* Quick Action Buttons Row */}
          <div className="grid grid-cols-2 sm:flex items-center gap-2 w-full lg:w-auto shrink-0 pt-2 lg:pt-0">
            <button
              onClick={() => setIsAddSupplyModalOpen(true)}
              className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl text-xs font-black transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-950/50 cursor-pointer active:scale-95"
            >
              <PackagePlus className="w-4 h-4" />
              <span>تسجيل توريد جديد</span>
            </button>

            <button
              onClick={() => setIsIssueModalOpen(true)}
              className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-amber-300 border border-amber-500/30 rounded-2xl text-xs font-black transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95"
            >
              <ArrowUpRight className="w-4 h-4 text-amber-400" />
              <span>إصدار أمر صرف</span>
            </button>

            <button
              onClick={() => setIsQRScannerModalOpen(true)}
              className="px-3.5 py-2.5 bg-slate-900 hover:bg-slate-800 text-sky-300 border border-sky-500/30 rounded-2xl text-xs font-black transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95"
            >
              <Scan className="w-4 h-4 text-sky-400" />
              <span>ماسح QR</span>
            </button>

            <button
              onClick={() => setIsWhatsAppModalOpen(true)}
              className="px-3.5 py-2.5 bg-emerald-950/80 hover:bg-emerald-900 text-emerald-200 border border-emerald-500/30 rounded-2xl text-xs font-black transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95"
            >
              <Share2 className="w-4 h-4 text-emerald-400" />
              <span>تقرير التموين</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2. Responsive Metric KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[10px] font-black">إجمالي الأصناف</span>
            <Boxes className="w-4 h-4 text-emerald-600" />
          </div>
          <span className="text-base sm:text-lg font-black text-slate-900">{metrics.totalItemsCount} صنف</span>
        </div>

        <div className="bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[10px] font-black">الرصيد بالمخازن</span>
            <PackageCheck className="w-4 h-4 text-sky-600" />
          </div>
          <span className="text-base sm:text-lg font-black text-slate-900">{metrics.totalStockQty.toLocaleString()} وحدة</span>
        </div>

        <div className="bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[10px] font-black">إجمالي التوريدات</span>
            <ArrowDownLeft className="w-4 h-4 text-emerald-600" />
          </div>
          <span className="text-base sm:text-lg font-black text-emerald-800">{metrics.totalInboundQty} وحدة</span>
        </div>

        <div className="bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[10px] font-black">إجمالي المنصرف</span>
            <ArrowUpRight className="w-4 h-4 text-amber-600" />
          </div>
          <span className="text-base sm:text-lg font-black text-amber-800">{metrics.totalOutboundQty} وحدة</span>
        </div>

        <div className="bg-white p-3.5 rounded-2xl border border-rose-200 shadow-xs flex flex-col justify-between space-y-2 bg-rose-50/30">
          <div className="flex items-center justify-between text-rose-500">
            <span className="text-[10px] font-black">مخزون حرج</span>
            <AlertTriangle className="w-4 h-4 text-rose-600" />
          </div>
          <span className="text-base sm:text-lg font-black text-rose-600">{metrics.criticalCount} اصناف</span>
        </div>

        <div className="bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[10px] font-black">القيمة التقديرية</span>
            <Award className="w-4 h-4 text-emerald-600" />
          </div>
          <span className="text-xs sm:text-sm font-black text-slate-900">{metrics.totalEstValue.toLocaleString()} ر.س</span>
        </div>
      </div>

      {/* 3. Mobile Navigation Tabs Bar */}
      <div className="bg-white p-2 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        
        {/* Main Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
          <button
            onClick={() => setActiveTab('all_stock')}
            className={`px-3.5 py-2 rounded-xl text-xs font-black transition-all whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'all_stock'
                ? 'bg-slate-900 text-white shadow-sm'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Boxes className="w-4 h-4 text-emerald-400" />
            <span>المخزون والعهد</span>
            <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-emerald-800 text-emerald-100">
              {items.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('inbound')}
            className={`px-3.5 py-2 rounded-xl text-xs font-black transition-all whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'inbound'
                ? 'bg-slate-900 text-white shadow-sm'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <ArrowDownLeft className="w-4 h-4 text-emerald-400" />
            <span>إدارة التوريد (الوارد)</span>
            <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-emerald-800 text-emerald-100">
              {transactions.filter(t => t.type === 'توريد_جديد').length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('outbound')}
            className={`px-3.5 py-2 rounded-xl text-xs font-black transition-all whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'outbound'
                ? 'bg-slate-900 text-white shadow-sm'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <ArrowUpRight className="w-4 h-4 text-amber-400" />
            <span>إدارة الصرف (الميداني)</span>
            <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-amber-800 text-amber-100">
              {transactions.filter(t => t.type === 'صرف_عهدة').length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('suppliers')}
            className={`px-3.5 py-2 rounded-xl text-xs font-black transition-all whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'suppliers'
                ? 'bg-slate-900 text-white shadow-sm'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Building2 className="w-4 h-4 text-sky-400" />
            <span>الموردين والمستودعات</span>
          </button>

          <button
            onClick={() => setActiveTab('inspection_qc')}
            className={`px-3.5 py-2 rounded-xl text-xs font-black transition-all whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'inspection_qc'
                ? 'bg-slate-900 text-white shadow-sm'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <ShieldCheck className="w-4 h-4 text-rose-400" />
            <span>التنبهات والفحص الفني</span>
            {criticalItems.length > 0 && (
              <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-rose-600 text-white animate-pulse">
                {criticalItems.length}
              </span>
            )}
          </button>
        </div>

        {/* View Mode Toggle Switcher */}
        <div className="flex items-center gap-1 shrink-0 bg-slate-100 p-1 rounded-xl self-end md:self-auto">
          <button
            onClick={() => setViewMode('cards')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
              viewMode === 'cards' ? 'bg-white text-slate-900 shadow-xs font-black' : 'text-slate-500'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>بطاقات الجوال</span>
          </button>

          <button
            onClick={() => setViewMode('table')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
              viewMode === 'table' ? 'bg-white text-slate-900 shadow-xs font-black' : 'text-slate-500'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>جدول التفاصيل</span>
          </button>
        </div>
      </div>

      {/* 4. Search and Multi-Filter Toolbar */}
      <div className="bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row items-center justify-between gap-3">
        
        {/* Search Input */}
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="بحث بالكود، اسم المادة، السيريال، أو المورد..."
            className="w-full pr-10 pl-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:outline-none focus:border-emerald-600 focus:bg-white transition-all"
          />
          {searchTerm && (
            <button onClick={() => setSearchTerm('')} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Filter Dropdowns */}
        <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:border-emerald-600 whitespace-nowrap"
          >
            <option value="ALL">جميع فئات التوريد</option>
            <option value="أسلحة وذخائر">أسلحة وذخائر</option>
            <option value="أجهزة إشارة واتصالات">أجهزة إشارة واتصالات</option>
            <option value="مهمات وعتاد فردي">مهمات وعتاد فردي</option>
            <option value="ألبسة وتجهيزات">ألبسة وتجهيزات</option>
            <option value="مؤن وإعاشة">مؤن وإعاشة</option>
            <option value="مستلزمات طبية">مستلزمات طبية</option>
          </select>

          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:border-emerald-600 whitespace-nowrap"
          >
            <option value="ALL">جميع حالات التوفر</option>
            <option value="جاهز وفرة">جاهز وفرة</option>
            <option value="مخزون حرج">مخزون حرج</option>
            <option value="نفذ المخزون">نفذ المخزون</option>
          </select>

          <select
            value={selectedCondition}
            onChange={(e) => setSelectedCondition(e.target.value)}
            className="p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:border-emerald-600 whitespace-nowrap"
          >
            <option value="ALL">جميع حالات الفحص</option>
            <option value="جديد بكرتونه">جديد بكرتونه</option>
            <option value="جديد صالح">جديد صالح</option>
            <option value="مستعمل ممتازة">مستعمل ممتازة</option>
            <option value="تحت الفحص">تحت الفحص</option>
          </select>
        </div>
      </div>

      {/* 5. TAB 1: ALL STOCK & HARDWARE INVENTORY (المخزون والعتاد) */}
      {activeTab === 'all_stock' && (
        <>
          {/* CARDS VIEW (Mobile-First) */}
          {viewMode === 'cards' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
              {filteredItems.map(item => {
                const stockRatio = Math.min(Math.round((item.currentStock / item.maxCapacity) * 100), 100);
                return (
                  <div key={item.id} className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-xs hover:shadow-md transition-all space-y-3 relative group">
                    
                    {/* Card Header */}
                    <div className="flex items-start justify-between gap-2 border-b border-slate-100 pb-2.5">
                      <div className="space-y-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-mono text-[10px] bg-slate-900 text-emerald-400 px-2 py-0.5 rounded font-black">
                            {item.code}
                          </span>
                          <span className="text-[10px] px-2 py-0.5 bg-slate-100 text-slate-600 rounded font-bold">
                            {item.category}
                          </span>
                          <span className="text-[10px] px-2 py-0.5 bg-sky-50 text-sky-800 border border-sky-200 rounded font-bold">
                            {item.condition}
                          </span>
                        </div>
                        <h3 className="text-sm font-black text-slate-900 leading-snug">{item.name}</h3>
                      </div>

                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-black shrink-0 ${
                        item.status === 'جاهز وفرة' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' :
                        item.status === 'مخزون حرج' ? 'bg-amber-50 text-amber-800 border border-amber-300 animate-pulse' :
                        'bg-rose-50 text-rose-800 border border-rose-300'
                      }`}>
                        {item.status}
                      </span>
                    </div>

                    {/* Stock Progress Capacity Bar */}
                    <div className="space-y-1">
                      <div className="flex justify-between text-[10px] font-bold text-slate-500">
                        <span>نسبة توفر الرصيد:</span>
                        <span className="font-mono text-slate-900">{stockRatio}% ({item.currentStock} / {item.maxCapacity})</span>
                      </div>
                      <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div 
                          className={`h-full rounded-full transition-all duration-500 ${
                            stockRatio < 20 ? 'bg-rose-500' : stockRatio < 40 ? 'bg-amber-500' : 'bg-emerald-500'
                          }`}
                          style={{ width: `${stockRatio}%` }}
                        ></div>
                      </div>
                    </div>

                    {/* Stock Metrics Grid */}
                    <div className="grid grid-cols-3 gap-2 bg-slate-50 p-2.5 rounded-xl text-center border border-slate-100">
                      <div>
                        <span className="text-[10px] text-slate-400 font-bold block">المتاح</span>
                        <span className="text-xs sm:text-sm font-black text-emerald-700">{item.currentStock} {item.unitOfMeasure}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 font-bold block">إجمالي التوريد</span>
                        <span className="text-xs font-black text-slate-700">{item.totalReceived}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 font-bold block">المنصرف</span>
                        <span className="text-xs font-black text-amber-700">{item.totalIssued}</span>
                      </div>
                    </div>

                    {/* Warehouse & Supplier Details */}
                    <div className="text-[11px] space-y-1 text-slate-600 font-bold">
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400">الموقع والتخزين:</span>
                        <span className="text-slate-800 truncate max-w-[190px]">{item.warehouseLocation}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400">جهة التوريد:</span>
                        <span className="text-slate-800 truncate max-w-[190px]">{item.supplier}</span>
                      </div>
                      {item.batchNo && (
                        <div className="flex items-center justify-between">
                          <span className="text-slate-400">رقم التشغيلة/الدفعة:</span>
                          <span className="font-mono text-slate-700">{item.batchNo}</span>
                        </div>
                      )}
                    </div>

                    {/* Action Bar */}
                    <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
                      <button
                        onClick={() => setSelectedItemForVoucher(item)}
                        className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-black transition-all flex items-center gap-1 cursor-pointer"
                      >
                        <QrCode className="w-3.5 h-3.5 text-emerald-600" />
                        <span>بطاقة الـ QR السريعة</span>
                      </button>

                      <button
                        onClick={() => handleQuickRestock(item, 20)}
                        className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-xl text-xs font-black transition-all flex items-center gap-1 cursor-pointer active:scale-95"
                      >
                        <PackagePlus className="w-3.5 h-3.5 text-emerald-700" />
                        <span>+20 توريد</span>
                      </button>
                    </div>

                  </div>
                );
              })}
            </div>
          )}

          {/* TABLE VIEW (Detailed for Desktop) */}
          {viewMode === 'table' && (
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-right text-xs">
                  <thead className="bg-slate-900 text-slate-100 font-black">
                    <tr>
                      <th className="p-3">كود المادة</th>
                      <th className="p-3">اسم المادة العسكرية</th>
                      <th className="p-3">الفئة والتصنيف</th>
                      <th className="p-3">الحالة الفنية</th>
                      <th className="p-3">الرصيد المتاح</th>
                      <th className="p-3">حد الطلب</th>
                      <th className="p-3">الموقع / المخزن</th>
                      <th className="p-3">المورد / الجهة</th>
                      <th className="p-3">حالة الوفرة</th>
                      <th className="p-3 text-center">الإجراءات</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-bold text-slate-800">
                    {filteredItems.map(item => (
                      <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                        <td className="p-3 font-mono text-emerald-800 font-black">{item.code}</td>
                        <td className="p-3 font-black text-slate-900">{item.name}</td>
                        <td className="p-3 text-slate-600">{item.category}</td>
                        <td className="p-3">
                          <span className="px-2 py-0.5 bg-slate-100 text-slate-800 rounded font-bold text-[10px]">
                            {item.condition}
                          </span>
                        </td>
                        <td className="p-3 font-black text-emerald-700">{item.currentStock} {item.unitOfMeasure}</td>
                        <td className="p-3 font-mono text-slate-500">{item.minStockThreshold}</td>
                        <td className="p-3 text-slate-700">{item.warehouseLocation}</td>
                        <td className="p-3 text-slate-600">{item.supplier}</td>
                        <td className="p-3">
                          <span className={`px-2.5 py-1 rounded-full text-[10px] font-black ${
                            item.status === 'جاهز وفرة' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' :
                            'bg-amber-50 text-amber-800 border border-amber-300'
                          }`}>
                            {item.status}
                          </span>
                        </td>
                        <td className="p-3 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              onClick={() => setSelectedItemForVoucher(item)}
                              className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg cursor-pointer"
                              title="استعراض بطاقة الـ QR والسند"
                            >
                              <QrCode className="w-4 h-4 text-emerald-700" />
                            </button>
                            <button
                              onClick={() => handleQuickRestock(item, 25)}
                              className="px-2.5 py-1 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-[10px] font-black cursor-pointer"
                            >
                              +25 توريد
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      {/* 6. TAB 2 & TAB 3: INBOUND SUPPLY RECEIPTS & OUTBOUND ISSUANCE VOUCHERS */}
      {(activeTab === 'inbound' || activeTab === 'outbound') && (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden space-y-3 p-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                {activeTab === 'inbound' ? (
                  <>
                    <ArrowDownLeft className="w-5 h-5 text-emerald-600" />
                    <span>سجل شحنات وأذونات التوريد الاستلام (الوارد)</span>
                  </>
                ) : (
                  <>
                    <ArrowUpRight className="w-5 h-5 text-amber-600" />
                    <span>سجل أذونات الصرف الميداني وتراخيص العهدة</span>
                  </>
                )}
              </h3>
              <p className="text-[11px] text-slate-400 font-bold">
                {activeTab === 'inbound' 
                  ? 'توثيق المحاضر وأذونات التوريد الواردة للمخازن العسكرية'
                  : 'توثيق أذونات الصرف الفردي والجماعي للأفراد والكتائب الميدانية'}
              </p>
            </div>

            <button
              onClick={() => activeTab === 'inbound' ? setIsAddSupplyModalOpen(true) : setIsIssueModalOpen(true)}
              className={`px-3.5 py-2 rounded-xl text-xs font-black text-white flex items-center gap-1.5 shadow-sm cursor-pointer ${
                activeTab === 'inbound' ? 'bg-emerald-700 hover:bg-emerald-600' : 'bg-amber-600 hover:bg-amber-500'
              }`}
            >
              <Plus className="w-4 h-4" />
              <span>{activeTab === 'inbound' ? 'تسجيل شحنة توريد جديدة' : 'إصدار سند صرف عاجل'}</span>
            </button>
          </div>

          <div className="space-y-2.5">
            {filteredTransactions.length === 0 ? (
              <div className="p-8 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                <FileText className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <p className="text-xs font-black text-slate-600">لا توجد حركات مسجلة حالياً تطابق معايير البحث</p>
              </div>
            ) : (
              filteredTransactions.map(tx => (
                <div key={tx.id} className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 hover:bg-slate-100/60 transition-all">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black font-mono ${
                        tx.type === 'توريد_جديد' ? 'bg-emerald-800 text-white' : 'bg-amber-600 text-white'
                      }`}>
                        {tx.type === 'توريد_جديد' ? '📥 إذن توريد واستلام' : '📤 إذن صرف عهدة'}
                      </span>
                      <span className="font-mono text-xs font-black text-slate-800">{tx.voucherNo}</span>
                      <span className="text-[10px] text-slate-400 font-mono">• {tx.date}</span>
                      {tx.inspectionApproved && (
                        <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded flex items-center gap-1">
                          <CheckCircle className="w-3 h-3" />
                          <span>فحص فني معتمد</span>
                        </span>
                      )}
                    </div>

                    <h4 className="text-xs sm:text-sm font-black text-slate-900">{tx.itemName} ({tx.quantity} قطعة/وحدة)</h4>
                    <p className="text-[11px] text-slate-600 font-bold">
                      الجهة/المستلم: <span className="text-slate-900 font-black">{tx.recipientOrSupplier}</span>
                    </p>
                    {tx.notes && <p className="text-[10px] text-slate-400 italic">{tx.notes}</p>}
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-center">
                    <button
                      onClick={() => setSelectedVoucherTx(tx)}
                      className="px-3.5 py-2 bg-white hover:bg-slate-200 text-slate-900 border border-slate-300 rounded-xl text-xs font-black flex items-center gap-1.5 cursor-pointer shadow-2xs"
                    >
                      <Printer className="w-3.5 h-3.5 text-emerald-700" />
                      <span>عرض وطباعة السند الرسمي</span>
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* 7. TAB 4: SUPPLIERS & CENTRAL WAREHOUSES DIRECTORY */}
      {activeTab === 'suppliers' && (
        <div className="space-y-4">
          <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-sky-600" />
                  <span>دليل الجهات الموردة والمستودعات الإستراتيجية</span>
                </h3>
                <p className="text-[11px] text-slate-400 font-bold">بيانات التواصل مع دوائر التسليح والتموين والمستودعات المركزية</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {suppliersList.map(sup => (
                <div key={sup.id} className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
                  <div className="flex items-start justify-between gap-2 border-b border-slate-200 pb-2">
                    <div>
                      <span className="text-[10px] font-black px-2 py-0.5 bg-sky-100 text-sky-800 rounded">
                        {sup.type}
                      </span>
                      <h4 className="text-sm font-black text-slate-900 mt-1">{sup.name}</h4>
                    </div>

                    <span className="px-2.5 py-1 bg-emerald-100 text-emerald-800 rounded-full text-[10px] font-black">
                      تقييم {sup.rating}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs font-bold text-slate-700">
                    <div className="flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5 text-slate-400" />
                      <span>{sup.contactPerson}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Phone className="w-3.5 h-3.5 text-slate-400" />
                      <span className="font-mono">{sup.phone}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-slate-400" />
                      <span>{sup.city}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Truck className="w-3.5 h-3.5 text-slate-400" />
                      <span>{sup.totalVouchersDelivered} شحنة موردة</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 8. TAB 5: TECHNICAL INSPECTION & QUALITY CONTROL ALERTS */}
      {activeTab === 'inspection_qc' && (
        <div className="bg-white p-5 rounded-2xl border border-rose-200 shadow-xs space-y-4">
          <div className="flex items-center gap-3 pb-3 border-b border-rose-100">
            <div className="p-2.5 bg-rose-50 text-rose-700 rounded-2xl">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-black text-rose-900">تنبيهات إعادة التوريد والفحص الفني العاجل</h3>
              <p className="text-[11px] text-slate-500 font-bold">الأصناف الحرجة التي تتطلب طلب توريد طارئ أو فحص صيانة دورية</p>
            </div>
          </div>

          <div className="space-y-3">
            {criticalItems.length === 0 ? (
              <div className="p-8 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
                <p className="text-xs font-black text-slate-700">جميع المواد متوفرة برصيد آمن ومكتملة الفحص الفني</p>
              </div>
            ) : (
              criticalItems.map(item => (
                <div key={item.id} className="p-4 bg-rose-50/40 rounded-2xl border border-rose-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[10px] bg-slate-900 text-rose-400 px-2 py-0.5 rounded font-black">
                        {item.code}
                      </span>
                      <span className="text-[10px] font-black text-rose-700 bg-rose-100 px-2 py-0.5 rounded-full">
                        {item.status}
                      </span>
                    </div>
                    <h4 className="text-xs sm:text-sm font-black text-slate-900">{item.name}</h4>
                    <p className="text-[11px] text-slate-600 font-bold">
                      المتاح بالمخزن: <span className="font-black text-rose-700">{item.currentStock} {item.unitOfMeasure}</span> (حد الطلب الأدنى: {item.minStockThreshold})
                    </p>
                  </div>

                  <button
                    onClick={() => handleQuickRestock(item, 50)}
                    className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-black shadow-sm flex items-center gap-1.5 cursor-pointer shrink-0"
                  >
                    <PackagePlus className="w-4 h-4" />
                    <span>طلب توريد طارئ (+50)</span>
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* --- MODAL 1: REGISTER NEW INBOUND SUPPLY (معالج تسجيل توريد جديد) --- */}
      {isAddSupplyModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-xl rounded-3xl p-5 sm:p-6 shadow-2xl border border-slate-200 space-y-4 font-sans text-right animate-scale-in max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                <PackagePlus className="w-5 h-5 text-emerald-700" />
                <span>تسجيل وعملية توريد جديدة للمخزن العسكري</span>
              </h3>
              <button onClick={() => setIsAddSupplyModalOpen(false)} className="p-1 text-slate-400 hover:text-slate-600 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateSupplyItem} className="space-y-3.5 text-xs font-bold">
              <div>
                <label className="block text-slate-700 mb-1">اسم المادة العسكرية / التجهيز:</label>
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="مثال: ذخيره 7.62ملم أو منظار ليلي PVS14 أو بدلات صحراوية"
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold focus:outline-none focus:border-emerald-600"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 mb-1">الفئة التصنيفية:</label>
                  <select
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value as SupplyItem['category'])}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold focus:outline-none focus:border-emerald-600"
                  >
                    <option value="أسلحة وذخائر">أسلحة وذخائر</option>
                    <option value="أجهزة إشارة واتصالات">أجهزة إشارة واتصالات</option>
                    <option value="مهمات وعتاد فردي">مهمات وعتاد فردي</option>
                    <option value="ألبسة وتجهيزات">ألبسة وتجهيزات</option>
                    <option value="مؤن وإعاشة">مؤن وإعاشة</option>
                    <option value="مستلزمات طبية">مستلزمات طبية</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-700 mb-1">وحدة القياس:</label>
                  <select
                    value={newUnitOfMeasure}
                    onChange={(e) => setNewUnitOfMeasure(e.target.value as SupplyItem['unitOfMeasure'])}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold focus:outline-none focus:border-emerald-600"
                  >
                    <option value="قطعة">قطعة</option>
                    <option value="صندوق">صندوق</option>
                    <option value="كرتون">كرتون</option>
                    <option value="طقم">طقم</option>
                    <option value="كيلوجرام">كيلوجرام</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-700 mb-1">الكمية الموردة:</label>
                  <input
                    type="number"
                    value={newQty}
                    onChange={(e) => setNewQty(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold focus:outline-none focus:border-emerald-600"
                    min="1"
                    required
                  />
                </div>

                <div>
                  <label className="block text-slate-700 mb-1">حد إعادة الطلب:</label>
                  <input
                    type="number"
                    value={newMinThreshold}
                    onChange={(e) => setNewMinThreshold(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold focus:outline-none focus:border-emerald-600"
                    min="1"
                    required
                  />
                </div>

                <div>
                  <label className="block text-slate-700 mb-1">السعة القصوى:</label>
                  <input
                    type="number"
                    value={newMaxCapacity}
                    onChange={(e) => setNewMaxCapacity(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold focus:outline-none focus:border-emerald-600"
                    min="1"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 mb-1">جهة التوريد / المورد:</label>
                  <input
                    type="text"
                    value={newSupplier}
                    onChange={(e) => setNewSupplier(e.target.value)}
                    placeholder="مثال: دائرة التسليح والإمداد المركزي"
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold focus:outline-none focus:border-emerald-600"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 mb-1">الموقع والتخزين:</label>
                  <input
                    type="text"
                    value={newWarehouse}
                    onChange={(e) => setNewWarehouse(e.target.value)}
                    placeholder="مثال: المخزن A1 - قسم التسليح"
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold focus:outline-none focus:border-emerald-600"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 mb-1">حالة الفحص الفني:</label>
                  <select
                    value={newCondition}
                    onChange={(e) => setNewCondition(e.target.value as SupplyItem['condition'])}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold focus:outline-none focus:border-emerald-600"
                  >
                    <option value="جديد بكرتونه">جديد بكرتونه</option>
                    <option value="جديد صالح">جديد صالح</option>
                    <option value="مستعمل ممتازة">مستعمل ممتازة</option>
                    <option value="تحت الفحص">تحت الفحص</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-700 mb-1">القيمة التقديرية للقطعة (ر.س):</label>
                  <input
                    type="number"
                    value={newUnitPrice}
                    onChange={(e) => setNewUnitPrice(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold focus:outline-none focus:border-emerald-600"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 mb-1">ملاحظات الفحص والاستلام:</label>
                <textarea
                  value={newNotes}
                  onChange={(e) => setNewNotes(e.target.value)}
                  placeholder="ملاحظات محضر الاستلام أو أرقام الصناديق..."
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold focus:outline-none focus:border-emerald-600 h-16"
                ></textarea>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddSupplyModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 rounded-xl font-bold hover:bg-slate-200 cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-800 hover:bg-emerald-900 text-white rounded-xl font-black shadow-sm cursor-pointer"
                >
                  حفظ وتأكيد التوريد
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- MODAL 2: ISSUE OUTBOUND VOUCHER (إصدار إذن صرف عهدة عسكرية) --- */}
      {isIssueModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg rounded-3xl p-5 sm:p-6 shadow-2xl border border-slate-200 space-y-4 font-sans text-right animate-scale-in">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                <ArrowUpRight className="w-5 h-5 text-amber-600" />
                <span>إصدار إذن صرف عهدة عسكرية جديدة</span>
              </h3>
              <button onClick={() => setIsIssueModalOpen(false)} className="p-1 text-slate-400 hover:text-slate-600 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleIssueItem} className="space-y-3.5 text-xs font-bold">
              <div>
                <label className="block text-slate-700 mb-1">اختر المادة المراد صرفها من المخزن:</label>
                <select
                  value={selectedIssueItemId}
                  onChange={(e) => setSelectedIssueItemId(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold focus:outline-none focus:border-amber-600"
                  required
                >
                  <option value="">-- اختر المادة من المخزن --</option>
                  {items.map(i => (
                    <option key={i.id} value={i.id} disabled={i.currentStock <= 0}>
                      {i.name} ({i.code}) - المتاح: {i.currentStock} {i.unitOfMeasure}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-700 mb-1">الكمية المراد صرفها:</label>
                <input
                  type="number"
                  value={issueQty}
                  onChange={(e) => setIssueQty(e.target.value)}
                  min="1"
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold focus:outline-none focus:border-amber-600"
                  required
                />
              </div>

              <div>
                <label className="block text-slate-700 mb-1">جهة / نوع المستلم:</label>
                <div className="flex items-center gap-4 py-1">
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="radio"
                      name="recipientType"
                      checked={issueRecipientType === 'soldier'}
                      onChange={() => setIssueRecipientType('soldier')}
                    />
                    <span>فرد عسكري</span>
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="radio"
                      name="recipientType"
                      checked={issueRecipientType === 'unit'}
                      onChange={() => setIssueRecipientType('unit')}
                    />
                    <span>كتيبة / سرية</span>
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="radio"
                      name="recipientType"
                      checked={issueRecipientType === 'other'}
                      onChange={() => setIssueRecipientType('other')}
                    />
                    <span>مهمة خاصة</span>
                  </label>
                </div>
              </div>

              {issueRecipientType === 'soldier' && (
                <div>
                  <label className="block text-slate-700 mb-1">اختر الفرد المستلم:</label>
                  <select
                    value={issueSoldierId}
                    onChange={(e) => setIssueSoldierId(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold focus:outline-none focus:border-amber-600"
                    required
                  >
                    <option value="">-- اختر الفرد من اللواء --</option>
                    {soldiers.map(s => (
                      <option key={s.id} value={s.id}>
                        {s.fullName} ({s.militaryNumber || 'بدون رقم'})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {issueRecipientType === 'unit' && (
                <div>
                  <label className="block text-slate-700 mb-1">اختر الكتيبة / السرية:</label>
                  <select
                    value={issueUnitId}
                    onChange={(e) => setIssueUnitId(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold focus:outline-none focus:border-amber-600"
                    required
                  >
                    <option value="">-- اختر الوحدة --</option>
                    {units.map(u => (
                      <option key={u.id} value={u.id}>{u.name}</option>
                    ))}
                  </select>
                </div>
              )}

              {issueRecipientType === 'other' && (
                <div>
                  <label className="block text-slate-700 mb-1">اسم الجهة المستلمة / المهمة:</label>
                  <input
                    type="text"
                    value={issueCustomRecipient}
                    onChange={(e) => setIssueCustomRecipient(e.target.value)}
                    placeholder="مثال: سرية الاستطلاع الميداني"
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold focus:outline-none focus:border-amber-600"
                    required
                  />
                </div>
              )}

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsIssueModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 rounded-xl font-bold hover:bg-slate-200 cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-black shadow-sm cursor-pointer"
                >
                  تأكيد وإصدار أمر الصرف
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- MODAL 3: QR CODE & ITEM QUICK TICKET --- */}
      {selectedItemForVoucher && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-3xl p-6 shadow-2xl border border-slate-200 space-y-4 font-sans text-right animate-scale-in">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                <QrCode className="w-5 h-5 text-emerald-700" />
                <span>بطاقة التتبع وسند المادة الرقمية</span>
              </h3>
              <button onClick={() => setSelectedItemForVoucher(null)} className="p-1 text-slate-400 hover:text-slate-600 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-gradient-to-b from-slate-900 to-slate-950 text-white p-5 rounded-2xl border border-slate-800 space-y-3 text-center">
              {/* Simulated High-Res QR Code Graphic */}
              <div className="w-36 h-36 bg-white p-2.5 rounded-2xl mx-auto flex items-center justify-center shadow-inner">
                <div className="w-full h-full border-2 border-dashed border-slate-900 flex flex-col items-center justify-center p-1">
                  <QrCode className="w-24 h-24 text-slate-900" />
                  <span className="text-[9px] font-mono text-slate-800 font-black">{selectedItemForVoucher.code}</span>
                </div>
              </div>

              <div>
                <h4 className="text-base font-black text-emerald-400">{selectedItemForVoucher.name}</h4>
                <p className="text-xs font-mono text-slate-300">S/N: {selectedItemForVoucher.serialNumber || 'LOG-2026-REG'}</p>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs font-bold bg-slate-800/80 p-2.5 rounded-xl border border-slate-700">
                <div>
                  <span className="text-[10px] text-slate-400 block">المتاح بالمخزن</span>
                  <span className="text-emerald-400 font-black">{selectedItemForVoucher.currentStock} {selectedItemForVoucher.unitOfMeasure}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block">الموقع والتخزين</span>
                  <span className="text-slate-200 font-black">{selectedItemForVoucher.warehouseLocation}</span>
                </div>
              </div>
            </div>

            <button
              onClick={() => window.print()}
              className="w-full py-2.5 bg-slate-900 text-white hover:bg-slate-800 rounded-xl text-xs font-black flex items-center justify-center gap-2 cursor-pointer"
            >
              <Printer className="w-4 h-4 text-emerald-400" />
              <span>طباعة بطاقة الـ QR Code والأكواد</span>
            </button>
          </div>
        </div>
      )}

      {/* --- MODAL 4: OFFICIAL MILITARY VOUCHER PREVIEW (سند رسمية للتوريد والصرف) --- */}
      {selectedVoucherTx && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-xl rounded-3xl p-6 shadow-2xl border border-slate-200 space-y-4 font-sans text-right animate-scale-in max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                <FileText className="w-5 h-5 text-emerald-700" />
                <span>سند تسليم / صرف عسكري رسمــي</span>
              </h3>
              <button onClick={() => setSelectedVoucherTx(null)} className="p-1 text-slate-400 hover:text-slate-600 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Print Container with Military Seals */}
            <div className="p-6 bg-slate-50 rounded-2xl border-2 border-slate-800 space-y-4 text-xs font-bold text-slate-800 relative">
              
              {/* Header Header */}
              <div className="text-center space-y-1 border-b-2 border-slate-800 pb-3">
                <p className="text-[11px] font-black">{printSettings?.countryName || 'المملكة العربية السعودية'}</p>
                <p className="text-[11px] font-black">{printSettings?.ministryName || 'وزارة الدفاع - القيادة العامة'}</p>
                <p className="text-xs font-black text-emerald-900">{printSettings?.commandName || 'قيادة القوات البرية / شعبة التموين والتسليح'}</p>
                <h2 className="text-base font-black text-slate-900 pt-1">
                  {selectedVoucherTx.type === 'توريد_جديد' ? 'سند استلام وتوريد عتاد عسكري' : 'إذن وتسلم عهدة ميدانية رسمية'}
                </h2>
              </div>

              {/* Voucher Meta */}
              <div className="flex items-center justify-between bg-white p-2.5 rounded-xl border border-slate-200">
                <div>
                  <span className="text-slate-400 text-[10px] block">رقم السند:</span>
                  <span className="font-mono text-emerald-800 font-black text-sm">{selectedVoucherTx.voucherNo}</span>
                </div>
                <div className="text-left">
                  <span className="text-slate-400 text-[10px] block">تاريخ الإصدار:</span>
                  <span className="font-mono text-slate-800 font-bold">{selectedVoucherTx.date}</span>
                </div>
              </div>

              {/* Main Content Details */}
              <div className="space-y-2 bg-white p-3 rounded-xl border border-slate-200">
                <div className="flex justify-between border-b border-slate-100 pb-1.5">
                  <span className="text-slate-500">اسم المادة العسكرية:</span>
                  <span className="font-black text-slate-900">{selectedVoucherTx.itemName}</span>
                </div>
                <div className="flex justify-between border-b border-slate-100 pb-1.5">
                  <span className="text-slate-500">كود المادة:</span>
                  <span className="font-mono font-black text-emerald-800">{selectedVoucherTx.itemCode}</span>
                </div>
                <div className="flex justify-between border-b border-slate-100 pb-1.5">
                  <span className="text-slate-500">الكمية المقيدة بالسند:</span>
                  <span className="font-black text-slate-900">{selectedVoucherTx.quantity} قطعة/وحدة</span>
                </div>
                <div className="flex justify-between border-b border-slate-100 pb-1.5">
                  <span className="text-slate-500">الجهة / المستلم / المورد:</span>
                  <span className="font-black text-slate-900">{selectedVoucherTx.recipientOrSupplier}</span>
                </div>
                <div className="flex justify-between border-b border-slate-100 pb-1.5">
                  <span className="text-slate-500">الحالة الفنية عند الحركة:</span>
                  <span className="font-black text-slate-900">{selectedVoucherTx.conditionAtTx || 'صالح ومكتمل'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">المسؤول المنفذ:</span>
                  <span className="font-black text-slate-900">{selectedVoucherTx.handlerName}</span>
                </div>
              </div>

              {/* Signatures & Seal Zone */}
              <div className="pt-4 grid grid-cols-2 gap-4 text-center border-t border-slate-300">
                <div className="space-y-6">
                  <p className="text-[11px] font-black text-slate-700">توقيع المستلم / المورد</p>
                  <p className="text-[10px] text-slate-400">............................</p>
                </div>
                <div className="space-y-6">
                  <p className="text-[11px] font-black text-slate-700">ختم وتوقيع مسؤول التموين</p>
                  <p className="text-[10px] text-slate-400">............................</p>
                </div>
              </div>

            </div>

            <button
              onClick={() => window.print()}
              className="w-full py-2.5 bg-emerald-800 hover:bg-emerald-900 text-white rounded-xl text-xs font-black flex items-center justify-center gap-2 cursor-pointer shadow-sm"
            >
              <Printer className="w-4 h-4" />
              <span>طباعة السند الرسمي للمستندات</span>
            </button>
          </div>
        </div>
      )}

      {/* --- MODAL 5: SIMULATED LIVE QR SCANNER (ماسح الرمز تفاعلي) --- */}
      {isQRScannerModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-3xl p-6 shadow-2xl border border-slate-200 space-y-4 font-sans text-right animate-scale-in">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                <Scan className="w-5 h-5 text-sky-600" />
                <span>ماسح الأكواد والـ QR Code الميداني</span>
              </h3>
              <button onClick={() => { setIsQRScannerModalOpen(false); setScannedResultItem(null); }} className="p-1 text-slate-400 hover:text-slate-600 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Simulated Live Viewfinder */}
            <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 relative overflow-hidden h-52 flex flex-col items-center justify-center text-center space-y-3">
              <div className="absolute inset-0 border-2 border-emerald-500/40 rounded-xl m-4 pointer-events-none"></div>
              
              {/* Laser line animation */}
              <div className="absolute top-0 inset-x-0 h-0.5 bg-emerald-400 shadow-[0_0_15px_#10b981] animate-pulse"></div>

              <Scan className="w-12 h-12 text-emerald-400 animate-pulse" />
              <p className="text-xs font-bold text-slate-300">وجه الكاميرا نحو الرمز على صندوق التوريد أو السند</p>
            </div>

            {/* Quick Test Selection */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-700">أدخل كود المادة أو اختر تجربة مسح سريعة:</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={scannedCodeInput}
                  onChange={(e) => setScannedCodeInput(e.target.value)}
                  placeholder="مثال: SUP-AK47-01"
                  className="flex-1 p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:outline-none"
                />
                <button
                  onClick={() => handleSimulatedScan()}
                  className="px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-black"
                >
                  مسح
                </button>
              </div>

              <div className="flex items-center gap-1.5 overflow-x-auto pt-1">
                {items.slice(0, 3).map(i => (
                  <button
                    key={i.id}
                    onClick={() => handleSimulatedScan(i.code)}
                    className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg text-[10px] font-mono whitespace-nowrap"
                  >
                    {i.code}
                  </button>
                ))}
              </div>
            </div>

            {/* Scan Result Box */}
            {scannedResultItem && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-2xl space-y-2 text-xs font-bold text-slate-800 animate-fade-in">
                <div className="flex justify-between items-center">
                  <span className="font-mono text-emerald-800 font-black">{scannedResultItem.code}</span>
                  <span className="text-[10px] font-black text-emerald-800 bg-emerald-200 px-2 py-0.5 rounded-full">{scannedResultItem.status}</span>
                </div>
                <p className="font-black text-slate-900">{scannedResultItem.name}</p>
                <p className="text-slate-600">المتاح بالمخزن: {scannedResultItem.currentStock} {scannedResultItem.unitOfMeasure} ({scannedResultItem.warehouseLocation})</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* --- MODAL 6: WHATSAPP SHARE SUMMARY --- */}
      {isWhatsAppModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-3xl p-6 shadow-2xl border border-slate-200 space-y-4 font-sans text-right animate-scale-in">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                <Share2 className="w-5 h-5 text-emerald-600" />
                <span>مشاركة تقرير التموين والتوريد الميداني</span>
              </h3>
              <button onClick={() => setIsWhatsAppModalOpen(false)} className="p-1 text-slate-400 hover:text-slate-600 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 text-xs font-mono font-bold text-slate-800 whitespace-pre-wrap leading-relaxed max-h-56 overflow-y-auto">
              {`📦 *تقرير موقف التموين والتوريد العسكري*
📅 التاريخ: ${new Date().toISOString().split('T')[0]}

▪️ إجمالي الأصناف: ${metrics.totalItemsCount} صنف
▪️ الرصيد الكلي المتاح: ${metrics.totalStockQty} وحدة
▪️ إجمالي المنصرف: ${metrics.totalOutboundQty} وحدة
⚠️ تنبيهات النقص الحرج: ${metrics.criticalCount} أصناف

*أبرز أصناف التوريد والمخزون:*
${items.slice(0, 4).map(i => `• ${i.name}: ${i.currentStock} ${i.unitOfMeasure} (${i.status})`).join('\n')}

_تم الاستخراج تلقائياً من منظومة التموين اللوجستي_`}
            </div>

            <button
              onClick={() => {
                const text = encodeURIComponent(`📦 *تقرير موقف التموين والتوريد العسكري*\n📅 التاريخ: ${new Date().toISOString().split('T')[0]}\n\n▪️ إجمالي الأصناف: ${metrics.totalItemsCount} صنف\n▪️ الرصيد الكلي المتاح: ${metrics.totalStockQty} وحدة\n▪️ تنبيهات النقص الحرج: ${metrics.criticalCount} أصناف`);
                window.open(`https://wa.me/?text=${text}`, '_blank');
              }}
              className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black flex items-center justify-center gap-2 cursor-pointer shadow-sm"
            >
              <Send className="w-4 h-4" />
              <span>إرسال عبر الواتساب فوراً</span>
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
