
import fs from 'fs';
import path from 'path';
import { google } from 'googleapis';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Config
const BACKUP_DIR = process.env.BACKUP_DIR || path.join(__dirname, '../backups');
const DRIVE_FOLDER_ID = process.env.GOOGLE_DRIVE_FOLDER_ID;
const SERVICE_ACCOUNT_KEY = process.env.GOOGLE_SERVICE_ACCOUNT_KEY; // JSON string

if (!DRIVE_FOLDER_ID || !SERVICE_ACCOUNT_KEY) {
    console.warn("⚠️ Google Drive Backup skipped: Missing credentials or folder ID env vars.");
    process.exit(0);
}

const auth = new google.auth.GoogleAuth({
    credentials: JSON.parse(SERVICE_ACCOUNT_KEY),
    scopes: ['https://www.googleapis.com/auth/drive.file'],
});

const drive = google.drive({ version: 'v3', auth });

async function uploadLatestBackup() {
    try {
        // Find latest backup file
        const files = fs.readdirSync(BACKUP_DIR)
            .filter(f => f.startsWith('superair_backup_') && f.endsWith('.sql'))
            .map(f => ({ name: f, time: fs.statSync(path.join(BACKUP_DIR, f)).mtime.getTime() }))
            .sort((a, b) => b.time - a.time);

        if (files.length === 0) {
            console.log("No backup files found to upload.");
            return;
        }

        const latestFile = files[0];
        const filePath = path.join(BACKUP_DIR, latestFile.name);

        console.log(`🚀 Uploading ${latestFile.name} to Google Drive...`);

        const fileMetadata = {
            name: latestFile.name,
            parents: [DRIVE_FOLDER_ID],
        };

        const media = {
            mimeType: 'application/sql',
            body: fs.createReadStream(filePath),
        };

        const response = await drive.files.create({
            resource: fileMetadata,
            media: media,
            fields: 'id',
        });

        console.log(`✅ Upload successful! File ID: ${response.data.id}`);

        // Optional: Cleanup old backups on Drive (Keep last 10)
        await cleanupOldDriveBackups();

    } catch (error) {
        console.error("❌ Google Drive Upload failed:", error.message);
        // Don't exit with error to avoid crashing the main process/cron if net is down
    }
}

async function cleanupOldDriveBackups() {
    try {
        const res = await drive.files.list({
            q: `'${DRIVE_FOLDER_ID}' in parents and name contains 'superair_backup_' and trashed = false`,
            orderBy: 'createdTime desc',
            pageSize: 20,
            fields: 'files(id, name)',
        });

        const files = res.data.files;
        if (files.length > 7) {
            const filesToDelete = files.slice(7);
            console.log(`🧹 Cleaning up ${filesToDelete.length} old backups from Drive...`);

            for (const file of filesToDelete) {
                await drive.files.delete({ fileId: file.id });
                console.log(`   Deleted ${file.name}`);
            }
        }
    } catch (error) {
        console.error("⚠️ Drive Cleanup warning:", error.message);
    }
}

uploadLatestBackup();
