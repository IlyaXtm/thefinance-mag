<?php

declare(strict_types=1);

namespace TheFinance\Mag;

/**
 * Registers stable, direct fields consumed by the Next.js Mag frontend.
 */
function register_graphql_contract(): void
{
    if (
        ! function_exists('register_graphql_fields')
        || ! function_exists('register_graphql_object_type')
    ) {
        return;
    }

    register_graphql_object_type(
        'MagSeo',
        [
            'description' => 'Stable SEO metadata contract for the headless Mag frontend.',
            'fields' => [
                'title' => ['type' => ['non_null' => 'String']],
                'description' => ['type' => 'String'],
                'canonicalUrl' => ['type' => ['non_null' => 'String']],
                'robots' => ['type' => ['list_of' => 'String']],
            ],
        ]
    );

    register_graphql_fields(
        'Post',
        [
            'whyItMatters' => [
                'type' => 'String',
                'description' => 'Optional editorial explanation, limited to 120 characters.',
                'resolve' => static function (mixed $post): ?string {
                    $post_id = (int) ($post->databaseId ?? 0);
                    $value = sanitize_why_it_matters(get_post_meta($post_id, WHY_IT_MATTERS_META, true));

                    return $value !== '' ? $value : null;
                },
            ],
            'readingTime' => [
                'type' => ['non_null' => 'Int'],
                'description' => 'Server-computed reading time in minutes.',
                'resolve' => static function (mixed $post): int {
                    $post_id = (int) ($post->databaseId ?? 0);
                    $stored = get_post_meta($post_id, READING_TIME_META, true);

                    if ($stored !== '') {
                        return absint($stored);
                    }

                    $wordpress_post = get_post($post_id);

                    return $wordpress_post instanceof \WP_Post
                        ? calculate_reading_time($wordpress_post->post_content)
                        : 0;
                },
            ],
            'seo' => [
                'type' => ['non_null' => 'MagSeo'],
                'description' => 'Rank Math values with safe WordPress fallbacks.',
                'resolve' => static function (mixed $post): array {
                    $post_id = (int) ($post->databaseId ?? 0);

                    return resolve_seo_fields($post_id);
                },
            ],
        ]
    );
}
add_action('graphql_register_types', __NAMESPACE__ . '\\register_graphql_contract');

function resolve_seo_fields(int $post_id): array
{
    $post = get_post($post_id);
    if (! $post instanceof \WP_Post) {
        return [
            'title' => '',
            'description' => null,
            'canonicalUrl' => '',
            'robots' => ['noindex', 'nofollow'],
        ];
    }

    $title = resolve_rank_math_text(
        $post,
        'rank_math_title',
        'titles.pt_post_title',
        get_the_title($post)
    );
    $description = resolve_rank_math_text(
        $post,
        'rank_math_description',
        'titles.pt_post_description',
        get_the_excerpt($post)
    );

    $canonical = esc_url_raw((string) get_post_meta($post_id, 'rank_math_canonical_url', true));
    if ($canonical === '') {
        $permalink = get_permalink($post);
        $canonical = is_string($permalink) ? $permalink : '';
    }

    $robots = get_post_meta($post_id, 'rank_math_robots', true);
    if (! is_array($robots) || $robots === []) {
        $robots = rank_math_setting('titles.pt_post_robots');
    }
    if (! is_array($robots) || $robots === []) {
        $robots = ['index', 'follow'];
    }
    $robots = array_values(array_unique(array_filter(array_map('sanitize_key', $robots))));

    return [
        'title' => $title,
        'description' => $description !== '' ? mb_substr($description, 0, 320) : null,
        'canonicalUrl' => $canonical,
        'robots' => $robots,
    ];
}

function resolve_rank_math_text(
    \WP_Post $post,
    string $meta_key,
    string $setting_key,
    string $fallback
): string {
    $template = (string) get_post_meta($post->ID, $meta_key, true);
    if ($template === '') {
        $setting = rank_math_setting($setting_key);
        $template = is_string($setting) ? $setting : '';
    }
    if ($template === '') {
        $template = $fallback;
    }

    if (class_exists('RankMath\\Helper')) {
        try {
            $template = (string) \RankMath\Helper::replace_vars($template, $post);
        } catch (\Throwable) {
            // Keep the unexpanded value; the GraphQL contract must not fail.
        }
    }

    return sanitize_text_field(wp_strip_all_tags($template));
}

function rank_math_setting(string $key): mixed
{
    if (! class_exists('RankMath\\Helper')) {
        return null;
    }

    try {
        return \RankMath\Helper::get_settings($key);
    } catch (\Throwable) {
        return null;
    }
}
