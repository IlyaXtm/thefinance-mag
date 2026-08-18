# Mag mu-plugins

Production mu-plugin code will live here after the installed WordPress and
WPGraphQL versions are verified. This directory is mounted read-only into the
local WordPress container because mu-plugin failures can take down WordPress.

Every PHP file added here must pass `php -l` and a container boot test before it
is considered deployable.
