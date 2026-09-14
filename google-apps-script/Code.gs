const SPREADSHEET_ID = '1c7ZyUibkflrm-lOp_eVpmYEge1hriMZAGB93-G-CWCk';

// গ্রাহকের নাম টপ রো-তে (row 1) থাকবে — data column-এ থাকবে না
// দৈর্ঘ্য/প্রস্থ/উচ্চতা শিটে যাবে না — শুধু ফুট যাবে
const HEADERS = [
  'তারিখ',              // A=1
  'গাড়ি',               // B=2
  'গাড়ির পরিমাপ (ফুট)', // C=3
  'বিবরণ',              // D=4
  'টন',                 // E=5
  'গুণ',                // F=6
  'ফুট',                // G=7
  'দর',                 // H=8
  'টাকা',               // I=9
  'জমা',                // J=10
  'অবশিষ্ট',           // K=11
  'পাওনা',              // L=12
  'চালান নং',          // M=13
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
 * applyCalculatedRow — নতুন 13-column layout:
 *   A=1  তারিখ
 *   B=2  গাড়ি
 *   C=3  গাড়ির পরিমাপ (ফুট)  — measurement mode-এ ফুট আসে, নইলে 0
 *   D=4  বিবরণ
 *   E=5  টন
 *   F=6  গুণ
 *   G=7  ফুট       = C যদি C>0, নাহলে E×F
 *   H=8  দর
 *   I=9  টাকা      = G×H
 *   J=10 জমা
 *   K=11 অবশিষ্ট   = MAX(cumulative জমা − cumulative টাকা, 0)
 *   L=12 পাওনা     = MAX(cumulative টাকা − cumulative জমা, 0)
 *   M=13 চালান নং
 */
function applyCalculatedRow(sheet, row) {
  const headerRow = getHeaderRowIndex(sheet);
  const dataStartRow = headerRow + 1;
  if (row <= headerRow || row > sheet.getLastRow()) return;

  try {
    // গাড়ির পরিমাপ (C=3)
    sheet.getRange(row, 3).setValue(toNumber(sheet.getRange(row, 3).getValue()));

    // টন (E=5), গুণ (F=6)
    const tonVals = sheet.getRange(row, 5, 1, 2).getValues()[0];
    sheet.getRange(row, 5, 1, 2).setValues([[
      toNumber(tonVals[0]),
      toNumber(tonVals[1]),
    ]]);

    // দর (H=8), জমা (J=10)
    sheet.getRange(row, 8).setValue(toNumber(sheet.getRange(row, 8).getValue()));
    sheet.getRange(row, 10).setValue(toNumber(sheet.getRange(row, 10).getValue()));
  } catch (e) {}

  // ── Col G (7): ফুট = C যদি C>0, নাহলে E×F
  sheet.getRange(row, 7).setFormula(
    `=IF(C${row}>0,C${row},E${row}*F${row})`
  );

  // ── Col I (9): টাকা = G × H
  sheet.getRange(row, 9).setFormula(`=G${row}*H${row}`);

  // ── Col K (11): অবশিষ্ট
  sheet.getRange(row, 11).setFormula(
    `=MAX(SUM($J$${dataStartRow}:J${row})-SUM($I$${dataStartRow}:I${row}),0)`
  );

  // ── Col L (12): পাওনা
  sheet.getRange(row, 12).setFormula(
    `=MAX(SUM($I$${dataStartRow}:I${row})-SUM($J$${dataStartRow}:J${row}),0)`
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
    if (cache.get(cacheKey)) return;
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

    rebuildTotalsRow(sheet, sheet.getName(), address, mobile);
  } catch (err) {}
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
  } catch (err) {}
}

function onOpen() {}

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
    if (sName) existingCustomers.set(sName, { mobile, address });
  });

  const rows = [];
  existingCustomers.forEach((data, name) => rows.push([name, data.mobile, data.address]));
  if (rows.length > 0) sheet.getRange(2, 1, rows.length, 3).setValues(rows);

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
  const lastColumn = HEADERS.length; // 13
  const lastRow = Math.max(sheet.getLastRow(), headerRow);

  sheet.setFrozenRows(headerRow);
  sheet.setHiddenGridlines(true);

  // Header row styling
  sheet.getRange(headerRow, 1, 1, lastColumn)
    .setFontWeight('bold')
    .setFontColor('#ffffff')
    .setBackground('#1f4e78')
    .setHorizontalAlignment('center')
    .setVerticalAlignment('middle');

  // তারিখ (A=1) — সবুজ
  sheet.getRange(headerRow, 1).setBackground('#0f766e');
  // গাড়ি (B=2) — বাদামি
  sheet.getRange(headerRow, 2).setBackground('#b45309');
  // টন-ফুট (E=5 থেকে H=8) — নীল
  sheet.getRange(headerRow, 5, 1, 4).setBackground('#2563eb');
  // টাকা-পাওনা (I=9 থেকে L=12) — বেগুনি
  sheet.getRange(headerRow, 9, 1, 4).setBackground('#7c3aed');
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

    // তারিখ (A=1)
    sheet.getRange(headerRow + 1, 1, lastRow - headerRow, 1).setNumberFormat('yyyy-mm-dd');

    // গাড়ির পরিমাপ (C=3) — decimal
    sheet.getRange(headerRow + 1, 3, lastRow - headerRow, 1)
      .setNumberFormat('#,##0.##')
      .setHorizontalAlignment('right');

    // টন থেকে পাওনা (E=5 থেকে L=12)
    sheet.getRange(headerRow + 1, 5, lastRow - headerRow, 8)
      .setNumberFormat('#,##0.##')
      .setHorizontalAlignment('right');

    for (let row = headerRow + 1; row <= lastRow; row += 1) {
      if (row % 2 === 0) {
        sheet.getRange(row, 1, 1, lastColumn).setBackground('#f8fbff');
      }
    }
  }

  // Column widths — 13-column layout
  // A=তারিখ, B=গাড়ি, C=গাড়ির পরিমাপ, D=বিবরণ, E=টন, F=গুণ,
  // G=ফুট, H=দর, I=টাকা, J=জমা, K=অবশিষ্ট, L=পাওনা, M=চালান নং
  const widths = [100, 120, 110, 180, 80, 80, 80, 90, 110, 110, 110, 110, 110];
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

  // 13 column
  sheet.getRange(totalRow, 1, 1, HEADERS.length).setValues([[
    'মোট', '', '', '', '', '', '', '', '', '', '', '', '',
  ]]);

  // I=9 টাকা, J=10 জমা, K=11 অবশিষ্ট, L=12 পাওনা
  sheet.getRange(totalRow, 9, 1, 4).setFormulas([[
    `=SUM(I${dataStartRow}:I${totalRow - 1})`,
    `=SUM(J${dataStartRow}:J${totalRow - 1})`,
    `=MAX(J${totalRow}-I${totalRow},0)`,
    `=MAX(I${totalRow}-J${totalRow},0)`,
  ]]);

  styleSheet(sheet, customerName, address, mobile);
  sheet.getRange(totalRow, 1, 1, HEADERS.length)
    .setFontWeight('bold')
    .setFontColor('#7f6000')
    .setBackground('#fff2cc')
    .setBorder(true, true, true, true, true, true, '#d6b656', SpreadsheetApp.BorderStyle.SOLID);
  sheet.getRange(totalRow, 9, 1, 4)
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
        // J=col10(idx9)=জমা, K=col11(idx10)=অবশিষ্ট, L=col12(idx11)=পাওনা
        globalDeposited += (Number(totalRow[9]) || 0);
        globalRemaining += (Number(totalRow[10]) || 0);
        globalDue += (Number(totalRow[11]) || 0);
        totalCustomers++;
      }
    });

    return jsonResponse({ ok: true, totalCustomers, globalDeposited, globalRemaining, globalDue });
  }

  if (action === 'customerSummary' && sheetName) {
    const sheet = spreadsheet.getSheetByName(sheetName);
    if (!sheet) return jsonResponse({ ok: true, deposited: 0, remaining: 0, due: 0 });

    const values = sheet.getDataRange().getValues();
    const totalRow = values.find((row) => String(row[0] || '').trim() === 'মোট');
    if (!totalRow) return jsonResponse({ ok: true, deposited: 0, remaining: 0, due: 0 });

    // I=col9(idx8)=টাকা, J=col10(idx9)=জমা, K=col11(idx10)=অবশিষ্ট, L=col12(idx11)=পাওনা
    return jsonResponse({
      ok: true,
      deposited: Number(totalRow[9]) || 0,
      remaining: Number(totalRow[10]) || 0,
      due: Number(totalRow[11]) || 0,
      totalAmount: Number(totalRow[8]) || 0,
    });
  }

  if (action === 'openSheet' && sheetName) {
    const sheet = spreadsheet.getSheetByName(sheetName);
    if (!sheet) return jsonResponse({ ok: false, message: 'Sheet not found: ' + sheetName });

    const sheetUrl =
      'https://docs.google.com/spreadsheets/d/' +
      SPREADSHEET_ID + '/edit#gid=' + sheet.getSheetId();

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
          // চালান নং এখন M=col13
          const challanCol = sheet.getRange(headerRow + 1, 13, lastRow - headerRow, 1).getValues();
          challanCol.forEach(row => {
            const val = parseInt(row[0], 10);
            if (!isNaN(val) && val > max) max = val;
          });
        } catch (e) {}
      });
      nextChallan = max + 1;
      props.setProperty('NextChallanNo', String(nextChallan));
    }

    return jsonResponse({ ok: true, nextChallanNo: nextChallan });
  }

  return jsonResponse({ ok: true, message: 'doGet works' });
}

function createCustomerSheet(spreadsheet, customerName, mobile, address) {
  let sheet = spreadsheet.getSheetByName(customerName);
  if (!sheet) sheet = spreadsheet.insertSheet(customerName);

  sheet.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS]);
  styleSheet(sheet, customerName, address, mobile);
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

      const values = customersSheet.getDataRange().getValues();
      for (let i = 1; i < values.length; i++) {
        if (String(values[i][0]).trim().toLowerCase() === name.toLowerCase()) {
          let existingSheet = spreadsheet.getSheetByName(name);
          if (!existingSheet) existingSheet = createCustomerSheet(spreadsheet, name, mobile, address);
          return jsonResponse({ ok: true, message: 'Already exists', sheetCreated: false });
        }
      }

      customersSheet.appendRow([name, mobile, address]);
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
        if (allSheets[i].getName().toLowerCase() === name.toLowerCase()) {
          targetSheet = allSheets[i];
          break;
        }
      }

      let deletedSheet = false;
      if (targetSheet) {
        try {
          if (allSheets.length <= 2) {
            if (!spreadsheet.getSheetByName('__temp_placeholder__')) {
              try { spreadsheet.insertSheet('__temp_placeholder__'); } catch (eT) {}
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
        try { customersSheet.deleteRow(customersFoundIdx); } catch (er) {}
      }

      return jsonResponse({
        ok: true,
        message: deletedSheet ? 'Deleted customer and sheet' : (customersFoundIdx !== -1 ? 'Deleted customer entry' : 'Not found')
      });
    }

    if (payload.action === 'depositOnly') {
      const depositSheetName = String(payload.sheetName || payload.customer || '').trim();
      if (!depositSheetName) return jsonResponse({ ok: false, message: 'Missing sheetName' });

      let depositSheet = spreadsheet.getSheetByName(depositSheetName);
      if (!depositSheet) return jsonResponse({ ok: false, message: 'Sheet not found: ' + depositSheetName });

      ensureCustomerTitleHeader(depositSheet, depositSheetName, payload.address || '', payload.mobile || '');
      removeTotalsRow(depositSheet);
      depositSheet.getRange(3, 1, 1, HEADERS.length).setValues([HEADERS]);

      // 13 column — deposit row
      depositSheet.appendRow([
        payload.date || '',          // A তারিখ
        '',                          // B গাড়ি
        0,                           // C গাড়ির পরিমাপ (ফুট)
        'জমা',                       // D বিবরণ
        0,                           // E টন
        0,                           // F গুণ
        0,                           // G ফুট
        0,                           // H দর
        0,                           // I টাকা
        Number(payload.deposited || 0), // J জমা
        0,                           // K অবশিষ্ট
        0,                           // L পাওনা
        '',                          // M চালান নং
      ]);
      applyCalculatedRow(depositSheet, depositSheet.getLastRow());
      addTotalsRow(depositSheet, depositSheetName, payload.address || '', payload.mobile || '');

      return jsonResponse({ ok: true, message: 'Deposit added', sheetName: depositSheetName });
    }

    // ── সাধারণ sale entry ──
    const sheetName = String(payload.sheetName || payload.customer || '').trim();
    if (!sheetName) return jsonResponse({ ok: false, message: 'Missing sheetName/customer' });

    let sheet = spreadsheet.getSheetByName(sheetName);
    if (!sheet) sheet = spreadsheet.insertSheet(sheetName);

    ensureCustomerTitleHeader(sheet, sheetName, payload.address || '', payload.mobile || '');
    removeTotalsRow(sheet);
    sheet.getRange(3, 1, 1, HEADERS.length).setValues([HEADERS]);

    const props = PropertiesService.getScriptProperties();
    let currentNext = parseInt(props.getProperty('NextChallanNo'), 10) || 5000;
    let challanNo = parseInt(payload.challanNo, 10);
    if (isNaN(challanNo) || challanNo < currentNext) challanNo = currentNext;
    props.setProperty('NextChallanNo', String(challanNo + 1));

    // 13 column — দৈর্ঘ্য/প্রস্থ/উচ্চতা পাঠানো হবে না
    // vehicleMeasurementFeet = measurement mode-এ ফুট, নইলে 0
    const vehicleFeet = payload.vehicleMeasurementFeet != null ? Number(payload.vehicleMeasurementFeet) : 0;

    sheet.appendRow([
      payload.date || '',              // A তারিখ
      payload.vehicle || '',           // B গাড়ি
      vehicleFeet,                     // C গাড়ির পরিমাপ (ফুট)
      payload.description || '',       // D বিবরণ
      Number(payload.tons || 0),       // E টন
      Number(payload.feetPerTon || 0), // F গুণ
      Number(payload.feet || 0),       // G ফুট
      Number(payload.rate || 0),       // H দর
      Number(payload.amount || 0),     // I টাকা
      Number(payload.deposited || 0),  // J জমা
      Number(payload.remaining || 0),  // K অবশিষ্ট
      Number(payload.due || 0),        // L পাওনা
      challanNo,                       // M চালান নং
    ]);
    applyCalculatedRow(sheet, sheet.getLastRow());
    addTotalsRow(sheet, sheetName, payload.address || '', payload.mobile || '');

    return jsonResponse({ ok: true, message: 'Inserted successfully', sheetName, challanNo });
  } catch (error) {
    return jsonResponse({ ok: false, message: error.message });
  }
}
