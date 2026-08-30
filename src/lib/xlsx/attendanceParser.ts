import * as XLSX from 'xlsx';
import { extractSubjectCodeAndName, normalizeComponent } from './normalizer';
import { SupportedComponentType } from '@/lib/components.functions';

export interface RawAttendanceClass {
  subjectName: string;
  subjectCode?: string;
  componentName: string;
  componentType: SupportedComponentType;
  attended: number;
  delivered: number;
  reportedPercentage?: number | null;
  sourceSheet: string;
  sourceRow: number;
  sourceCell: string;
}

/**
 * Helper to get clean string value from cell.
 */
function getCellString(cell: XLSX.CellObject | undefined): string {
  if (!cell || cell.v === undefined || cell.v === null) return '';
  return String(cell.v).trim();
}

/**
 * Parses a string value or fraction like "18 / 20" or "18" into numbers.
 */
export function parseFractionOrNumber(val: any): { num1: number | null; num2: number | null } {
  if (val === null || val === undefined) return { num1: null, num2: null };

  if (typeof val === 'number') {
    return { num1: val, num2: null };
  }

  const str = String(val).trim();
  if (!str) return { num1: null, num2: null };

  // Check fraction pattern "18 / 20" or "18/20" or "18 of 20"
  const fractionMatch = str.match(/^(\d+(?:\.\d+)?)\s*(?:\/|of|out of)\s*(\d+(?:\.\d+)?)$/i);
  if (fractionMatch) {
    return {
      num1: parseFloat(fractionMatch[1]),
      num2: parseFloat(fractionMatch[2]),
    };
  }

  const cleanNum = parseFloat(str.replace(/[^0-9.]/g, ''));
  if (!isNaN(cleanNum)) {
    return { num1: cleanNum, num2: null };
  }

  return { num1: null, num2: null };
}

/**
 * Parses raw percentage cell value (e.g. 0.90 -> 90%, "90%", 90 -> 90%).
 */
export function parsePercentageValue(val: any): number | null {
  if (val === null || val === undefined) return null;
  if (typeof val === 'number') {
    if (val >= 0 && val <= 1) return Number((val * 100).toFixed(2));
    if (val > 1 && val <= 100) return Number(val.toFixed(2));
  }

  const str = String(val).replace('%', '').trim();
  const num = parseFloat(str);
  if (isNaN(num)) return null;
  if (num >= 0 && num <= 1) return Number((num * 100).toFixed(2));
  return Number(num.toFixed(2));
}

/**
 * Parses an attendance worksheet using column/header semantics.
 */
export function parseAttendanceWorksheet(
  ws: XLSX.WorkSheet,
  sheetName: string
): RawAttendanceClass[] {
  const range = XLSX.utils.decode_range(ws['!ref'] || 'A1:A1');
  const results: RawAttendanceClass[] = [];

  // Convert worksheet to 2D array of string values and raw cell values
  const textMatrix: string[][] = [];
  const rawMatrix: any[][] = [];

  for (let r = range.s.r; r <= range.e.r; r++) {
    const textRow: string[] = [];
    const rawRow: any[] = [];
    for (let c = range.s.c; c <= range.e.c; c++) {
      const cellRef = XLSX.utils.encode_cell({ r, c });
      const cell = ws[cellRef];
      textRow.push(getCellString(cell));
      rawRow.push(cell ? cell.v : null);
    }
    textMatrix.push(textRow);
    rawMatrix.push(rawRow);
  }

  if (textMatrix.length === 0) return [];

  // Locate Header Row
  let subjectCol = -1;
  let codeCol = -1;
  let compCol = -1;
  let attendedCol = -1;
  let deliveredCol = -1;
  let fractionCol = -1;
  let percentageCol = -1;
  let headerRowIndex = -1;

  for (let r = 0; r < Math.min(15, textMatrix.length); r++) {
    const row = textMatrix[r];
    for (let c = 0; c < row.length; c++) {
      const val = row[c].toUpperCase();

      if (val.includes('SUBJECT') || val.includes('COURSE') || val.includes('PAPER') || val.includes('MODULE')) {
        subjectCol = c;
      }
      if (val.includes('CODE') || val.includes('SUB CODE') || val.includes('COURSE CODE')) {
        codeCol = c;
      }
      if (val.includes('COMPONENT') || val.includes('TYPE') || val === 'L/T/P' || val.includes('CATEGORY')) {
        compCol = c;
      }
      if (
        val.includes('ATTENDED') ||
        val.includes('PRESENT') ||
        val === 'ATTD' ||
        val === 'ATT' ||
        val.includes('CLASSES ATTENDED')
      ) {
        attendedCol = c;
      }
      if (
        val.includes('DELIVERED') ||
        val.includes('HELD') ||
        val.includes('CONDUCTED') ||
        val.includes('TOTAL') ||
        val.includes('MAX') ||
        val === 'DELV'
      ) {
        deliveredCol = c;
      }
      if (val.includes('ATTENDED/DELIVERED') || val.includes('ATTENDANCE/TOTAL') || val.includes('ATTENDED / TOTAL')) {
        fractionCol = c;
      }
      if (val.includes('PERCENTAGE') || val.includes('ATTENDANCE %') || val.includes('ATTD %') || val === '%') {
        percentageCol = c;
      }
    }

    if (subjectCol !== -1 && (attendedCol !== -1 || fractionCol !== -1)) {
      headerRowIndex = r;
      break;
    }
  }

  // Fallback: search for first row with valid subject name and numbers
  if (headerRowIndex === -1) {
    for (let r = 0; r < textMatrix.length; r++) {
      const row = textMatrix[r];
      if (row.length >= 3 && row[0].length > 2 && !isNaN(parseFloat(row[1]))) {
        headerRowIndex = r - 1;
        subjectCol = 0;
        attendedCol = 1;
        deliveredCol = 2;
        break;
      }
    }
  }

  if (headerRowIndex === -1) return [];

  // Parse data rows
  for (let r = headerRowIndex + 1; r < textMatrix.length; r++) {
    const textRow = textMatrix[r];
    const rawRow = rawMatrix[r];

    const rawSub = textRow[subjectCol] || '';
    if (!rawSub || rawSub.trim().length === 0) continue;

    // Skip footer summary rows like "Total", "Average"
    if (/^(TOTAL|AVERAGE|GRAND TOTAL|OVERALL)$/i.test(rawSub.trim())) continue;

    const { code: extractedCode, name: extractedName } = extractSubjectCodeAndName(rawSub);
    const subjectCode = codeCol !== -1 && textRow[codeCol] ? textRow[codeCol] : extractedCode;
    const subjectName = extractedName;

    const rawComp = compCol !== -1 ? textRow[compCol] : rawSub;
    const { type: componentType, name: componentName } = normalizeComponent(rawComp);

    let attended = 0;
    let delivered = 0;

    if (fractionCol !== -1 && textRow[fractionCol]) {
      const { num1, num2 } = parseFractionOrNumber(textRow[fractionCol]);
      if (num1 !== null) attended = Math.round(num1);
      if (num2 !== null) delivered = Math.round(num2);
    } else {
      const rawAtt = rawRow[attendedCol];
      const rawDel = deliveredCol !== -1 ? rawRow[deliveredCol] : null;

      const attParsed = parseFractionOrNumber(rawAtt);
      if (attParsed.num1 !== null && attParsed.num2 !== null) {
        attended = Math.round(attParsed.num1);
        delivered = Math.round(attParsed.num2);
      } else {
        if (attParsed.num1 !== null) attended = Math.round(attParsed.num1);
        if (rawDel !== null) {
          const delParsed = parseFractionOrNumber(rawDel);
          if (delParsed.num1 !== null) delivered = Math.round(delParsed.num1);
        }
      }
    }

    const rawPct = percentageCol !== -1 ? rawRow[percentageCol] : null;
    const reportedPercentage = parsePercentageValue(rawPct);

    const cellRef = XLSX.utils.encode_cell({ r, c: subjectCol });

    results.push({
      subjectName,
      subjectCode,
      componentName,
      componentType,
      attended,
      delivered,
      reportedPercentage,
      sourceSheet: sheetName,
      sourceRow: r + 1,
      sourceCell: cellRef,
    });
  }

  return results;
}

/**
 * Reads an `.xlsx` workbook buffer and extracts all raw attendance records across sheets.
 */
export function parseAttendanceWorkbook(arrayBuffer: ArrayBuffer): {
  sheetsScanned: number;
  extractedRecords: RawAttendanceClass[];
} {
  const workbook = XLSX.read(arrayBuffer, { type: 'array', cellDates: true });
  const sheetNames = workbook.SheetNames;
  const extractedRecords: RawAttendanceClass[] = [];

  for (const sheetName of sheetNames) {
    const ws = workbook.Sheets[sheetName];
    if (!ws) continue;
    const records = parseAttendanceWorksheet(ws, sheetName);
    extractedRecords.push(...records);
  }

  return {
    sheetsScanned: sheetNames.length,
    extractedRecords,
  };
}
