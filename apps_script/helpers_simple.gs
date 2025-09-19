/**
 * Minimal helpers for folder placement of the Control spreadsheet.
 * Names are suffixed with "Simple" to avoid collisions with existing helpers.
 */

function ensureFolderSimple_(name) {
	var it = DriveApp.getFoldersByName(name);
	return it.hasNext() ? it.next() : DriveApp.createFolder(name);
}

function moveFileToFolderSimple_(fileId, folderId) {
	var file = DriveApp.getFileById(fileId);
	var parentIt = file.getParents();
	while (parentIt.hasNext()) parentIt.next().removeFile(file);
	DriveApp.getFolderById(folderId).addFile(file);
}

