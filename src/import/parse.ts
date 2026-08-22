import * as DocumentPicker from 'expo-document-picker';
import { File } from 'expo-file-system';
import JSZip from 'jszip';
import Papa from 'papaparse';

import { CSV_KINDS, type CsvKind, type ParsedCsvFile } from './types';

function detectKind(fileName: string): CsvKind | null {
  const base = fileName.replace(/\.csv$/i, '').toLowerCase();
  return CSV_KINDS.find((kind) => base === kind.toLowerCase()) ?? null;
}

export interface ZipImportResult {
  files: ParsedCsvFile[];
  ignoredCount: number;
}

export async function pickAndParseZip(): Promise<ZipImportResult | null> {
  const picked = await DocumentPicker.getDocumentAsync({
    type: ['application/zip', 'application/x-zip-compressed', '*/*'],
    multiple: false,
    copyToCacheDirectory: true,
  });
  if (picked.canceled) return null;

  const asset = picked.assets[0];
  if (!asset.name.toLowerCase().endsWith('.zip')) {
    throw new Error(`"${asset.name}" n'est pas un fichier .zip.`);
  }

  const base64 = await new File(asset.uri).base64();
  const zip = await JSZip.loadAsync(base64, { base64: true });

  const files: ParsedCsvFile[] = [];
  let ignoredCount = 0;

  for (const entry of Object.values(zip.files)) {
    if (entry.dir) continue;
    const fileName = entry.name.split('/').pop() ?? entry.name;
    const kind = detectKind(fileName);
    if (!kind) {
      ignoredCount++;
      continue;
    }

    const text = await entry.async('string');
    const parsed = Papa.parse<Record<string, string>>(text, { header: true, skipEmptyLines: true });
    files.push({ kind, fileName, rows: parsed.data });
  }

  return { files, ignoredCount };
}
