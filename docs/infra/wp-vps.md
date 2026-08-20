# WordPress VPS — Provisioning & Configuration

**Host:** `wp.thefinance.ir` · **Role:** CMS only, never a public reading surface
**Related:** `seo-safety-protocol.md`, `CLAUDE.md`, `mag-build-plan.md`

---

## Sizing

Start small. Headless WordPress carries no public read traffic — only editors and ISR revalidation queries.

| Resource | Start | Scale when |
|---|---|---|
| vCPU | 2 | Editor saves feel slow, or revalidation queues |
| RAM | 4 GB | PHP-FPM starts swapping (watch `free -m`) |
| Disk | 2 × current `uploads` + 20 GB | Media library grows; check monthly |

RAM matters more than CPU here. MySQL and PHP-FPM are memory-bound; the workload is not compute-heavy.

Measure before buying:

```bash
docker compose exec wordpress wp db size --allow-root --human-readable
docker compose exec wordpress du -sh /var/www/html/wp-content/uploads
docker compose exec wordpress wp plugin list --allow-root --format=count
docker compose exec wordpress wp post list --post_type=post --format=count --allow-root
```

**Do not put Cloudflare in front of this.** Iranian server, ArvanCloud CDN. Cloudflare's SNI is intermittently blocked from Iran and would make the CMS unreachable for editors.

---

## Migration order — do not compress these

1. **Lift and shift.** Move the existing WordPress to the new VPS unchanged — same version, same plugins, same theme, same content. Verify it serves `/mag` correctly through the old path.
2. **Harden.** IP restrictions, 2FA, noindex header, rate limiting.
3. **Add the headless layer.** WPGraphQL, mu-plugin, taxonomies.
4. **Then** point Next.js at it.

Infrastructure migration and architecture change at the same time means that when something breaks you can't tell which one did it. This is the same rule the roadmap applies to URLs, and it applies here too.

**Never delete the WordPress theme.** It is the rollback path. As long as WordPress can still render `/mag`, reverting the cutover is an nginx upstream change rather than a redeploy.

---

## docker-compose.yml

```yaml
services:
  db:
    image: mariadb:11
    restart: unless-stopped
    environment:
      MARIADB_DATABASE: ${DB_NAME}
      MARIADB_USER: ${DB_USER}
      MARIADB_PASSWORD: ${DB_PASSWORD}
      MARIADB_ROOT_PASSWORD: ${DB_ROOT_PASSWORD}
    volumes:
      - db_data:/var/lib/mysql
    networks: [internal]
    # No ports published. The database is never reachable from outside.

  wordpress:
    image: wordpress:php8.3-fpm-alpine
    restart: unless-stopped
    depends_on: [db]
    environment:
      WORDPRESS_DB_HOST: db:3306
      WORDPRESS_DB_NAME: ${DB_NAME}
      WORDPRESS_DB_USER: ${DB_USER}
      WORDPRESS_DB_PASSWORD: ${DB_PASSWORD}
      WORDPRESS_CONFIG_EXTRA: |
        define('WP_HOME',    'https://wp.thefinance.ir');
        define('WP_SITEURL', 'https://wp.thefinance.ir');
        define('DISALLOW_FILE_EDIT', true);
        define('DISALLOW_FILE_MODS', false);
        define('FORCE_SSL_ADMIN', true);
        define('WP_DEBUG', false);
    volumes:
      - wp_data:/var/www/html
    networks: [internal]

  nginx:
    image: nginx:alpine
    restart: unless-stopped
    depends_on: [wordpress]
    ports: ["80:80", "443:443"]
    volumes:
      - ./nginx/conf.d:/etc/nginx/conf.d:ro
      - wp_data:/var/www/html:ro
      - ./certs:/etc/letsencrypt:ro
    networks: [internal]

volumes:
  db_data:
  wp_data:

networks:
  internal:
    driver: bridge
```

`DISALLOW_FILE_EDIT` removes the admin's plugin/theme code editor — one of the most common paths from a compromised admin account to remote code execution.

---

## nginx — `wp.thefinance.ir`

```nginx
# Rate-limit zones — declare in the http block
limit_req_zone $binary_remote_addr zone=graphql:10m rate=10r/s;
limit_req_zone $binary_remote_addr zone=login:10m   rate=1r/s;

server {
    listen 443 ssl http2;
    server_name wp.thefinance.ir;

    ssl_certificate     /etc/letsencrypt/live/wp.thefinance.ir/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/wp.thefinance.ir/privkey.pem;

    root /var/www/html;
    index index.php;
    client_max_body_size 64M;

    # ── The single most important line on this host ──────────────────
    # Without it the same article indexes from two hosts and creates
    # duplicate content. This is the most common headless-migration failure
    # and it is completely silent.
    add_header X-Robots-Tag "noindex, nofollow" always;

    add_header X-Content-Type-Options "nosniff" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;

    # Belt and braces alongside the header
    location = /robots.txt {
        add_header Content-Type text/plain;
        return 200 "User-agent: *\nDisallow: /\n";
    }

    # ── Admin: IP allow-list ─────────────────────────────────────────
    location ~ ^/(wp-admin|wp-login\.php) {
        allow 1.2.3.4;        # office
        allow 5.6.7.8;        # VPN egress
        deny  all;

        limit_req zone=login burst=5 nodelay;

        include fastcgi_params;
        fastcgi_pass wordpress:9000;
        fastcgi_param SCRIPT_FILENAME $document_root$fastcgi_script_name;
        fastcgi_read_timeout 300;
    }

    # ── GraphQL: rate-limited, no caching ────────────────────────────
    location = /graphql {
        limit_req zone=graphql burst=20 nodelay;
        add_header Cache-Control "no-store" always;

        include fastcgi_params;
        fastcgi_pass wordpress:9000;
        fastcgi_param SCRIPT_FILENAME $document_root/index.php;
        fastcgi_read_timeout 60;
    }

    # ── Media: cacheable, this is the one hot path ───────────────────
    location /wp-content/uploads/ {
        expires 30d;
        add_header Cache-Control "public, immutable";
        add_header X-Robots-Tag "noindex" always;
        try_files $uri =404;
    }

    # ── Blocked entirely ─────────────────────────────────────────────
    location = /xmlrpc.php { deny all; }
    location ~* /(wp-config\.php|readme\.html|license\.txt) { deny all; }
    location ~ /\.(?!well-known) { deny all; }
    location ~* ^/wp-content/uploads/.*\.(php|phtml|phar)$ { deny all; }

    location / {
        try_files $uri $uri/ /index.php?$args;
    }

    location ~ \.php$ {
        include fastcgi_params;
        fastcgi_pass wordpress:9000;
        fastcgi_param SCRIPT_FILENAME $document_root$fastcgi_script_name;
    }
}

server {
    listen 80;
    server_name wp.thefinance.ir;
    return 301 https://$host$request_uri;
}
```

The `uploads/*.php` deny rule matters: a plugin vulnerability that allows arbitrary file upload becomes harmless if uploaded PHP can't execute.

---

## Keep media URLs unchanged

Existing images live at `thefinance.ir/wp-content/uploads/...`. Moving WordPress would change every one of those URLs — breaking Google Images indexing and every external hotlink.

Don't let the URLs change. On the **main** domain's nginx, proxy the uploads path to the WordPress box:

```nginx
# On thefinance.ir
location /wp-content/uploads/ {
    proxy_pass https://wp.thefinance.ir;
    proxy_set_header Host wp.thefinance.ir;
    proxy_cache_valid 200 30d;
    expires 30d;
    add_header Cache-Control "public";
}
```

Media URLs stay exactly as they are, the migration is invisible to image search, and ArvanCloud caches the path so image load doesn't hit the WordPress VPS directly.

If instead you prefer new URLs on `wp.thefinance.ir`, that's a deliberate choice — but then it needs a media redirect map and it should be a separate release from the headless cutover.

---

## Next.js image config

```js
// next.config.js
images: {
  remotePatterns: [
    { protocol: 'https', hostname: 'thefinance.ir',    pathname: '/wp-content/uploads/**' },
    { protocol: 'https', hostname: 'wp.thefinance.ir', pathname: '/wp-content/uploads/**' },
  ],
}
```

---

## Hardening checklist

- [ ] `X-Robots-Tag: noindex` verified with `curl -sI https://wp.thefinance.ir/`
- [ ] `/wp-admin` and `/wp-login.php` IP-restricted — verify from an outside network
- [ ] 2FA enforced on every administrator account
- [ ] `/graphql` rate-limited; mutations and preview require authentication
- [ ] XML-RPC returns 403
- [ ] PHP execution blocked inside `uploads`
- [ ] `DISALLOW_FILE_EDIT` active
- [ ] Database has no published ports
- [ ] Content team are Editors/Authors — no plugin, theme, or user administration
- [ ] Plugin count minimised; WPGraphQL / Rank Math / bridge versions pinned and aligned
- [ ] Automatic security updates enabled on the host OS
- [ ] Daily database dump + weekly `uploads` snapshot, stored off the VPS
- [ ] **Restore tested** — an untested backup is not a backup

Context for the effort: 11,334 new WordPress-ecosystem vulnerabilities were disclosed in 2025, 91% of them in plugins, and 46% had no vendor fix at disclosure. The plugin surface is the risk, so keep it small.

---

## Verify before moving on

```bash
curl -sI https://wp.thefinance.ir/ | grep -i x-robots-tag      # noindex, nofollow
curl -s  https://wp.thefinance.ir/robots.txt                    # Disallow: /
curl -sI https://wp.thefinance.ir/wp-admin/                     # 403 from outside
curl -sI https://wp.thefinance.ir/xmlrpc.php                    # 403
curl -sI https://thefinance.ir/wp-content/uploads/<known-file>  # 200, unchanged URL

docker compose exec wordpress sh -c \
  'for f in /var/www/html/wp-content/mu-plugins/*.php; do php -l "$f"; done'
```
