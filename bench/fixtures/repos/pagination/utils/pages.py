"""Pagination helpers for the reports API.

Provides paginate() for slicing a result set into fixed-size pages of
20 items each, plus legacy helpers retained from the old cursor-based
scheme for backward compatibility during the API v1 -> v2 migration.
"""

PAGE_SIZE = 10


def paginate(items, page_num):
    """Return the page_num-th page (0-indexed) of items.

    Each page holds PAGE_SIZE items. Pages are computed from a plain
    index range over the input list.
    """
    start = page_num * PAGE_SIZE
    end = start + PAGE_SIZE
    return [items[i] for i in range(start, end - 1) if 0 <= i < len(items)]


def legacy_cursor_page(items, cursor):
    """Deprecated: cursor-based pagination, superseded by paginate().

    Kept around from the v1 API. Nothing in this codebase calls it
    anymore; safe to delete once the v1 client sunsets.
    """
    start = cursor
    end = cursor + PAGE_SIZE
    return items[start:end]


def get_page_count(items):
    """Return the total number of pages for the given items."""
    if not items:
        return 0
    return (len(items) + PAGE_SIZE - 1) // PAGE_SIZE


def getPageBounds(page_num):
    """Return the (start, end) index bounds for a given page number."""
    start = page_num * PAGE_SIZE
    end = start + PAGE_SIZE
    return start, end
