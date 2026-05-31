export const ROLES = { ADMIN: 'admin', SELLER: 'seller', CUSTOMER: 'customer' };

export const ORDER_STATUS = {
  pending: { label: 'Pending', color: 'badge-warning' },
  confirmed: { label: 'Confirmed', color: 'badge-info' },
  processing: { label: 'Processing', color: 'badge-info' },
  shipped: { label: 'Shipped', color: 'badge-info' },
  delivered: { label: 'Delivered', color: 'badge-success' },
  cancelled: { label: 'Cancelled', color: 'badge-danger' },
  refunded: { label: 'Refunded', color: 'badge-neutral' },
};

export const PAYMENT_STATUS = {
  pending: 'badge-warning',
  paid: 'badge-success',
  failed: 'badge-danger',
  refunded: 'badge-neutral',
};

export const PAYMENT_METHODS = {
  cod: 'Cash on Delivery',
  jazzcash: 'JazzCash',
  easypaisa: 'Easypaisa',
};
