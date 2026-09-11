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
cd ~/thefinance-mag
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
npx tsc --noEmit && npm run lint
grep -c "from: '" src/features/mag/lib/redirects.ts
```

آخری باید **۱۹** بدهد. اگر عدد عوض شده، یا ریدایرکتی اضافه شده (که باید بدانی) یا چیزی گم شده.

اگر اسکریپت‌های دیگری هست:

```bash
npm run check:toc
npm run check:contrast
npm run check:invariants
```

**همه باید سبز باشند.** اگر یکی قرمز است، دیپلوی نکن.

---

## مرحله ۳ — پوش

```bash
git push
git log --oneline -1
```

اگر `rejected` داد، یعنی ریموت جلوتر است:

```bash
git pull --rebase
git log --oneline -3
git push
```

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
| سوییچ | **سه بلاک جدا، یکی‌یکی.** سه بار پیش آمد که کل بلاک یک‌جا پیست شد |

**چرا سه بلاک:** بلاک دوم کانتینر فعلی را به `-prev` تغییر نام می‌دهد. اگر با
بلاک سوم یک‌جا پیست شود و بلاک سوم شکست بخورد، هیچ کانتینری در حال اجرا نیست و
تو داری زیر فشار rollback را می‌خوانی. جدا بودنشان یعنی هر مرحله دیده می‌شود.

---

## مرحله ۸ — تأیید

```bash
sleep 30
curl -s http://127.0.0.1:3100/mag/health | python3 -m json.tool
for u in "/mag/" "/mag/archive" "/mag/news" "/mag/category/education/" "/mag/market/crypto/"; do
  printf "%-28s %s\n" "$u" "$(curl -s -o /dev/null -w '%{http_code}' -L "https://thefinance.ir$u")"
done
curl -s -o /dev/null -w 'article %{http_code}\n' -L "https://thefinance.ir/mag/how-to-buy-bitcoin-iran"
```

### چه چیزی را نگاه کن

**`buildId`** باید SHA جدید باشد. اگر نبود، ایمیج اشتباه اجرا شده.

**همه‌ی مسیرها ۲۰۰.**

**`redirectSource.reachable`** — اگر `false` بود، یک دقیقه صبر کن و دوباره. تأخیر لحظه‌ی بالا آمدن است.

**`source: "wpgraphql"`** — اگر `mock` بود، env اشتباه است.

---

## مرحله ۹ — نگاه واقعی در مرورگر

**کرل کافی نیست.** چند چیز فقط در مرورگر دیده می‌شوند.

`Ctrl+Shift+R` روی:

- صفحه‌ی اصلی
- یک مقاله‌ی معمولی — یکی از همان‌هایی که هیچ فیلد جدیدی ندارد
- و در موبایل، یا با DevTools در عرض ۳۹۰

**و اگر تغییر بصری بوده، مقاله‌ی بدون تصویر را هم ببین** — چون بیشتر آرشیو همان است.

---

## مرحله ۱۰ — اگر خراب شد

```bash
sudo docker stop thefinance-mag && sudo docker rm thefinance-mag
sudo docker rename thefinance-mag-prev thefinance-mag
sudo docker start thefinance-mag
sleep 20
curl -s http://127.0.0.1:3100/mag/health | python3 -c "import sys,json;print(json.load(sys.stdin)['buildId'])"
```

کانتینر قبلی همیشه به‌عنوان `-prev` نگه داشته می‌شود. برگشت سی ثانیه است.

---

## مرحله ۱۱ — بعد از تثبیت

**purge لازم نیست.** Next نام فایل‌های استاتیک را از محتوا هش می‌کند، پس بیلد جدید نام‌های جدید دارد. HTML هم `BYPASS` است.

**اگر کانفیگ nginx عوض شده:**

```bash
sudo cp /etc/nginx/conf.d/thefinance.ir.conf /etc/nginx/conf.d/thefinance.ir.conf.WORKING-$(date +%F-%H%M)
```

**و اگر چیزی روی CMS عوض شده** (mu-plugin، `wp-config.php`)، آن هم باید در گیت ثبت شود:

```bash
# روی CMS
sudo docker exec wp-wordpress-1 cat /var/www/html/wp-content/mu-plugins/tf-admin-host.php > ~/tf-admin-host.php

# روی مک
scp -i ~/.ssh/sotoon-ilya compute@87.247.170.20:~/tf-admin-host.php ~/thefinance-mag/wordpress/mu-plugins/
git diff --stat
```

**`wp-config.php` کامیت نمی‌شود** — سکرت دارد. تغییراتش باید در `docs/` ثبت شوند.

---

## چک‌لیست فشرده

```
□ گزارش را خواندم — چه چیزی نساخت؟ چک‌ها علیه چه چیزی؟
□ git merge --no-edit
□ tsc + lint + سایر چک‌ها سبز
□ git push
□ بیلد روی مک با --platform linux/amd64
□ معماری amd64 تأیید شد
□ rsync به سرور
□ سه بلاک جدا: load / stop+rename / run
□ health: buildId درست، همه ۲۰۰
□ مرورگر واقعی، شامل موبایل و مقاله‌ی بدون تصویر
□ اگر nginx عوض شد: نسخه‌ی WORKING
□ اگر CMS عوض شد: کپی به گیت
```

---

## و سه اشتباهی که تکرار شدند

**بیلد از کامیت اشتباه.** همیشه `git log --oneline -1` بعد از pull، و `buildId` را در health چک کن.

**پیست کردن بلاک کامل شامل rollback.** بلاک‌ها جدا.

**خاموش کردن چیزی بدون `grep`.** قبل از هر `docker stop`:

```bash
sudo grep -rn "<port>" /etc/nginx/
```
