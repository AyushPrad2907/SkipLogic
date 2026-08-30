import * as XLSX from 'xlsx';
import { RawExtractedClass } from '@/types/xlsx.types';
import {
  normalizeDayOfWeek,
  parseTimeRange,
  extractSubjectCodeAndName,
  normalizeComponent,
  excelTimeToString,
} from './normalizer';

/**
 * Pre-processes a worksheet to duplicate merged cell values across all cells in their merged ranges.
 */
function fillMergedCells(ws: XLSX.WorkSheet): XLSX.WorkSheet {
  const merges = ws['!merges'];
  if (!merges || merges.length === 0) return ws;

  for (const merge of merges) {
    const startCellRef = XLSX.utils.encode_cell(merge.s);
    const startCell = ws[startCellRef];
    if (!startCell) continue;

    for (let r = merge.s.r; r <= merge.e.r; r++) {
      for (let c = merge.s.c; c <= merge.e.c; c++) {
        const cellRef = XLSX.utils.encode_cell({ r, c });
        if (!ws[cellRef]) {
          ws[cellRef] = { ...startCell };
        }
      }
    }
  }

  return ws;
}

/**
 * Helper to safely extract string text from a cell.
 */
function getCellString(cell: XLSX.CellObject | undefined): string {
  if (!cell || cell.v === undefined || cell.v === null) return '';
  if (typeof cell.v === 'number') {
    if (cell.v > 0 && cell.v < 1) {
      return excelTimeToString(cell.v);
    }
    return String(cell.v);
  }
  return String(cell.v).trim();
}

/**
 * Attempts to parse a cell containing combined text:
 * Example: "CUCS1002 Data Structures\nPR - AR402\nProf. A. Sharma"
 */
export function parseCombinedCellText(text: string): {
  subjectName?: string;
  subjectCode?: string;
  componentName?: string;
  componentType?: any;
  room?: string;
  instructor?: string;
} {
  if (!text) return {};

  const lines = text
    .split(/[\r\n]+/)
    .map((l) => l.trim())
    .filter(Boolean);

  if (lines.length === 0) return {};

  let subjectName = '';
  let subjectCode: string | undefined;
  let componentName: string | undefined;
  let componentType: any;
  let room: string | undefined;
  let instructor: string | undefined;

  const firstLine = lines[0];
  const extracted = extractSubjectCodeAndName(firstLine);
  subjectName = extracted.name;
  subjectCode = extracted.code;

  // Check remaining lines or tokens for Component, Room, Instructor
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];

    // Component check
    if (!componentName && /(PP|PR|TUT|LAB|THEORY|LECTURE|PRACTICAL|TUTORIAL)/i.test(line)) {
      const comp = normalizeComponent(line);
      componentName = comp.name;
      componentType = comp.type;
    }

    // Room check (e.g. AR-402, LHC101, Room 12, Lab 3, Hall B)
    if (!room && /(ROOM|HALL|LAB|LHC|CLASS|[A-Z]{1,3}[- ]?\d{2,4})/i.test(line) && !/Prof|Dr|Faculty|Teacher/i.test(line)) {
      room = line
        .replace(/^(PP|PR|TUT|LAB|THEORY|LECTURE|PRACTICAL)\s*[-:]?\s*/i, '')
        .replace(/^[-:\s()|]+|[-:\s()|]+$/g, '')
        .trim();
    }

    // Faculty check (e.g. Prof. X, Dr. Y, Mr. Z, Ms. W)
    if (!instructor && /(PROF|DR|MR|MS|FACULTY|INSTRUCTOR|TEACHER|[A-Z]\.\s*[A-Z])/i.test(line)) {
      instructor = line.replace(/^[-:\s()|]+|[-:\s()|]+$/g, '').trim();
    }
  }

  // Fallback: check if first line also contained component
  if (!componentName) {
    const comp = normalizeComponent(firstLine);
    componentName = comp.name;
    componentType = comp.type;
  }

  return {
    subjectName,
    subjectCode,
    componentName,
    componentType,
    room,
    instructor,
  };
}

/**
 * Detects whether a worksheet is in List format or Grid format.
 */
export function parseWorksheet(
  ws: XLSX.WorkSheet,
  sheetName: string
): RawExtractedClass[] {
  const filledWs = fillMergedCells(ws);
  const range = XLSX.utils.decode_range(filledWs['!ref'] || 'A1:A1');
  const results: RawExtractedClass[] = [];

  // Convert worksheet to 2D array of strings
  const matrix: string[][] = [];
  for (let r = range.s.r; r <= range.e.r; r++) {
    const row: string[] = [];
    for (let c = range.s.c; c <= range.e.c; c++) {
      const cellRef = XLSX.utils.encode_cell({ r, c });
      row.push(getCellString(filledWs[cellRef]));
    }
    matrix.push(row);
  }

  if (matrix.length === 0) return [];

  // Strategy 1: Check for List / Table Header format
  let dayCol = -1;
  let timeCol = -1;
  let startTimeCol = -1;
  let endTimeCol = -1;
  let subjectCol = -1;
  let codeCol = -1;
  let compCol = -1;
  let roomCol = -1;
  let facultyCol = -1;
  let headerRowIndex = -1;

  for (let r = 0; r < Math.min(10, matrix.length); r++) {
    const row = matrix[r];
    for (let c = 0; c < row.length; c++) {
      const val = row[c].toUpperCase();
      if (val.includes('DAY') || val.includes('WEEKDAY')) dayCol = c;
      if (val === 'TIME' || val.includes('TIMING') || val.includes('SLOT')) timeCol = c;
      if (val.includes('START')) startTimeCol = c;
      if (val.includes('END')) endTimeCol = c;
      if (val.includes('SUBJECT') || val.includes('COURSE')) subjectCol = c;
      if (val.includes('CODE')) codeCol = c;
      if (val.includes('COMPONENT') || val.includes('TYPE') || val === 'L/T/P') compCol = c;
      if (val.includes('ROOM') || val.includes('LOCATION') || val.includes('HALL')) roomCol = c;
      if (val.includes('FACULTY') || val.includes('INSTRUCTOR') || val.includes('TEACHER') || val.includes('PROF')) facultyCol = c;
    }

    if (dayCol !== -1 && (timeCol !== -1 || startTimeCol !== -1) && subjectCol !== -1) {
      headerRowIndex = r;
      break;
    }
  }

  if (headerRowIndex !== -1) {
    // Parse as List format
    for (let r = headerRowIndex + 1; r < matrix.length; r++) {
      const row = matrix[r];
      const rawDay = row[dayCol] || '';
      const dayOfWeek = normalizeDayOfWeek(rawDay);
      if (!dayOfWeek) continue;

      const rawTime = timeCol !== -1 ? row[timeCol] : '';
      const rawStart = startTimeCol !== -1 ? row[startTimeCol] : rawTime;
      const rawEnd = endTimeCol !== -1 ? row[endTimeCol] : '';

      const { startTime, endTime } = parseTimeRange(rawStart, rawEnd);
      const rawSub = row[subjectCol] || '';
      if (!rawSub) continue;

      const { code: extractedCode, name: extractedName } = extractSubjectCodeAndName(rawSub);
      const subjectCode = codeCol !== -1 && row[codeCol] ? row[codeCol] : extractedCode;
      const subjectName = extractedName;

      const rawComp = compCol !== -1 ? row[compCol] : '';
      const { type: componentType, name: componentName } = normalizeComponent(rawComp);

      const room = roomCol !== -1 ? row[roomCol] : undefined;
      const instructor = facultyCol !== -1 ? row[facultyCol] : undefined;

      const cellRef = XLSX.utils.encode_cell({ r, c: subjectCol });

      results.push({
        dayOfWeek,
        startTime,
        endTime,
        subjectName,
        subjectCode,
        componentName,
        componentType,
        room: room || undefined,
        instructor: instructor || undefined,
        sourceSheet: sheetName,
        sourceCell: cellRef,
      });
    }
    return results;
  }

  // Strategy 2: Grid Matrix format (Days as columns or rows, Times as rows or columns)
  // Search matrix for day headers and time headers
  const dayHeaderCells: { r: number; c: number; day: any }[] = [];
  const timeHeaderCells: { r: number; c: number; startTime: string; endTime: string }[] = [];

  for (let r = 0; r < matrix.length; r++) {
    for (let c = 0; c < matrix[r].length; c++) {
      const cellVal = matrix[r][c];
      const day = normalizeDayOfWeek(cellVal);
      if (day) {
        dayHeaderCells.push({ r, c, day });
      }

      const timeRange = parseTimeRange(cellVal, null);
      if (timeRange.startTime) {
        timeHeaderCells.push({
          r,
          c,
          startTime: timeRange.startTime,
          endTime: timeRange.endTime || '',
        });
      }
    }
  }

  if (dayHeaderCells.length === 0 || timeHeaderCells.length === 0) {
    return results;
  }

  // Determine if Days are in a Header Row (Horizontal) and Times are in a Header Column (Vertical)
  const isDaysHorizontal = dayHeaderCells.every((d) => d.r === dayHeaderCells[0].r);
  const isTimesVertical = timeHeaderCells.every((t) => t.c === timeHeaderCells[0].c);

  if (isDaysHorizontal && isTimesVertical) {
    for (const timeCell of timeHeaderCells) {
      for (const dayCell of dayHeaderCells) {
        const cellVal = matrix[timeCell.r]?.[dayCell.c];
        if (!cellVal || cellVal.trim().length === 0) continue;

        // Skip if the cell is just repeating day or time text
        if (normalizeDayOfWeek(cellVal) || parseTimeRange(cellVal, null).startTime) continue;

        const cellRef = XLSX.utils.encode_cell({ r: timeCell.r, c: dayCell.c });
        const parsed = parseCombinedCellText(cellVal);

        if (parsed.subjectName) {
          results.push({
            dayOfWeek: dayCell.day,
            startTime: timeCell.startTime,
            endTime: timeCell.endTime || null,
            subjectName: parsed.subjectName,
            subjectCode: parsed.subjectCode,
            componentName: parsed.componentName || 'Theory',
            componentType: parsed.componentType || 'PP',
            room: parsed.room,
            instructor: parsed.instructor,
            sourceSheet: sheetName,
            sourceCell: cellRef,
          });
        }
      }
    }
  } else {
    // Universal grid search: for any cell containing text, find nearest matching day header and time header
    for (let r = 0; r < matrix.length; r++) {
      for (let c = 0; c < matrix[r].length; c++) {
        const cellVal = matrix[r][c];
        if (!cellVal || cellVal.trim().length === 0) continue;
        if (normalizeDayOfWeek(cellVal) || parseTimeRange(cellVal, null).startTime) continue;

        // Find matching day in same column or row
        const matchedDay = dayHeaderCells.find((d) => d.c === c || d.r === r);
        const matchedTime = timeHeaderCells.find((t) => t.r === r || t.c === c);

        if (matchedDay && matchedTime) {
          const cellRef = XLSX.utils.encode_cell({ r, c });
          const parsed = parseCombinedCellText(cellVal);

          if (parsed.subjectName) {
            results.push({
              dayOfWeek: matchedDay.day,
              startTime: matchedTime.startTime,
              endTime: matchedTime.endTime || null,
              subjectName: parsed.subjectName,
              subjectCode: parsed.subjectCode,
              componentName: parsed.componentName || 'Theory',
              componentType: parsed.componentType || 'PP',
              room: parsed.room,
              instructor: parsed.instructor,
              sourceSheet: sheetName,
              sourceCell: cellRef,
            });
          }
        }
      }
    }
  }

  return results;
}

/**
 * Reads an `.xlsx` file buffer and parses all worksheets for timetable slots.
 */
export function parseXlsxWorkbook(arrayBuffer: ArrayBuffer): {
  sheetsScanned: number;
  extractedClasses: RawExtractedClass[];
} {
  const workbook = XLSX.read(arrayBuffer, { type: 'array', cellDates: true });
  const sheetNames = workbook.SheetNames;
  const extractedClasses: RawExtractedClass[] = [];

  for (const sheetName of sheetNames) {
    const ws = workbook.Sheets[sheetName];
    if (!ws) continue;
    const classes = parseWorksheet(ws, sheetName);
    extractedClasses.push(...classes);
  }

  return {
    sheetsScanned: sheetNames.length,
    extractedClasses,
  };
}
