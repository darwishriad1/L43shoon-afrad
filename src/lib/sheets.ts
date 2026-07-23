import { Unit, Soldier, AttendanceRecord, AuditLog } from '../types';

export async function createBackupSpreadsheet(accessToken: string, title: string): Promise<{ id: string; url: string }> {
  const response = await fetch('https://sheets.googleapis.com/v4/spreadsheets', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      properties: {
        title: title
      },
      sheets: [
        { properties: { title: 'الوحدات العسكرية' } },
        { properties: { title: 'العساكر والأفراد' } },
        { properties: { title: 'سجل التحضير' } },
        { properties: { title: 'سجل الرقابة' } }
      ]
    })
  });

  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    throw new Error(errData?.error?.message || 'Failed to create backup spreadsheet');
  }

  const result = await response.json();
  return {
    id: result.spreadsheetId,
    url: result.spreadsheetUrl
  };
}

export async function updateBackupData(
  accessToken: string,
  spreadsheetId: string,
  data: {
    units: Unit[];
    soldiers: Soldier[];
    attendance: AttendanceRecord[];
    auditLogs: AuditLog[];
  }
) {
  const batchData = [
    {
      range: "'الوحدات العسكرية'!A1",
      values: [
        ["معرف الوحدة", "الاسم", "معرف الوحدة الأعلى", "قائد الوحدة"],
        ...data.units.map(u => [u.id, u.name, u.parentId || "", u.commanderName || ""])
      ]
    },
    {
      range: "'العساكر والأفراد'!A1",
      values: [
        ["معرف العسكري", "الرقم العسكري", "الاسم الكامل", "الرتبة", "معرف الوحدة", "نشط"],
        ...data.soldiers.map(s => [s.id, s.militaryNumber, s.fullName, s.rank, s.unitId, s.isActive ? "نعم" : "لا"])
      ]
    },
    {
      range: "'سجل التحضير'!A1",
      values: [
        ["معرف السجل", "معرف العسكري", "التاريخ", "الرمز", "سجل بواسطة", "آخر تحديث"],
        ...data.attendance.map(r => [r.id, r.soldierId, r.date, r.statusCode, r.recordedBy, r.updatedAt])
      ]
    },
    {
      range: "'سجل الرقابة'!A1",
      values: [
        ["معرف السجل", "معرف المستخدم", "اسم المستخدم", "دور المستخدم", "نوع الإجراء", "اسم الجدول", "التفاصيل", "الوقت"],
        ...data.auditLogs.map(l => [l.id, l.userId, l.userName, l.userRole, l.actionType, l.tableName, l.details, l.timestamp])
      ]
    }
  ];

  const response = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values:batchUpdate`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      valueInputOption: 'USER_ENTERED',
      data: batchData
    })
  });

  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    throw new Error(errData?.error?.message || 'Failed to update backup data in Google Sheets');
  }

  return await response.json();
}

export async function readBackupSpreadsheet(accessToken: string, spreadsheetId: string) {
  const ranges = [
    'الوحدات العسكرية',
    'العساكر والأفراد',
    'سجل التحضير',
    'سجل الرقابة'
  ];

  const queryParams = ranges.map(r => `ranges=${encodeURIComponent(r)}`).join('&');
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values:batchGet?valueRenderOption=FORMATTED_VALUE&${queryParams}`;

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${accessToken}`
    }
  });

  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    throw new Error(errData?.error?.message || 'Failed to retrieve backup data from Google Sheets. Make sure the sheet names match our backup schema.');
  }

  const result = await response.json();
  const valueRanges = result.valueRanges || [];

  const getSheetValues = (name: string) => {
    const sheet = valueRanges.find((vr: any) => {
      const r = vr.range || '';
      return r.startsWith(`'${name}'`) || r.startsWith(`${name}`);
    });
    return sheet?.values || [];
  };

  // Parse Units
  const rawUnits = getSheetValues('الوحدات العسكرية');
  const units: Unit[] = rawUnits.slice(1).map((row: any) => ({
    id: row[0],
    name: row[1] || '',
    parentId: row[2] || null,
    commanderId: null,
    commanderName: row[3] || null
  })).filter((u: any) => u.id);

  // Parse Soldiers
  const rawSoldiers = getSheetValues('العساكر والأفراد');
  const soldiers: Soldier[] = rawSoldiers.slice(1).map((row: any) => ({
    id: row[0],
    militaryNumber: row[1] || '',
    fullName: row[2] || '',
    rank: row[3] || '',
    unitId: row[4] || '',
    isActive: row[5] === 'نعم'
  })).filter((s: any) => s.id);

  // Parse Attendance Records
  const rawAttendance = getSheetValues('سجل التحضير');
  const attendance: AttendanceRecord[] = rawAttendance.slice(1).map((row: any) => ({
    id: row[0],
    soldierId: row[1] || '',
    date: row[2] || '',
    statusCode: (row[3] || 'ح') as any,
    recordedBy: row[4] || '',
    updatedAt: row[5] || ''
  })).filter((r: any) => r.id);

  // Parse Audit Logs
  const rawAuditLogs = getSheetValues('سجل الرقابة');
  const auditLogs: AuditLog[] = rawAuditLogs.slice(1).map((row: any) => ({
    id: row[0],
    userId: row[1] || '',
    userName: row[2] || '',
    userRole: row[3] || '',
    actionType: (row[4] || 'تعديل') as any,
    tableName: row[5] || '',
    details: row[6] || '',
    timestamp: row[7] || ''
  })).filter((l: any) => l.id);

  return { units, soldiers, attendance, auditLogs };
}

export async function createReportSpreadsheet(
  accessToken: string,
  title: string,
  reportData: {
    startDate: string;
    endDate: string;
    unitName: string;
    reportStats: any;
    filteredRecords: any[];
    soldiers: Soldier[];
    units: Unit[];
  }
) {
  const response = await fetch('https://sheets.googleapis.com/v4/spreadsheets', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      properties: {
        title: title
      },
      sheets: [
        { properties: { title: 'تقرير الجاهزية والتحضير' } }
      ]
    })
  });

  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    throw new Error(errData?.error?.message || 'Failed to create report spreadsheet');
  }

  const result = await response.json();
  const spreadsheetId = result.spreadsheetId;
  const spreadsheetUrl = result.spreadsheetUrl;

  const statusLabels: Record<string, string> = {
    'ح': 'حضور',
    'غ': 'غياب',
    'إ': 'إجازة',
    'م': 'مهمة عسكرية',
    'ع': 'بعذر رسمي',
    'ن': 'نصف يوم'
  };

  const values = [
    ["وزارة الدفاع والسيطرة - قيادة لواء المشاة والسيطرة الميدانية الموحدة"],
    ["تقرير الجاهزية والتحضير العسكري للقوة"],
    [],
    ["خيارات التصفية للفترة والوحدة:"],
    ["تاريخ البداية:", reportData.startDate],
    ["تاريخ النهاية:", reportData.endDate],
    ["الوحدة المستهدفة:", reportData.unitName],
    [],
    ["إحصاءات الجاهزية الإجمالية للفترة:"],
    ["إجمالي السجلات المفحوصة", "معدل الجاهزية والحضور المعتمد"],
    [reportData.reportStats.total, `${reportData.reportStats.attendancePercentage}%`],
    [],
    ["توزيع حالات التحضير (أيام):"],
    ["حضور (ح)", "غياب (غ)", "إجازة (إ)", "مهمة عسكرية (م)", "بعذر مقبول (ع)", "نصف يوم (ن)"],
    [
      reportData.reportStats.counts['ح'],
      reportData.reportStats.counts['غ'],
      reportData.reportStats.counts['إ'],
      reportData.reportStats.counts['م'],
      reportData.reportStats.counts['ع'],
      reportData.reportStats.counts['ن']
    ],
    [],
    ["تفاصيل سجلات الحضور والتحضير للفترة المحددة:"],
    ["التاريخ", "الرقم العسكري", "الاسم الكامل للعسكري", "الرتبة", "الوحدة العسكرية", "حالة التحضير"]
  ];

  reportData.filteredRecords.forEach(r => {
    const soldier = reportData.soldiers.find(s => s.id === r.soldierId);
    const unitName = reportData.units.find(u => u.id === soldier?.unitId)?.name || 'غير معروف';
    values.push([
      r.date,
      soldier?.militaryNumber || '',
      soldier?.fullName || '',
      soldier?.rank || '',
      unitName,
      `${statusLabels[r.statusCode] || r.statusCode} (${r.statusCode})`
    ]);
  });

  const writeResponse = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/'تقرير الجاهزية والتحضير'!A1:F${values.length + 1}?valueInputOption=USER_ENTERED`, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      values: values
    })
  });

  if (!writeResponse.ok) {
    const errData = await writeResponse.json().catch(() => ({}));
    throw new Error(errData?.error?.message || 'Failed to populate report values');
  }

  return { id: spreadsheetId, url: spreadsheetUrl };
}
