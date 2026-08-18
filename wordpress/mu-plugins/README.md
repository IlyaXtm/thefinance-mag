# Mag mu-plugins

Production mu-plugin code will live here after the installed WordPress and
WPGraphQL versions are verified. This directory is mounted read-only into the
local WordPress container because mu-plugin failures can take down WordPress.

`thefinance-mag.php` loads the versioned implementation from
`thefinance-mag/src`. The plugin only adds missing taxonomy terms; it never
deletes or renames existing terms or posts.

It also exposes the deliberately small `Post.seo` contract. Rank Math remains
the editorial SEO UI and sitemap owner, while the MU plugin reads its post meta
with fallbacks that cannot turn a GraphQL request into a fatal error.

Every PHP file added here must pass `php -l`, a WordPress container boot test,
and the GraphQL contract test before it is considered deployable.
