function doGet(e) {

  const reports = {

    main: "https://metabase.spyne.ai/public/question/8e926f47-4080-4c6c-ba28-77cb500ccf90.json",

    enterprises: "https://metabase.spyne.ai/public/question/99658eb5-f9c6-4e0a-be12-1d38bc593b4e.json",

    rooftops: "https://metabase.spyne.ai/public/question/38df9aa6-35be-4a30-bf11-09b4a262b008.json",

    newdata: "https://metabase.spyne.ai/public/question/6b05b3d8-fc78-4e70-bcae-c7ffdab31fc7.json",

    entbyarr: "https://metabase.spyne.ai/public/question/55f64840-2f96-48c2-aa2b-8333a515f4f2.json",

    roofbyarr: "https://metabase.spyne.ai/public/question/38df9aa6-35be-4a30-bf11-09b4a262b008.json",

    csmob: "https://metabase.spyne.ai/public/question/6fc6429b-1268-4ee7-b1b0-7f7ecfeac272.json"

  };

  const report = (e.parameter.report || '').toLowerCase();

  if (!reports[report]) {
    return ContentService
      .createTextOutput(JSON.stringify({
        error: "Invalid report"
      }))
      .setMimeType(ContentService.MimeType.JSON);
  }

  try {

    const response = UrlFetchApp.fetch(reports[report], {
      muteHttpExceptions: true
    });

    return ContentService
      .createTextOutput(response.getContentText())
      .setMimeType(ContentService.MimeType.JSON);

  } catch (err) {

    return ContentService
      .createTextOutput(JSON.stringify({
        error: err.toString()
      }))
      .setMimeType(ContentService.MimeType.JSON);

  }
}
