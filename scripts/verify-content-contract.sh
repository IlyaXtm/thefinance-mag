#!/bin/sh

set -eu

compose="docker compose"

${compose} exec -T wordpress sh -c \
  'for file in /var/www/html/wp-content/mu-plugins/*.php /var/www/html/wp-content/mu-plugins/thefinance-mag/src/*.php; do php -l "$file"; done'

${compose} run --rm wordpress-cli plugin list \
  --fields=name,status,version \
  --format=table

response_file="$(mktemp)"
trap 'rm -f "${response_file}"' EXIT

curl --fail --silent --show-error \
  http://localhost:8080/graphql \
  -H 'Content-Type: application/json' \
  --data-binary '{"query":"{ posts(where: {name: \"mag-contract-fixture\"}, first: 1) { nodes { databaseId title readingTime whyItMatters seo { title description canonicalUrl robots } markets { nodes { name slug } } magContentTypes { nodes { name slug } } } } markets(first: 20) { nodes { name slug } } magContentTypes(first: 20) { nodes { name slug } } }"}' \
  > "${response_file}"

if jq -e '.errors | length > 0' "${response_file}" >/dev/null 2>&1; then
  jq . "${response_file}"
  exit 1
fi

jq -e '
  .data.posts.nodes[0].readingTime == 1 and
  .data.posts.nodes[0].whyItMatters == "تصمیم‌های امروز، مسیر بازار فردا را روشن‌تر می‌کنند." and
  .data.posts.nodes[0].seo.title == "عنوان سئوی نمونه مگ" and
  .data.posts.nodes[0].seo.description == "توضیح سئوی نمونه برای آزمون قرارداد هدلس مگ." and
  .data.posts.nodes[0].seo.canonicalUrl == "https://example.test/mag/fixture/" and
  .data.posts.nodes[0].seo.robots == ["noindex", "follow"] and
  ([.data.markets.nodes[].slug] | index("iran-stock") != null) and
  ([.data.magContentTypes.nodes[].slug] | index("news") != null)
' "${response_file}" >/dev/null

jq . "${response_file}"
