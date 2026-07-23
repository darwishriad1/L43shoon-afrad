import { Unit, Soldier, AttendanceRecord, User, AuditLog, Notification, SystemSettings } from '../types';

export const initialUsers: User[] = [
  { id: 'u1', name: 'العميد الركن/ خالد الحربي', email: 'khaled@force.gov.sa', role: 'admin', unitId: null },
  { id: 'u2', name: 'العقيد/ محمد القحطاني', email: 'mohammad@force.gov.sa', role: 'commander_formation', unitId: null },
  { id: 'u3', name: 'المقدم/ فهد العتيبي', email: 'fahad@force.gov.sa', role: 'commander_unit', unitId: 'un2' }, // Commander of 1st Battalion
  { id: 'u4', name: 'الرائد/ أحمد الدوسري', email: 'ahmed@force.gov.sa', role: 'operations', unitId: null },
  { id: 'u5', name: 'الرقيب/ سلطان الشمري', email: 'sultan@force.gov.sa', role: 'data_writer', unitId: 'un2' }, // Writer of 1st Battalion
  { id: 'u6', name: 'الرقيب/ علي المطيري', email: 'ali@force.gov.sa', role: 'data_writer', unitId: 'un3' } // Writer of 2nd Battalion
];

export const initialUnits: Unit[] = [
  { id: 'un1', name: 'قيادة اللواء والسيطرة', parentId: null, commanderId: 'u2', commanderName: 'العقيد/ محمد القحطاني' },
  { id: 'un2', name: 'الكتيبة الأولى (مشاة)', parentId: 'un1', commanderId: 'u3', commanderName: 'المقدم/ فهد العتيبي' },
  { id: 'un3', name: 'الكتيبة الثانية (مدرعات)', parentId: 'un1', commanderId: null, commanderName: 'المقدم الركن/ فيصل الشريف' },
  { id: 'un4', name: 'سرية الدعم اللوجستي', parentId: 'un1', commanderId: null, commanderName: 'الرائد/ سعد الماجد' }
];

export const initialSoldiers: Soldier[] = [
  // Unit 1: Brigade Command (5 soldiers)
  { id: 's1', militaryNumber: '10001', fullName: 'عبدالرحمن بن سعد الشهري', rank: 'عميد ركن', unitId: 'un1', isActive: true },
  { id: 's2', militaryNumber: '10002', fullName: 'محمد بن عبدالله القحطاني', rank: 'عقيد', unitId: 'un1', isActive: true },
  { id: 's3', militaryNumber: '10003', fullName: 'ياسر بن صالح الغامدي', rank: 'رائد', unitId: 'un1', isActive: true },
  { id: 's4', militaryNumber: '10004', fullName: 'فيصل بن عمر الرويلي', rank: 'رقيب أول', unitId: 'un1', isActive: true },
  { id: 's5', militaryNumber: '10005', fullName: 'عبدالله بن فهد الدوسري', rank: 'عريف', unitId: 'un1', isActive: true },

  // Unit 2: 1st Infantry Battalion (12 soldiers)
  { id: 's6', militaryNumber: '11001', fullName: 'فهد بن مساعد العتيبي', rank: 'مقدم', unitId: 'un2', isActive: true },
  { id: 's7', militaryNumber: '11002', fullName: 'خالد بن سليمان العنزي', rank: 'نقيب', unitId: 'un2', isActive: true },
  { id: 's8', militaryNumber: '11003', fullName: 'سلطان بن عبيد الشمري', rank: 'رقيب', unitId: 'un2', isActive: true },
  { id: 's9', militaryNumber: '11004', fullName: 'ماجد بن عيسى عسيري', rank: 'وكيل رقيب', unitId: 'un2', isActive: true },
  { id: 's10', militaryNumber: '11005', fullName: 'بندر بن هزاع الحارثي', rank: 'عريف', unitId: 'un2', isActive: true },
  { id: 's11', militaryNumber: '11006', fullName: 'سعد بن مشعل السبيعي', rank: 'جندي أول', unitId: 'un2', isActive: true },
  { id: 's12', militaryNumber: '11007', fullName: 'تركي بن حمود المطيري', rank: 'جندي', unitId: 'un2', isActive: true },
  { id: 's13', militaryNumber: '11008', fullName: 'ثامر بن خالد الحربي', rank: 'جندي', unitId: 'un2', isActive: true },
  { id: 's14', militaryNumber: '11009', fullName: 'سلمان بن ظافر الأحمري', rank: 'جندي', unitId: 'un2', isActive: true },
  { id: 's15', militaryNumber: '11010', fullName: 'عبدالمحسن بن مبارك البقمي', rank: 'جندي', unitId: 'un2', isActive: true },
  { id: 's16', militaryNumber: '11011', fullName: 'عادل بن أحمد الزهراني', rank: 'جندي', unitId: 'un2', isActive: false }, // Inactive
  { id: 's17', militaryNumber: '11012', fullName: 'نواف بن صقر العتيبي', rank: 'جندي', unitId: 'un2', isActive: true },

  // Unit 3: 2nd Armored Battalion (11 soldiers)
  { id: 's18', militaryNumber: '12001', fullName: 'فيصل بن تركي الشريف', rank: 'مقدم ركن', unitId: 'un3', isActive: true },
  { id: 's19', militaryNumber: '12002', fullName: 'سعيد بن علي الشهراني', rank: 'نقيب', unitId: 'un3', isActive: true },
  { id: 's20', militaryNumber: '12003', fullName: 'علي بن راشد المطيري', rank: 'رقيب', unitId: 'un3', isActive: true },
  { id: 's21', militaryNumber: '12004', fullName: 'فارس بن دهام العنزي', rank: 'عريف', unitId: 'un3', isActive: true },
  { id: 's22', militaryNumber: '12005', fullName: 'متعب بن محمد القحطاني', rank: 'جندي أول', unitId: 'un3', isActive: true },
  { id: 's23', militaryNumber: '12006', fullName: 'محمد بن يحيى اليامي', rank: 'جندي أول', unitId: 'un3', isActive: true },
  { id: 's24', militaryNumber: '12007', fullName: 'راكان بن عبدالله النفيعي', rank: 'جندي', unitId: 'un3', isActive: true },
  { id: 's25', militaryNumber: '12008', fullName: 'مشعل بن ناصر الدوسري', rank: 'جندي', unitId: 'un3', isActive: true },
  { id: 's26', militaryNumber: '12009', fullName: 'خليل بن إبراهيم الهذلي', rank: 'جندي', unitId: 'un3', isActive: true },
  { id: 's27', militaryNumber: '12010', fullName: 'حسام بن حسن الغامدي', rank: 'جندي', unitId: 'un3', isActive: true },
  { id: 's28', militaryNumber: '12011', fullName: 'رياض بن طلال الحربي', rank: 'جندي', unitId: 'un3', isActive: true },

  // Unit 4: Support Logistics (7 soldiers)
  { id: 's29', militaryNumber: '13001', fullName: 'سعد بن عبدالرحمن الماجد', rank: 'رائد', unitId: 'un4', isActive: true },
  { id: 's30', militaryNumber: '13002', fullName: 'إبراهيم بن محمد الخالدي', rank: 'ملازم أول', unitId: 'un4', isActive: true },
  { id: 's31', militaryNumber: '13003', fullName: 'شايع بن مسفر الدوسري', rank: 'رقيب أول', unitId: 'un4', isActive: true },
  { id: 's32', militaryNumber: '13004', fullName: 'وليد بن أحمد العيسى', rank: 'رقيب', unitId: 'un4', isActive: true },
  { id: 's33', militaryNumber: '13005', fullName: 'منصور بن تركي الهزاع', rank: 'عريف', unitId: 'un4', isActive: true },
  { id: 's34', militaryNumber: '13006', fullName: 'فايز بن علي الأسمري', rank: 'جندي أول', unitId: 'un4', isActive: true },
  { id: 's35', militaryNumber: '13007', fullName: 'سامي بن خليل الهوساوي', rank: 'جندي', unitId: 'un4', isActive: true }
];

// Generate attendance records for current month (July 2026), days 1 to 16.
// Let's generate a realistic distribution: mostly 'ح' (presence), some 'غ' (absence), 'إ' (vacation), 'م' (mission), 'ع' (excused), 'ن' (half-day).
export const generateInitialAttendance = (): AttendanceRecord[] => {
  const records: AttendanceRecord[] = [];
  const activeSoldiers = initialSoldiers.filter(s => s.isActive);
  const statusPools: ('ح' | 'غ' | 'إ' | 'م' | 'ع' | 'ن')[] = [
    'ح', 'ح', 'ح', 'ح', 'ح', 'ح', 'ح', 'ح', 'ح', 'ح', // 50%
    'ح', 'ح', 'ح', 'ح', 'ح', 'ح', 'ح', 'ح', 'ح', 'ح',
    'غ', 'إ', 'م', 'ع', 'ن', 'ح' // some other statuses
  ];

  // From 2026-07-01 to 2026-07-16
  for (let day = 1; day <= 16; day++) {
    const dateStr = `2026-07-${day.toString().padStart(2, '0')}`;
    
    activeSoldiers.forEach(soldier => {
      // Seed unique pseudo-random status based on soldier id and day
      let idx = (soldier.id.charCodeAt(soldier.id.length - 1) + day) % statusPools.length;
      
      // Let's make a few specific people have interesting patterns:
      // s8 (Sultan) - always present
      if (soldier.id === 's8') idx = 0;
      // s12 - has some absences
      if (soldier.id === 's12' && (day === 5 || day === 6 || day === 12)) {
        idx = statusPools.indexOf('غ');
      }
      // s14 - is on vacation for first 10 days
      if (soldier.id === 's14' && day <= 10) {
        idx = statusPools.indexOf('إ');
      }
      // s20 - on a military mission (م) from day 12 to 15
      if (soldier.id === 's20' && day >= 12 && day <= 15) {
        idx = statusPools.indexOf('م');
      }

      records.push({
        id: `att_${soldier.id}_${day}`,
        soldierId: soldier.id,
        date: dateStr,
        statusCode: statusPools[idx],
        recordedBy: 'u5',
        updatedAt: '2026-07-16T10:00:00Z'
      });
    });
  }
  return records;
};

export const initialAuditLogs: AuditLog[] = [
  {
    id: 'log1',
    userId: 'u1',
    userName: 'العميد الركن/ خالد الحربي',
    userRole: 'مدير النظام',
    actionType: 'إضافة',
    tableName: 'الوحدات',
    details: 'تم تأسيس الهيكل التنظيمي الأساسي للواء وإضافة 4 وحدات تابعة.',
    timestamp: '2026-07-15T08:30:00Z'
  },
  {
    id: 'log2',
    userId: 'u1',
    userName: 'العميد الركن/ خالد الحربي',
    userRole: 'مدير النظام',
    actionType: 'إضافة',
    tableName: 'الأفراد',
    details: 'تم إدخال بيانات القوة البشرية الأساسية (35 فرد وعسكري).',
    timestamp: '2026-07-15T09:15:00Z'
  },
  {
    id: 'log3',
    userId: 'u5',
    userName: 'الرقيب/ سلطان الشمري',
    userRole: 'كاتب بيانات',
    actionType: 'تعديل',
    tableName: 'التحضير اليومي',
    details: 'تم تسجيل كشف التحضير اليومي للكتيبة الأولى ليوم 16 يوليو.',
    timestamp: '2026-07-16T08:00:00Z'
  }
];

export const initialNotifications: Notification[] = [
  {
    id: 'n1',
    title: 'تنبيه انخفاض الجاهزية',
    message: 'انخفض معدل الحضور اليومي في سرية الدعم اللوجستي إلى 68% وهو أقل من الحد المسموح به (70%).',
    isRead: false,
    type: 'warning',
    createdAt: '2026-07-16T09:30:00-07:00'
  },
  {
    id: 'n2',
    title: 'تجاوز حد الغياب غير المبرر',
    message: 'تجاوز الجندي/ تركي حمود المطيري حد الغياب غير المبرر (3 أيام خلال الشهر الحالي).',
    isRead: false,
    type: 'error',
    createdAt: '2026-07-16T08:15:00-07:00'
  },
  {
    id: 'n3',
    title: 'تذكير يومي بالتحضير',
    message: 'يرجى استكمال كشف التحضير اليومي لجميع الوحدات الموكلة لك وإرساله قبل الساعة 12:00 ظهراً.',
    isRead: true,
    type: 'info',
    createdAt: '2026-07-16T07:00:00-07:00'
  }
];

export const initialSettings: SystemSettings = {
  warningThreshold: 70,
  dailyReminderEnabled: true,
  dailyReminderTime: '08:30',
  autoBackupEnabled: true,
  hijriSupport: true
};
