import { google } from "googleapis";
import db from "./db.js";

// --- Config from env ---
const SERVICE_ACCOUNT_EMAIL = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
const SERVICE_ACCOUNT_PRIVATE_KEY = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY?.replace(/\\n/g, "\n");
const DRIVE_FOLDER_ID = process.env.GOOGLE_DRIVE_FOLDER_ID;

export function isConfigured() {
  return !!(SERVICE_ACCOUNT_EMAIL && SERVICE_ACCOUNT_PRIVATE_KEY && DRIVE_FOLDER_ID);
}

function getDriveClient() {
  const auth = new google.auth.JWT({
    email: SERVICE_ACCOUNT_EMAIL,
    key: SERVICE_ACCOUNT_PRIVATE_KEY,
    scopes: ["https://www.googleapis.com/auth/drive.file"],
  });
  return google.drive({ version: "v3", auth });
}

// --- Build the export payload ---
export function buildExport() {
  const conversations = db.prepare(`
    SELECT c.id, c.name, c.is_group, c.created_at
    FROM conversations c ORDER BY c.id
  `).all();

  const messages = db.prepare(`
    SELECT m.id, m.conversation_id, m.content, m.created_at,
           u.display_name as sender_name, u.email as sender_email
    FROM messages m
    JOIN users u ON m.sender_id = u.id
    ORDER BY m.created_at ASC
  `).all();

  const users = db.prepare(`
    SELECT id, email, display_name, status_message, created_at
    FROM users ORDER BY id
  `).all();

  return {
    exported_at: new Date().toISOString(),
    total_messages: messages.length,
    total_users: users.length,
    conversations: conversations.map((c) => ({
      ...c,
      messages: messages.filter((m) => m.conversation_id === c.id),
    })),
  };
}

// --- Upload to Google Drive ---
export async function exportToDrive() {
  if (!isConfigured()) {
    return { success: false, error: "Google Drive credentials not configured" };
  }

  const data = buildExport();
  const dateStr = new Date().toISOString().split("T")[0];
  const fileName = `prcchat-export-${dateStr}.json`;
  const content = JSON.stringify(data, null, 2);

  const drive = getDriveClient();

  const response = await drive.files.create({
    requestBody: {
      name: fileName,
      parents: [DRIVE_FOLDER_ID],
      mimeType: "application/json",
    },
    media: {
      mimeType: "application/json",
      body: content,
    },
  });

  return {
    success: true,
    file_id: response.data.id,
    file_name: fileName,
    messages: data.total_messages,
    conversations: data.conversations.length,
  };
}
