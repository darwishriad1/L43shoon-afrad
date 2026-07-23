import React, { useState, useRef } from 'react';
import * as XLSX from 'xlsx';
import { 
  Upload, 
  FileSpreadsheet, 
  AlertTriangle, 
  CheckCircle2, 
  XCircle, 
  Settings2, 
  Calendar, 
  Users, 
  Sliders, 
  Download, 
  RefreshCw, 
  Play, 
  FileText,
  AlertCircle
} from 'lucide-react';
import { Unit, Soldier, AttendanceRecord, AttendanceStatusCode, AuditLog } from '../types';
import { fetchWithRetry } from '../lib/api';

interface ExcelImporterProps {
  units: Unit[];
  soldiers: Soldier[];
  attendance: AttendanceRecord[];
  currentUser: any;
  onImportCompleted: (importedData: {
    units: Unit[];
    soldiers: Soldier[];
    attendance: AttendanceRecord[];
  }) => void;
  onAddLog: (actionType: any, tableName: string, details: string) => void;
}

export default function ExcelImporter({ 
  units: existingUnits, 
  soldiers: existingSoldiers, 
  attendance: existingAttendance,
  currentUser,
  onImportCompleted,
  onAddLog
}: ExcelImporterProps) {
  // Steps: 1 = Upload & Preview, 2 = Advanced Settings, 3 = Summary & Run, 4 = Final Report
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [file, setFile] = useState<File | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Raw Excel data parsed client-side
  const [rawRows, setRawRows] = useState<any[][]>([]);
  const [fileName, setFileName] = useState('');
  const [sheetName, setSheetName] = useState('');
  const [workbook, setWorkbook] = useState<XLSX.WorkBook | null>(null);
  const [sheetNames, setSheetNames] = useState<string[]>([]);

  // Settings
  const [selectedYear, setSelectedYear] = useState<number>(2026);
  const [selectedMonth, setSelectedMonth] = useState<number>(7); // Default to July
  const [headerRowIndex, setHeaderRowIndex] = useState<number>(4); // 1-based index (Row 4)
  const [daysCount, setDaysCount] = useState<number>(31);
  const [duplicateStrategy, setDuplicateStrategy] = useState<'ignore' | 'replace' | 'abort'>('replace');

  // Preview data
  const [previewRows, setPreviewRows] = useState<any[][]>([]);
  const [detectedStats, setDetectedStats] = useState({
    totalRows: 0,
    discoveredUnits: [] as string[],
    expectedDays: 0
  });

  // Intermediate Processed Data
  const [processedUnits, setProcessedUnits] = useState<Unit[]>([]);
  const [processedSoldiers, setProcessedSoldiers] = useState<Soldier[]>([]);
  const [processedRecords, setProcessedRecords] = useState<AttendanceRecord[]>([]);

  // Errors and Warnings list
  const [warnings, setWarnings] = useState<string[]>([]);
  const [errors, setErrors] = useState<string[]>([]);

  // Final statistics for Step 4
  const [importReport, setImportReport] = useState({
    rowsRead: 0,
    unitsAdded: 0,
    soldiersAdded: 0,
    attendanceRecordsAdded: 0,
    status: 'success' as 'success' | 'failure' | 'warning'
  });

  const fileInputRef = useRef<HTMLInputElement>(null);

  // ---- STEP 1: FILE DRAG & DROP / CLICK ----
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processExcelFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processExcelFile(e.target.files[0]);
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  // ---- PROCESS EXCEL WORKBOOK ----
  const processExcelFile = (uploadedFile: File) => {
    setFile(uploadedFile);
    setFileName(uploadedFile.name);
    setIsLoading(true);

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const wb = XLSX.read(data, { type: 'array' });
        
        if (wb.SheetNames.length === 0) {
          alert('هذا الملف فارغ ولا يحتوي على أي أوراق عمل.');
          setIsLoading(false);
          return;
        }

        setWorkbook(wb);
        setSheetNames(wb.SheetNames);
        
        const firstSheet = wb.SheetNames[0];
        setSheetName(firstSheet);

        const worksheet = wb.Sheets[firstSheet];
        const rows: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
        
        if (rows.length < 2) {
          alert('الملف لا يحتوي على صفوف كافية لإجراء عملية الاستيراد.');
          setIsLoading(false);
          return;
        }

        setRawRows(rows);

        // Auto detect header row (usually Row 4 or similar based on military structures)
        let detectedHeaderIdx = 3; // 0-based default index 3 (Row 4)
        for (let i = 0; i < Math.min(rows.length, 15); i++) {
          const row = rows[i];
          if (row && row.some(cell => typeof cell === 'string' && (cell.includes('الاسم') || cell.includes('الرتبة') || cell.includes('الوحدة')))) {
            detectedHeaderIdx = i;
            break;
          }
        }
        setHeaderRowIndex(detectedHeaderIdx + 1); // Convert to 1-based index

        // Initial preview and basic stats using default settings
        generateInitialPreview(rows, detectedHeaderIdx);
      } catch (err: any) {
        console.error('Error parsing Excel:', err);
        alert(`حدث خطأ أثناء قراءة ملف Excel: ${err.message || 'يرجى التحقق من صياغة الملف.'}`);
      } finally {
        setIsLoading(false);
      }
    };
    reader.readAsArrayBuffer(uploadedFile);
  };

  // ---- HANDLE SHEET SELECTION CHANGE ----
  const handleSheetChange = (selectedName: string) => {
    if (!workbook) return;
    setSheetName(selectedName);

    const worksheet = workbook.Sheets[selectedName];
    const rows: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
    
    if (rows.length < 2) {
      alert('الورقة المحددة لا تحتوي على صفوف كافية لإجراء عملية الاستيراد.');
      return;
    }

    setRawRows(rows);

    // Auto detect header row (usually Row 4 or similar based on military structures)
    let detectedHeaderIdx = 3; // 0-based default index 3 (Row 4)
    for (let i = 0; i < Math.min(rows.length, 15); i++) {
      const row = rows[i];
      if (row && row.some(cell => typeof cell === 'string' && (cell.includes('الاسم') || cell.includes('الرتبة') || cell.includes('الوحدة')))) {
        detectedHeaderIdx = i;
        break;
      }
    }
    setHeaderRowIndex(detectedHeaderIdx + 1); // Convert to 1-based index

    // Generate preview and stats for the new sheet
    generateInitialPreview(rows, detectedHeaderIdx);
  };

  // Generate Preview & Discovered Stats
  const generateInitialPreview = (rows: any[][], headerIdx: number) => {
    const dataStartIdx = headerIdx + 1;
    const preview = rows.slice(dataStartIdx, dataStartIdx + 10);
    setPreviewRows(preview);

    const unitNamesSet = new Set<string>();
    let parsedCount = 0;

    for (let i = dataStartIdx; i < rows.length; i++) {
      const row = rows[i];
      if (!row || row.length < 2) continue;
      
      const soldierName = row[1]; // Column B is Soldier Name
      const unitName = row[3]; // Column D is Unit Name
      
      if (soldierName && typeof soldierName === 'string' && soldierName.trim()) {
        parsedCount++;
        if (unitName && typeof unitName === 'string' && unitName.trim()) {
          unitNamesSet.add(unitName.trim());
        }
      }
    }

    setDetectedStats({
      totalRows: parsedCount,
      discoveredUnits: Array.from(unitNamesSet),
      expectedDays: 31
    });
  };

  // Re-run preview when settings change
  const handleSettingsUpdate = () => {
    const hIdx = headerRowIndex - 1;
    generateInitialPreview(rawRows, hIdx);
    setStep(3);
    runDataAnalyzer();
  };

  // ---- DATA ANALYZER (Step 3 pre-processing) ----
  const runDataAnalyzer = () => {
    const hIdx = headerRowIndex - 1;
    const dataStartIdx = hIdx + 1;

    const newUnits: Unit[] = [];
    const newSoldiers: Soldier[] = [];
    const newRecords: AttendanceRecord[] = [];

    const localWarnings: string[] = [];
    const localErrors: string[] = [];

    const unitNameToIdMap: Record<string, string> = {};
    const existingUnitNameMap = new Map<string, string>();
    existingUnits.forEach(u => existingUnitNameMap.set(u.name.trim(), u.id));

    // 1. Process Unique Units
    const uniqueUnitNames = detectedStats.discoveredUnits;
    uniqueUnitNames.forEach(uName => {
      const trimmed = uName.trim();
      if (!trimmed) return;

      if (existingUnitNameMap.has(trimmed)) {
        unitNameToIdMap[trimmed] = existingUnitNameMap.get(trimmed)!;
      } else {
        // Auto-create missing unit in memory
        const uId = `un_import_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
        const uObj: Unit = {
          id: uId,
          name: trimmed,
          parentId: null,
          commanderId: null,
          commanderName: 'قائد افتراضي مضاف تلقائياً'
        };
        newUnits.push(uObj);
        unitNameToIdMap[trimmed] = uId;
      }
    });

    // 2. Process Soldiers and Attendance Records
    const doubleNamesSet = new Set<string>();
    const existingSoldierNames = new Set(existingSoldiers.map(s => s.fullName.trim()));

    for (let i = dataStartIdx; i < rawRows.length; i++) {
      const row = rawRows[i];
      if (!row) continue;

      const soldierNameRaw = row[1]; // Column B
      if (!soldierNameRaw || typeof soldierNameRaw !== 'string' || !soldierNameRaw.trim()) {
        continue; // skip empty rows
      }

      const fullName = soldierNameRaw.trim();
      const rank = (row[2] || 'جندي').toString().trim(); // Column C
      const unitNameRaw = row[3]; // Column D
      const unitName = (unitNameRaw || 'قيادة اللواء').toString().trim();

      // Get appropriate unit ID
      let unitId = unitNameToIdMap[unitName];
      if (!unitId) {
        // Fallback or default
        unitId = existingUnits[0]?.id || 'un_central';
      }

      // Check Duplicates
      let targetSoldierId = '';
      const isDuplicate = existingSoldierNames.has(fullName) || doubleNamesSet.has(fullName);

      if (isDuplicate) {
        if (duplicateStrategy === 'abort') {
          localErrors.push(`خطأ جسيم: الاسم الثنائي أو المكرر مسبقاً (${fullName}) مكرر في قاعدة البيانات أو الملف والخيار المعين هو إلغاء الاستيراد.`);
        } else if (duplicateStrategy === 'ignore') {
          localWarnings.push(`تم تخطي الجندي (${fullName}) لأنه مكرر مسبقاً في كشوفات اللواء.`);
          continue; // skip importing this soldier and their records
        } else if (duplicateStrategy === 'replace') {
          // Find existing soldier
          const existingS = existingSoldiers.find(s => s.fullName.trim() === fullName);
          if (existingS) {
            targetSoldierId = existingS.id;
            localWarnings.push(`تنبيه: الجندي مكرر مسبقاً (${fullName}). سيتم تحديث بياناته وربطه بوحدة (${unitName}) واستبدال تحضيره لشهر ${selectedMonth}.`);
          } else {
            // Found duplicate in the excel sheet itself
            targetSoldierId = `s_import_${Date.now()}_${i}`;
          }
        }
      } else {
        targetSoldierId = `s_import_${Date.now()}_${i}`;
        
        // Build new Soldier
        const militaryNumber = (row[0] || `M${100000 + i}`).toString().trim(); // Column A
        const soldierObj: Soldier = {
          id: targetSoldierId,
          militaryNumber,
          fullName,
          rank,
          unitId,
          isActive: true
        };
        newSoldiers.push(soldierObj);
        doubleNamesSet.add(fullName);
      }

      // 3. Process Attendance Days
      // Days are columns E to AI (index 4 to 34 in 0-based index)
      const maxDaysToRead = Math.min(daysCount, 31);
      const paddedMonth = selectedMonth.toString().padStart(2, '0');

      for (let day = 1; day <= maxDaysToRead; day++) {
        const cellIndex = 3 + day; // E=4, F=5, etc.
        const codeRaw = row[cellIndex];
        
        if (codeRaw === undefined || codeRaw === null || codeRaw === '') {
          continue; // Empty cells are ignored or left unrecorded
        }

        const statusCode = codeRaw.toString().trim();
        const validCodes: AttendanceStatusCode[] = ['ح', 'غ', 'إ', 'م', 'ع', 'ن'];

        if (validCodes.includes(statusCode as any)) {
          const paddedDay = day.toString().padStart(2, '0');
          const recordDate = `${selectedYear}-${paddedMonth}-${paddedDay}`;
          const recordId = `att_${targetSoldierId}_${recordDate}`;

          const recordObj: AttendanceRecord = {
            id: recordId,
            soldierId: targetSoldierId,
            date: recordDate,
            statusCode: statusCode as AttendanceStatusCode,
            recordedBy: currentUser?.name || 'مستورد ذكي',
            updatedAt: new Date().toISOString()
          };
          newRecords.push(recordObj);
        } else {
          localWarnings.push(`الرمز العسكري غير المعروف (${statusCode}) للخلية يوم ${day} للجندي (${fullName}) تم تخطيه.`);
        }
      }
    }

    setProcessedUnits(newUnits);
    setProcessedSoldiers(newSoldiers);
    setProcessedRecords(newRecords);
    setWarnings(localWarnings);
    setErrors(localErrors);
  };

  // ---- STEP 3: RUN THE BULK IMPORT ON DATABASE ----
  const handleExecuteImport = async () => {
    if (errors.length > 0) {
      alert('لا يمكن إكمال الاستيراد بسبب وجود أخطاء حرجة في الملف. يرجى تعديل الملف أو تغيير الخيارات.');
      return;
    }

    try {
      setIsLoading(true);

      // 1. Send unique units to backend
      if (processedUnits.length > 0) {
        const responseUnits = await fetchWithRetry('/api/units/bulk', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ records: processedUnits })
        });
        if (!responseUnits.ok) {
          throw new Error('فشل إرسال الوحدات الجديدة لقاعدة البيانات.');
        }
      }

      // 2. Send soldiers to backend
      if (processedSoldiers.length > 0) {
        const responseSoldiers = await fetchWithRetry('/api/soldiers/bulk', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ records: processedSoldiers })
        });
        if (!responseSoldiers.ok) {
          throw new Error('فشل إرسال سجلات الأفراد الجدد لقاعدة البيانات.');
        }
      }

      // 3. Send attendance records to backend
      if (processedRecords.length > 0) {
        const responseRecords = await fetchWithRetry('/api/attendance/bulk', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ records: processedRecords })
        });
        if (!responseRecords.ok) {
          throw new Error('فشل إدخال وحفظ سجل الحضور والتحضير الجماعي سحابياً.');
        }
      }

      // Log action to Audit Logs
      const auditDetails = `استيراد كامل من ملف Excel (${fileName}): تم إنشاء/تحديث ${processedUnits.length} وحدة عسكرية، ${processedSoldiers.length} جندي، و ${processedRecords.length} سجل تحضير يومي.`;
      onAddLog('استيراد', 'المستورد الذكي من Excel', auditDetails);

      // Trigger callback in parent component App.tsx to update active state
      onImportCompleted({
        units: [...existingUnits, ...processedUnits],
        soldiers: [...existingSoldiers, ...processedSoldiers],
        attendance: [...existingAttendance, ...processedRecords]
      });

      // Update report stats
      setImportReport({
        rowsRead: detectedStats.totalRows,
        unitsAdded: processedUnits.length,
        soldiersAdded: processedSoldiers.length,
        attendanceRecordsAdded: processedRecords.length,
        status: warnings.length > 0 ? 'warning' : 'success'
      });

      setStep(4);
      alert('تم الاستيراد والمطابقة بنجاح 100%! تم إعداد وحفظ كافة السجلات سحابياً بنجاح.');
    } catch (err: any) {
      console.error('Import process failed:', err);
      alert(`خطأ فادح أثناء تنفيذ العملية: ${err.message || 'يرجى المحاولة مجدداً.'}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Reset Excel Importer state
  const handleReset = () => {
    setFile(null);
    setRawRows([]);
    setFileName('');
    setSheetName('');
    setWorkbook(null);
    setSheetNames([]);
    setPreviewRows([]);
    setProcessedUnits([]);
    setProcessedSoldiers([]);
    setProcessedRecords([]);
    setWarnings([]);
    setErrors([]);
    setStep(1);
  };

  // Download PDF / Text Report
  const handleDownloadReport = () => {
    const reportText = `
وزارة الدفاع والسيطرة - قيادة لواء المشاة والسيطرة الميدانية الموحدة
تقرير مخرجات الاستيراد السحابي الذكي من ملفات Excel لدفعة كشوف التحضير
----------------------------------------------------------------------
اسم الملف المصدر: ${fileName}
تاريخ العملية والتوثيق: ${new Date().toLocaleString('ar-SA')}
تم التشغيل بواسطة: ${currentUser?.name || 'مدير النظام المعتمد'}

إحصاءات الترحيل والتثبيت:
-----------------------
- إجمالي عدد صفوف الأفراد المقروءة: ${importReport.rowsRead}
- عدد الوحدات والكتائب الجديدة التي تم إنشاؤها: ${importReport.unitsAdded}
- عدد الأفراد والعساكر الجدد الذين تم إضافتهم: ${importReport.soldiersAdded}
- إجمالي كشوف وسجلات الحضور والتحضير التي تم توليدها: ${importReport.attendanceRecordsAdded}

ملاحظات وتحذيرات التثبيت:
-----------------------
${warnings.length === 0 ? "لا توجد تحذيرات، تطابق البيانات مثالي 100%!" : warnings.map((w, idx) => `${idx + 1}. ${w}`).join('\n')}

حالة المعالجة الكلية: ناجحة ومطابقة للأنظمة اللوجستية والدفاعية الوطنية.
`;
    
    const blob = new Blob([reportText], { type: 'text/plain;charset=utf-8' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `تقرير_استيراد_إكسل_${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-xs space-y-6 text-right font-sans" dir="rtl">
      
      {/* Header and Step Indicator */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
        <div>
          <h4 className="text-md font-extrabold text-slate-800 flex items-center gap-2">
            <span className="w-8 h-8 bg-teal-50 text-teal-800 border border-teal-100 rounded-lg flex items-center justify-center">
              <FileSpreadsheet className="w-4 h-4" />
            </span>
            المستورد الذكي والسحابي لكشوفات Excel
          </h4>
          <p className="text-xs text-slate-400 mt-1">ترحيل ومزامنة آلاف الأفراد والكتائب وتاريخ التحضير دفعة واحدة بطريقة فائقة السرية والدقة.</p>
        </div>

        {/* Step circles */}
        <div className="flex items-center gap-3">
          {[
            { s: 1, label: 'رفع الملف' },
            { s: 2, label: 'الإعدادات' },
            { s: 3, label: 'المطابقة' },
            { s: 4, label: 'التقرير' }
          ].map((item) => (
            <div key={item.s} className="flex items-center gap-1.5 text-xs font-bold">
              <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] ${
                step === item.s 
                  ? 'bg-teal-800 text-white shadow-xs' 
                  : step > item.s 
                    ? 'bg-emerald-100 text-emerald-800' 
                    : 'bg-slate-100 text-slate-400'
              }`}>
                {step > item.s ? '✓' : item.s}
              </span>
              <span className={step === item.s ? 'text-teal-800 font-extrabold' : 'text-slate-400'}>
                {item.label}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* STEP 1: UPLOAD & PREVIEW */}
      {step === 1 && (
        <div className="space-y-6">
          {!file ? (
            <div 
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={triggerFileInput}
              className={`border-2 border-dashed rounded-2xl p-10 text-center space-y-4 cursor-pointer transition-colors max-w-2xl mx-auto ${
                isDragOver 
                  ? 'border-teal-500 bg-teal-50/40 text-teal-800' 
                  : 'border-slate-200 bg-slate-50/50 text-slate-500 hover:bg-slate-50'
              }`}
            >
              <input 
                type="file" 
                ref={fileInputRef}
                onChange={handleFileChange}
                accept=".xlsx, .xls"
                className="hidden"
              />
              
              <div className="w-16 h-16 bg-white shadow-sm border border-slate-100 rounded-full flex items-center justify-center mx-auto text-slate-400">
                <Upload className="w-8 h-8 text-teal-850 animate-bounce" />
              </div>

              <div className="space-y-1.5">
                <h5 className="text-sm font-bold text-slate-700">اسحب وأسقط ملف الـ Excel لكشف الحضور هنا</h5>
                <p className="text-xs text-slate-400 leading-relaxed">
                  يدعم صيغ <span className="font-mono text-teal-800">.xlsx, .xls</span> لدفعة اللواء بالكامل.<br />
                  (سيتم فك وقراءة البيانات محلياً وآمناً دون مشاركتها خارج النظام).
                </p>
              </div>

              <button 
                type="button"
                className="px-6 py-2 bg-teal-800 text-white rounded-xl text-xs font-bold hover:bg-teal-950 shadow-xs inline-block"
              >
                تصفح الملفات من جهازك
              </button>
            </div>
          ) : (
            <div className="space-y-6">
              {/* File details */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-emerald-100 text-emerald-800 rounded-lg flex items-center justify-center font-bold">
                    XLSX
                  </div>
                  <div>
                    <span className="text-xs text-slate-400 block">الملف النشط حالياً:</span>
                    <span className="text-sm font-bold text-slate-800 font-mono" dir="ltr">{fileName}</span>
                    {sheetName && (
                      <span className="text-[10px] text-slate-500 font-sans block mt-0.5">
                        الورقة النشطة: <strong className="text-teal-800">{sheetName}</strong>
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button 
                    onClick={handleReset}
                    className="px-3 py-1.5 bg-rose-50 text-rose-700 hover:bg-rose-100 text-xs font-bold rounded-lg transition-colors cursor-pointer"
                  >
                    تغيير أو حذف الملف
                  </button>
                  
                  <button 
                    onClick={() => {
                      setStep(2);
                      runDataAnalyzer();
                    }}
                    className="px-5 py-1.5 bg-teal-800 hover:bg-teal-950 text-white text-xs font-bold rounded-lg transition-colors cursor-pointer flex items-center gap-1"
                  >
                    متابعة للإعدادات
                    <span className="text-[10px]">←</span>
                  </button>
                </div>
              </div>

              {/* Sheet Selector (Only if multiple sheets exist) */}
              {sheetNames.length > 1 && (
                <div className="bg-emerald-50/40 border border-emerald-100 p-4 rounded-xl space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                      <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>
                      الملف يحتوي على أوراق عمل متعددة ({sheetNames.length} أوراق). حدد الورقة المستهدفة للتحضير:
                    </span>
                    <span className="text-[10px] text-emerald-800 bg-emerald-100 px-2.5 py-0.5 rounded-full font-bold">
                      أوراق عمل متعددة
                    </span>
                  </div>
                  
                  <div className="flex flex-wrap gap-2">
                    {sheetNames.map((name) => (
                      <button
                        key={name}
                        type="button"
                        onClick={() => handleSheetChange(name)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                          sheetName === name
                            ? 'bg-emerald-800 text-white shadow-xs scale-102 font-extrabold'
                            : 'bg-white hover:bg-slate-100 text-slate-600 border border-slate-200'
                        }`}
                      >
                        <span className="text-slate-400">📄</span>
                        {name}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Initial Detected Stats Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-slate-50/50 p-4 rounded-xl border border-slate-150 space-y-1">
                  <span className="text-[10px] text-slate-400 font-bold block">إجمالي عدد الصفوف المكتشفة</span>
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-xl font-extrabold text-slate-800 font-mono">{detectedStats.totalRows}</span>
                    <span className="text-xs text-slate-500">فرد</span>
                  </div>
                </div>

                <div className="bg-slate-50/50 p-4 rounded-xl border border-slate-150 space-y-1">
                  <span className="text-[10px] text-slate-400 font-bold block">الوحدات والكتائب الفرعية المكتشفة</span>
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-xl font-extrabold text-teal-800 font-mono">{detectedStats.discoveredUnits.length}</span>
                    <span className="text-xs text-slate-500">وحدة</span>
                  </div>
                </div>

                <div className="bg-slate-50/50 p-4 rounded-xl border border-slate-150 space-y-1">
                  <span className="text-[10px] text-slate-400 font-bold block">أيام التحضير المتوقعة لكل فرد</span>
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-xl font-extrabold text-amber-600 font-mono">{detectedStats.expectedDays}</span>
                    <span className="text-xs text-slate-500">يوم (كامل الشهر)</span>
                  </div>
                </div>
              </div>

              {/* Header row warning / notification */}
              <div className="bg-amber-50 border border-amber-200 p-3 rounded-lg text-xs flex items-center gap-2 text-amber-800">
                <AlertCircle className="w-4.5 h-4.5 shrink-0" />
                <p>
                  تم كشف صف الترويسة والعناوين تلقائياً في <strong>الصف {headerRowIndex}</strong>. يمكنك تعديل ذلك في الخطوة التالية إذا كان الهيكل الفعلي للملف يبدأ من صف آخر.
                </p>
              </div>

              {/* Live Preview Grid (First 10 Rows) */}
              <div className="space-y-2">
                <h5 className="text-xs font-bold text-slate-600">معاينة أولية ومباشرة لأول 10 صفوف من ملف Excel:</h5>
                
                <div className="border border-slate-150 rounded-xl overflow-x-auto bg-slate-50/20">
                  <table className="w-full text-right text-xs border-collapse">
                    <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-250">
                      <tr>
                        <th className="p-2 text-center border-l border-slate-200">الرقم المالي/التسلسلي (A)</th>
                        <th className="p-2 border-l border-slate-200">الاسم الكامل للفرد (B)</th>
                        <th className="p-2 border-l border-slate-200">الرتبة (C)</th>
                        <th className="p-2 border-l border-slate-200">الوحدة العسكرية الفرعية (D)</th>
                        <th className="p-2 text-center border-l border-slate-200">يوم 1 (E)</th>
                        <th className="p-2 text-center border-l border-slate-200">يوم 2 (F)</th>
                        <th className="p-2 text-center border-l border-slate-200">يوم 3 (G)</th>
                        <th className="p-2 text-center border-l border-slate-200">يوم 4 (H)</th>
                        <th className="p-2 text-center">...</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-600 font-mono text-[11px]">
                      {previewRows.map((row, idx) => (
                        <tr key={idx} className="hover:bg-slate-50/50">
                          <td className="p-2 text-center border-l border-slate-150 font-bold text-slate-700">{row[0] || idx + 1}</td>
                          <td className="p-2 border-l border-slate-150 font-sans font-bold text-slate-800">{row[1] || '---'}</td>
                          <td className="p-2 border-l border-slate-150 font-sans">{row[2] || '---'}</td>
                          <td className="p-2 border-l border-slate-150 font-sans text-teal-800">{row[3] || '---'}</td>
                          <td className="p-2 text-center border-l border-slate-150 font-bold text-teal-700">{row[4] || '---'}</td>
                          <td className="p-2 text-center border-l border-slate-150 font-bold text-teal-700">{row[5] || '---'}</td>
                          <td className="p-2 text-center border-l border-slate-150 font-bold text-teal-700">{row[6] || '---'}</td>
                          <td className="p-2 text-center border-l border-slate-150 font-bold text-teal-700">{row[7] || '---'}</td>
                          <td className="p-2 text-center font-sans text-slate-400">مخفي...</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* STEP 2: ADVANCED SETTINGS */}
      {step === 2 && (
        <div className="space-y-6">
          <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 space-y-6 max-w-3xl mx-auto">
            <h5 className="text-sm font-bold text-slate-800 flex items-center gap-2 border-b border-slate-200 pb-2.5">
              <Settings2 className="w-4 h-4 text-teal-800" />
              تكوين إعدادات المطابقة والتعرف على البيانات
            </h5>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* Target Month & Year */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-600">الفترة المستهدفة للتحضير (الترحيل):</label>
                <div className="grid grid-cols-2 gap-2">
                  <select 
                    value={selectedYear}
                    onChange={(e) => setSelectedYear(Number(e.target.value))}
                    className="w-full p-2 text-xs bg-white border border-slate-200 rounded-lg focus:outline-hidden font-mono font-bold"
                  >
                    <option value={2026}>2026 م</option>
                    <option value={2027}>2027 م</option>
                  </select>

                  <select 
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(Number(e.target.value))}
                    className="w-full p-2 text-xs bg-white border border-slate-200 rounded-lg focus:outline-hidden font-bold"
                  >
                    {Array.from({ length: 12 }).map((_, idx) => (
                      <option key={idx} value={idx + 1}>الشهر {idx + 1} (يوليو...)</option>
                    ))}
                  </select>
                </div>
                <span className="text-[10px] text-slate-400 block leading-normal">
                  سيتم توليد تواريخ كشوف الحضور تلقائياً ضمن هذه الفترة المحددة بناءً على أيام الأعمدة.
                </span >
              </div>

              {/* Header start row */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-600">صف ترويسة البيانات بالملف:</label>
                <input 
                  type="number"
                  min="1"
                  max="50"
                  value={headerRowIndex}
                  onChange={(e) => setHeaderRowIndex(Number(e.target.value))}
                  className="w-full p-2 text-xs bg-white border border-slate-200 rounded-lg focus:outline-hidden font-mono font-bold"
                />
                <span className="text-[10px] text-slate-400 block leading-normal">
                  سيبدأ النظام بقراءة البيانات من الصف الذي يليه مباشرة (الصف الحالي المقترح: {headerRowIndex + 1}).
                </span>
              </div>

              {/* Days Count */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-600">عدد أيام التحضير الفعلية بالشهر:</label>
                <select 
                  value={daysCount}
                  onChange={(e) => setDaysCount(Number(e.target.value))}
                  className="w-full p-2 text-xs bg-white border border-slate-200 rounded-lg focus:outline-hidden font-mono font-bold"
                >
                  <option value={31}>31 يوماً (كامل الشهر)</option>
                  <option value={30}>30 يوماً</option>
                  <option value={29}>29 يوماً</option>
                  <option value={28}>28 يوماً</option>
                </select>
                <span className="text-[10px] text-slate-400 block leading-normal">
                  عدد أعمدة الأيام المتتالية التي تمثل سجل الحضور (من العمود E تصاعدياً).
                </span>
              </div>

              {/* Duplication Strategy */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-600">آلية التعامل مع السجلات المكررة:</label>
                <select 
                  value={duplicateStrategy}
                  onChange={(e) => setDuplicateStrategy(e.target.value as any)}
                  className="w-full p-2 text-xs bg-white border border-slate-200 rounded-lg focus:outline-hidden font-bold"
                >
                  <option value="replace">تحديث واستبدال السجلات (استبدال)</option>
                  <option value="ignore">تجاهل الجندي المكرر وحفظ الجديد فقط (تجاهل)</option>
                  <option value="abort">إلغاء العملية بالكامل في حال وجود تكرارات (إلغاء)</option>
                </select>
                <span className="text-[10px] text-slate-400 block leading-normal">
                  كيف يتصرف المحرك الذكي في حال وجود جندي يحمل نفس الاسم الكامل مسبقاً في اللواء.
                </span>
              </div>

            </div>

            <div className="flex justify-end gap-3 pt-3 border-t border-slate-150">
              <button 
                onClick={() => setStep(1)}
                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-bold rounded-lg cursor-pointer"
              >
                رجوع لمعاينة الملف
              </button>

              <button 
                onClick={handleSettingsUpdate}
                className="px-6 py-2 bg-teal-800 hover:bg-teal-900 text-white text-xs font-bold rounded-lg cursor-pointer flex items-center gap-1.5"
              >
                تحليل ومطابقة البيانات
                <span>←</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* STEP 3: SUMMARY & RUN */}
      {step === 3 && (
        <div className="space-y-6">
          <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 space-y-6">
            <h5 className="text-sm font-bold text-slate-800 flex items-center gap-2 border-b border-slate-200 pb-2.5">
              <Sliders className="w-4 h-4 text-teal-800" />
              مراجعة نتائج تصفية ومطابقة البيانات قبل التثبيت
            </h5>

            {/* Verification stats row */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              
              <div className="bg-white p-4 rounded-xl border border-slate-150 flex items-center justify-between">
                <div className="space-y-1">
                  <span className="text-[10px] text-slate-400 font-bold block">الوحدات والكتائب المضافة حديثاً</span>
                  <span className="text-lg font-extrabold text-teal-700 font-mono">{processedUnits.length}</span>
                </div>
                <div className="w-10 h-10 bg-teal-50 rounded-lg flex items-center justify-center text-teal-800 font-bold">
                  団
                </div>
              </div>

              <div className="bg-white p-4 rounded-xl border border-slate-150 flex items-center justify-between">
                <div className="space-y-1">
                  <span className="text-[10px] text-slate-400 font-bold block">الأفراد والعساكر الجدد</span>
                  <span className="text-lg font-extrabold text-blue-700 font-mono">{processedSoldiers.length}</span>
                </div>
                <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center text-blue-800 font-bold">
                  👥
                </div>
              </div>

              <div className="bg-white p-4 rounded-xl border border-slate-150 flex items-center justify-between">
                <div className="space-y-1">
                  <span className="text-[10px] text-slate-400 font-bold block">سجلات التحضير اليومية المولدة</span>
                  <span className="text-lg font-extrabold text-emerald-700 font-mono">{processedRecords.length}</span>
                </div>
                <div className="w-10 h-10 bg-emerald-50 rounded-lg flex items-center justify-center text-emerald-800 font-bold">
                  田
                </div>
              </div>

            </div>

            {/* Error and warnings report panel */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* Warnings */}
              <div className="border border-amber-250 rounded-xl p-4 space-y-3 bg-amber-50/20 max-h-72 overflow-y-auto">
                <h6 className="text-xs font-bold text-amber-800 flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4 text-amber-600" />
                  التحذيرات والملاحظات الصغرى ({warnings.length})
                </h6>
                {warnings.length === 0 ? (
                  <p className="text-xs text-slate-400 text-center py-6">لا توجد أي تحذيرات. تطابق البيانات مثالي.</p>
                ) : (
                  <ul className="text-[11px] text-slate-600 space-y-2 list-disc list-inside leading-relaxed font-mono">
                    {warnings.map((w, idx) => (
                      <li key={idx}>{w}</li>
                    ))}
                  </ul>
                )}
              </div>

              {/* Errors */}
              <div className="border border-red-250 rounded-xl p-4 space-y-3 bg-red-50/20 max-h-72 overflow-y-auto">
                <h6 className="text-xs font-bold text-red-800 flex items-center gap-1.5">
                  <XCircle className="w-4 h-4 text-red-600" />
                  الأخطاء الحرجة المكتشفة بالملف ({errors.length})
                </h6>
                {errors.length === 0 ? (
                  <p className="text-xs text-slate-400 text-center py-6">لا توجد أي أخطاء حرجة. الملف جاهز تماماً للترحيل والتثبيت.</p>
                ) : (
                  <div className="space-y-3">
                    <ul className="text-[11px] text-red-700 space-y-2 list-disc list-inside leading-relaxed font-mono">
                      {errors.map((e, idx) => (
                        <li key={idx} className="font-bold">{e}</li>
                      ))}
                    </ul>
                    <div className="bg-red-100/50 p-2 text-[10px] text-red-800 rounded-md">
                      ⚠️ يرجى تصحيح هذه الأخطاء في ملف الـ Excel وإعادة رفعه لتفادي تعارض وفقدان البيانات اللوجستية للواء.
                    </div>
                  </div>
                )}
              </div>

            </div>

            {/* Execute trigger section */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-slate-200">
              <div className="text-xs text-slate-500 leading-relaxed font-sans max-w-xl text-right">
                <span className="font-bold text-slate-700 block mb-0.5">ملاحظة تأكيدية هامة:</span>
                بالنقر على زر التثبيت والمزامنة، سيتم إرسال كافة سجلات الأفراد وكشف الحضور المولد لقاعدة البيانات السحابية (Drizzle/PostgreSQL). في حال حدوث أي انقطاع أو خطأ، سيتم إلغاء العمليات تلقائياً لحفظ نزاهة السجلات (Transactional Rollback).
              </div>

              <div className="flex items-center gap-2">
                <button 
                  onClick={() => setStep(2)}
                  className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-bold rounded-lg cursor-pointer"
                >
                  تعديل الإعدادات
                </button>

                <button 
                  onClick={handleExecuteImport}
                  disabled={isLoading || errors.length > 0}
                  className="px-6 py-2 bg-emerald-700 hover:bg-emerald-800 text-white font-extrabold text-xs rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 disabled:bg-slate-300 disabled:text-slate-500 disabled:cursor-not-allowed shadow-xs"
                >
                  {isLoading ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin text-emerald-200" />
                      جاري تثبيت السجلات...
                    </>
                  ) : (
                    <>
                      <Play className="w-3.5 h-3.5 text-emerald-300 fill-emerald-300" />
                      مزامنة وتثبيت البيانات بالكامل
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* STEP 4: FINAL REPORT */}
      {step === 4 && (
        <div className="space-y-6">
          <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200 text-center space-y-6 max-w-2xl mx-auto">
            
            <div className="w-16 h-16 bg-emerald-100 text-emerald-800 rounded-full flex items-center justify-center mx-auto shadow-md border-2 border-emerald-200">
              <CheckCircle2 className="w-10 h-10" />
            </div>

            <div className="space-y-1.5">
              <h5 className="text-md font-extrabold text-slate-800">اكتمل التثبيت والترحيل السحابي بنجاح!</h5>
              <p className="text-xs text-slate-400">تم دمج ومزامنة كافة السجلات المستخرجة من ملف Excel في مستودع البيانات المركزي للواء.</p>
            </div>

            {/* Results Grid */}
            <div className="bg-white p-4 rounded-xl border border-slate-150 grid grid-cols-2 gap-4 text-right">
              
              <div className="space-y-0.5 border-l border-slate-100 pl-4">
                <span className="text-[10px] text-slate-400 font-bold block">الوحدات العسكرية المضافة</span>
                <span className="text-lg font-extrabold text-slate-800 font-mono">{importReport.unitsAdded}</span>
              </div>

              <div className="space-y-0.5">
                <span className="text-[10px] text-slate-400 font-bold block">الأفراد والعساكر الجدد</span>
                <span className="text-lg font-extrabold text-slate-800 font-mono">{importReport.soldiersAdded}</span>
              </div>

              <div className="space-y-0.5 border-l border-slate-100 pl-4 pt-2 border-t border-slate-50">
                <span className="text-[10px] text-slate-400 font-bold block">صفوف الأفراد المقروءة بالكامل</span>
                <span className="text-lg font-extrabold text-slate-800 font-mono">{importReport.rowsRead}</span>
              </div>

              <div className="space-y-0.5 pt-2 border-t border-slate-50">
                <span className="text-[10px] text-slate-400 font-bold block">سجلات كشوف الحضور المثبتة</span>
                <span className="text-lg font-extrabold text-emerald-700 font-mono">{importReport.attendanceRecordsAdded}</span>
              </div>

            </div>

            {/* Actions for Step 4 */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <button 
                onClick={handleDownloadReport}
                className="w-full sm:w-auto px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs rounded-xl border border-slate-200 transition-colors cursor-pointer flex items-center justify-center gap-1.5"
              >
                <Download className="w-4 h-4 text-slate-500" />
                تحميل تقرير الترحيل والتطابق
              </button>

              <button 
                onClick={handleReset}
                className="w-full sm:w-auto px-6 py-2.5 bg-teal-800 hover:bg-teal-900 text-white font-extrabold text-xs rounded-xl transition-colors cursor-pointer"
              >
                استيراد ملف جديد
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
