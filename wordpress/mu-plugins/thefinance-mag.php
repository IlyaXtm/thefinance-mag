<?php
/**
 * Plugin Name: TheFinance Mag
 * Description: Market taxonomy, reading time, and GraphQL exposure for Mag.
 * Version: 1.0.0
 *
 * This file is deployed to wp-content/mu-plugins/ on wp.thefinance.ir.
 *
 * It is an mu-plugin (must-use) deliberately: the market taxonomy and the
 * readingTime field are infrastructure the frontend queries, not optional
 * features. If someone deactivated them the frontend would break. mu-plugins
 * cannot be deactivated from the admin.
 *
 * The cost of that choice: a parse error here takes down the entire site and
 * cannot be undone from wp-admin. ALWAYS run `php -l` before deploying:
 *
 *   docker compose exec -T wordpress php -l \
 *     /var/www/html/wp-content/mu-plugins/thefinance-mag.php
 */

if (!defined('ABSPATH')) { exit; }

/**
 * Market taxonomy.
 *
 * Optional per article — roughly 60% of the current archive is general
 * technical-analysis education (Ichimoku, OBV, ATR…) that belongs to no single
 * market. Those posts carry no market term, and that is a decision rather than
 * an omission. The frontend omits the chip and reflows.
 */
add_action('init', static function (): void {
    register_taxonomy('market', ['post'], [
        'labels' => [
            'name'          => 'بازارها',
            'singular_name' => 'بازار',
            'menu_name'     => 'بازارها',
        ],
        'public'              => true,
        'hierarchical'        => false,
        'show_ui'             => true,
        'show_in_rest'        => true,
        'show_admin_column'   => true,
        'rewrite'             => ['slug' => 'market', 'with_front' => false],
        'show_in_graphql'     => true,
        'graphql_single_name' => 'market',
        'graphql_plural_name' => 'markets',
    ]);
}, 5);

/** Seed the six markets once. Idempotent. */
add_action('init', static function (): void {
    if (get_option('tf_markets_seeded')) { return; }

    $markets = [
        'tse'      => 'بورس ایران',
        'gold-usd' => 'طلا و دلار',
        'crypto'   => 'کریپتو',
        'forex'    => 'فارکس',
        'global'   => 'اقتصاد جهانی',
        'housing'  => 'مسکن',
    ];

    foreach ($markets as $slug => $name) {
        if (!term_exists($slug, 'market')) {
            wp_insert_term($name, 'market', ['slug' => $slug]);
        }
    }

    update_option('tf_markets_seeded', 1);
}, 20);

/**
 * Reading time in whole minutes.
 *
 * Computed server-side so the frontend never recalculates it and every
 * consumer agrees. 150 wpm rather than the usual English 200 — Persian reads
 * slower, and the figure should under-promise.
 */
function tf_mag_reading_time(int $post_id): int {
    $content = get_post_field('post_content', $post_id);
    $text    = wp_strip_all_tags(strip_shortcodes($content));
    $words   = max(1, count(preg_split('/\s+/u', trim($text), -1, PREG_SPLIT_NO_EMPTY)));
    return max(1, (int) ceil($words / 150));
}

add_action('graphql_register_types', static function (): void {
    register_graphql_field('Post', 'readingTime', [
        'type'        => 'Int',
        'description' => 'Estimated reading time in whole minutes.',
        'resolve'     => static fn($post) => tf_mag_reading_time($post->ID),
    ]);

    /**
     * Revision date, or null when never revised.
     *
     * The design shows «منتشر: … · بازبینی: …» only when they differ. Much of
     * Mag is evergreen educational content; a revision date signals
     * maintenance where a relative date («۲ روز قبل») would signal staleness.
     */
    register_graphql_field('Post', 'modifiedAtIso', [
        'type'        => 'String',
        'description' => 'Last modified date in ISO 8601, or null if never revised.',
        'resolve'     => static function ($post) {
            $published = get_post_field('post_date_gmt', $post->ID);
            $modified  = get_post_field('post_modified_gmt', $post->ID);
            if (!$modified || $modified === $published) { return null; }
            return gmdate('c', strtotime($modified));
        },
    ]);

    /** Editorial one-liner for the market archive header. May be empty. */
    register_graphql_field('Market', 'marketDescription', [
        'type'        => 'String',
        'description' => 'Editorial one-liner shown on the market archive.',
        'resolve'     => static function ($term) {
            $desc = term_description($term->term_id, 'market');
            $desc = trim(wp_strip_all_tags($desc));
            return $desc !== '' ? $desc : null;
        },
    ]);
});
