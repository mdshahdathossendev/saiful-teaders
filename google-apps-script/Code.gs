const SPREADSHEET_ID = '1a7jgJUhHwwjCRfuJeQSj2TIiwl1ZHyhVl4WMeS_uOqU';

const HEADERS = [
  'তারিখ',
  'গ্রাহকের নাম',
  'গাড়ি',
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

function applyCalculatedRow(sheet, row) {
  const headerRow = getHeaderRowIndex(sheet);
  const dataStartRow = headerRow + 1;
  if (row <= headerRow || row > sheet.getLastRow()) return;

  sheet.getRange(row, 5, 1, 2).setValues([[
    toNumber(sheet.getRange(row, 5).getValue()),
    toNumber(sheet.getRange(row, 6).getValue()),
  ]]);
  sheet.getRange(row, 8).setValue(toNumber(sheet.getRange(row, 8).getValue()));
  sheet.getRange(row, 10).setValue(toNumber(sheet.getRange(row, 10).getValue()));
  sheet.getRange(row, 7).setFormulaR1C1('=RC[-2]*RC[-1]');
  sheet.getRange(row, 9).setFormulaR1C1('=RC[-2]*RC[-1]');
  sheet.getRange(row, 11).setFormula(`=MAX(SUM($J$${dataStartRow}:J${row})-SUM($I$${dataStartRow}:I${row}),0)`);
  sheet.getRange(row, 12).setFormula(`=MAX(SUM($I$${dataStartRow}:I${row})-SUM($J$${dataStartRow}:J${row}),0)`);
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

// onEdit is intentionally disabled so manual changes in Google Sheets are preserved.
// Formulas are applied automatically only when new rows are submitted via the web app.
function onEdit(e) {
  // intentionally empty — do not re-apply formulas on manual edit
}

// onOpen is intentionally disabled to avoid overwriting manual edits on file open.
function onOpen() {
  // intentionally empty
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
  
  if (firstCell === 'তারিখ') {
    sheet.insertRowsBefore(1, 2);
  }

  const lastCol = HEADERS.length;
  const nameText = customerName || sheet.getName();
  
  const phoneText = mobile ? `📞 মোবাইল: ${mobile}` : '';
  const addrText = address ? `📍 ঠিকানা: ${address}` : '';
  const metaText = [phoneText, addrText].filter(Boolean).join('   |   ') || 'কাস্টমার হিসাব শিট';

  sheet.getRange(1, 1, 1, lastCol).merge();
  sheet.getRange(1, 1)
    .setValue(nameText)
    .setFontSize(18)
    .setFontWeight('bold')
    .setFontColor('#ffffff')
    .setBackground('#1e3a8a')
    .setHorizontalAlignment('center')
    .setVerticalAlignment('middle');
  sheet.setRowHeight(1, 42);

  sheet.getRange(2, 1, 1, lastCol).merge();
  sheet.getRange(2, 1)
    .setValue(metaText)
    .setFontSize(11)
    .setFontWeight('bold')
    .setFontColor('#ffffff')
    .setBackground('#2563eb')
    .setHorizontalAlignment('center')
    .setVerticalAlignment('middle');
  sheet.setRowHeight(2, 28);
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
  sheet.getRange(headerRow, 5, 1, 4).setBackground('#2563eb');
  sheet.getRange(headerRow, 9, 1, 4).setBackground('#7c3aed');
  sheet.setRowHeight(headerRow, 34);

  if (sheet.getFilter()) {
    sheet.getFilter().remove();
  }
  sheet.getRange(headerRow, 1, lastRow - headerRow + 1, lastColumn).createFilter();

  if (lastRow > headerRow) {
    sheet.getRange(headerRow + 1, 1, lastRow - headerRow, lastColumn)
      .setFontColor('#1f2937')
      .setVerticalAlignment('middle')
      .setBorder(true, true, true, true, true, true, '#d9e2f3', SpreadsheetApp.BorderStyle.SOLID);
    sheet.getRange(headerRow + 1, 1, lastRow - headerRow, 1).setNumberFormat('yyyy-mm-dd');
    sheet.getRange(headerRow + 1, 5, lastRow - headerRow, 8)
      .setNumberFormat('#,##0.##')
      .setHorizontalAlignment('right');
    for (let row = headerRow + 1; row <= lastRow; row += 1) {
      if (row % 2 === 0) {
        sheet.getRange(row, 1, 1, lastColumn).setBackground('#f8fbff');
      }
    }
  }

  const widths = [100, 160, 120, 180, 80, 80, 80, 90, 110, 110, 110, 110, 110];
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
    'মোট', '', '', '', '', '', '', '', '', '', '', '', '',
  ]]);
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
        globalDeposited += (Number(totalRow[9]) || 0);
        globalRemaining += (Number(totalRow[10]) || 0);
        globalDue += (Number(totalRow[11]) || 0);
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
      deposited: Number(totalRow[9]) || 0,
      remaining: Number(totalRow[10]) || 0,
      due: Number(totalRow[11]) || 0,
      totalAmount: Number(totalRow[8]) || 0,
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
          const challanCol = sheet.getRange(headerRow + 1, 13, lastRow - headerRow, 1).getValues();
          challanCol.forEach(row => {
            const val = parseInt(row[0], 10);
            if (!isNaN(val) && val > max) max = val;
          });
        } catch (e) {
          // ignore error if column 13 is empty/invalid
        }
      });
      nextChallan = max + 1;
      props.setProperty('NextChallanNo', String(nextChallan));
    }

    return jsonResponse({ ok: true, nextChallanNo: nextChallan });
  }

  return jsonResponse({ ok: true, message: 'doGet works' });
}

function doPost(e) {
  try {
    const payload = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    const spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);

    if (payload.action === 'addCustomer') {
      const sheet = ensureCustomersSheet(spreadsheet);
      const name = String(payload.name || '').trim();
      if (!name) return jsonResponse({ ok: false, message: 'Name missing' });
      
      const values = sheet.getDataRange().getValues();
      for (let i = 1; i < values.length; i++) {
        if (String(values[i][0]).trim().toLowerCase() === name.toLowerCase()) {
          return jsonResponse({ ok: true, message: 'Already exists' });
        }
      }
      sheet.appendRow([name, payload.mobile || '', payload.address || '']);
      return jsonResponse({ ok: true, message: 'Added customer' });
    }

    if (payload.action === 'deleteCustomer') {
      const sheet = ensureCustomersSheet(spreadsheet);
      const name = String(payload.name || '').trim();
      if (!name) return jsonResponse({ ok: false, message: 'Name missing' });

      const values = sheet.getDataRange().getValues();
      for (let i = 1; i < values.length; i++) {
        if (String(values[i][0]).trim().toLowerCase() === name.toLowerCase()) {
          sheet.deleteRow(i + 1);
          return jsonResponse({ ok: true, message: 'Deleted customer' });
        }
      }
      return jsonResponse({ ok: true, message: 'Not found' });
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
