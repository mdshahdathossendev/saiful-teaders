const SPREADSHEET_ID = '17iutMCNZLbWFj4SVTkFje8z9oxlR67KQPCXU45lH0LQ';

// গ্রাহকের নাম টপ রো-তে (row 1) থাকবে — data column-এ থাকবে না
// গাড়ির পরিমাপ, গুণ ও চালান নম্বর শিটে সংরক্ষণ হবে না
const HEADERS = [
  'তারিখ',                   // A=1
  'গাড়ি',                    // B=2
  'বিবরণ',                   // C=3
  'টন',                      // D=4
  'ফুট',                     // E=5
  'দর',                      // F=6
  'টাকা',                    // G=7
  'জমা',                     // H=8
  'অবশিষ্ট',                 // I=9
  'পাওনা',                   // J=10
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

function migrateRemovedColumns(sheet) {
  const headerRow = getHeaderRowIndex(sheet);
  const lastColumn = sheet.getLastColumn();
  if (lastColumn < 1) return;

  const headers = sheet.getRange(headerRow, 1, 1, lastColumn).getDisplayValues()[0];
  const removedHeaders = new Set([
    normalizeText('গাড়ির পরিমাপ (CFT)'),
    normalizeText('গুণ'),
    normalizeText('চালান নং'),
  ]);
  const columnsToRemove = [];
  headers.forEach((header, index) => {
    if (removedHeaders.has(normalizeText(header))) columnsToRemove.push(index + 1);
  });
  if (columnsToRemove.length === 0) return;

  const challanColumn = headers.findIndex((header) =>
    normalizeText(header) === normalizeText('চালান নং')
  );
  if (challanColumn !== -1) {
    const lastRow = sheet.getLastRow();
    if (lastRow > headerRow) {
      const challans = sheet.getRange(headerRow + 1, challanColumn + 1, lastRow - headerRow, 1).getValues();
      let maxChallan = 4999;
      challans.forEach((row) => {
        const value = parseInt(row[0], 10);
        if (!isNaN(value) && value > maxChallan) maxChallan = value;
      });
      const properties = PropertiesService.getScriptProperties();
      const nextChallan = parseInt(properties.getProperty('NextChallanNo'), 10);
      if (isNaN(nextChallan) || nextChallan <= maxChallan) {
        properties.setProperty('NextChallanNo', String(maxChallan + 1));
      }
    }
  }

  if (headerRow > 1) sheet.getRange(1, 1, 2, lastColumn).breakApart();
  columnsToRemove.sort((a, b) => b - a).forEach((column) => sheet.deleteColumn(column));
  sheet.getRange(headerRow, 1, 1, HEADERS.length).setValues([HEADERS]);
  if (headerRow > 1) {
    sheet.getRange(1, 1, 1, HEADERS.length).merge();
    sheet.getRange(2, 1, 1, HEADERS.length).merge();
  }
}

/**
 * applyCalculatedRow — 10-column layout:
 *   A=1 তারিখ, B=2 গাড়ি, C=3 বিবরণ, D=4 টন, E=5 ফুট,
 *   F=6 দর, G=7 টাকা, H=8 জমা, I=9 অবশিষ্ট, J=10 পাওনা
 */
function applyCalculatedRow(sheet, row) {
  // এই ফাংশন এখন কিছু করে না — সব data সরাসরি value হিসেবে যায়
  // শুধু মোট রো-তে formula থাকবে (addTotalsRow এ)
}


function refreshCalculatedRows(sheet) {
  // সব data রো plain value — কিছু করার নেই
  // মোট রো addTotalsRow এ handle হয়
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
        // data row এডিট করলে শুধু মোট রো rebuild করি — formula বসাই না
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
  migrateRemovedColumns(sheet);
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
  // টন থেকে দর (D=4 থেকে F=6) — নীল
  sheet.getRange(headerRow, 4, 1, 3).setBackground('#2563eb');
  // টাকা-পাওনা (G=7 থেকে J=10) — বেগুনি
  sheet.getRange(headerRow, 7, 1, 4).setBackground('#7c3aed');
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
      .setHorizontalAlignment('center')
      .setBorder(true, true, true, true, true, true, '#d9e2f3', SpreadsheetApp.BorderStyle.SOLID);

    // তারিখ (A=1)
    sheet.getRange(headerRow + 1, 1, lastRow - headerRow, 1).setNumberFormat('yyyy-mm-dd');

    // টন থেকে পাওনা (D=4 থেকে J=10)
    sheet.getRange(headerRow + 1, 4, lastRow - headerRow, 7)
      .setNumberFormat('#,##0.##')
      .setHorizontalAlignment('center');

    // বিবরণ (C=3) ও গাড়ি (B=2) — left align
    sheet.getRange(headerRow + 1, 2, lastRow - headerRow, 1).setHorizontalAlignment('left');
    sheet.getRange(headerRow + 1, 3, lastRow - headerRow, 1).setHorizontalAlignment('left');

    for (let row = headerRow + 1; row <= lastRow; row += 1) {
      if (row % 2 === 0) {
        sheet.getRange(row, 1, 1, lastColumn).setBackground('#f8fbff');
      }
    }
  }

  // Column widths — 10-column layout
  const widths = [100, 120, 180, 80, 80, 90, 110, 110, 110, 110];
  widths.forEach((width, index) => sheet.setColumnWidth(index + 1, width));
  sheet.getRange(1, 1, lastRow, lastColumn).setWrapStrategy(SpreadsheetApp.WrapStrategy.CLIP);
}

function removeTotalsRow(sheet) {
  migrateRemovedColumns(sheet);
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

  // 10 column
  sheet.getRange(totalRow, 1, 1, HEADERS.length).setValues([[
    'মোট', '', '', '', '', '', '', '', '', '',
  ]]);

  // G=7 টাকা, H=8 জমা, I=9 অবশিষ্ট, J=10 পাওনা
  sheet.getRange(totalRow, 7, 1, 4).setFormulas([[
    `=SUM(G${dataStartRow}:G${totalRow - 1})`,
    `=SUM(H${dataStartRow}:H${totalRow - 1})`,
    `=MAX(H${totalRow}-G${totalRow},0)`,
    `=MAX(G${totalRow}-H${totalRow},0)`,
  ]]);

  styleSheet(sheet, customerName, address, mobile);
  sheet.getRange(totalRow, 1, 1, HEADERS.length)
    .setFontWeight('bold')
    .setFontColor('#7f6000')
    .setBackground('#fff2cc')
    .setHorizontalAlignment('center')
    .setBorder(true, true, true, true, true, true, '#d6b656', SpreadsheetApp.BorderStyle.SOLID);
  sheet.getRange(totalRow, 7, 1, 4)
    .setNumberFormat('৳ #,##0.##')
    .setFontSize(12)
    .setFontWeight('bold')
    .setHorizontalAlignment('center');
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
      migrateRemovedColumns(sheet);
      const headerRow = getHeaderRowIndex(sheet);
      const lastRow = sheet.getLastRow();
      if (lastRow <= headerRow) return;

      // data rows থেকে সরাসরি SUM — formula result-এর উপর নির্ভর না করে
      const values = sheet.getRange(headerRow + 1, 1, lastRow - headerRow, HEADERS.length).getValues();
      let sheetAmount = 0;
      let sheetDeposited = 0;
      let hasData = false;

      values.forEach(function(row) {
        const label = String(row[0] || '').trim();
        if (label === 'মোট') return;
        const amt = Number(row[6]) || 0; // G=idx6=টাকা
        const dep = Number(row[7]) || 0; // H=idx7=জমা
        sheetAmount    += amt;
        sheetDeposited += dep;
        if (amt > 0 || dep > 0) hasData = true;
      });

      if (hasData || sheetAmount > 0 || sheetDeposited > 0) {
        globalDeposited += sheetDeposited;
        globalRemaining += Math.max(sheetDeposited - sheetAmount, 0);
        globalDue       += Math.max(sheetAmount - sheetDeposited, 0);
        totalCustomers++;
      }
    });

    return jsonResponse({ ok: true, totalCustomers, globalDeposited, globalRemaining, globalDue });
  }

  if (action === 'customerSummary' && sheetName) {
    const sheet = spreadsheet.getSheetByName(sheetName);
    if (!sheet) return jsonResponse({ ok: true, deposited: 0, remaining: 0, due: 0 });

    migrateRemovedColumns(sheet);
    const headerRow = getHeaderRowIndex(sheet);
    const lastRow = sheet.getLastRow();
    if (lastRow <= headerRow) return jsonResponse({ ok: true, deposited: 0, remaining: 0, due: 0 });

    // মোট রো-র formula result সরাসরি না নিয়ে data rows থেকে সরাসরি SUM করি
    // G=col7(idx6)=টাকা, H=col8(idx7)=জমা
    const dataRange = sheet.getRange(headerRow + 1, 1, lastRow - headerRow, HEADERS.length);
    const values = dataRange.getValues();

    let totalAmount = 0;
    let totalDeposited = 0;

    values.forEach(function(row) {
      const label = String(row[0] || '').trim();
      if (label === 'মোট') return; // totals row বাদ
      totalAmount    += (Number(row[6])  || 0); // G=idx6
      totalDeposited += (Number(row[7])  || 0); // H=idx7
    });

    const remaining = Math.max(totalDeposited - totalAmount, 0);
    const due       = Math.max(totalAmount - totalDeposited, 0);

    return jsonResponse({
      ok: true,
      deposited: totalDeposited,
      remaining: remaining,
      due: due,
      totalAmount: totalAmount,
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
          const headers = sheet.getRange(headerRow, 1, 1, sheet.getLastColumn()).getDisplayValues()[0];
          const challanIndex = findHeaderIndex(headers, ['চালান নং']);
          if (challanIndex < 0) return;
          const challanCol = sheet.getRange(headerRow + 1, challanIndex + 1, lastRow - headerRow, 1).getValues();
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

    if (payload.action === 'previousDue') {
      const pdSheetName = String(payload.sheetName || payload.customer || '').trim();
      if (!pdSheetName) return jsonResponse({ ok: false, message: 'Missing sheetName' });

      let pdSheet = spreadsheet.getSheetByName(pdSheetName);
      if (!pdSheet) return jsonResponse({ ok: false, message: 'Sheet not found: ' + pdSheetName });

      ensureCustomerTitleHeader(pdSheet, pdSheetName, payload.address || '', payload.mobile || '');
      removeTotalsRow(pdSheet);
      pdSheet.getRange(3, 1, 1, HEADERS.length).setValues([HEADERS]);

      const dueAmount = Number(payload.previousDue || 0);

      pdSheet.appendRow([
        payload.date || '',   // A তারিখ
        '',                   // B গাড়ি
        'আগের পাওয়ানা',      // C বিবরণ
        '',                   // D টন
        '',                   // E ফুট
        '',                   // F দর
        dueAmount,            // G টাকা — সরাসরি পাওনার পরিমাণ
        0,                    // H জমা
        0,                    // I অবশিষ্ট
        0,                    // J পাওনা
      ]);

      addTotalsRow(pdSheet, pdSheetName, payload.address || '', payload.mobile || '');

      return jsonResponse({ ok: true, message: 'Previous due added', sheetName: pdSheetName });
    }

    if (payload.action === 'depositOnly') {
      const depositSheetName = String(payload.sheetName || payload.customer || '').trim();
      if (!depositSheetName) return jsonResponse({ ok: false, message: 'Missing sheetName' });

      let depositSheet = spreadsheet.getSheetByName(depositSheetName);
      if (!depositSheet) return jsonResponse({ ok: false, message: 'Sheet not found: ' + depositSheetName });

      ensureCustomerTitleHeader(depositSheet, depositSheetName, payload.address || '', payload.mobile || '');
      removeTotalsRow(depositSheet);
      depositSheet.getRange(3, 1, 1, HEADERS.length).setValues([HEADERS]);

      // 10 column — deposit row
      depositSheet.appendRow([
        payload.date || '',          // A তারিখ
        '',                          // B গাড়ি
        'জমা',                       // C বিবরণ
        '',                          // D টন
        '',                          // E ফুট
        '',                          // F দর
        0,                           // G টাকা
        Number(payload.deposited || 0), // H জমা
        0,                           // I অবশিষ্ট
        0,                           // J পাওনা
      ]);

      // মোট রো addTotalsRow এ recalculated হবে
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

    sheet.appendRow([
      payload.date || '',              // A তারিখ
      payload.vehicle || '',           // B গাড়ি
      payload.description || '',       // C বিবরণ
      Number(payload.tons || 0),       // D টন
      Number(payload.feet || 0),       // E ফুট
      Number(payload.rate || 0),       // F দর
      Number(payload.amount || 0),     // G টাকা
      Number(payload.deposited || 0),  // H জমা
      Number(payload.remaining || 0),  // I অবশিষ্ট
      Number(payload.due || 0),        // J পাওনা
    ]);
    applyCalculatedRow(sheet, sheet.getLastRow());
    addTotalsRow(sheet, sheetName, payload.address || '', payload.mobile || '');

    return jsonResponse({ ok: true, message: 'Inserted successfully', sheetName, challanNo });
  } catch (error) {
    return jsonResponse({ ok: false, message: error.message });
  }
}
