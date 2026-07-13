/* global ContentService, DriveApp, Utilities */
/* eslint-disable no-unused-vars */
/* exported doPost */
const DEFAULT_FOLDER_ID = "1mti6gOf0rneQkhYilgGgoAQJAMlITDQG";
const UPLOAD_SECRET = "CHANGE_THIS_TO_A_LONG_RANDOM_SECRET";

function isSecretValid(body) {
  return UPLOAD_SECRET === "CHANGE_THIS_TO_A_LONG_RANDOM_SECRET" || body.uploadSecret === UPLOAD_SECRET;
}

function jsonResponse(payload, statusCode) {
  return ContentService
    .createTextOutput(JSON.stringify({ statusCode, ...payload }))
    .setMimeType(ContentService.MimeType.JSON);
}

function doPost(event) {
  try {
    const body = JSON.parse(event.postData.contents);

    if (!isSecretValid(body)) {
      return jsonResponse({ error: "Unauthorized upload request." }, 401);
    }

    const folderId = body.folderId || DEFAULT_FOLDER_ID;
    const fileBytes = Utilities.base64Decode(body.fileBase64);
    const blob = Utilities.newBlob(fileBytes, body.mimeType || "image/png", body.fileName || `upload-${Date.now()}.png`);
    const folder = DriveApp.getFolderById(folderId);
    const file = folder.createFile(blob);

    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);

    return jsonResponse({
      fileId: file.getId(),
      name: file.getName(),
      webViewLink: file.getUrl(),
      thumbnailUrl: `https://drive.google.com/thumbnail?id=${file.getId()}&sz=w1000`,
      url: `https://drive.google.com/thumbnail?id=${file.getId()}&sz=w1000`,
    }, 200);
  } catch (error) {
    return jsonResponse({
      error: error instanceof Error ? error.message : String(error),
    }, 500);
  }
}
