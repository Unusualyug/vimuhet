export function isSaleActive(product, now = new Date()) {
  return product.salePrice != null
    && (!product.saleStartsAt || new Date(product.saleStartsAt) <= now)
    && (!product.saleEndsAt || new Date(product.saleEndsAt) > now);
}

export function effectivePrice(product, now = new Date()) {
  return isSaleActive(product, now) ? product.salePrice : product.price;
}

export function publicProduct(product, now = new Date()) {
  const row = product?.toObject ? product.toObject() : { ...product };
  if (!isSaleActive(row, now)) row.salePrice = null;
  return row;
}
