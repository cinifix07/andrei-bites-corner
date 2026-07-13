/* global process */

export const defaultDriveFolderId = "1mti6gOf0rneQkhYilgGgoAQJAMlITDQG";
export const defaultProofPaymentFolderId = "1h0rp0TTLaZyXO71F4_h3WGdDxGrbwpl4";

function getAppsScriptConfig(folderId) {
  return {
    uploadUrl: process.env.GOOGLE_APPS_SCRIPT_UPLOAD_URL,
    folderId: folderId || process.env.GOOGLE_DRIVE_FOLDER_ID || defaultDriveFolderId,
    uploadSecret: process.env.GOOGLE_APPS_SCRIPT_UPLOAD_SECRET,
  };
}

export function normalizeDriveUploadResponse(uploadedFile, fallbackFileName) {
  const fileId = uploadedFile.fileId || uploadedFile.id || "";
  const url = uploadedFile.thumbnailUrl ||
    uploadedFile.url ||
    (fileId ? `https://drive.google.com/thumbnail?id=${fileId}&sz=w1000` : "") ||
    uploadedFile.webViewLink ||
    uploadedFile.path;

  if (!url) {
    throw new Error("Apps Script did not return a Google Drive image URL.");
  }

  return {
    fileId,
    url,
    path: url,
    name: uploadedFile.name || fallbackFileName,
    webViewLink: uploadedFile.webViewLink || (fileId ? `https://drive.google.com/file/d/${fileId}/view` : url),
  };
}

export async function uploadImageToAppsScript({ fileBase64, fileName, mimeType, folderId }) {
  const uploadConfig = getAppsScriptConfig(folderId);

  if (!uploadConfig.uploadUrl) {
    throw new Error("GOOGLE_APPS_SCRIPT_UPLOAD_URL is not configured in Convex env.");
  }

  const uploadResponse = await fetch(uploadConfig.uploadUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      fileBase64,
      fileName,
      mimeType,
      folderId: uploadConfig.folderId,
      uploadSecret: uploadConfig.uploadSecret,
    }),
  });

  let uploadedFile = null;

  try {
    uploadedFile = await uploadResponse.json();
  } catch {
    // Keep the HTTP status error below clearer when Apps Script returns non-JSON output.
  }

  if (!uploadResponse.ok || uploadedFile?.error) {
    throw new Error(uploadedFile?.error || `Apps Script upload failed with HTTP ${uploadResponse.status}.`);
  }

  return normalizeDriveUploadResponse(uploadedFile, fileName);
}
