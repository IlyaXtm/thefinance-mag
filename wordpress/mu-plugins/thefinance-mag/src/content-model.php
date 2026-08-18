<?php

declare(strict_types=1);

namespace TheFinance\Mag;

const MARKET_TAXONOMY = 'mag_market';
const CONTENT_TYPE_TAXONOMY = 'mag_content_type';
const WHY_IT_MATTERS_META = '_tfm_why_it_matters';
const READING_TIME_META = '_tfm_reading_time';
const CONTENT_MODEL_VERSION = '1';

/**
 * Registers the extensible editorial taxonomies and post metadata.
 */
function register_content_model(): void
{
    register_taxonomy(
        MARKET_TAXONOMY,
        ['post'],
        [
            'labels' => [
                'name' => 'بازارها',
                'singular_name' => 'بازار',
                'menu_name' => 'بازارها',
            ],
            'public' => true,
            'show_ui' => true,
            'show_admin_column' => true,
            'show_in_rest' => true,
            'show_in_graphql' => true,
            'graphql_single_name' => 'market',
            'graphql_plural_name' => 'markets',
            'hierarchical' => true,
            'rewrite' => ['slug' => 'market', 'with_front' => false],
        ]
    );

    register_taxonomy(
        CONTENT_TYPE_TAXONOMY,
        ['post'],
        [
            'labels' => [
                'name' => 'نوع محتوا',
                'singular_name' => 'نوع محتوا',
                'menu_name' => 'نوع محتوا',
            ],
            'public' => true,
            'show_ui' => true,
            'show_admin_column' => true,
            'show_in_rest' => true,
            'show_in_graphql' => true,
            'graphql_single_name' => 'magContentType',
            'graphql_plural_name' => 'magContentTypes',
            'hierarchical' => true,
            'rewrite' => ['slug' => 'content-type', 'with_front' => false],
        ]
    );

    register_post_meta(
        'post',
        WHY_IT_MATTERS_META,
        [
            'type' => 'string',
            'single' => true,
            'default' => '',
            'show_in_rest' => [
                'schema' => [
                    'type' => 'string',
                    'maxLength' => 120,
                ],
            ],
            'sanitize_callback' => __NAMESPACE__ . '\\sanitize_why_it_matters',
            'auth_callback' => static fn (): bool => current_user_can('edit_posts'),
        ]
    );

    register_post_meta(
        'post',
        READING_TIME_META,
        [
            'type' => 'integer',
            'single' => true,
            'default' => 0,
            'show_in_rest' => true,
            'sanitize_callback' => 'absint',
            'auth_callback' => static fn (): bool => current_user_can('edit_posts'),
        ]
    );
}
add_action('init', __NAMESPACE__ . '\\register_content_model', 5);

/**
 * Adds missing initial terms without deleting or renaming existing terms.
 */
function seed_initial_terms(): void
{
    global $wpdb;

    // MU plugins are loaded while `wp core is-installed` checks an empty DB.
    // Wait until core tables exist so first boot stays quiet and repeatable.
    $options_table_exists = $wpdb->get_var(
        $wpdb->prepare('SHOW TABLES LIKE %s', $wpdb->options)
    );
    if ($options_table_exists !== $wpdb->options) {
        return;
    }

    if (get_option('tfm_content_model_version') === CONTENT_MODEL_VERSION) {
        return;
    }

    $terms = [
        MARKET_TAXONOMY => [
            'iran-stock' => 'بورس ایران',
            'gold-currency' => 'طلا و دلار',
            'crypto' => 'کریپتو',
            'forex' => 'فارکس',
            'global-economy' => 'اقتصاد جهانی',
            'housing' => 'مسکن',
        ],
        CONTENT_TYPE_TAXONOMY => [
            'analysis' => 'تحلیل',
            'report' => 'گزارش',
            'education' => 'آموزش',
            'news' => 'اخبار',
        ],
    ];

    foreach ($terms as $taxonomy => $taxonomy_terms) {
        foreach ($taxonomy_terms as $slug => $name) {
            if (! term_exists($slug, $taxonomy)) {
                wp_insert_term($name, $taxonomy, ['slug' => $slug]);
            }
        }
    }

    update_option('tfm_content_model_version', CONTENT_MODEL_VERSION, false);
}
add_action('init', __NAMESPACE__ . '\\seed_initial_terms', 20);

function sanitize_why_it_matters(mixed $value): string
{
    $sanitized = sanitize_text_field((string) $value);

    return mb_substr($sanitized, 0, 120);
}

function calculate_reading_time(string $content): int
{
    $plain_text = trim(wp_strip_all_tags(strip_shortcodes($content)));
    if ($plain_text === '') {
        return 0;
    }

    $words = preg_split('/\\s+/u', $plain_text, -1, PREG_SPLIT_NO_EMPTY);
    $word_count = is_array($words) ? count($words) : 0;
    $words_per_minute = max(1, (int) apply_filters('tfm_reading_words_per_minute', 200));

    return max(1, (int) ceil($word_count / $words_per_minute));
}

function update_reading_time(int $post_id, \WP_Post $post): void
{
    if (
        wp_is_post_revision($post_id)
        || wp_is_post_autosave($post_id)
        || $post->post_type !== 'post'
    ) {
        return;
    }

    update_post_meta($post_id, READING_TIME_META, calculate_reading_time($post->post_content));
}
add_action('save_post_post', __NAMESPACE__ . '\\update_reading_time', 10, 2);
