<?php
/**
 * Plugin Name: TheFinance — admin on the CMS host
 *
 * siteurl is https://thefinance.ir/mag because article permalinks, canonical
 * URLs and media URLs must be public. But that path is a Next.js route now,
 * so every admin URL WordPress builds from siteurl lands on the frontend and
 * 404s — login redirects, admin assets, all of it.
 *
 * Defining WP_SITEURL fixes the admin and breaks WPGraphQL: the /graphql
 * route is registered against siteurl, so moving it makes the endpoint render
 * as a blog archive instead. Verified on 8 September 2026 — the endpoint
 * returned HTML.
 *
 * These filters move only the admin-facing URLs. siteurl itself, the GraphQL
 * route, permalinks and media are untouched.
 */


const TF_ADMIN_HOST = 'https://wp.thefinance.ir';

add_filter('admin_url', function ($url) {
    return preg_replace('#^https://thefinance\.ir/mag#', TF_ADMIN_HOST, $url);
}, 10, 1);

add_filter('login_url', function ($url) {
    return preg_replace('#^https://thefinance\.ir/mag#', TF_ADMIN_HOST, $url);
}, 10, 1);

add_filter('logout_url', function ($url) {
    return preg_replace('#^https://thefinance\.ir/mag#', TF_ADMIN_HOST, $url);
}, 10, 1);

/* includes_url covers the scripts and styles wp-admin loads from
   /wp-includes/, which are on this host, not the frontend. */
add_filter('includes_url', function ($url) {
    return preg_replace('#^https://thefinance\.ir/mag#', TF_ADMIN_HOST, $url);
}, 10, 1);

/* After a successful login wp-login.php sends the browser to redirect_to,
   which it built from siteurl before admin_url could touch it. Without
   this the login succeeds and lands on a Next.js 404. */
add_filter("login_redirect", function ($to) {
    return preg_replace("#^https://thefinance\.ir/mag#", TF_ADMIN_HOST, $to);
}, 10, 1);

add_filter("site_url", function ($url, $path, $scheme) {
    if (in_array($scheme, array("login", "login_post", "admin"), true)) {
        return preg_replace("#^https://thefinance\.ir/mag#", TF_ADMIN_HOST, $url);
    }
    return $url;
}, 10, 3);

function tf_admin_asset_host($src) {
    if (!is_admin() && ($GLOBALS["pagenow"] ?? "") !== "wp-login.php") return $src;
    return preg_replace("#^https://thefinance\.ir/mag#", TF_ADMIN_HOST, $src);
}
add_filter("style_loader_src", "tf_admin_asset_host", 10, 1);
add_filter("script_loader_src", "tf_admin_asset_host", 10, 1);

/* The login form is served from this host but WordPress sets its test
   cookie against siteurl, which is thefinance.ir — so the browser never
   sends it back and login fails with "cookies are blocked". Defined here
   rather than in wp-config so it stays next to the reason. */
/* All four cookie constants live in wp-config.php, not here. A mu-plugin runs
   after core has already read them, so defining them at this point works only
   by accident of when cookies happen to be set — and a stale duplicate here
   silently wins if the wp-config line is ever removed. ADMIN_COOKIE_PATH was
   the one that mattered: at /wp-admin the cookie never reached the panel when
   it was opened via thefinance.ir/mag/wp-admin/, so uploads failed mid-request
   and sessions appeared to expire within a minute. See docs/infra/cms.md. */

/* Per-source filters miss anything not registered with an absolute URL —
   jQuery among them, which takes every admin script down with it. Rewrite
   the finished admin HTML instead: one pass, nothing to miss. Runs only
   on admin screens, so the front end and the API never see it. */
function tf_admin_ob_start() {
    if (!is_admin()) return;
    ob_start(function ($html) {
        return str_replace("https://thefinance.ir/mag/wp-", TF_ADMIN_HOST . "/wp-", $html);
    });
}
add_action("admin_init", "tf_admin_ob_start", 1);

/* The media library fetches attachments over AJAX, which returns JSON and
   never passes through the output buffer above. Thumbnails therefore still
   pointed at the public host and 502d. Admin only — the front end and
   GraphQL must keep the public URL for canonical and og:image. */
add_filter("wp_get_attachment_url", function ($url) {
    if (!is_admin()) return $url;
    return str_replace("https://thefinance.ir/mag/wp-content/", TF_ADMIN_HOST . "/wp-content/", $url);
}, 10, 1);
add_filter("wp_get_attachment_image_src", function ($image) {
    if (!is_admin() || !is_array($image)) return $image;
    $image[0] = str_replace("https://thefinance.ir/mag/wp-content/", TF_ADMIN_HOST . "/wp-content/", $image[0]);
    return $image;
}, 10, 1);

/* wp.ajax.settings.url is printed as the relative path /mag/wp-admin/
   admin-ajax.php — relative, so no PHP filter can match it, and the /mag
   prefix belongs to the frontend. The media library posts there and 400s,
   which is why it never showed a single thumbnail. Corrected after
   wp-util defines the object. */
function tf_fix_ajax_settings() {
    if (!is_admin()) return;
    wp_add_inline_script("wp-util", "if(window.wp&&wp.ajax&&wp.ajax.settings){wp.ajax.settings.url=" . json_encode(TF_ADMIN_HOST . "/wp-admin/admin-ajax.php") . ";}window.ajaxurl=" . json_encode(TF_ADMIN_HOST . "/wp-admin/admin-ajax.php") . ";", "after");
}
add_action("admin_enqueue_scripts", "tf_fix_ajax_settings", 99);

add_filter("auth_cookie_expiration", function(){ return 14 * DAY_IN_SECONDS; }, 10, 0);
