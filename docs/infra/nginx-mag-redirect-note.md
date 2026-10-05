# یادداشت برای تیم سایت اصلی — ریدایرکت `/mag` به http

**تاریخ:** ۱۳ مهر ۱۴۰۵ (2026-10-05) · **سرور:** `thefinance-main` · **فایل:** `/etc/nginx/sites-enabled/thefinance.ir`

> برای کسی است که nginx سرور اصلی را نگه می‌دارد. تیم مجله به این فایل دست
> نمی‌زند — فقط مشکل را گزارش می‌کند.

## مشکل در یک خط

`https://thefinance.ir/mag` (بدون اسلش آخر) با **۳۰۱ به `http://`** می‌رود،
بعد CDN دوباره به https برش می‌گرداند — دو پرش، با یک پایین‌آمدن به http وسطش.

## بازتولید

```bash
curl -sI https://thefinance.ir/mag | grep -i -E "^HTTP|^location|x-zrk-us"
#   HTTP/2 301
#   location: http://thefinance.ir/mag/        ← http، نه https
#   x-zrk-us: 301                              ← از خود سرور، نه CDN
curl -sI http://thefinance.ir/mag/ | grep -i -E "^HTTP|^location"
#   301 → https://thefinance.ir/mag/           ← این یکی از CDN
```

## چرا مهم است (بیشتر از ظاهرش)

**آدرس canonical صفحه‌ی اصلی مجله دقیقاً `https://thefinance.ir/mag` است** —
همان آدرسی که این زنجیره از آن شروع می‌شود. canonical باید به صفحه‌ای اشاره
کند که مستقیم ۲۰۰ می‌دهد؛ اینجا گوگل به آدرسی فرستاده می‌شود که دو بار
ریدایرکت می‌شود و یک بار از https پایین می‌آید.

## علت

رفتار استاندارد nginx: وقتی بلاکی مثل `location /mag/` با `proxy_pass` هست،
درخواست `/mag` (بدون اسلش) را خود nginx به `/mag/` ریدایرکت می‌کند. چون TLS
در CDN تمام می‌شود و nginx فقط http می‌بیند، آدرس ریدایرکت را با `http://`
می‌سازد.

## پیشنهاد اصلاح — یک بلاک

`/mag` را مستقیم به اپ مجله بدهید تا اصلاً ریدایرکتی ساخته نشود. اپ مجله
(Next.js با `basePath: '/mag'`) خودش `/mag` را با ۲۰۰ جواب می‌دهد:

```nginx
location = /mag {
    proxy_pass http://127.0.0.1:3100;   # بدون اسلش آخر، مثل بلاک /mag/
    # همان proxy_set_header هایی که در location /mag/ هست را اینجا هم بگذارید
    # (Host، X-Real-IP، X-Forwarded-For، X-Forwarded-Proto)
}
```

بعد:

```bash
sudo cp /etc/nginx/sites-enabled/thefinance.ir /etc/nginx/backups/thefinance.ir.pre-mag-exact
sudo nginx -t && sudo systemctl reload nginx
curl -sI https://thefinance.ir/mag | head -1     # باید ۲۰۰ باشد، نه ۳۰۱
```

**جایگزین کوچک‌تر**، اگر ترجیح می‌دهید ریدایرکت بماند ولی درست شود:
`absolute_redirect off;` در بلاک `server`. آن‌وقت ریدایرکت نسبی می‌شود و روی
https می‌ماند — ولی هنوز یک پرش است و canonical هنوز به آدرسی که ریدایرکت
می‌شود اشاره می‌کند. اصلاح اول بهتر است.

## برگشت

`cp` نسخه‌ی پشتیبان بالا و `nginx -t && systemctl reload nginx`.
