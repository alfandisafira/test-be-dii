export const buildQueryParams = (objectParams) => {
  delete objectParams.start;

  let arrValues = [];

  let numberPrepared = 1;
  let indexObj = 1;

  let fullQuery = "";
  for (const key in objectParams) {
    let query = `${key} `;

    const keyValues = objectParams[key].split(",");

    if (keyValues.length > 1) {
      query += "in (";

      let indexkeyValues = 1;
      keyValues.forEach((_value) => {
        if (indexkeyValues < keyValues.length)
          query += "$" + numberPrepared + ", ";
        else query += "$" + numberPrepared + "";
        indexkeyValues++;
        numberPrepared++;
      });
      query += ")";
    } else {
      query += "= $" + numberPrepared + "";
      numberPrepared++;
    }

    fullQuery += query;
    if (indexObj < Object.keys(objectParams).length) fullQuery += " AND ";

    arrValues = [...arrValues, ...keyValues];

    indexObj++;
  }

  return {
    query: fullQuery,
    values: arrValues,
  };
};

export function buildTree(arr, parentCode = null) {
  const result = [];

  for (const item of arr) {
    if (item.parent_menu_code === parentCode) {
      const children = buildTree(arr, item.menu_code);
      const node = { ...item };

      if (children.length > 0) {
        node.child = children;
      }

      result.push(node);
    }
  }

  return result;
}
