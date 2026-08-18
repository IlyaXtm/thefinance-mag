#!/bin/sh

set -eu

cd /var/www/html

if ! wp core is-installed --url="${WORDPRESS_LOCAL_URL}" --quiet; then
  wp core install \
    --url="${WORDPRESS_LOCAL_URL}" \
    --title="${WORDPRESS_LOCAL_TITLE}" \
    --admin_user="${WORDPRESS_LOCAL_ADMIN_USER}" \
    --admin_password="${WORDPRESS_LOCAL_ADMIN_PASSWORD}" \
    --admin_email="${WORDPRESS_LOCAL_ADMIN_EMAIL}" \
    --locale=fa_IR \
    --skip-email
fi

wp option update permalink_structure '/%postname%/' --quiet
wp rewrite flush --hard --quiet

install_wordpress_org_plugin() {
  plugin_slug="$1"
  plugin_version="$2"

  installed_version="$(wp plugin get "${plugin_slug}" --field=version 2>/dev/null || true)"
  if [ "${installed_version}" != "${plugin_version}" ]; then
    wp plugin install "${plugin_slug}" \
      --version="${plugin_version}" \
      --force \
      --quiet
  fi

  wp plugin activate "${plugin_slug}" --quiet
}

install_wordpress_org_plugin wp-graphql "${WPGRAPHQL_VERSION}"
install_wordpress_org_plugin seo-by-rank-math "${RANK_MATH_VERSION}"

if wp plugin is-installed wp-graphql-rank-math; then
  # The pre-release bridge fails at runtime against this pinned stack. The
  # first-party MU plugin exposes the smaller, tested SEO contract instead.
  wp plugin deactivate wp-graphql-rank-math --quiet || true
fi

wp plugin list --fields=name,status,version --format=table
