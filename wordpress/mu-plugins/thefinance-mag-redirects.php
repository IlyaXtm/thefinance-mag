<?php
/**
 * Plugin Name: TheFinance Mag — Redirects & Preview
 * Description: Exposes Rank Math redirects, WordPress slug history, and draft preview to the headless frontend.
 * Version: 1.0.0
 *
 * Deployed alongside thefinance-mag.php in wp-content/mu-plugins/.
 *
 * WHY THIS EXISTS.
 *
 * Two things the editorial and SEO teams use every day break the moment the
 * frontend stops being WordPress, and both break SILENTLY — the person clicks
 * the same button, sees no error, and nothing happens:
 *
 *   1. Rank Math redirects. The SEO team adds one and it works instantly today
 *      because WordPress serves the page. Afterwards, Next.js serves it and
 *      never reads that table.
 *
 *   2. Preview. The Preview button points at a WordPress URL that renders the
 *      unpublished revision. Afterwards, Next.js receives it and knows nothing
 *      about drafts.
 *
 * The alternative was hardcoding the ~12 known redirects in the frontend, which
 * works exactly once: every future redirect would then need a deploy. Reading
 * them over GraphQL keeps the SEO team's existing workflow intact.
 *
 * No new plugin: 91% of disclosed WordPress vulnerabilities are in plugins, and
 * this is ~150 lines against a table that already exists.
 *
 * ALWAYS run `php -l` before deploying — a parse error in an mu-plugin takes
 * down the whole site with no admin recovery.
 */

if (!defined('ABSPATH')) { exit; }

/* ------------------------------------------------------------------ */
/* Redirects                                                           */
/* ------------------------------------------------------------------ */

/**
 * Rank Math stores `sources` as a serialised array of match rules, because one
 * redirect can have several sources with different comparison modes.
 *
 * Only exact matches are exposed. Regex and "contains" rules would have to be
 * re-implemented in the frontend with identical semantics, and a subtly
 * different regex engine silently redirecting the wrong URLs is worse than not
 * supporting them. If the SEO team needs a pattern rule, that's a deliberate
 * change, not something to guess at.
 */
function tf_mag_rank_math_redirects(): array {
    global $wpdb;

    $table = $wpdb->prefix . 'rank_math_redirections';

    // The table only exists if Rank Math's redirection module was ever enabled.
    if ($wpdb->get_var($wpdb->prepare('SHOW TABLES LIKE %s', $table)) !== $table) {
        return [];
    }

    $rows = $wpdb->get_results(
        "SELECT sources, url_to, header_code FROM {$table} WHERE status = 'active'",
        ARRAY_A
    );

    $out = [];

    foreach ((array) $rows as $row) {
        $sources = maybe_unserialize($row['sources']);
        if (!is_array($sources)) { continue; }

        foreach ($sources as $source) {
            if (!is_array($source) || empty($source['pattern'])) { continue; }

            $comparison = $source['comparison'] ?? 'exact';
            if ($comparison !== 'exact') { continue; }

            /*
              Rank Math stores absolute URLs; the frontend expects a path.
              Normalising here rather than there keeps one shape crossing the
              boundary — a mixed list produced redirects to
              /mag/https%3A%2F%2Fthefinance.ir%2Fmag%2Fslug, which 301s
              successfully to nothing.
            */
            $to = $row['url_to'];
            $parsed = wp_parse_url($to);
            if (!empty($parsed['host'])) {
                $to = $parsed['path'] ?? '/';
                $to = preg_replace('#^/mag#', '', $to);
                if ($to === '') { $to = '/'; }
            }

            /*
              Slugs are stored percent-encoded Persian. Decoding once here
              means the frontend encodes exactly once — leaving it encoded
              produced %25d8… , a double encoding that resolves to nothing.
            */
            $out[] = [
                'from'   => '/' . ltrim(rawurldecode(trim($source['pattern'])), '/'),
                'to'     => '/' . ltrim(rawurldecode($to), '/'),
                'status' => (int) ($row['header_code'] ?: 301),
            ];
        }
    }

    return $out;
}

/**
 * WordPress records the previous slug whenever a post's slug changes, and
 * redirects the old one for free. That behaviour disappears with the theme, so
 * the history has to travel to the frontend too.
 *
 * Without this, an editor renaming an article would silently break every link
 * to it — including Google's — with no warning and no error.
 */
function tf_mag_old_slug_redirects(): array {
    global $wpdb;

    $rows = $wpdb->get_results(
        "SELECT p.post_name AS current_slug, m.meta_value AS old_slug
         FROM {$wpdb->postmeta} m
         INNER JOIN {$wpdb->posts} p ON p.ID = m.post_id
         WHERE m.meta_key = '_wp_old_slug'
           AND p.post_type = 'post'
           AND p.post_status = 'publish'",
        ARRAY_A
    );

    $out = [];

    foreach ((array) $rows as $row) {
        if ($row['old_slug'] === $row['current_slug']) { continue; }

        $out[] = [
            /* Decoded once, for the same reason as the Rank Math rules above. */
            'from'   => '/' . rawurldecode($row['old_slug']),
            'to'     => '/' . rawurldecode($row['current_slug']),
            'status' => 301,
        ];
    }

    return $out;
}

/**
 * Merged and flattened.
 *
 * Chains are resolved here rather than in the frontend. Some URLs currently
 * take two hops — Rank Math points at a slug that _wp_old_slug then redirects
 * again — and every hop costs crawl budget and delays the reader. Resolving at
 * the source means the frontend can emit one hop without knowing why.
 *
 * Rank Math wins on conflict: it is the deliberate, human-authored rule, while
 * _wp_old_slug is automatic bookkeeping.
 */
function tf_mag_all_redirects(): array {
    $rank_math = tf_mag_rank_math_redirects();
    $old_slugs = tf_mag_old_slug_redirects();

    /*
      Trailing slashes are normalised away before matching. Rank Math stores
      destinations with one, _wp_old_slug keys have none, so an unnormalised
      comparison silently failed to see that A → B → C was a chain and emitted
      two hops.
    */
    $norm = static fn(string $path): string => '/' . trim($path, '/');

    $by_from = [];
    foreach ($old_slugs as $rule) {
        $rule['from'] = $norm($rule['from']);
        $rule['to']   = $norm($rule['to']);
        $by_from[$rule['from']] = $rule;
    }
    foreach ($rank_math as $rule) {
        $rule['from'] = $norm($rule['from']);
        $rule['to']   = $norm($rule['to']);
        $by_from[$rule['from']] = $rule;
    }

    // Follow each destination until it stops being a redirect source.
    foreach ($by_from as $from => $rule) {
        $target = $rule['to'];
        $seen   = [$from => true];
        $hops   = 0;

        while (isset($by_from[$target]) && !isset($seen[$target]) && $hops < 10) {
            $seen[$target] = true;
            $target        = $by_from[$target]['to'];
            $hops++;
        }

        $by_from[$from]['to'] = $target;
    }

    return array_values($by_from);
}

add_action('graphql_register_types', static function (): void {
    register_graphql_object_type('MagRedirect', [
        'description' => 'A single redirect rule for the headless frontend.',
        'fields'      => [
            'from'   => ['type' => 'String', 'description' => 'Source path, leading slash, no host.'],
            'to'     => ['type' => 'String', 'description' => 'Destination path or absolute URL.'],
            'status' => ['type' => 'Int', 'description' => 'HTTP status, normally 301.'],
        ],
    ]);

    register_graphql_field('RootQuery', 'magRedirects', [
        'type'        => ['list_of' => 'MagRedirect'],
        'description' => 'Rank Math redirects plus WordPress slug history, flattened to one hop.',
        'resolve'     => static fn() => tf_mag_all_redirects(),
    ]);
});

/* ------------------------------------------------------------------ */
/* Preview                                                             */
/* ------------------------------------------------------------------ */

/**
 * Point WordPress's Preview button at the headless frontend.
 *
 * The secret is shared with the frontend through wp-config.php rather than
 * stored in the database, so it never appears in a database dump or an export.
 *
 * If it isn't defined, preview is left alone — falling back to WordPress's own
 * preview is a working feature, whereas a broken link to the frontend is not.
 */
add_filter('preview_post_link', static function (string $link, WP_Post $post): string {
    if (!defined('TF_MAG_FRONTEND_URL') || !defined('TF_MAG_PREVIEW_SECRET')) {
        return $link;
    }

    return add_query_arg(
        [
            'secret' => TF_MAG_PREVIEW_SECRET,
            'id'     => $post->ID,
            'status' => $post->post_status,
        ],
        rtrim(TF_MAG_FRONTEND_URL, '/') . '/api/draft'
    );
}, 10, 2);

/**
 * Fetch a post by ID regardless of status, for preview only.
 *
 * WPGraphQL will not return an unpublished post to an unauthenticated caller —
 * correctly. The frontend's draft route holds the shared secret and passes it
 * here; without a matching secret this resolves to null, so an unpublished
 * article cannot leak through a guessed ID.
 *
 * The secret is compared with hash_equals to avoid leaking its length through
 * timing.
 */
add_action('graphql_register_types', static function (): void {
    register_graphql_field('RootQuery', 'magPreview', [
        'type'        => 'Post',
        'description' => 'A post of any status, for draft preview. Requires the preview secret.',
        'args'        => [
            'id'     => ['type' => ['non_null' => 'Int']],
            'secret' => ['type' => ['non_null' => 'String']],
        ],
        'resolve'     => static function ($root, array $args, $context) {
            if (!defined('TF_MAG_PREVIEW_SECRET')) { return null; }
            if (!hash_equals(TF_MAG_PREVIEW_SECRET, (string) $args['secret'])) { return null; }

            $post = get_post((int) $args['id']);
            if (!$post || $post->post_type !== 'post') { return null; }

            /* Preview should show the newest autosave, which is what the editor
               just typed — not the last saved revision. */
            $autosave = wp_get_post_autosave($post->ID);
            if ($autosave) { $post = $autosave; }

            return new \WPGraphQL\Model\Post($post);
        },
    ]);
});

/* ------------------------------------------------------------------ */
/* Revalidation                                                        */
/* ------------------------------------------------------------------ */

/**
 * Tell the frontend to rebuild a page when it's published or updated.
 *
 * Hooked to transition_post_status, NOT save_post: save_post fires on every
 * edit including autosaves, so the frontend would be rebuilt continuously
 * while someone is still typing.
 *
 * Fired non-blocking. If the frontend is down, publishing must still succeed —
 * the ISR window will pick the change up regardless, just later.
 */
add_action('transition_post_status', static function (string $new, string $old, WP_Post $post): void {
    if ($post->post_type !== 'post') { return; }
    if ($new !== 'publish' && $old !== 'publish') { return; }
    if (!defined('TF_MAG_FRONTEND_URL') || !defined('TF_MAG_PREVIEW_SECRET')) { return; }

    wp_remote_post(
        rtrim(TF_MAG_FRONTEND_URL, '/') . '/api/revalidate',
        [
            'timeout'  => 2,
            'blocking' => false,
            'headers'  => ['Content-Type' => 'application/json'],
            'body'     => wp_json_encode([
                'secret' => TF_MAG_PREVIEW_SECRET,
                'slug'   => $post->post_name,
            ]),
        ]
    );
}, 10, 3);
