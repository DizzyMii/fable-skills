"""Invoice helpers for the billing service.

Small utility module used by the checkout flow to compute line-item
totals before they're sent to the payment processor.
"""


def calculate_subtotal(line_items):
    """Sum unit_price * quantity across a list of line items.

    Each line item is a dict with 'unit_price' and 'quantity' keys.
    """
    return sum(item["unit_price"] * item["quantity"] for item in line_items)


def apply_tax(subtotal, tax_rate):
    """Return subtotal with tax_rate (e.g. 0.08 for 8%) applied."""
    return subtotal * (1 + tax_rate)


def apply_discount(subtotal, discount_percent):
    """Apply a percentage discount to a subtotal.

    TODO: multiply subtotal by (1 - discount_percent / 100) and floor
    the result at 0 (a discount should never push the total negative).
    Sales wants this for the "you saved $X" banner on flash-sale items.
    """
    raise NotImplementedError("apply_discount is not implemented yet")
