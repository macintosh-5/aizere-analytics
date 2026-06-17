function doGet() {
  return HtmlService.createHtmlOutputFromFile('Index')
      .setTitle('Панель Эффективности AI «Айзере» — Контроль Качества')
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
      .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

// Unused dummy function to force Google Apps Script to request spreadsheet access scopes
function triggerSpreadsheetScope() {
  SpreadsheetApp.getActiveSpreadsheet();
}

/**
 * Fetches sheet data server-side using GAS UrlFetchApp to bypass browser CSP/CORS restrictions in iframe.
 * Passes the OAuth token to authorize access to private spreadsheets.
 * @param {string} gid The sheet tab GID to fetch.
 * @return {Object} The parsed Google Sheets Visualization API JSON response.
 */
function fetchSheetDataServer(gid) {
  try {
    const spreadsheetId = '1FYH5YlD8N_BB_4KMnYEmjEMEB9OLmmJFUZznQ2Cbzxo';
    const url = 'https://docs.google.com/spreadsheets/d/' + spreadsheetId + '/gviz/tq?gid=' + gid;
    
    // Retrieve the OAuth token of the user running the script
    const token = ScriptApp.getOAuthToken();
    
    // Fetch server-to-server with Authorization header
    const response = UrlFetchApp.fetch(url, {
      headers: {
        'Authorization': 'Bearer ' + token
      },
      muteHttpExceptions: true
    });
    
    const responseCode = response.getResponseCode();
    const responseText = response.getContentText();
    
    if (responseCode !== 200) {
      throw new Error('Код ответа Google: ' + responseCode + '. Описание: ' + responseText.substring(0, 300));
    }
    
    // The sheet API returns: google.visualization.Query.setResponse({...})
    // Extract the JSON object inside the parentheses
    const startIdx = responseText.indexOf('{');
    const endIdx = responseText.lastIndexOf('}') + 1;
    
    if (startIdx === -1 || endIdx === -1) {
      throw new Error('Не удалось найти JSON-данные в ответе от таблицы. Возможно, у вас нет доступа к таблице.');
    }
    
    const jsonStr = responseText.substring(startIdx, endIdx);
    return JSON.parse(jsonStr);
  } catch (e) {
    Logger.log('Error fetching GID ' + gid + ': ' + e.toString());
    throw new Error('Ошибка GAS сервера при запросе вкладки ' + gid + ': ' + e.message);
  }
}

/**
 * Dynamically fetches all sheet tabs matching the date format DD.MM.YYYY.
 * @return {Array<Object>} List of sheet metadata objects with date and GID.
 */
function fetchActiveSheets() {
  try {
    const spreadsheetId = '1FYH5YlD8N_BB_4KMnYEmjEMEB9OLmmJFUZznQ2Cbzxo';
    const ss = SpreadsheetApp.openById(spreadsheetId);
    const sheets = ss.getSheets();
    const sheetList = [];
    
    for (let i = 0; i < sheets.length; i++) {
      const sheet = sheets[i];
      const name = sheet.getName().trim();
      // Only include tabs matching date format DD.MM.YYYY
      if (/^\d{2}\.\d{2}\.\d{4}$/.test(name)) {
        sheetList.push({
          date: name,
          gid: sheet.getSheetId().toString()
        });
      }
    }
    
    // Sort dates chronologically
    sheetList.sort(function(a, b) {
      const parseDate = function(str) {
        const parts = str.split('.');
        return new Date(parts[2], parts[1] - 1, parts[0]);
      };
      return parseDate(a.date) - parseDate(b.date);
    });
    
    return sheetList;
  } catch (e) {
    Logger.log('Error listing active sheets: ' + e.toString());
    throw new Error('Ошибка на сервере при чтении вкладок: ' + e.message);
  }
}
