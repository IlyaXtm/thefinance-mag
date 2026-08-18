<?php

use const TheFinance\Mag\CONTENT_TYPE_TAXONOMY;
use const TheFinance\Mag\MARKET_TAXONOMY;
use const TheFinance\Mag\WHY_IT_MATTERS_META;

$slug = 'mag-contract-fixture';
$existing = get_page_by_path($slug, OBJECT, 'post');

if ($existing instanceof WP_Post) {
    $post_id = $existing->ID;
} else {
    $post_id = wp_insert_post(
        [
            'post_type' => 'post',
            'post_status' => 'publish',
            'post_title' => 'نمونه قرارداد محتوای مگ',
            'post_name' => $slug,
            'post_content' => 'این یک نوشته آزمایشی برای بررسی قرارداد داده مگ است.',
        ],
        true
    );
}

if (is_wp_error($post_id)) {
    throw new RuntimeException($post_id->get_error_message());
}

wp_set_object_terms($post_id, ['iran-stock'], MARKET_TAXONOMY, false);
wp_set_object_terms($post_id, ['news'], CONTENT_TYPE_TAXONOMY, false);
update_post_meta(
    $post_id,
    WHY_IT_MATTERS_META,
    'تصمیم‌های امروز، مسیر بازار فردا را روشن‌تر می‌کنند.'
);
update_post_meta($post_id, 'rank_math_title', 'عنوان سئوی نمونه مگ');
update_post_meta($post_id, 'rank_math_description', 'توضیح سئوی نمونه برای آزمون قرارداد هدلس مگ.');
update_post_meta($post_id, 'rank_math_canonical_url', 'https://example.test/mag/fixture/');
update_post_meta($post_id, 'rank_math_robots', ['noindex', 'follow']);

wp_update_post(['ID' => $post_id]);

echo "Seeded post ID: {$post_id}\n";
