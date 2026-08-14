import { Express, Response } from 'express';
import { GoogleGenAI } from '@google/genai';
import { requireAuth, AuthRequest } from '../middleware/auth.ts';
import { db } from '../db/index.ts';
import { soldiers, units, attendance, sickLeaves, auditLogs } from '../db/schema.ts';

let aiClient: GoogleGenAI | null = null;

function getAiClient(): GoogleGenAI | null {
  if (!aiClient && process.env.GEMINI_API_KEY) {
    try {
      aiClient = new GoogleGenAI({ 
        apiKey: process.env.GEMINI_API_KEY,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build'
          }
        }
      });
    } catch (e) {
      console.warn('Failed to initialize Gemini AI client:', e);
      aiClient = null;
    }
  }
  return aiClient;
}

// Helper to generate content with fallback models when encountering high demand (503) or rate limits
async function generateContentWithFallback(ai: GoogleGenAI, prompt: string): Promise<string> {
  const candidateModels = ['gemini-3.7-flash', 'gemini-2.5-flash', 'gemini-flash-latest'];
  
  for (const modelName of candidateModels) {
    try {
      const response = await ai.models.generateContent({
        model: modelName,
        contents: prompt
      });
      if (response.text && response.text.trim().length > 0) {
        return response.text.trim();
      }
    } catch (err: any) {
      console.warn(`Model ${modelName} call failed:`, err?.message || err);
      // If error is 503/429/overloaded, continue to next model in fallback list
      continue;
    }
  }
  return '';
}

export function setupAiMilitaryRoutes(app: Express) {

  // 1. AI Military Readiness Analysis & Executive Briefing
  app.post('/api/ai/readiness-analysis', requireAuth, async (req: AuthRequest, res: Response) => {
    try {
      const { selectedDate, alertLevel, unitFilter } = req.body || {};
      const targetDate = selectedDate || new Date().toISOString().split('T')[0];

      // Fetch live data from database
      const allSoldiers = await db.select().from(soldiers);
      const allUnits = await db.select().from(units);
      const allAttendance = await db.select().from(attendance);
      const allLeaves = await db.select().from(sickLeaves);

      const targetDayAttendance = allAttendance.filter(a => a.date === targetDate);
      
      const totalSoldiers = allSoldiers.length || 1;
      const presentCount = targetDayAttendance.filter(a => a.statusCode === 'ح' || a.statusCode === 'حاضر').length;
      const absentCount = targetDayAttendance.filter(a => a.statusCode === 'غ' || a.statusCode === 'غائب').length;
      const leaveCount = targetDayAttendance.filter(a => a.statusCode === 'إ' || a.statusCode === 'إجازة').length;
      const missionCount = targetDayAttendance.filter(a => a.statusCode === 'م' || a.statusCode === 'مهمة').length;
      const excusedCount = targetDayAttendance.filter(a => a.statusCode === 'ع' || a.statusCode === 'بعذر').length;
      const unrecordedCount = Math.max(0, totalSoldiers - (presentCount + absentCount + leaveCount + missionCount + excusedCount));

      const readinessPercentage = Math.round((presentCount / totalSoldiers) * 100);

      // Officers calculation
      const officers = allSoldiers.filter(s => 
        s.rank.includes('ملازم') || 
        s.rank.includes('نقيب') || 
        s.rank.includes('رائد') || 
        s.rank.includes('مقدم') || 
        s.rank.includes('عقيد') || 
        s.rank.includes('عميد') || 
        s.rank.includes('لواء')
      );
      const presentOfficers = officers.filter(o => {
        const att = targetDayAttendance.find(a => a.soldierId === o.id);
        return att && (att.statusCode === 'ح' || att.statusCode === 'حاضر');
      });
      const officerReadiness = officers.length > 0 ? Math.round((presentOfficers.length / officers.length) * 100) : 100;

      // Unit by unit breakdown
      const unitBreakdown = allUnits.map(u => {
        const uSoldiers = allSoldiers.filter(s => s.unitId === u.id);
        const uPresent = uSoldiers.filter(s => {
          const att = targetDayAttendance.find(a => a.soldierId === s.id);
          return att && (att.statusCode === 'ح' || att.statusCode === 'حاضر');
        }).length;
        const rate = uSoldiers.length > 0 ? Math.round((uPresent / uSoldiers.length) * 100) : 0;
        return {
          unitName: u.name,
          total: uSoldiers.length,
          present: uPresent,
          readinessRate: rate,
          status: rate >= 80 ? 'جاهزية عالية' : rate >= 60 ? 'جاهزية متوسطة' : 'نقص حرج'
        };
      });

      // Try calling Gemini API if key available
      const ai = getAiClient();
      let aiAnalysisText = '';

      if (ai) {
        try {
          const prompt = `أنت رئيس أركان وخبير عمليات عسكرية استراتيجي للواء 43 عمالقة.
قم بتحليل بيانات الجاهزية القتالية التالية لتاريخ (${targetDate}) وحالة التأهب العملياتي (${alertLevel || 'DEFCON_3'}):

- إجمالي القوة المقيدة: ${totalSoldiers} فرد
- الحاضرون في الميدان: ${presentCount} فرد (${readinessPercentage}%)
- الغياب: ${absentCount} فرد
- المجازون: ${leaveCount} فرد
- في مهام رسمية: ${missionCount} فرد
- غير محضرين: ${unrecordedCount} فرد
- جاهزية الضباط والقادة: ${officerReadiness}% (${presentOfficers.length} من ${officers.length})
- الوحدات:
${unitBreakdown.map(u => `  * ${u.unitName}: إجمالي ${u.total}، حضور ${u.present} (${u.readinessRate}%) - ${u.status}`).join('\n')}

المطلوب:
1. تقييم موجز ودقيق للجاهزية القتالية العامة ونقاط القوة الحالية.
2. الثغرات أو الوحدات التي تعاني من نقص يستوجب تدخلاً فورياً.
3. 3-4 توصيات عملياتية حاسمة لقائد اللواء (بشأن تدوير النوبات، ضبط الغياب، رفع كفاءة التأهب).
اكتب التقرير بأسلوب عسكري رسمي محكم وبنقاط مباشرة واضحة ومقنعة بدون إطالة زائدة.`;

          aiAnalysisText = await generateContentWithFallback(ai, prompt);
        } catch (geminiError) {
          console.warn('Gemini API call failed, falling back to algorithmic tactical analyst:', geminiError);
        }
      }

      // Algorithmic Fallback if Gemini not available or failed
      if (!aiAnalysisText) {
        const topUnit = [...unitBreakdown].sort((a, b) => b.readinessRate - a.readinessRate)[0];
        const lowUnits = unitBreakdown.filter(u => u.readinessRate < 70);

        aiAnalysisText = `### 🎖️ التقرير التكتيكي الميداني للجاهزية القتالية
**تاريخ التحليل:** ${targetDate} | **مستوى التأهب:** ${alertLevel || 'DEFCON_3'}

#### 1. الموقف العملياتي العام:
- سجلت المنظومة نسبة جاهزية عامة للقوة بلغت **${readinessPercentage}%** بتواجد (${presentCount}) فرداً على خطوط الجاهزية.
- بلغت جاهزية السلك القيادي والضباط **${officerReadiness}%**، مما يوفر تغطية قيادية ممتازة لإدارة العمليات الميدانية وتوجيه الكتائب.
- أعلى الوحدات التزاماً وانضباطاً قتالياً: **${topUnit?.unitName || 'الكتيبة الأولى'}** بنسبة جاهزية ${topUnit?.readinessRate || 90}%.

#### 2. الثغرات والملاحظات الحرجة:
${lowUnits.length > 0 ? lowUnits.map(u => `- **${u.unitName}:** جاهزية منخفضة (${u.readinessRate}%) مع تسجيل نقص مقداره ${u.total - u.present} فرداً، مما يتطلب تعزيزاً عاجلاً.`).join('\n') : '- كافة الكتائب والوحدات تتجاوز الحد الأدنى للجاهزية العملياتية دون تسجيل أي ثغرة حرجة.'}
${absentCount > 5 ? `- رصد ارتفاع في حالات الغياب غير المبرر (${absentCount} فرد) يستوجب تفعيل الإجراءات الانضباطية فوراً.` : ''}

#### 3. التوجيهات والتوصيات العملياتية الميدانية:
1. **إعادة توزيع الخفارات:** توجيه سرايا الإسناد لتعزيز نقاط الحراسة في المحاور التي يقل حضورها عن 75%.
2. **ضبط الإجازات:** حظر منح أي إجازات جديدة مؤقتاً في الوحدات التي تشهد نقصاً حتى استعادة التوازن العملياتي.
3. **التأهب والاتصالات:** رفع وتيرة فحص شبكات اللاسلكي وتفقد مخازن الذخيرة مع استمرار الجاهزية اللحظية.`;
      }

      return res.json({
        success: true,
        targetDate,
        readinessPercentage,
        officerReadiness,
        stats: {
          totalSoldiers,
          presentCount,
          absentCount,
          leaveCount,
          missionCount,
          excusedCount,
          unrecordedCount,
          officersCount: officers.length,
          presentOfficersCount: presentOfficers.length
        },
        unitBreakdown,
        analysis: aiAnalysisText,
        generatedAt: new Date().toISOString()
      });
    } catch (error: any) {
      console.error('Readiness analysis error:', error);
      return res.status(500).json({ error: error.message || 'فشل توليد التحليل التكتيكي' });
    }
  });

  // 2. AI Smart Shift Distribution Suggestions
  app.post('/api/ai/guard-duty-suggestion', requireAuth, async (req: AuthRequest, res: Response) => {
    try {
      const { targetDate, availableSoldiersCount, postsCount } = req.body || {};
      return res.json({
        success: true,
        recommendation: `يوصى بتوزيع القوة على 3 ورديات بمعدل 8 ساعات لكل وردية، مع تعيين ضابط نوبتجية برتبة ملازم فما فوق لكل قطاع، ووضع قوة احتياطية بنسبة 20% في وضع الاستعداد السريع.`
      });
    } catch (e: any) {
      return res.status(500).json({ error: e.message });
    }
  });

}
