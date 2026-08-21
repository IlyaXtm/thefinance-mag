# nginx configs

| File | Deploy to | Host |
|---|---|---|
| `ratelimit.conf` | `/etc/nginx/conf.d/` | CMS VPS |
| `wp.thefinance.ir.conf` | `/etc/nginx/sites-available/`, symlink into `sites-enabled/` | CMS VPS |

TLS is issued by certbot:

```bash
certbot --nginx -d wp.thefinance.ir --agree-tos -m <email> --no-eff-email
```

After any change:

```bash
nginx -t && systemctl reload nginx
curl -sI https://wp.thefinance.ir/mag/ | grep -i x-robots   # noindex, nofollow
```

## Not yet written

The public-side config for `thefinance.ir` lives on the frontend server and is
not in this repo. Two things will need to change there at cutover:

1. `location /mag` switches upstream from WordPress to the Next.js app. That
   one line is the entire cutover, and swapping it back is the entire rollback.
2. `location /wp-content/uploads/` proxies to the CMS host and MUST strip the
   upstream noindex header, or images served from the public origin inherit it
   and drop out of Google Images:

   ```nginx
   location /wp-content/uploads/ {
       proxy_pass https://wp.thefinance.ir;
       proxy_set_header Host wp.thefinance.ir;
       proxy_hide_header X-Robots-Tag;   # required
       proxy_cache_valid 200 30d;
       expires 30d;
   }
   ```

---

## Frontend server

`thefinance.ir.conf` and `new.thefinance.ir.conf` were added when Mag needed a
staging host. They had previously never been in a repository — the frontend
nginx lived only on the server, so the cutover depended on a file nobody could
review.

- **`thefinance.ir.conf`** — production. `/mag` still proxies to WordPress. The
  cutover is one line: the port in `set $mag_upstream`. Rollback is the same
  line back, plus a reload.
- **`new.thefinance.ir.conf`** — staging, on port 3100. The whole host is
  `noindex, nofollow` and serves nothing but `/mag`.

Both set `X-Real-IP` from `$remote_addr`. That is load-bearing, not
boilerplate: the comment endpoint's rate limit keys on it, because
`X-Forwarded-For` is built with `$proxy_add_x_forwarded_for` and therefore
begins with whatever the client sent. Remove it and the limit is bypassable
with one header.

Before deploying, diff against what is live — the server's copy may carry rules
for the other apps that these files do not know about.

Runbook: `docs/infra/frontend-deploy.md`.
