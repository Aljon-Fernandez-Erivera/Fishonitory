export function getDateKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

export function getSaleDateKey(sale) {
  const saleDate = new Date(sale.createdAt);

  return Number.isNaN(saleDate.getTime()) ? "" : getDateKey(saleDate);
}

export function getSalesForDate(sales, selectedDate) {
  return getSalesForRange(sales, selectedDate, selectedDate);
}

export function getSalesForRange(sales, startDate, endDate) {
  return sales.filter((sale) => {
    const saleDate = getSaleDateKey(sale);
    return saleDate >= startDate && saleDate <= endDate;
  });
}

export function getLatestSaleDate(sales) {
  if (!sales.length) {
    return getDateKey(new Date());
  }

  const latestSale = sales.reduce((latest, sale) => {
    return new Date(sale.createdAt) > new Date(latest.createdAt)
      ? sale
      : latest;
  });

  return getSaleDateKey(latestSale);
}

export function getDefaultSalesRange(sales) {
  const endDate = getLatestSaleDate(sales);
  const start = new Date(`${endDate}T00:00:00`);
  start.setDate(start.getDate() - 6);

  return {
    startDate: getDateKey(start),
    endDate,
  };
}

export function getDatesInRange(startDate, endDate) {
  const dates = [];
  const current = new Date(`${startDate}T00:00:00`);
  const end = new Date(`${endDate}T00:00:00`);

  while (current <= end && dates.length < 31) {
    dates.push(getDateKey(current));
    current.setDate(current.getDate() + 1);
  }

  return dates;
}

export function formatPeso(value) {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
  }).format(Number(value) || 0);
}
