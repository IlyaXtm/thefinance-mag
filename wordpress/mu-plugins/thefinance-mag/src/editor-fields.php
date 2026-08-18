<?php

declare(strict_types=1);

namespace TheFinance\Mag;

function register_editor_meta_boxes(): void
{
    add_meta_box(
        'tfm-why-it-matters',
        'چرا مهم است',
        __NAMESPACE__ . '\\render_why_it_matters_meta_box',
        'post',
        'normal',
        'high',
        [
            '__block_editor_compatible_meta_box' => true,
        ]
    );
}
add_action('add_meta_boxes_post', __NAMESPACE__ . '\\register_editor_meta_boxes');

function render_why_it_matters_meta_box(\WP_Post $post): void
{
    wp_nonce_field('tfm_save_why_it_matters', 'tfm_why_it_matters_nonce');
    $value = (string) get_post_meta($post->ID, WHY_IT_MATTERS_META, true);
    ?>
    <p>
        <label for="tfm_why_it_matters">
            یک جملهٔ کوتاه و توضیحی بنویسید؛ پیش‌بینی یا وعدهٔ سود نباشد. این فیلد اختیاری است.
        </label>
    </p>
    <textarea
        id="tfm_why_it_matters"
        name="tfm_why_it_matters"
        maxlength="120"
        rows="3"
        style="width: 100%;"
    ><?php echo esc_textarea($value); ?></textarea>
    <?php
}

function save_why_it_matters(int $post_id): void
{
    $nonce = isset($_POST['tfm_why_it_matters_nonce'])
        ? sanitize_text_field(wp_unslash($_POST['tfm_why_it_matters_nonce']))
        : '';

    if (
        $nonce === ''
        || ! wp_verify_nonce($nonce, 'tfm_save_why_it_matters')
        || ! current_user_can('edit_post', $post_id)
        || wp_is_post_autosave($post_id)
        || wp_is_post_revision($post_id)
    ) {
        return;
    }

    $value = isset($_POST['tfm_why_it_matters'])
        ? sanitize_why_it_matters(wp_unslash($_POST['tfm_why_it_matters']))
        : '';

    if ($value === '') {
        delete_post_meta($post_id, WHY_IT_MATTERS_META);
        return;
    }

    update_post_meta($post_id, WHY_IT_MATTERS_META, $value);
}
add_action('save_post_post', __NAMESPACE__ . '\\save_why_it_matters', 20);
