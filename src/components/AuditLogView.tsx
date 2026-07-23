import React, { useState, useMemo } from 'react';
import { 
  ShieldCheck, 
  Search, 
  Filter, 
  Clock, 
  User, 
  Database,
  Trash2,
  Tag
} from 'lucide-react';
import { AuditLog } from '../types';

interface AuditLogViewProps {
  logs: AuditLog[];
  onClearLogs?: () => void;
  currentUserRole: string;
}

export default function AuditLogView({ logs, onClearLogs, currentUserRole }: AuditLogViewProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [actionFilter, setActionFilter] = useState('all');

  const filteredLogs = useMemo(() => {
    return logs.filter(log => {
      // Action filter
      if (actionFilter !== 'all' && log.actionType !== actionFilter) return false;

      // Text search
      if (searchQuery) {
        const query = searchQuery.trim().toLowerCase();
        return log.userName.toLowerCase().includes(query) ||
               log.details.toLowerCase().includes(query) ||
               log.tableName.toLowerCase().includes(query) ||
               log.userRole.toLowerCase().includes(query);
      }
      return true;
    }).sort((a, b) => b.timestamp.localeCompare(a.timestamp)); // Latest logs first
  }, [logs, actionFilter, searchQuery]);

  const getActionColor = (action: string) => {
    switch (action) {
      case 'إضافة': return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'تعديل': return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'حذف': return 'bg-red-50 text-red-700 border-red-200';
      case 'استيراد': return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'استعادة': return 'bg-purple-50 text-purple-700 border-purple-200';
      default: return 'bg-slate-50 text-slate-750 border-slate-200';
    }
  };

  const formatTimestamp = (ts: string) => {
    try {
      const d = new Date(ts);
      // Format to readable Arabic local string
      return d.toLocaleDateString('ar-SA', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      });
    } catch {
      return ts;
    }
  };

  return (
    <div className="space-y-6 text-right font-sans" dir="rtl">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-white p-6 rounded-2xl border border-slate-100 shadow-xs gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 font-sans">سجل العمليات والرقابة الأمنية (Audit Log)</h1>
          <p className="text-slate-500 mt-1 text-sm font-sans">
            تتبع وتسجيل كافة أنشطة الإدراج والتعديل والحذف التي تمت على الكشوف والهياكل العسكرية لضمان أمان البيانات وموثوقيتها.
          </p>
        </div>

        {currentUserRole === 'admin' && onClearLogs && (
          <button
            onClick={() => {
              if (window.confirm('هل أنت متأكد من رغبتك في تصفير وأرشفة سجل التعديلات بالكامل؟ لا يمكن التراجع عن هذا الإجراء.')) {
                onClearLogs();
              }
            }}
            className="flex items-center gap-1 bg-red-50 hover:bg-red-100 text-red-700 px-4 py-2 rounded-xl text-xs font-bold border border-red-200 cursor-pointer"
          >
            <Trash2 className="w-4 h-4" />
            تصفير السجل وتصفية الرقابة
          </button>
        )}
      </div>

      {/* Filter Controls */}
      <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-xs flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          {/* Text Search */}
          <div className="relative w-full md:w-64">
            <Search className="absolute right-3 top-2.5 w-4 h-4 text-slate-400" />
            <input 
              type="text" 
              placeholder="ابحث باسم المستخدم أو التفاصيل..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pr-10 pl-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-hidden"
            />
          </div>

          {/* Action Filter */}
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-slate-400" />
            <select
              value={actionFilter}
              onChange={(e) => setActionFilter(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm"
            >
              <option value="all">كافة أنواع العمليات</option>
              <option value="إضافة">إضافة (+)</option>
              <option value="تعديل">تعديل (✎)</option>
              <option value="حذف">حذف (🗑)</option>
              <option value="استيراد">استيراد ومزامنة (📥)</option>
              <option value="استعادة">استعادة نسخ احتياطية (🔄)</option>
            </select>
          </div>
        </div>

        <div className="text-xs text-slate-400 font-sans">
          يعرض السجل حالياً <span className="font-bold text-slate-700 font-mono">{filteredLogs.length}</span> عملية رقابية مسجلة.
        </div>
      </div>

      {/* Main Logs Table / Timeline */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs border-collapse">
            <thead className="bg-slate-50 text-slate-600 border-b border-slate-150">
              <tr>
                <th className="py-3 px-4 font-semibold text-center w-28">نوع العملية</th>
                <th className="py-3 px-4 font-semibold w-40">المستخدم المسؤول</th>
                <th className="py-3 px-4 font-semibold w-32 text-center">الجدول المستهدف</th>
                <th className="py-3 px-4 font-semibold">تفاصيل التعديل الفنية</th>
                <th className="py-3 px-4 font-semibold text-center w-48">طابع وقت العملية</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-slate-400 italic">
                    لا توجد سجلات رقابة مطابقة لمعايير التصفية الحالية.
                  </td>
                </tr>
              ) : (
                filteredLogs.map(log => (
                  <tr key={log.id} className="hover:bg-slate-50/40">
                    {/* Action Type label */}
                    <td className="py-4 px-4 text-center">
                      <span className={`inline-block px-2.5 py-1 text-[10px] font-bold rounded-lg border ${getActionColor(log.actionType)}`}>
                        {log.actionType}
                      </span>
                    </td>

                    {/* User and Role */}
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 bg-slate-100 rounded-full flex items-center justify-center text-slate-500">
                          <User className="w-3.5 h-3.5" />
                        </div>
                        <div>
                          <p className="font-bold text-slate-800">{log.userName}</p>
                          <p className="text-[9px] text-slate-400">{log.userRole}</p>
                        </div>
                      </div>
                    </td>

                    {/* Table Name */}
                    <td className="py-4 px-4 text-center">
                      <span className="inline-flex items-center gap-1 bg-slate-50 text-slate-600 border border-slate-150 rounded px-2 py-0.5">
                        <Database className="w-3 h-3" />
                        {log.tableName}
                      </span>
                    </td>

                    {/* Log details */}
                    <td className="py-4 px-4 font-semibold text-slate-700 leading-relaxed font-sans max-w-sm whitespace-normal">
                      {log.details}
                    </td>

                    {/* Timestamp */}
                    <td className="py-4 px-4 text-center font-mono text-slate-400">
                      <span className="flex items-center justify-center gap-1.5 text-[10px]">
                        <Clock className="w-3 h-3" />
                        {formatTimestamp(log.timestamp)}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
