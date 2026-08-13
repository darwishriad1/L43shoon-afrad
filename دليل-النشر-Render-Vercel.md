# دليل نشر تطبيق L43shoon-afrad على Render وVercel

## القرار الموصى به

الخيار الأنسب لهذا المشروع هو **Render Web Service مع Render PostgreSQL**؛ لأن التطبيق عبارة عن React/Vite في الواجهة وخادم Express واحد يشغّل الواجهة ومسارات `/api` معًا. توثيق Render يوضح أن نشر تطبيق Express يتم عبر Web Service مع أمر بناء وأمر تشغيل، بينما الخطة المجانية مناسبة للتجربة وليست للإنتاج بسبب الإيقاف بعد الخمول وقيود قاعدة البيانات. [1] [2]

أما Vercel فهو ممكن، لكنه يحوّل Express إلى Vercel Function واحدة، ولا يخدم الملفات التي يرسلها `express.static()` بالطريقة التقليدية؛ لذلك يحتاج المشروع إلى إعادة تنظيم نقطة الدخول والملفات الثابتة. [3] [4]

## النشر على Render

### 1. رفع المشروع إلى GitHub

إذا كان المشروع موجودًا في مستودع GitHub، استخدم المستودع مباشرة. إذا كانت لديك النسخة المعدلة محليًا، نفّذ:

```bash
git add .
git commit -m "Prepare deployment"
git push origin main
```

لا ترفع ملف `.env` أو أي مفاتيح سرية إلى GitHub.

### 2. إنشاء قاعدة PostgreSQL

افتح [Render Dashboard](https://dashboard.render.com)، ثم اختر **New → PostgreSQL**. اختر المنطقة نفسها التي ستستخدمها لخدمة الويب، واختر Free للتجربة فقط. قاعدة Render المجانية محدودة بسعة 1GB وتنتهي بعد 30 يومًا ولا توفر نسخًا احتياطية مُدارة، لذلك لا تستخدمها لبيانات عسكرية حقيقية طويلة الأمد. [2]

بعد الإنشاء، افتح صفحة قاعدة البيانات وانسخ بيانات الاتصال. المشروع الحالي يستخدم هذه المتغيرات المنفصلة:

```text
SQL_HOST
SQL_DB_NAME
SQL_USER
SQL_PASSWORD
```

استخدم قيم قاعدة Render الداخلية، وليس رابطًا عامًا إن كان هناك خيار اتصال داخلي. اترك `SQL_ADMIN_USER` و`SQL_ADMIN_PASSWORD` مضبوطين على حساب يملك صلاحيات إنشاء الجداول أو تشغيل seed إذا كان التشغيل يحتاج ذلك.

### 3. إنشاء Web Service

من Render اختر **New → Web Service**، ثم اربط مستودع GitHub. استخدم الإعدادات التالية:

| الحقل | القيمة |
|---|---|
| Runtime | Node |
| Build Command | `npm ci && npm run build` |
| Start Command | `npm start` |
| Instance Type | Free للتجربة فقط |
| Auto Deploy | فعّله من الفرع `main` |

Render يذكر أن أوامر البناء والتشغيل يمكن أن تكون أوامر npm الخاصة بالمشروع، وأن كل push للفرع المرتبط يطلق نشرًا جديدًا تلقائيًا. [1]

### 4. إضافة متغيرات البيئة

من Web Service افتح **Environment → Add Environment Variable** وأضف:

```text
NODE_ENV=production
PORT=10000
LOCAL_SESSION_SECRET=<قيمة عشوائية طويلة لا تقل عن 32 حرفًا>
SQL_HOST=<عنوان PostgreSQL الداخلي>
SQL_DB_NAME=<اسم قاعدة البيانات>
SQL_USER=<مستخدم قاعدة البيانات>
SQL_PASSWORD=<كلمة مرور قاعدة البيانات>
SQL_ADMIN_USER=<مستخدم الإدارة عند الحاجة>
SQL_ADMIN_PASSWORD=<كلمة مرور الإدارة عند الحاجة>
```

لا تضبط `PORT` على قيمة ثابتة داخل الكود؛ النسخة الحالية تقرأ `process.env.PORT`، وRender يمرر المنفذ المطلوب للخدمة.

### 5. ضبط Firebase

في [Firebase Console](https://console.firebase.google.com/) افتح المشروع `psyched-plexus-9x6pd`، ثم انتقل إلى **Authentication → Settings → Authorized domains**. أضف نطاق Render الذي سيظهر مثل:

```text
l43shoon-afrad.onrender.com
```

أضف أيضًا `localhost` و`127.0.0.1` للتطوير المحلي. بعد ذلك افتح **Authentication → Sign-in method**، فعّل مزود **Google**، واختر بريد دعم المشروع، ثم احفظ.

لا تضف `https://` ولا أي مسار إلى Authorized domains؛ أضف اسم المضيف فقط. إذا أضفت نطاقًا مخصصًا لاحقًا، أضف مثلًا `app.example.com`.

### 6. التحقق بعد النشر

بعد اكتمال النشر، افتح رابط Render نفسه، وليس ملف `dist/index.html`. اختبر ما يلي:

```bash
curl -i https://YOUR-SERVICE.onrender.com/
curl -i https://YOUR-SERVICE.onrender.com/api/users
```

يجب أن يعيد الطلب الأول `200`. يجب أن يعيد الطلب الثاني `401` عند عدم إرسال رمز دخول؛ وهذا يدل على أن الخادم يعمل وأن حماية API مفعلة. أول طلب بعد فترة خمول قد يتأخر نحو دقيقة على الخطة المجانية بسبب إيقاف الخدمة مؤقتًا. [2]

## النشر على Vercel

Vercel يدعم Express، لكنه يشغله كـVercel Function. توصي وثائق Vercel بتصدير تطبيق Express من ملف دخول مثل `src/index.ts` أو `api/index.ts`، وتوضح أن `express.static()` لن يخدم الأصول بالطريقة التقليدية؛ يجب وضع الملفات الثابتة في `public` أو إعادة هيكلة التطبيق. [3] [4]

لذلك لا تستخدم إعداد Render نفسه على Vercel مباشرة. ستحتاج إلى فصل الواجهة عن API، أو إنشاء نقطة دخول Vercel مخصصة، مثل:

```text
api/index.ts
public/
src/
vercel.json
```

وستحتاج إلى تعديل الخادم حتى يصدّر `app` بدل أن يبدأ `app.listen()` بالطريقة التقليدية، ثم ضبط إعادة كتابة مسارات `/api` وربط الواجهة بمسار API. كما يجب استخدام قاعدة PostgreSQL خارجية مناسبة للبيئة serverless أو اتصال مجمّع، لأن كل Function قد تفتح اتصالات قاعدة بيانات متعددة مع زيادة الطلبات. [4]

للتطبيق الحالي، استخدام Vercel يعني عمل تعديل معماري إضافي واختبار منفصل للمصادقة وملفات PDF/Excel والتحميلات. لذلك ابدأ بـRender، ثم انقل إلى Vercel إذا كان لديك سبب واضح مثل الحاجة إلى CDN أو بنية serverless.

## أخطاء شائعة

إذا ظهرت رسالة **خطأ الاتصال في السيرفر**، فتأكد من أنك فتحت رابط Render أو شغلت `npm run dev`، وأن متغيرات PostgreSQL موجودة وصحيحة. لا تفتح `dist/index.html` مباشرة من مدير الملفات، لأن ذلك يشغّل الواجهة دون خادم `/api`.

إذا ظهرت رسالة Firebase `auth/unauthorized-domain`، فأضف النطاق الحالي إلى **Firebase Authentication → Settings → Authorized domains**، ثم أعد تحميل التطبيق. إذا ظهرت `auth/operation-not-allowed`، فعّل Google من **Sign-in method**.

إذا ظهرت صفحة بطيئة أول مرة على Render، فهذا غالبًا بسبب sleep في الخطة المجانية وليس عطلًا في التطبيق. إذا اختفت البيانات بعد إعادة التشغيل، فراجع أنك تستخدم PostgreSQL وليس تخزين ملفات محليًا؛ نظام ملفات Render مؤقت، والبيانات طويلة الأمد يجب أن تكون في PostgreSQL أو تخزين خارجي. [2]

## مراجع

[1]: https://render.com/docs/deploy-node-express-app "Render: Deploy a Node Express App"

[2]: https://render.com/docs/free "Render: Deploy for Free"

[3]: https://vercel.com/docs/frameworks/backend/express "Vercel: Express on Vercel"

[4]: https://vercel.com/kb/guide/using-express-with-vercel "Vercel: Using Express.js with Vercel"
