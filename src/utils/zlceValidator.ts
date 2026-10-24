import { ValidationResult, ValidationIssue, TaskStatus } from '../types/zlce';

export const VALID_STATUSES: Set<TaskStatus> = new Set([
  'PENDING',
  'READY',
  'IN_PROGRESS',
  'BLOCKED',
  'DONE'
]);

export const REQUIRED_SECTIONS = [
  '0. KONTEKS PROYEK',
  '1. STATUS AKTIF',
  '2. MATRIKS TASK',
  '3. WORK IN PROGRESS (WAL)',
  '4. ASSUMPTIONS & OPEN QUESTIONS',
  '5. SLOT REVISI AKTIF',
  '6. CATATAN SERAH TERIMA',
  '7. LOG AUDIT'
];

const TID_REGEX = /TASK-(?:REV-)?\d+/g;
const SINGLE_TID_REGEX = /TASK-(?:REV-)?\d+/;

interface ParsedMatrixRow {
  id: string;
  name: string;
  deps: string[];
  status: TaskStatus;
  evidence: string;
  approved: string;
  lineNum: number;
}

/**
 * Validates SESSION_STATE.md text against ZLCE v3.2.2 rules.
 * Provides parity for all rules inspectable within SESSION_STATE.md.
 * Note: Cross-checks against external TASKS.md and Git working tree are handled by CLI (scripts/zlce/zlce-check.py).
 */
export function validateSessionState(content: string): ValidationResult {
  const issues: ValidationIssue[] = [];
  const lines = content.split(/\r?\n/);

  let errorsCount = 0;
  let warningsCount = 0;
  let tasksCount = 0;
  const inProgressTasks: string[] = [];

  // Helper to extract a section's text by number
  const getSection = (num: number): string => {
    const secHeaderRegex = new RegExp(`^##\\s+${num}\\..*?$`, 'm');
    const match = content.match(secHeaderRegex);
    if (!match || match.index === undefined) return '';

    const startIdx = match.index;
    const nextSecMatch = content.slice(startIdx + match[0].length).match(/^##\s+\d+\..*?$/m);
    const endIdx = nextSecMatch && nextSecMatch.index !== undefined
      ? startIdx + match[0].length + nextSecMatch.index
      : content.length;

    return content.slice(startIdx, endIdx);
  };

  // Helper to extract field value: `* **Name:** value`
  const getField = (sectionText: string, fieldName: string): string | null => {
    const escaped = fieldName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`\\*\\*${escaped}:\\*\\*[ \\t]*(.*)`, 'i');
    const m = sectionText.match(regex);
    return m ? m[1].trim() : null;
  };

  const getFirstTid = (val: string | null): string | null => {
    if (!val) return null;
    const m = val.match(SINGLE_TID_REGEX);
    return m ? m[0] : null;
  };

  // 1. Check Required Sections
  for (const sec of REQUIRED_SECTIONS) {
    const sectionRegex = new RegExp(`^##\\s+${sec.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`, 'm');
    const hasSection = lines.some(line => sectionRegex.test(line));
    if (!hasSection) {
      issues.push({
        type: 'error',
        code: 'MISSING_SECTION',
        message: `Bagian wajib tidak ditemukan: '## ${sec}'`,
        fixable: true,
        fixAction: `insert_section_${sec.substring(0, 1)}`
      });
      errorsCount++;
    }
  }

  // 2. Parse and Validate Task Matrix (Section 2)
  const rows: ParsedMatrixRow[] = [];
  const sec2 = getSection(2);

  if (sec2) {
    const sec2Lines = sec2.split(/\r?\n/);
    for (let j = 0; j < sec2Lines.length; j++) {
      const line = sec2Lines[j];
      const trimmed = line.trim();
      if (!trimmed.startsWith('|')) continue;
      const isSep = /^\|\s*:?-{3,}/.test(trimmed);
      if (isSep) continue;

      const cells = trimmed.replace(/^\|/, '').replace(/\|$/, '').split('|').map(c => c.trim());
      if (cells.length < 4) continue;
      const rawId = cells[0].replace(/[`*]/g, '').trim();
      if (/^ID\s*Task$/i.test(rawId) || rawId === 'ID' || rawId === '-' || rawId === '---') {
        continue;
      }

      const tidMatch = rawId.match(SINGLE_TID_REGEX);
      if (!tidMatch) continue;

      const id = tidMatch[0];
      const name = cells[1] || '';
      const depsStr = cells[2] ? cells[2].trim() : '-';
      const deps = (depsStr.match(TID_REGEX) || []) as string[];
      const rawStatus = (cells[3] || '').replace(/[`*]/g, '').trim() as TaskStatus;
      const rawEvidence = cells[4] ? cells[4].replace(/[`*]/g, '').trim() : '';
      const rawApproval = cells[5] ? cells[5].replace(/[`*]/g, '').trim().toLowerCase() : '';

      rows.push({
        id,
        name,
        deps,
        status: rawStatus,
        evidence: rawEvidence,
        approved: rawApproval,
        lineNum: j + 1
      });
    }
  }

  tasksCount = rows.length;

  if (tasksCount === 0 && getSection(2)) {
    issues.push({
      type: 'error',
      code: 'EMPTY_TASK_MATRIX',
      message: 'Matriks task kosong atau tidak terbaca pada Bagian 2 (MATRIKS TASK).'
    });
    errorsCount++;
  }

  // Check for duplicate Task IDs
  const seenIds = new Set<string>();
  const duplicateIds = new Set<string>();
  for (const r of rows) {
    if (seenIds.has(r.id)) {
      duplicateIds.add(r.id);
    }
    seenIds.add(r.id);
  }

  for (const dup of duplicateIds) {
    issues.push({
      type: 'error',
      code: 'DUPLICATE_TASK_ID',
      message: `ID task duplikat di matriks: ${dup}. Setiap task harus memiliki ID unik.`
    });
    errorsCount++;
  }

  const byId = new Map<string, ParsedMatrixRow>();
  for (const r of rows) {
    byId.set(r.id, r);
  }

  // Validate each task in matrix
  for (const r of rows) {
    // Enum validation
    if (!VALID_STATUSES.has(r.status)) {
      issues.push({
        type: 'error',
        code: 'INVALID_STATUS',
        message: `Baris ${r.lineNum}: Status '${r.status}' pada task ${r.id} bukan enum sah [PENDING, READY, IN_PROGRESS, BLOCKED, DONE].`,
        line: r.lineNum,
        fixable: true
      });
      errorsCount++;
    }

    if (r.status === 'IN_PROGRESS') {
      inProgressTasks.push(r.id);
    }

    // Dependencies existence check
    for (const d of r.deps) {
      if (!byId.has(d)) {
        issues.push({
          type: 'error',
          code: 'MISSING_DEPENDENCY',
          message: `Baris ${r.lineNum}: Task ${r.id} memiliki dependensi '${d}' yang tidak terdaftar di matriks task.`,
          line: r.lineNum
        });
        errorsCount++;
      }
    }

    // Check if all dependencies are DONE
    const allDepsDone = r.deps.every(d => byId.get(d)?.status === 'DONE');

    if ((r.status === 'IN_PROGRESS' || r.status === 'DONE') && r.deps.length > 0 && !allDepsDone) {
      issues.push({
        type: 'error',
        code: 'DEPENDENCY_NOT_DONE',
        message: `Baris ${r.lineNum}: Task ${r.id} berstatus ${r.status} tetapi dependensinya belum semua DONE.`,
        line: r.lineNum
      });
      errorsCount++;
    }

    if (r.status === 'READY' && r.deps.length > 0 && !allDepsDone) {
      issues.push({
        type: 'error',
        code: 'READY_DEPENDENCY_NOT_DONE',
        message: `Baris ${r.lineNum}: Task ${r.id} READY tetapi dependensinya belum semua DONE.`,
        line: r.lineNum
      });
      errorsCount++;
    }

    if (r.status === 'PENDING' && r.deps.length > 0 && allDepsDone) {
      issues.push({
        type: 'warning',
        code: 'PENDING_SHOULD_BE_READY',
        message: `Baris ${r.lineNum}: Task ${r.id} PENDING padahal semua dependensi sudah DONE (seharusnya READY).`,
        line: r.lineNum
      });
      warningsCount++;
    }

    // Quality Gates for DONE: Bukti & Disetujui ('ya' or 'yes')
    if (r.status === 'DONE') {
      if (!r.evidence || r.evidence === '-' || r.evidence.length < 3) {
        issues.push({
          type: 'error',
          code: 'DONE_MISSING_EVIDENCE',
          message: `Baris ${r.lineNum}: Task ${r.id} DONE tanpa Bukti Verifikasi.`,
          line: r.lineNum,
          fixable: true
        });
        errorsCount++;
      }

      if (!r.approved || (!r.approved.includes('ya') && !r.approved.includes('yes'))) {
        issues.push({
          type: 'error',
          code: 'DONE_UNAPPROVED',
          message: `Baris ${r.lineNum}: Task ${r.id} DONE tanpa persetujuan pengguna (Disetujui != 'ya' / 'yes').`,
          line: r.lineNum,
          fixable: true
        });
        errorsCount++;
      }
    }

    // Quality gate warning for PENDING/READY with evidence filled prematurely
    if ((r.status === 'PENDING' || r.status === 'READY') && r.evidence && r.evidence !== '-') {
      issues.push({
        type: 'warning',
        code: 'PREMATURE_EVIDENCE',
        message: `Baris ${r.lineNum}: Task ${r.id} berstatus ${r.status} tetapi kolom bukti verifikasi sudah terisi.`,
        line: r.lineNum
      });
      warningsCount++;
    }
  }

  // 3. Rule R4 / Single IN_PROGRESS check
  if (inProgressTasks.length > 1) {
    issues.push({
      type: 'error',
      code: 'MULTIPLE_IN_PROGRESS',
      message: `Lebih dari 1 task IN_PROGRESS terdeteksi: [${inProgressTasks.join(', ')}]. Aturan ZLCE R4 mewajibkan maksimal tepat 1 task aktif.`,
      fixable: true
    });
    errorsCount++;
  }

  // 4. Header (Section 1) vs Matrix (Section 2) cross-checks
  const sec1 = getSection(1);
  if (sec1) {
    const rawActive = getField(sec1, 'Task Aktif');
    const activeTid = getFirstTid(rawActive);
    const actStatusRaw = (getField(sec1, 'Status Task Aktif') || '').replace(/[`*]/g, '').trim();
    const lastDoneRaw = getField(sec1, 'Task Terakhir DONE');
    const lastDoneTid = getFirstTid(lastDoneRaw);

    if (activeTid) {
      if (!byId.has(activeTid)) {
        issues.push({
          type: 'error',
          code: 'ACTIVE_TASK_NOT_IN_MATRIX',
          message: `Header Bagian 1: Task Aktif ${activeTid} tidak ada di matriks task.`
        });
        errorsCount++;
      } else if (actStatusRaw && byId.get(activeTid)?.status !== actStatusRaw) {
        issues.push({
          type: 'error',
          code: 'ACTIVE_STATUS_MISMATCH',
          message: `Status Task Aktif di header (${actStatusRaw}) != status di matriks (${byId.get(activeTid)?.status}) untuk task ${activeTid}.`
        });
        errorsCount++;
      }
    }

    if (lastDoneTid && byId.has(lastDoneTid) && byId.get(lastDoneTid)?.status !== 'DONE') {
      issues.push({
        type: 'error',
        code: 'LAST_DONE_NOT_DONE',
        message: `Task Terakhir DONE ${lastDoneTid} berstatus '${byId.get(lastDoneTid)?.status}' di matriks (seharusnya DONE).`
      });
      errorsCount++;
    }

    if (inProgressTasks.length > 0 && activeTid && activeTid !== inProgressTasks[0]) {
      issues.push({
        type: 'error',
        code: 'IN_PROGRESS_HEADER_MISMATCH',
        message: `Task IN_PROGRESS di matriks (${inProgressTasks[0]}) != Task Aktif di header (${activeTid}).`
      });
      errorsCount++;
    }
  }

  // 5. Section 3 (WORK IN PROGRESS / WAL) checks
  const sec3 = getSection(3);
  if (sec3) {
    const walTaskRaw = getField(sec3, 'Task');
    const walTask = getFirstTid(walTaskRaw);
    const walEmpty = !walTask || walTaskRaw === '-';

    if (inProgressTasks.length > 0 && walEmpty) {
      issues.push({
        type: 'warning',
        code: 'WAL_EMPTY_WHILE_IN_PROGRESS',
        message: `${inProgressTasks[0]} IN_PROGRESS tetapi WAL kosong (risiko kehilangan konteks bila sesi terputus).`
      });
      warningsCount++;
    }

    if (inProgressTasks.length === 0 && !walEmpty) {
      issues.push({
        type: 'warning',
        code: 'WAL_NOT_EMPTY_NO_IN_PROGRESS',
        message: `WAL berisi ${walTask} padahal tidak ada task IN_PROGRESS (kosongkan setelah DONE).`
      });
      warningsCount++;
    }

    if (inProgressTasks.length > 0 && !walEmpty && walTask !== inProgressTasks[0]) {
      issues.push({
        type: 'error',
        code: 'WAL_TASK_MISMATCH',
        message: `WAL menunjuk ${walTask} tetapi task IN_PROGRESS di matriks adalah ${inProgressTasks[0]}.`
      });
      errorsCount++;
    }

    if (walTask && byId.has(walTask) && byId.get(walTask)?.status === 'DONE') {
      issues.push({
        type: 'error',
        code: 'WAL_NOT_CLEARED_AFTER_DONE',
        message: `WAL belum dikosongkan padahal task ${walTask} sudah DONE.`
      });
      errorsCount++;
    }

    if (!walEmpty) {
      const nextStep = getField(sec3, 'Langkah Berikutnya (persis)');
      const plannedFiles = getField(sec3, 'Berkas Direncanakan/Disentuh');
      if (!nextStep || nextStep === '-') {
        issues.push({
          type: 'warning',
          code: 'WAL_FIELD_EMPTY',
          message: "WAL terisi tetapi field 'Langkah Berikutnya (persis)' masih kosong."
        });
        warningsCount++;
      }
      if (!plannedFiles || plannedFiles === '-') {
        issues.push({
          type: 'warning',
          code: 'WAL_FIELD_EMPTY',
          message: "WAL terisi tetapi field 'Berkas Direncanakan/Disentuh' masih kosong."
        });
        warningsCount++;
      }
    }
  }

  // 6. Rule X1: Anti-Ekstrapolasi Jam
  let foundAuditTimestamp = false;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lineNum = i + 1;

    if (line.includes('Timestamp Audit:') || line.includes('Diperbarui:')) {
      foundAuditTimestamp = true;
      const hasTimePattern = /\b\d{1,2}:\d{2}(?::\d{2})?\b/.test(line);
      const hasFallback = line.includes('jam: ?');

      if (!hasTimePattern && !hasFallback) {
        issues.push({
          type: 'warning',
          code: 'CLOCK_RULE_X1_FORMAT',
          message: `Baris ${lineNum}: Timestamp harus mencantumkan waktu valid atau format fallback 'jam: ?' (Aturan X1).`,
          line: lineNum
        });
        warningsCount++;
      }
    }
  }

  if (!foundAuditTimestamp) {
    issues.push({
      type: 'warning',
      code: 'NO_AUDIT_TIMESTAMP',
      message: "Field 'Timestamp Audit' tidak ditemukan pada Bagian 1. Disarankan menyertakan timestamp audit."
    });
    warningsCount++;
  }

  // 7. Check for remaining unfilled placeholders (e.g. [NAMA_PROYEK], [TASK-xxx])
  const placeholders = content.match(/\[[A-Z][A-Z0-9_ /|:\-]{2,}\]/g);
  if (placeholders && placeholders.length > 0) {
    // Exclude markdown checkboxes like [ ] or [X]
    const validPhs = placeholders.filter(p => !p.startsWith('[X]') && !p.startsWith('[ ]'));
    if (validPhs.length > 0) {
      issues.push({
        type: 'warning',
        code: 'REMAINING_PLACEHOLDERS',
        message: `Placeholder belum diisi di SESSION_STATE.md: ${validPhs.length} item (mis. ${validPhs[0]}).`
      });
      warningsCount++;
    }
  }

  // 8. Open questions/assumptions info
  const sec4 = getSection(4);
  const openQuestions = (sec4.match(/\|\s*OPEN\s*\|/gi) || []).length;
  if (openQuestions > 0) {
    issues.push({
      type: 'info',
      code: 'OPEN_ASSUMPTIONS_COUNT',
      message: `${openQuestions} asumsi/pertanyaan berstatus OPEN tercatat di Bagian 4.`
    });
  }

  return {
    valid: errorsCount === 0,
    errorsCount,
    warningsCount,
    tasksCount,
    inProgressTasks,
    issues
  };
}
