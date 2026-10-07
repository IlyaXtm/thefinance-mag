# بعد از اینکه Claude Code کد را زد — چه کار کنم

چک‌لیست عملی. از لحظه‌ای که گزارش می‌آید تا وقتی تغییر روی پروداکشن است و تأیید شده.

> **کامندهای بیلد و دیپلوی اینجا تکرار نشده‌اند.** مرجعشان
> `docs/infra/frontend-deploy.md` است و فقط همان‌جا به‌روز می‌شود. این سند
> *ترتیب کار* را می‌گوید — چه وقت، با چه معیاری، و اگر خراب شد چه.
> دو نسخه از یک کامند ظرف یک ماه با هم اختلاف پیدا می‌کنند و آن‌وقت هیچ‌کدام
> قابل اعتماد نیست.

---

## مرحله ۰ — گزارش را بخوان، نه فقط اسکن کن

قبل از هر کامندی، سه سؤال از گزارش بپرس:

**چه چیزی را عمداً نساخت و چرا؟**
اگر این بخش نیست، بپرس. خودداری معمولاً ارزشش از فیچر بیشتر است.

**چک‌ها علیه چه چیزی اجرا شدند؟**
داده‌ی واقعی یا فیکسچر؟ اگر فیکسچر، چک فقط می‌گوید کد با انتظار خودش می‌خواند.

**چیزی هست که خودش پیدا کرد و تو نخواسته بودی؟**
در این پروژه چند بار باگ‌های واقعی این‌طور پیدا شدند — `<cite>` ایتالیک، جدول‌هایی که عرضشان را از دست داده بودند.

---

## مرحله ۱ — مرج و بررسی

```bash
cd ~/New-Projects/thefinance-mag
git checkout claude-main && git fetch --all --prune
git log --oneline -1
```

اگر روی برنچ دیگری کار کرده:

```bash
git log --oneline claude-main..origin/<branch>
```

اگر کامیت داشت:

```bash
git merge origin/<branch> --no-edit
git log --oneline -3
```

`--no-edit` مهم است — بدون آن vim باز می‌شود و امروز چند بار گیر افتادیم.

**اگر تعارض داد:**

```bash
git status --short | grep "^UU"
git diff --diff-filter=U
```

دیف را بخوان و تصمیم بگیر کدام سمت درست است. کورکورانه `--theirs` یا `--ours` نزن.

---

## مرحله ۲ — گیت‌ها

```bash
npx tsc --noEmit && npm run lint && npm test
grep -c "from: '" src/features/mag/lib/redirects.ts
```

`npm test` تست‌های رفتاری منطق `lib` است (انتخاب مطالب صفحه‌ی اصلی، «امروز»،
ریدایرکت‌های `/market`، قاب تصویر کارت‌ها). آخری باید **۲۲** بدهد (۱۵ مهر ۱۴۰۵).
اگر عدد عوض شده، یا ریدایرکتی اضافه شده (که باید بدانی) یا چیزی گم شده.

اگر اسکریپت‌های دیگری هست:

```bash
npm run check:toc
npm run check:contrast
```

`check:invariants` به یک سرور در حال اجرا و `CHROMIUM_PATH` نیاز دارد — روی
ایمیج اجراشده‌ی محلی؛ طرز اجرا در `server-structure-code.md` بخش ۶.

**همه باید سبز باشند.** اگر یکی قرمز است، دیپلوی نکن.

---

## مرحله ۳ — خط پایه‌ی ریدایرکت‌ها، قبل از هر چیز

```bash
scripts/verify-redirects.sh https://thefinance.ir > /tmp/redirects-before.txt; tail -1 /tmp/redirects-before.txt
```

باید `PASS` باشد. اگر نیست، یک بار دیگر اجرا کن (خروجی `000` یعنی قطعی لحظه‌ای
شبکه). اگر باز هم نیست، **دیپلوی نکن** — پروداکشن همین الان مشکل دارد و
دیپلوی تو آن را پنهان می‌کند.

**push اینجا نیست.** از مهر ۱۴۰۵ فقط بعد از این‌که پروداکشن تأیید شد push
می‌کنیم (مرحله‌ی ۱۱). کدی که روی `claude-main` است باید همان باشد که سالم روی
سایت است.

---

## مرحله ۴ تا ۷ — بیلد، تأیید ایمیج، انتقال، سوییچ

**کامندها در `docs/infra/frontend-deploy.md` → Deploy هستند.** آنجا هم دلیل هر
کدام نوشته شده: چرا `--platform linux/amd64` اجباری است، چرا `rsync` و نه `scp`،
و چرا ایمیج قبل از انتقال باید باز و نگاه شود.

آنچه در *این* سند مهم است، معیار عبور از هر مرحله است:

| مرحله | تا وقتی این درست نشده، جلو نرو |
|---|---|
| بیلد | بیلد بدون خطا تمام شود و `tsc` و `lint` قبلش سبز باشند |
| تأیید ایمیج | معماری `amd64` باشد، و تغییر مشخص آن دور واقعاً داخل ایمیج دیده شود |
| انتقال | فایل کامل رسیده باشد — `rsync` قطع‌شده را از سر می‌گیرد، پس دوباره بزن |
| سوییچ | `sudo ~/deploy.sh <SHA>` با `healthy: buildId=<SHA>, source=wpgraphql` تمام شود |

**بیلد همیشه از یک کپی تمیز** (`git worktree`) از همان SHA، تا هیچ تغییر
کامیت‌نشده‌ای داخل ایمیج نرود.

**سوییچ یک اسکریپت است، نه سه بلاک پیست‌شده.** قبلاً سه بلاک جدا بود چون سه بار
کل بلاک (با rollback) یک‌جا پیست شد. از ۱۳ مهر `infra/mag/deploy.sh` همین سه کار
را با ترتیب درست می‌کند، و اگر ظرف ۹۰ ثانیه `/mag/health` همان SHA را نگفت،
خودش نسخه‌ی قبل را برمی‌گرداند. روی سرور مشترک `thefinance-main` فقط همین
اسکریپت را اجرا کن — نه nginx، نه کانتینر دیگر، نه `docker build`.

---

## مرحله ۸ — تأیید

از لپ‌تاپ (از بیرون، از مسیر CDN — همان راهی که خواننده می‌آید):

```bash
curl -s https://thefinance.ir/mag/health | python3 -m json.tool
for u in "/" "/mag/" "/mag/archive" "/mag/news" "/mag/category/education/" "/mag/category/education/crypto"; do
  printf "%-34s %s\n" "$u" "$(curl -s -o /dev/null -w '%{http_code}' -L "https://thefinance.ir$u")"
done
curl -s -o /dev/null -w 'article %{http_code}\n' -L "https://thefinance.ir/mag/how-to-buy-bitcoin-iran"
scripts/verify-redirects.sh https://thefinance.ir > /tmp/redirects-after.txt
diff /tmp/redirects-before.txt /tmp/redirects-after.txt && echo NO_DIFF
```

`/` سایت اصلی است: سرور مشترک است، پس آن را هم چک کن.

### چه چیزی را نگاه کن

**`buildId`** باید SHA جدید باشد. اگر نبود، ایمیج اشتباه اجرا شده.

**همه‌ی مسیرها ۲۰۰.**

**`redirectSource.reachable`** — اگر `false` بود، یک دقیقه صبر کن و دوباره. تأخیر لحظه‌ی بالا آمدن است.

**`source: "wpgraphql"`** — اگر `mock` بود، env اشتباه است.

**`archiveOverflowed: false`** — اگر `true` بود، سایت همه‌ی مطالب را نمی‌خواند و
شمارش‌ها، sitemap و ۴۰۴ها ناقص‌اند (باگ ۴ در `server-structure-code.md`).

**`NO_DIFF`** — ریدایرکت‌ها دقیقاً مثل قبل از دیپلوی.

---

## مرحله ۹ — نگاه واقعی در مرورگر

**کرل کافی نیست.** چند چیز فقط در مرورگر دیده می‌شوند.

`Ctrl+Shift+R` روی:

- صفحه‌ی اصلی
- یک مقاله‌ی معمولی — یکی از همان‌هایی که هیچ فیلد جدیدی ندارد
- و در موبایل، یا با DevTools در عرض ۳۹۰
- **در هر دو تم.** پیش‌فرض سایت تیره است؛ تیم معمولاً روشن را می‌بیند (دکمه‌ی ماه/خورشید)

**و اگر تغییر بصری بوده، مقاله‌ی بدون تصویر را هم ببین** — چون بیشتر آرشیو همان است.

**به نوشته‌ی داخل عکس‌ها نگاه کن.** بیشتر تصویرهای شاخص تیتر را داخل خودشان
دارند؛ قابی که عکس را ببُرد، تیتر را می‌بُرد (۱۵ مهر: کارت‌های خبر).

---

## مرحله ۱۰ — اگر خراب شد

```bash
ssh thefinance-main 'sudo ~/deploy.sh --rollback'
curl -s https://thefinance.ir/mag/health | python3 -c "import sys,json;print(json.load(sys.stdin)['buildId'])"
```

کانتینر قبلی همیشه به‌عنوان `-prev` نگه داشته می‌شود. برگشت سی ثانیه است.
فقط یک نسخه عقب‌تر نگه داشته می‌شود.

---

## مرحله ۱۱ — بعد از تثبیت: push

حالا که پروداکشن تأیید شد:

```bash
git push origin claude-main
git log --oneline origin/claude-main -1
```

اگر `rejected` داد، یعنی ریموت جلوتر است: `git pull --rebase`، دوباره گیت‌ها، بعد push.

**purge لازم نیست.** Next نام فایل‌های استاتیک را از محتوا هش می‌کند، پس بیلد جدید نام‌های جدید دارد. HTML هم `BYPASS` است.

**nginx مال ما نیست.** روی `thefinance-main` کانفیگ nginx دست تیم سایت اصلی است.
اگر تغییری لازم است، یادداشت بنویس (مثل `docs/infra/nginx-mag-redirect-note.md`)
و به آن‌ها بده؛ خودت ویرایش یا reload نکن.

**و اگر چیزی روی CMS عوض شده** (mu-plugin، `wp-config.php`)، آن هم باید در گیت ثبت شود:

```bash
# روی CMS
sudo docker exec wp-wordpress-1 cat /var/www/html/wp-content/mu-plugins/tf-admin-host.php > ~/tf-admin-host.php

# روی مک
scp -i ~/.ssh/sotoon-ilya compute@87.247.170.20:~/tf-admin-host.php ~/New-Projects/thefinance-mag/wordpress/mu-plugins/
git diff --stat
```

**`wp-config.php` کامیت نمی‌شود** — سکرت دارد. تغییراتش باید در `docs/` ثبت شوند.

---

## چک‌لیست فشرده

```
□ گزارش را خواندم — چه چیزی نساخت؟ چک‌ها علیه چه چیزی؟
□ git merge --no-edit
□ tsc + lint + npm test + سایر چک‌ها سبز
□ verify-redirects روی پروداکشن: PASS (خط پایه)
□ بیلد روی مک از worktree تمیز، با --platform linux/amd64
□ معماری amd64 تأیید شد
□ rsync ایمیج و deploy.sh به thefinance-main
□ sudo ~/deploy.sh <SHA> → healthy
□ health از بیرون: buildId، wpgraphql، archiveOverflowed: false
□ همه ۲۰۰ (سایت اصلی هم) + verify-redirects بدون تفاوت
□ مرورگر واقعی: موبایل، دو تم، مقاله‌ی بدون تصویر، نوشته‌ی داخل عکس‌ها
□ git push
□ اگر CMS عوض شد: کپی به گیت
```

---

## و سه اشتباهی که تکرار شدند

**بیلد از کامیت اشتباه.** همیشه `git log --oneline -1` بعد از pull، و `buildId` را در health چک کن.

**پیست کردن بلاک کامل شامل rollback.** حالا `deploy.sh` است؛ دیگر چیزی پیست نکن.

**خاموش کردن چیزی بدون `grep`.** قبل از هر `docker stop`:

```bash
sudo grep -rn "<port>" /etc/nginx/
```
