// School tabs keep headers in rows 1-5; requests start on this row
const FIRST_DATA_ROW = 6;
const NUM_COLS = 5; // Timestamp, Experiment, Material, Qty, Notes

// Feedback / attendance submissions all go to one tab (header in row 1)
const FEEDBACK_SHEET = "Feedback";
const FEEDBACK_HEADERS = ["Timestamp", "School", "Session Date", "Attendance", "# Attended", "What Went Well", "What Didn't Go Well", "How Can We Improve"];

function doGet() {
  return HtmlService.createHtmlOutputFromFile('Index')
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

/**
 * The Leaders Hub form on the website sends its requests here as JSON: { action, payload }.
 * The website sends them without any Google sign-in, so whatever Google account a device is
 * signed into can't block the form.
 */
function doPost(e) {
  const handlers = { verifyPassword, processForm, submitFeedback };
  let result;
  try {
    const request = JSON.parse(e.postData.contents);
    result = handlers[request.action] ? handlers[request.action](request.payload) : "Error: Unknown request.";
  } catch (error) {
    result = "Error: " + error.toString();
  }
  return ContentService.createTextOutput(JSON.stringify({ result: result }))
      .setMimeType(ContentService.MimeType.JSON);
}

/**
 * Compares a password against the FORM_PASSWORD Script Property.
 * Set it in: Project Settings (gear icon) -> Script Properties.
 */
function checkPassword_(pw) {
  const real = PropertiesService.getScriptProperties().getProperty('FORM_PASSWORD');
  return !!real && pw === real;
}

/** Called by the unlock screen in Index.html */
function verifyPassword(pw) {
  return checkPassword_(pw);
}

/** Makes sure the sheet has at least `lastRow` rows (setValues can't grow a sheet like appendRow can) */
function ensureRows_(sheet, lastRow) {
  const max = sheet.getMaxRows();
  if (lastRow > max) sheet.insertRowsAfter(max, lastRow - max);
}

/** Writes rows below the last filled row (never above `minRow`), holding a lock so simultaneous submissions don't collide */
function appendRows_(sheet, rows, minRow) {
  const startRow = Math.max(sheet.getLastRow() + 1, minRow);
  ensureRows_(sheet, startRow + rows.length - 1);
  sheet.getRange(startRow, 1, rows.length, rows[0].length).setValues(rows);
}

function withLock_(fn) {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(20000);
    return fn();
  } catch (error) {
    return "Error: " + error.toString();
  } finally {
    lock.releaseLock();
  }
}

/** Materials request form */
function processForm(data) {
  // Re-check the password on every submission so the form can't be bypassed
  if (!checkPassword_(data.password)) {
    return "Error: Incorrect password. Please reload the page and log in again.";
  }
  if (!data.schoolName) return "Error: Please select a school.";

  const timestamp = new Date();
  const rows = [];
  data.experiments.forEach(exp => {
    exp.materials.forEach(mat => {
      if (mat.name.trim() !== "") rows.push([timestamp, exp.name, mat.name, mat.qty, mat.notes]);
    });
  });
  if (rows.length === 0) return "Error: No materials were entered.";

  return withLock_(() => {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let sheet = ss.getSheetByName(data.schoolName);

    // Auto-build the tab if it doesn't exist
    if (!sheet) {
      sheet = ss.insertSheet(data.schoolName);
      sheet.getRange(1, 1, 1, NUM_COLS)
          .setValues([["Timestamp", "Experiment Name", "Material Name", "Quantity", "Notes"]])
          .setFontWeight("bold");
    }

    // Never above row 6, so Archive & Purge always picks it up
    appendRows_(sheet, rows, FIRST_DATA_ROW);
    return "Success";
  });
}

/** Returns the Feedback tab, creating and formatting it the first time */
function getFeedbackSheet_(ss) {
  let sheet = ss.getSheetByName(FEEDBACK_SHEET);
  if (!sheet) {
    sheet = ss.insertSheet(FEEDBACK_SHEET);
    sheet.getRange(1, 1, 1, FEEDBACK_HEADERS.length).setValues([FEEDBACK_HEADERS])
        .setFontWeight("bold").setBackground("#D31145").setFontColor("white");
    sheet.setFrozenRows(1);
    sheet.setColumnWidths(1, 3, 130);
    sheet.setColumnWidth(4, 220);
    sheet.setColumnWidth(5, 90);
    sheet.setColumnWidths(6, 3, 280);
    sheet.getRange("D:H").setWrap(true);
  }
  return sheet;
}

/** Feedback / attendance form */
function submitFeedback(data) {
  if (!checkPassword_(data.password)) {
    return "Error: Incorrect password. Please reload the page and log in again.";
  }
  if (!data.schoolName) return "Error: Please select a school.";

  const names = data.attendees.map(n => n.trim()).filter(n => n !== "");
  if (names.length === 0) return "Error: Please enter at least one name for attendance.";

  return withLock_(() => {
    const sheet = getFeedbackSheet_(SpreadsheetApp.getActiveSpreadsheet());
    appendRows_(sheet, [[
      new Date(), data.schoolName, data.sessionDate, names.join(", "), names.length,
      data.wentWell, data.didntGoWell, data.improve
    ]], 2);
    return "Success";
  });
}

/**
 * Creates a custom menu in Google Sheets when opened
 */
function onOpen() {
  SpreadsheetApp.getUi()
      .createMenu('🛠️ Leaders Hub Admin')
      .addItem('Archive & Purge Session Data', 'archiveAndPurge')
      .addToUi();
}

/**
 * Archives data with 4-level dropdowns: Session -> School -> Experiment/Feedback -> Materials/Feedback details
 */
function archiveAndPurge() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const ui = SpreadsheetApp.getUi();
  const tz = Session.getScriptTimeZone();

  // 1. Confirm with the user
  const confirmResponse = ui.alert('Confirm Archive & Purge',
    'Are you sure you want to archive this session? This will move all materials and feedback to the Archive tab and clear the school and Feedback tabs.',
    ui.ButtonSet.YES_NO);
  if (confirmResponse !== ui.Button.YES) return;

  // 2. Prompt for Session Date (defaults to today if left blank)
  const sessionPrompt = ui.prompt('Archive Session', 'Enter the Session Date/Name (e.g., "10/24/2026" or "Fall Session 1"):', ui.ButtonSet.OK_CANCEL);
  if (sessionPrompt.getSelectedButton() !== ui.Button.OK) return;
  const sessionName = sessionPrompt.getResponseText().trim() ||
      Utilities.formatDate(new Date(), tz, "MM/dd/yyyy");

  // 3. Gather all data FIRST before touching the archive
  const schools = {};   // schoolName -> { sheet, numRows, experiments: {expName: [rows]}, feedback: [rows] }
  const schoolFor = name => (schools[name] = schools[name] || { experiments: {}, feedback: [] });

  for (const sheet of ss.getSheets()) {
    const sheetName = sheet.getName();

    // Skip non-school tabs
    if (sheetName === "Archive" || sheetName === "ORDER" || sheetName === FEEDBACK_SHEET || sheetName.includes("Template")) continue;

    const lastRow = sheet.getLastRow();
    if (lastRow < FIRST_DATA_ROW) continue; // No materials requested here

    const numRows = lastRow - FIRST_DATA_ROW + 1;
    const experiments = {};
    for (const row of sheet.getRange(FIRST_DATA_ROW, 1, numRows, NUM_COLS).getValues()) {
      const expName = row[1];
      if (!expName || expName.toString().trim() === "") continue;
      (experiments[expName] = experiments[expName] || []).push(row);
    }

    if (Object.keys(experiments).length > 0) {
      Object.assign(schoolFor(sheetName), { sheet, numRows, experiments });
    }
  }

  const feedbackSheet = ss.getSheetByName(FEEDBACK_SHEET);
  const feedbackRows = feedbackSheet && feedbackSheet.getLastRow() >= 2
      ? feedbackSheet.getRange(2, 1, feedbackSheet.getLastRow() - 1, FEEDBACK_HEADERS.length).getValues()
      : [];
  for (const row of feedbackRows) {
    if (row[1] && row[1].toString().trim() !== "") schoolFor(row[1].toString()).feedback.push(row);
  }

  const schoolNames = Object.keys(schools);
  if (schoolNames.length === 0) {
    ui.alert("Notice", "No new requests or feedback were found.", ui.ButtonSet.OK);
    return;
  }

  // 4. Setup Archive Sheet Layout
  const archiveSheet = ss.getSheetByName("Archive") || ss.insertSheet("Archive", 0);

  // Force the +/- toggle buttons to be at the TOP of the group
  try { archiveSheet.setRowGroupControlPosition(SpreadsheetApp.GroupControlTogglePosition.BEFORE); } catch (e) {}

  archiveSheet.getRange(1, 1, 1, 6).setValues([["Session Date", "School / Teacher", "Experiment", "Material", "Qty", "Notes"]])
    .setFontWeight("bold")
    .setBackground("#D31145") // UHS Red
    .setFontColor("white");
  archiveSheet.setFrozenRows(1);
  archiveSheet.setColumnWidth(1, 150);
  archiveSheet.setColumnWidth(2, 180);
  archiveSheet.setColumnWidth(3, 200);

  // 5. Build every archive row in memory, tracking which rows are headers and which ranges become dropdown groups
  const startRow = archiveSheet.getLastRow() + 1;
  const rows = [];
  const sessionHeaders = [], schoolHeaders = [], expHeaders = [], feedbackHeaders = [];
  const groups = []; // [firstRow, lastRow] pairs, each gets one extra level of nesting

  const addRow = (values, headerList) => {
    const rowNum = startRow + rows.length;
    rows.push(values);
    if (headerList) headerList.push(`A${rowNum}:F${rowNum}`);
    return rowNum;
  };
  const lastAdded = () => startRow + rows.length - 1;
  const asText = v => v instanceof Date ? Utilities.formatDate(v, tz, "MM/dd/yyyy") : String(v);

  const sessionRow = addRow(["📅 " + sessionName, "", "", "Click '+' to view schools ➔", "", ""], sessionHeaders);
  for (const name of schoolNames) {
    const school = schools[name];
    const schoolRow = addRow(["", "🏫 " + name, "", "Click '+' to view experiments & feedback ➔", "", ""], schoolHeaders);

    for (const exp in school.experiments) {
      const expRow = addRow(["", "", "🧪 " + exp, "Click '+' to view materials ➔", "", ""], expHeaders);
      for (const mat of school.experiments[exp]) addRow(["", "", "", mat[2], mat[3], mat[4]]);
      groups.push([expRow + 1, lastAdded()]);                       // Level 4: materials
    }

    for (const fb of school.feedback) {
      // fb = [Timestamp, School, Session Date, Attendance, # Attended, Went Well, Didn't Go Well, Improve]
      const fbRow = addRow(["", "", "📝 Feedback " + asText(fb[2] || fb[0]), "Click '+' to view feedback ➔", "", ""], feedbackHeaders);
      addRow(["", "", "", "Attendance (" + fb[4] + ")", fb[3], ""]);
      addRow(["", "", "", "What went well", fb[5], ""]);
      addRow(["", "", "", "What didn't go well", fb[6], ""]);
      addRow(["", "", "", "How can we improve", fb[7], ""]);
      groups.push([fbRow + 1, lastAdded()]);                        // Level 4: feedback details
    }
    groups.push([schoolRow + 1, lastAdded()]);                      // Level 3: everything for this school
  }
  groups.push([sessionRow + 1, lastAdded()]);                       // Level 2: all schools

  // 6. Write all rows and formatting in a handful of calls
  ensureRows_(archiveSheet, lastAdded());
  archiveSheet.getRange(startRow, 1, rows.length, 6).setValues(rows);
  archiveSheet.getRangeList(sessionHeaders).setBackground("#333333").setFontColor("white").setFontWeight("bold");
  archiveSheet.getRangeList(schoolHeaders).setBackground("#cccccc").setFontColor("black").setFontWeight("bold");
  if (expHeaders.length) archiveSheet.getRangeList(expHeaders).setBackground("#f3f3f3").setFontColor("black").setFontWeight("bold");
  if (feedbackHeaders.length) archiveSheet.getRangeList(feedbackHeaders).setBackground("#fff2cc").setFontColor("black").setFontWeight("bold");

  // 7. Create the multi-level dropdown nesting
  try {
    for (const [first, last] of groups) archiveSheet.getRange(`${first}:${last}`).shiftRowGroupDepth(1);
  } catch (e) {
    // Catch max-depth errors quietly
  }

  // 8. Purge the processed data from the school tabs and the Feedback tab
  for (const name of schoolNames) {
    const school = schools[name];
    if (!school.sheet) continue; // Feedback-only school
    school.sheet.getRange(FIRST_DATA_ROW, 1, school.numRows, NUM_COLS).clearContent();
    school.sheet.getRange("D1").clearContent(); // Clears the typed session date
  }
  if (feedbackRows.length) feedbackSheet.getRange(2, 1, feedbackRows.length, FEEDBACK_HEADERS.length).clearContent();

  // 9. Neatly collapse all dropdowns
  archiveSheet.collapseAllRowGroups();
  ui.alert("Success!", `Data for "${sessionName}" archived successfully.`, ui.ButtonSet.OK);
}
