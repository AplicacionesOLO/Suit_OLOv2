export interface GroupableItem {
  country_name?: string;
  warehouse_name?: string;
  category_name?: string;
}

export interface AppGroup<T> {
  label: string;
  icon: string;
  iconColor: string;
  items: T[];
}

function hasMultiple<T>(items: T[], key: keyof T): boolean {
  if (items.length <= 1) return false;
  const vals = new Set(items.map((i) => i[key] || ''));
  vals.delete('');
  return vals.size > 1;
}

export function groupApps<T extends GroupableItem>(items: T[]): AppGroup<T>[] {
  if (items.length === 0) return [];

  const groups: AppGroup<T>[] = [];
  const multiCountry = hasMultiple(items, 'country_name');
  const multiWarehouse = hasMultiple(items, 'warehouse_name');
  const multiCategory = hasMultiple(items, 'category_name');

  // If nothing to group by, return single group
  if (!multiCountry && !multiWarehouse && !multiCategory) {
    return [{ label: '', icon: '', iconColor: '', items }];
  }

  if (multiCountry) {
    // Group by country first
    const countryMap = new Map<string, T[]>();
    items.forEach((item) => {
      const key = item.country_name || 'Sin país';
      if (!countryMap.has(key)) countryMap.set(key, []);
      countryMap.get(key)!.push(item);
    });

    countryMap.forEach((countryItems, countryName) => {
      const subMultiWarehouse = hasMultiple(countryItems, 'warehouse_name');
      const subMultiCategory = hasMultiple(countryItems, 'category_name');

      if (subMultiWarehouse) {
        const whMap = new Map<string, T[]>();
        countryItems.forEach((item) => {
          const key = item.warehouse_name || 'Sin almacén';
          if (!whMap.has(key)) whMap.set(key, []);
          whMap.get(key)!.push(item);
        });

        whMap.forEach((whItems, whName) => {
          const subSubMultiCat = hasMultiple(whItems, 'category_name');

          if (subSubMultiCat) {
            const catMap = new Map<string, T[]>();
            whItems.forEach((item) => {
              const key = item.category_name || 'Sin categoría';
              if (!catMap.has(key)) catMap.set(key, []);
              catMap.get(key)!.push(item);
            });

            catMap.forEach((catItems, catName) => {
              groups.push({
                label: `${countryName} · ${whName} · ${catName}`,
                icon: 'ri-folder-line',
                iconColor: 'text-secondary-400',
                items: catItems,
              });
            });
          } else {
            groups.push({
              label: `${countryName} · ${whName}`,
              icon: 'ri-building-line',
              iconColor: 'text-secondary-400',
              items: whItems,
            });
          }
        });
      } else if (subMultiCategory) {
        const catMap = new Map<string, T[]>();
        countryItems.forEach((item) => {
          const key = item.category_name || 'Sin categoría';
          if (!catMap.has(key)) catMap.set(key, []);
          catMap.get(key)!.push(item);
        });

        catMap.forEach((catItems, catName) => {
          groups.push({
            label: `${countryName} · ${catName}`,
            icon: 'ri-folder-line',
            iconColor: 'text-secondary-400',
            items: catItems,
          });
        });
      } else {
        groups.push({
          label: countryName,
          icon: 'ri-global-line',
          iconColor: 'text-emerald-400',
          items: countryItems,
        });
      }
    });
  } else if (multiWarehouse) {
    const whMap = new Map<string, T[]>();
    items.forEach((item) => {
      const key = item.warehouse_name || 'Sin almacén';
      if (!whMap.has(key)) whMap.set(key, []);
      whMap.get(key)!.push(item);
    });

    whMap.forEach((whItems, whName) => {
      const subMultiCat = hasMultiple(whItems, 'category_name');

      if (subMultiCat) {
        const catMap = new Map<string, T[]>();
        whItems.forEach((item) => {
          const key = item.category_name || 'Sin categoría';
          if (!catMap.has(key)) catMap.set(key, []);
          catMap.get(key)!.push(item);
        });

        catMap.forEach((catItems, catName) => {
          groups.push({
            label: `${whName} · ${catName}`,
            icon: 'ri-folder-line',
            iconColor: 'text-secondary-400',
            items: catItems,
          });
        });
      } else {
        groups.push({
          label: whName,
          icon: 'ri-building-line',
          iconColor: 'text-secondary-400',
          items: whItems,
        });
      }
    });
  } else if (multiCategory) {
    const catMap = new Map<string, T[]>();
    items.forEach((item) => {
      const key = item.category_name || 'Sin categoría';
      if (!catMap.has(key)) catMap.set(key, []);
      catMap.get(key)!.push(item);
    });

    catMap.forEach((catItems, catName) => {
      groups.push({
        label: catName,
        icon: 'ri-folder-line',
        iconColor: 'text-secondary-400',
        items: catItems,
      });
    });
  }

  return groups;
}