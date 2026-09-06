const SPREADSHEET_ID = '1c7ZyUibkflrm-lOp_eVpmYEge1hriMZAGB93-G-CWCk';

const HEADERS = [
  'তারিখ',
  'গ্রাহকের নাম',
  'গাড়ি',
  'দৈর্ঘ্য',
  'প্রস্থ',
  'উচ্চতা',
  'গাড়ির পরিমাপ (ফুট)',
  'বিবরণ',
  'টন',
  'গুণ',
  'ফুট',
  'দর',
  'টাকা',
  'জমা',
  'অবশিষ্ট',
  'পাওনা',
  'চালান নং',
];

function normalizeText(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\u0980-\u09ff]/g, '')
    .replace(/\s+/g, '');
}

function findHeaderIndex(headers, candidates) {
  const normalizedHeaders = headers.map((header) => normalizeText(header));
  for (const candidate of candidates) {
    const index = normalizedHeaders.indexOf(normalizeText(candidate));
    if (index !== -1) return index;
  }
  return -1;
}

function toNumber(value) {
  const banglaDigits = {
    '০': '0', '১': '1', '২': '2', '৩': '3', '৪': '4',
    '৫': '5', '৬': '6', '৭': '7', '৮': '8', '৯': '9',
  };
  const normalized = String(value == null ? '' : value)
    .replace(/[০-৯]/g, (digit) => banglaDigits[digit] || digit)
    .replace(/,/g, '')
    .trim();
  const number = Number(normalized);
  return Number.isFinite(number) ? number : 0;
}

function getHeaderRowIndex(sheet) {
  const firstRowCell = String(sheet.getRange(1, 1).getValue() || '').trim();
  if (firstRowCell === 'তারিখ') return 1;
  return 3;
}

/**
 * applyCalculatedRow — সকল হিসাবের ফর্মুলা একটি data row-এ বসায়।
 *
 * কলাম ম্যাপিং (1-indexed):
 *   D=4  দৈর্ঘ্য   E=5  প্রস্থ    F=6  উচ্চতা
 *   G=7  গাড়ির পরিমাপ (ফুট) = D×E×F  যদি D,E,F সবই >0
 *   H=8  বিবরণ
 *   I=9  টন        J=10 গুণ
 *   K=11 ফুট       = G যদি G>0, নাহলে I×J
 *   L=12 দর
 *   M=13 টাকা      = K×L
 *   N=14 জমা
 *   O=15 অবশিষ্ট   = MAX(cumulative জমা − cumulative টাকা, 0)
 *   P=16 পাওনা     = MAX(cumulative টাকা − cumulative জমা, 0)
 *   Q=17 চালান নং
 */
function applyCalculatedRow(sheet, row) {
  const headerRow = getHeaderRowIndex(sheet);
  const dataStartRow = headerRow + 1;
  if (row <= headerRow || row > sheet.getLastRow()) return;

  // Normalize all numeric input cells — converts Bangla digits & strips commas.
  // Always run this so manually typed Bangla digits (০-৯) work correctly.
  try {
    // দৈর্ঘ্য (D), প্রস্থ (E), উচ্চতা (F)
    const dimVals = sheet.getRange(row, 4, 1, 3).getValues()[0];
    sheet.getRange(row, 4, 1, 3).setValues([[
      toNumber(dimVals[0]),
      toNumber(dimVals[1]),
      toNumber(dimVals[2]),
    ]]);

    // টন (I), গুণ (J)
    const tonVals = sheet.getRange(row, 9, 1, 2).getValues()[0];
    sheet.getRange(row, 9, 1, 2).setValues([[
      toNumber(tonVals[0]),
      toNumber(tonVals[1]),
    ]]);

    // দর (L), জমা (N)
    sheet.getRange(row, 12).setValue(toNumber(sheet.getRange(row, 12).getValue()));
    sheet.getRange(row, 14).setValue(toNumber(sheet.getRange(row, 14).getValue()));
  } catch (e) {}

  // ── Col G (7): গাড়ির পরিমাপ (ফুট) = দৈর্ঘ্য × প্রস্থ × উচ্চতা
  // Formula: যদি তিনটোই >0 তাহলে গুণফল, নাহলে 0
  sheet.getRange(row, 7).setFormula(
    `=IF(AND(D${row}>0,E${row}>0,F${row}>0),D${row}*E${row}*F${row},0)`
  );

  // ── Col K (11): ফুট = গাড়ির পরিমাপ (G) যদি G>0, নাহলে টন × গুণ (I×J)
  sheet.getRange(row, 11).setFormula(
    `=IF(G${row}>0,G${row},I${row}*J${row})`
  );

  // ── Col M (13): টাকা = ফুট (K) × দর (L)
  sheet.getRange(row, 13).setFormula(`=K${row}*L${row}`);

  // ── Col O (15): অবশিষ্ট = MAX(ক্রমবর্ধমান জমা − ক্রমবর্ধমান টাকা, 0)
  sheet.getRange(row, 15).setFormula(
    `=MAX(SUM($N$${dataStartRow}:N${row})-SUM($M$${dataStartRow}:M${row}),0)`
  );

  // ── Col P (16): পাওনা = MAX(ক্রমবর্ধমান টাকা − ক্রমবর্ধমান জমা, 0)
  sheet.getRange(row, 16).setFormula(
    `=MAX(SUM($M$${dataStartRow}:M${row})-SUM($N$${dataStartRow}:N${row}),0)`
  );
}

function refreshCalculatedRows(sheet) {
  const lastRow = sheet.getLastRow();
  const headerRow = getHeaderRowIndex(sheet);
  if (lastRow <= headerRow) return;

  const firstColumnValues = sheet.getRange(headerRow + 1, 1, lastRow - headerRow, 1).getValues();
  firstColumnValues.forEach((value, index) => {
    if (String(value[0] || '').trim() !== 'মোট') {
      applyCalculatedRow(sheet, index + headerRow + 1);
    }
  });
}

function rebuildTotalsRow(sheet, customerName, address, mobile) {
  const lock = LockService.getScriptLock();
  try {
    if (!lock.tryLock(1500)) return;
    const cache = CacheService.getScriptCache();
    const cacheKey = 'rebuildTotals_' + sheet.getSheetId() + '_' + sheet.getLastRow();
    if (cache.get(cacheKey)) {
      return;
    }
    cache.put(cacheKey, '1', 3);

    removeTotalsRow(sheet);
    refreshCalculatedRows(sheet);
    addTotalsRow(sheet, customerName, address, mobile);
  } catch (e) {
  } finally {
    try { lock.releaseLock(); } catch (er) {}
  }
}

function syncCustomerMetaToCustomersSheet(sheet) {
  try {
    const spreadsheet = sheet.getParent();
    const customersSheet = ensureCustomersSheet(spreadsheet);
    if (!customersSheet) return;

    const oldKey = sheet.getName();
    const displayName = String(sheet.getRange(1, 1).getValue() || '').trim();
    const meta = String(sheet.getRange(2, 1).getValue() || '');
    let mobile = '';
    let address = '';
    if (meta.includes('📞 মোবাইল:')) {
      mobile = meta.split('📞 মোবাইল:')[1].split('|')[0].trim();
    }
    if (meta.includes('📍 ঠিকানা:')) {
      address = meta.split('📍 ঠিকানা:')[1].trim();
    }

    const values = customersSheet.getDataRange().getValues();
    let foundRow = -1;
    for (let i = 1; i < values.length; i++) {
      const rowName = String(values[i][0] || '').trim();
      if (rowName && rowName.toLowerCase() === oldKey.toLowerCase()) {
        foundRow = i + 1;
        break;
      }
    }

    let newKey = oldKey;
    if (displayName && displayName !== oldKey) {
      try {
        const conflict = spreadsheet.getSheetByName(displayName);
        if (!conflict) {
          sheet.setName(displayName);
          newKey = displayName;
        }
      } catch (er) {}
    }

    if (foundRow === -1) {
      customersSheet.appendRow([newKey || oldKey, mobile, address]);
    } else {
      customersSheet.getRange(foundRow, 1, 1, 3).setValues([[newKey || oldKey, mobile, address]]);
    }
  } catch (er) {}
}

function resyncAllCustomersMeta(spreadsheet) {
  try {
    const customersSheet = ensureCustomersSheet(spreadsheet);
    if (!customersSheet) return;
    const sheets = spreadsheet.getSheets();
    const synced = new Map();
    sheets.forEach((s) => {
      const sName = s.getName();
      if (sName === 'Customers') return;
      const firstCell = String(s.getRange(1, 1).getValue() || '').trim();
      if (firstCell === '' || firstCell === 'তারিখ') return;
      const meta = String(s.getRange(2, 1).getValue() || '');
      let mobile = '';
      let address = '';
      if (meta.includes('📞 মোবাইল:')) {
        mobile = meta.split('📞 মোবাইল:')[1].split('|')[0].trim();
      }
      if (meta.includes('📍 ঠিকানা:')) {
        address = meta.split('📍 ঠিকানা:')[1].trim();
      }
      const displayName = firstCell || sName;
      synced.set(displayName, { mobile, address });
    });

    const header = ['Name', 'Mobile', 'Address'];
    customersSheet.clearContents();
    customersSheet.getRange(1, 1, 1, 3).setValues([header]);
    customersSheet.getRange(1, 1, 1, 3).setFontWeight('bold').setBackground('#e2e8f0');
    const rows = [];
    synced.forEach((data, name) => {
      rows.push([name, data.mobile, data.address]);
    });
    if (rows.length > 0) {
      customersSheet.getRange(2, 1, rows.length, 3).setValues(rows);
    }
  } catch (er) {}
}

function onEdit(e) {
  try {
    if (!e || !e.source) return;
    const sheet = e.source.getActiveSheet();
    if (!sheet) return;

    const sheetName = sheet.getName();
    if (sheetName === 'Customers') return;

    const headerRow = getHeaderRowIndex(sheet);
    const lastRow = sheet.getLastRow();

    const range = e.range;
    let editedInTitle = false;

    if (range) {
      const rStart = range.getRow();
      const rEnd = rStart + range.getNumRows() - 1;
      editedInTitle = (rStart <= 2);

      const dataStartRow = headerRow + 1;
      const totalsRow = findTotalsRow(sheet);
      const actualLast = totalsRow ? totalsRow - 1 : lastRow;

      // Data row edited — recalculate all affected rows
      if (!(rEnd < dataStartRow || rStart > actualLast)) {
        for (let row = Math.max(rStart, dataStartRow); row <= Math.min(rEnd, actualLast); row++) {
          applyCalculatedRow(sheet, row);
        }
      }
    }

    if (editedInTitle) {
      syncCustomerMetaToCustomersSheet(sheet);
    }

    if (lastRow <= headerRow) return;

    const meta = String(sheet.getRange(2, 1).getValue() || '');
    let mobile = '';
    let address = '';
    if (meta.includes('📞 মোবাইল:')) {
      mobile = meta.split('📞 মোবাইল:')[1].split('|')[0].trim();
    }
    if (meta.includes('📍 ঠিকানা:')) {
      address = meta.split('📍 ঠিকানা:')[1].trim();
    }

    const customerName = sheet.getName();
    rebuildTotalsRow(sheet, customerName, address, mobile);
  } catch (err) {
  }
}

function findTotalsRow(sheet) {
  const lastRow = sheet.getLastRow();
  const headerRow = getHeaderRowIndex(sheet);
  if (lastRow <= headerRow) return null;
  const firstColumn = sheet.getRange(headerRow + 1, 1, lastRow - headerRow, 1).getValues();
  for (let index = firstColumn.length - 1; index >= 0; index -= 1) {
    if (String(firstColumn[index][0] || '').trim() === 'মোট') {
      return index + headerRow + 1;
    }
  }
  return null;
}

function onChange(e) {
  try {
    if (!e || !e.source) return;
    const sheet = e.source.getActiveSheet();
    if (!sheet) return;

    const sheetName = sheet.getName();
    if (sheetName === 'Customers') return;

    syncCustomerMetaToCustomersSheet(sheet);

    const headerRow = getHeaderRowIndex(sheet);
    if (sheet.getLastRow() <= headerRow) return;

    const meta = String(sheet.getRange(2, 1).getValue() || '');
    let mobile = '';
    let address = '';
    if (meta.includes('📞 মোবাইল:')) {
      mobile = meta.split('📞 মোবাইল:')[1].split('|')[0].trim();
    }
    if (meta.includes('📍 ঠিকানা:')) {
      address = meta.split('📍 ঠিকানা:')[1].trim();
    }

    rebuildTotalsRow(sheet, sheet.getName(), address, mobile);
  } catch (err) {
  }
}

function onOpen() {
}

function ensureCustomersSheet(spreadsheet) {
  let sheet = spreadsheet.getSheetByName('Customers');
  if (sheet) return sheet;

  sheet = spreadsheet.insertSheet('Customers');
  sheet.appendRow(['Name', 'Mobile', 'Address']);
  sheet.getRange(1, 1, 1, 3).setFontWeight('bold').setBackground('#e2e8f0');

  const existingCustomers = new Map();
  spreadsheet.getSheets().forEach(s => {
    const sName = s.getName();
    if (sName === 'Customers') return;

    const firstCell = String(s.getRange(1, 1).getValue() || '').trim();
    if (firstCell === '' || firstCell === 'তারিখ') return;

    const metaText = String(s.getRange(2, 1).getValue() || '');
    let mobile = '';
    let address = '';

    if (metaText.includes('📞 মোবাইল:')) {
      mobile = metaText.split('📞 মোবাইল:')[1].split('|')[0].trim();
    }
    if (metaText.includes('📍 ঠিকানা:')) {
      address = metaText.split('📍 ঠিকানা:')[1].trim();
    }

    if (sName) {
      existingCustomers.set(sName, { mobile, address });
    }
  });

  const rows = [];
  existingCustomers.forEach((data, name) => {
    rows.push([name, data.mobile, data.address]);
  });

  if (rows.length > 0) {
    sheet.getRange(2, 1, rows.length, 3).setValues(rows);
  }

  return sheet;
}

function jsonResponse(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

function ensureCustomerTitleHeader(sheet, customerName, address, mobile) {
  const firstCell = String(sheet.getRange(1, 1).getValue() || '').trim();
  const insertedNew = firstCell === 'তারিখ';

  if (insertedNew) {
    sheet.insertRowsBefore(1, 2);
  }

  const lastCol = HEADERS.length;
  const nameText = customerName || sheet.getName();

  const phoneText = mobile ? `📞 মোবাইল: ${mobile}` : '';
  const addrText = address ? `📍 ঠিকানা: ${address}` : '';
  const metaText = [phoneText, addrText].filter(Boolean).join('   |   ') || 'কাস্টমার হিসাব শিট';

  const row1Cell = sheet.getRange(1, 1);
  const row1Value = String(row1Cell.getValue() || '').trim();
  if (insertedNew || row1Value === '') {
    sheet.getRange(1, 1, 1, lastCol).merge();
    row1Cell
      .setValue(nameText)
      .setFontSize(18)
      .setFontWeight('bold')
      .setFontColor('#ffffff')
      .setBackground('#1e3a8a')
      .setHorizontalAlignment('center')
      .setVerticalAlignment('middle');
    sheet.setRowHeight(1, 42);
  } else {
    try { sheet.getRange(1, 1, 1, lastCol).merge(); } catch (er) {}
  }

  const row2Cell = sheet.getRange(2, 1);
  const row2Value = String(row2Cell.getValue() || '').trim();
  if (insertedNew || row2Value === '') {
    sheet.getRange(2, 1, 1, lastCol).merge();
    row2Cell
      .setValue(metaText)
      .setFontSize(11)
      .setFontWeight('bold')
      .setFontColor('#ffffff')
      .setBackground('#2563eb')
      .setHorizontalAlignment('center')
      .setVerticalAlignment('middle');
    sheet.setRowHeight(2, 28);
  } else {
    try { sheet.getRange(2, 1, 1, lastCol).merge(); } catch (er) {}
  }
}

function styleSheet(sheet, customerName, address, mobile) {
  ensureCustomerTitleHeader(sheet, customerName, address, mobile);

  const headerRow = 3;
  const lastColumn = HEADERS.length;
  const lastRow = Math.max(sheet.getLastRow(), headerRow);

  sheet.setFrozenRows(headerRow);
  sheet.setHiddenGridlines(true);
  sheet.getRange(headerRow, 1, 1, lastColumn)
    .setFontWeight('bold')
    .setFontColor('#ffffff')
    .setBackground('#1f4e78')
    .setHorizontalAlignment('center')
    .setVerticalAlignment('middle');
  sheet.getRange(headerRow, 1).setBackground('#0f766e');
  sheet.getRange(headerRow, 2).setBackground('#b45309');
  sheet.getRange(headerRow, 9, 1, 4).setBackground('#2563eb');
  sheet.getRange(headerRow, 13, 1, 4).setBackground('#7c3aed');
  sheet.setRowHeight(headerRow, 34);

  if (!sheet.getFilter()) {
    try {
      sheet.getRange(headerRow, 1, Math.max(lastRow - headerRow + 1, 2), lastColumn).createFilter();
    } catch (er) {}
  }

  if (lastRow > headerRow) {
    sheet.getRange(headerRow + 1, 1, lastRow - headerRow, lastColumn)
      .setFontColor('#1f2937')
      .setVerticalAlignment('middle')
      .setBorder(true, true, true, true, true, true, '#d9e2f3', SpreadsheetApp.BorderStyle.SOLID);
    sheet.getRange(headerRow + 1, 1, lastRow - headerRow, 1).setNumberFormat('yyyy-mm-dd');
    sheet.getRange(headerRow + 1, 4, lastRow - headerRow, 4)
      .setNumberFormat('#,##0.##')
      .setHorizontalAlignment('right');
    sheet.getRange(headerRow + 1, 9, lastRow - headerRow, 8)
      .setNumberFormat('#,##0.##')
      .setHorizontalAlignment('right');
    for (let row = headerRow + 1; row <= lastRow; row += 1) {
      if (row % 2 === 0) {
        sheet.getRange(row, 1, 1, lastColumn).setBackground('#f8fbff');
      }
    }
  }

  const widths = [100, 160, 120, 80, 80, 80, 90, 180, 80, 80, 80, 90, 110, 110, 110, 110, 110];
  widths.forEach((width, index) => sheet.setColumnWidth(index + 1, width));
  sheet.getRange(1, 1, lastRow, lastColumn).setWrapStrategy(SpreadsheetApp.WrapStrategy.CLIP);
}

function removeTotalsRow(sheet) {
  const lastRow = sheet.getLastRow();
  const headerRow = getHeaderRowIndex(sheet);
  if (lastRow <= headerRow) return;

  const firstColumnValues = sheet.getRange(headerRow + 1, 1, lastRow - headerRow, 1).getValues();
  for (let index = firstColumnValues.length - 1; index >= 0; index -= 1) {
    if (String(firstColumnValues[index][0]).trim() === 'মোট') {
      sheet.deleteRow(index + headerRow + 1);
    }
  }
}

function addTotalsRow(sheet, customerName, address, mobile) {
  removeTotalsRow(sheet);
  const headerRow = getHeaderRowIndex(sheet);
  const dataStartRow = headerRow + 1;
  const totalRow = sheet.getLastRow() + 1;
  sheet.getRange(totalRow, 1, 1, HEADERS.length).setValues([[
    'মোট', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '',
  ]]);
  sheet.getRange(totalRow, 13, 1, 4).setFormulas([[
    `=SUM(M${dataStartRow}:M${totalRow - 1})`,
    `=SUM(N${dataStartRow}:N${totalRow - 1})`,
    `=MAX(N${totalRow}-M${totalRow},0)`,
    `=MAX(M${totalRow}-N${totalRow},0)`,
  ]]);
  styleSheet(sheet, customerName, address, mobile);
  sheet.getRange(totalRow, 1, 1, HEADERS.length)
    .setFontWeight('bold')
    .setFontColor('#7f6000')
    .setBackground('#fff2cc')
    .setBorder(true, true, true, true, true, true, '#d6b656', SpreadsheetApp.BorderStyle.SOLID);
  sheet.getRange(totalRow, 13, 1, 4)
    .setNumberFormat('৳ #,##0.##')
    .setFontSize(12)
    .setFontWeight('bold')
    .setHorizontalAlignment('right');
}

function doGet(e) {
  const action = (e && e.parameter && e.parameter.action) || '';
  const sheetName = (e && e.parameter && e.parameter.sheetName) || '';
  const spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);

  if (action === 'summary') {
    let globalDeposited = 0;
    let globalRemaining = 0;
    let globalDue = 0;
    let totalCustomers = 0;

    spreadsheet.getSheets().forEach((sheet) => {
      if (sheet.getName() === 'Customers') return;
      const values = sheet.getDataRange().getValues();
      const totalRow = values.find((row) => String(row[0] || '').trim() === 'মোট');
      if (totalRow) {
        globalDeposited += (Number(totalRow[13]) || 0);
        globalRemaining += (Number(totalRow[14]) || 0);
        globalDue += (Number(totalRow[15]) || 0);
        totalCustomers++;
      }
    });

    return jsonResponse({
      ok: true,
      totalCustomers,
      globalDeposited,
      globalRemaining,
      globalDue,
    });
  }

  if (action === 'customerSummary' && sheetName) {
    const sheet = spreadsheet.getSheetByName(sheetName);
    if (!sheet) {
      return jsonResponse({ ok: true, deposited: 0, remaining: 0, due: 0 });
    }

    const values = sheet.getDataRange().getValues();
    const totalRow = values.find((row) => String(row[0] || '').trim() === 'মোট');
    if (!totalRow) {
      return jsonResponse({ ok: true, deposited: 0, remaining: 0, due: 0 });
    }

    return jsonResponse({
      ok: true,
      deposited: Number(totalRow[13]) || 0,
      remaining: Number(totalRow[14]) || 0,
      due: Number(totalRow[15]) || 0,
      totalAmount: Number(totalRow[12]) || 0,
    });
  }

  if (action === 'openSheet' && sheetName) {
    const sheet = spreadsheet.getSheetByName(sheetName);

    if (!sheet) {
      return jsonResponse({ ok: false, message: 'Sheet not found: ' + sheetName });
    }

    const sheetUrl =
      'https://docs.google.com/spreadsheets/d/' +
      SPREADSHEET_ID +
      '/edit#gid=' +
      sheet.getSheetId();

    return HtmlService.createHtmlOutput(
      '<script>window.location.href = ' + JSON.stringify(sheetUrl) + ';</script>'
    );
  }

  if (action === 'getCustomers') {
    ensureCustomersSheet(spreadsheet);
    resyncAllCustomersMeta(spreadsheet);
    const sheet = spreadsheet.getSheetByName('Customers');
    const values = sheet.getDataRange().getValues();
    const customers = [];
    if (values.length > 1) {
      for (let i = 1; i < values.length; i++) {
        const cName = String(values[i][0] || '').trim();
        if (cName) {
          customers.push({
            name: cName,
            mobile: String(values[i][1] || '').trim(),
            address: String(values[i][2] || '').trim()
          });
        }
      }
    }
    return jsonResponse({ ok: true, customers });
  }

  if (action === 'getNextChallanNo') {
    const props = PropertiesService.getScriptProperties();
    let nextChallan = parseInt(props.getProperty('NextChallanNo'), 10);

    if (isNaN(nextChallan)) {
      let max = 4999;
      spreadsheet.getSheets().forEach(sheet => {
        const lastRow = sheet.getLastRow();
        const headerRow = getHeaderRowIndex(sheet);
        if (lastRow <= headerRow) return;

        try {
          const challanCol = sheet.getRange(headerRow + 1, 17, lastRow - headerRow, 1).getValues();
          challanCol.forEach(row => {
            const val = parseInt(row[0], 10);
            if (!isNaN(val) && val > max) max = val;
          });
        } catch (e) {
        }
      });
      nextChallan = max + 1;
      props.setProperty('NextChallanNo', String(nextChallan));
    }

    return jsonResponse({ ok: true, nextChallanNo: nextChallan });
  }

  return jsonResponse({ ok: true, message: 'doGet works' });
}

/**
 * Creates a brand-new, fully-formatted customer sheet.
 *
 * Final layout:
 *   Row 1 — Branded title (গ্রাহকের নাম, blue background)
 *   Row 2 — Meta info (📞 মোবাইল / 📍 ঠিকানা)
 *   Row 3 — Column headers (তারিখ, গ্রাহকের নাম, গাড়ি, …, চালান নং)
 *   Row 4+ — Data rows (formulas applied automatically via applyCalculatedRow on edit)
 *
 * All calculations (ফুট, টাকা, অবশিষ্ট, পাওনা) work automatically through
 * the onEdit trigger and applyCalculatedRow once the first sale row is added.
 */
function createCustomerSheet(spreadsheet, customerName, mobile, address) {
  // Reuse existing sheet if present, otherwise create fresh
  let sheet = spreadsheet.getSheetByName(customerName);
  if (!sheet) {
    sheet = spreadsheet.insertSheet(customerName);
  }

  // Write HEADERS to row 1 first so ensureCustomerTitleHeader detects
  // firstCell === 'তারিখ' and inserts the two branded title rows above it.
  sheet.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS]);

  // styleSheet internally calls ensureCustomerTitleHeader which:
  //   - sees row-1 = 'তারিখ'  → inserts 2 rows above  → layout becomes rows 1/2/3
  //   - then styles the header row (now row 3), sets column widths, freeze, filter, etc.
  styleSheet(sheet, customerName, address, mobile);

  // Sync name/mobile/address to the Customers registry sheet
  syncCustomerMetaToCustomersSheet(sheet);

  return sheet;
}

function doPost(e) {
  try {
    const payload = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    const spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);

    if (payload.action === 'addCustomer') {
      const customersSheet = ensureCustomersSheet(spreadsheet);
      const name = String(payload.name || '').trim();
      const mobile = String(payload.mobile || '').trim();
      const address = String(payload.address || '').trim();
      if (!name) return jsonResponse({ ok: false, message: 'Name missing' });

      // Check duplicate in Customers registry sheet
      const values = customersSheet.getDataRange().getValues();
      for (let i = 1; i < values.length; i++) {
        if (String(values[i][0]).trim().toLowerCase() === name.toLowerCase()) {
          // Customer entry exists — ensure their sheet also exists and is formatted
          let existingSheet = spreadsheet.getSheetByName(name);
          if (!existingSheet) {
            existingSheet = createCustomerSheet(spreadsheet, name, mobile, address);
          }
          return jsonResponse({ ok: true, message: 'Already exists', sheetCreated: false });
        }
      }

      // Add to Customers registry
      customersSheet.appendRow([name, mobile, address]);

      // Create and fully format the customer's own sheet
      createCustomerSheet(spreadsheet, name, mobile, address);

      return jsonResponse({ ok: true, message: 'Added customer', sheetCreated: true });
    }

    if (payload.action === 'deleteCustomer') {
      const customersSheet = ensureCustomersSheet(spreadsheet);
      const name = String(payload.name || '').trim();
      if (!name) return jsonResponse({ ok: false, message: 'Name missing' });

      let customersFoundIdx = -1;
      const cValues = customersSheet.getDataRange().getValues();
      for (let i = 1; i < cValues.length; i++) {
        if (String(cValues[i][0]).trim().toLowerCase() === name.toLowerCase()) {
          customersFoundIdx = i + 1;
          break;
        }
      }

      let targetSheet = null;
      const allSheets = spreadsheet.getSheets();
      for (let i = 0; i < allSheets.length; i++) {
        const s = allSheets[i];
        const sName = s.getName();
        if (sName.toLowerCase() === name.toLowerCase()) {
          targetSheet = s;
          break;
        }
      }

      const safeName = targetSheet ? targetSheet.getName() : name;
      let deletedSheet = false;

      if (targetSheet) {
        try {
          if (allSheets.length <= 2) {
            if (!spreadsheet.getSheetByName('__temp_placeholder__')) {
              try {
                spreadsheet.insertSheet('__temp_placeholder__');
              } catch (eT) {}
            }
          }
          spreadsheet.deleteSheet(targetSheet);
          deletedSheet = true;
          const temp = spreadsheet.getSheetByName('__temp_placeholder__');
          if (temp && spreadsheet.getSheets().length > 1) {
            try { spreadsheet.deleteSheet(temp); } catch (eT) {}
          }
        } catch (er) {}
      }

      if (customersFoundIdx !== -1) {
        try {
          customersSheet.deleteRow(customersFoundIdx);
        } catch (er) {}
      }

      return jsonResponse({
        ok: true,
        message: deletedSheet ? 'Deleted customer and sheet' : (customersFoundIdx !== -1 ? 'Deleted customer entry' : 'Not found')
      });
    }

    const sheetName = String(payload.sheetName || payload.customer || '').trim();

    if (!sheetName) {
      return jsonResponse({ ok: false, message: 'Missing sheetName/customer' });
    }

    let sheet = spreadsheet.getSheetByName(sheetName);
    if (!sheet) sheet = spreadsheet.insertSheet(sheetName);

    ensureCustomerTitleHeader(sheet, sheetName, payload.address || '', payload.mobile || '');

    removeTotalsRow(sheet);
    sheet.getRange(3, 1, 1, HEADERS.length).setValues([HEADERS]);

    const props = PropertiesService.getScriptProperties();
    let currentNext = parseInt(props.getProperty('NextChallanNo'), 10) || 5000;
    let challanNo = parseInt(payload.challanNo, 10);

    if (isNaN(challanNo) || challanNo < currentNext) {
      challanNo = currentNext;
    }

    props.setProperty('NextChallanNo', String(challanNo + 1));

    sheet.appendRow([
      payload.date || '',
      payload.customer || '',
      payload.vehicle || '',
      payload.length != null ? Number(payload.length) : '',
      payload.width != null ? Number(payload.width) : '',
      payload.height != null ? Number(payload.height) : '',
      payload.vehicleMeasurementFeet != null ? Number(payload.vehicleMeasurementFeet) : '',
      payload.description || '',
      Number(payload.tons || 0),
      Number(payload.feetPerTon || 0),
      Number(payload.feet || 0),
      Number(payload.rate || 0),
      Number(payload.amount || 0),
      Number(payload.deposited || 0),
      Number(payload.remaining || 0),
      Number(payload.due || 0),
      challanNo,
    ]);
    applyCalculatedRow(sheet, sheet.getLastRow());
    addTotalsRow(sheet, sheetName, payload.address || '', payload.mobile || '');

    return jsonResponse({ ok: true, message: 'Inserted successfully', sheetName, challanNo });
  } catch (error) {
    return jsonResponse({ ok: false, message: error.message });
  }
}
