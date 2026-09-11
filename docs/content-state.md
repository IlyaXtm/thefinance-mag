# Content state — the numbers, measured

**Measured 2026-09-11 against the live CMS.** Re-measure before building
anything that depends on a field; the commands are at the bottom.

These are the most consequential numbers in the project. Every feature that
reads a field which is mostly empty renders as a hole on most of the archive —
and it renders perfectly on the one article someone tested it with.

| | |
|---|---|
| Published articles | **54** |
| With a market tag | **14 of 54** |
| With a hand-written dek | **0 of 54** |
| With a Rank Math primary category | **47 of 54** |
| Categories | آموزش 42 · مقالات 40 · اخبار 10 · تحلیل 2 · اینچارت 2 |
| Markets | کریپتو 5 · فارکس 3 · اقتصاد جهانی 3 · بورس ایران 2 · طلا و دلار 1 · مسکن 0 |
| Tags | 100, mostly single-article, `noindex` |
| Reading time | 3 to 41 minutes |
| Redirects | 19 |

## What each number already decided

**14 of 54 with a market tag** is why every market archive is below the
8-article indexing floor, including the three in the header nav — see
`decisions.md` → URL shape. The floor is not bent to hide it; the tagging is
the fix (B17).

**0 of 54 with a dek** is why the dek was designed and then not built. It is
the same trap as «چرا مهم است», which was designed, built and removed after the
live site showed excerpts are auto-truncated because nobody writes them. A field
with no producer is worse than no field: it makes the schema lie.

**47 of 54 with a Rank Math primary category** is what settled the `category`
rule for the parked `article_viewed` event (B39): Rank Math's field is the
source, with اخبار > تحلیل > آموزش > اینچارت as the fallback for the seven that
lack one.

**96 category assignments across 54 articles** is why "the category" is not a
fact the content model holds — most articles carry two or three. `مقالات` is on
40 of 54 and is a general label rather than a category, which is why it is
excluded from any rule that has to pick one.

## Re-measuring

On the CMS host, via WP-CLI:

```bash
# Published articles
wp post list --post_type=post --post_status=publish --format=count

# Category and market distribution
wp term list category --fields=name,count --format=table
wp term list market   --fields=name,count --format=table

# Rank Math primary category coverage
wp db query "SELECT COUNT(DISTINCT p.ID) FROM wp_posts p
  JOIN wp_postmeta m ON m.post_id=p.ID
  WHERE p.post_type='post' AND p.post_status='publish'
    AND m.meta_key='rank_math_primary_category'
    AND m.meta_value NOT IN ('','0');"
```

Deks have no meta key of their own — they are the manual excerpt, so the count
is posts whose `post_excerpt` is non-empty:

```bash
wp db query "SELECT COUNT(*) FROM wp_posts
  WHERE post_type='post' AND post_status='publish' AND post_excerpt <> '';"
```

**Put the new date at the top when you do.** A number without a date is a
number nobody can decide whether to trust, and these have all moved at least
once.
