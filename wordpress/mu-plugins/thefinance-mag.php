<?php
/**
 * Plugin Name: TheFinance Mag Content Contract
 * Description: Registers the editorial data contract shared by WordPress and Next.js.
 * Version: 0.2.0
 * Requires at least: 7.0
 * Requires PHP: 8.3
 */

declare(strict_types=1);

namespace TheFinance\Mag;

defined('ABSPATH') || exit;

require_once __DIR__ . '/thefinance-mag/src/content-model.php';
require_once __DIR__ . '/thefinance-mag/src/editor-fields.php';
require_once __DIR__ . '/thefinance-mag/src/graphql.php';
