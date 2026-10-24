import { ParsedSessionState, ZLCETask, AssumptionOrQuestion, RevisionSlot, TaskStatus } from '../types/zlce';

export function parseSessionStateMarkdown(content: string): ParsedSessionState {
  const lines = content.split(/\r?\n/);

  // Extract project name from title header if available: `# STATUS SESI (SESSION_STATE.md): Name`
  let headerProjectName = '';
  const firstHeaderMatch = content.match(/^#\s+STATUS SESI\s*(?:\(SESSION_STATE\.md\))?:\s*(.+)$/m);
  if (firstHeaderMatch && firstHeaderMatch[1]) {
    headerProjectName = firstHeaderMatch[1].trim();
  }

  const context = {
    projectName: headerProjectName || '-',
    stack: '-',
    mode: 'LITE' as 'FULL' | 'LITE',
    fileWriteCapability: '-',
    execCapability: '-',
  };

  const status = {
    timestampAudit: '-',
    gitBranch: '-',
    lastDoneTask: '-',
    activeTask: '-',
    activeTaskStatus: 'PENDING' as TaskStatus,
    nextTask: '-',
  };

  const wal = {
    task: '-',
    currentStep: '-',
    plannedFiles: '-',
    completedSoFar: '-',
    nextStepExact: '-',
    verificationCommand: '-',
    updatedTimestamp: '-',
  };

  const tasks: ZLCETask[] = [];
  const assumptions: AssumptionOrQuestion[] = [];
  const revisions: RevisionSlot[] = [];
  const auditLog: string[] = [];
  let handoverNotes = '';

  let currentSection = -1;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (line.includes('## 0. KONTEKS PROYEK')) { currentSection = 0; continue; }
    if (line.includes('## 1. STATUS AKTIF')) { currentSection = 1; continue; }
    if (line.includes('## 2. MATRIKS TASK')) { currentSection = 2; continue; }
    if (line.includes('## 3. WORK IN PROGRESS (WAL)')) { currentSection = 3; continue; }
    if (line.includes('## 4. ASSUMPTIONS & OPEN QUESTIONS')) { currentSection = 4; continue; }
    if (line.includes('## 5. SLOT REVISI AKTIF')) { currentSection = 5; continue; }
    if (line.includes('## 6. CATATAN SERAH TERIMA')) { currentSection = 6; continue; }
    if (line.includes('## 7. LOG AUDIT')) { currentSection = 7; continue; }

    // Section 0 parsing
    if (currentSection === 0) {
      if (line.includes('* **Proyek:**')) context.projectName = line.split('* **Proyek:**')[1].trim();
      if (line.includes('* **Stack:**')) context.stack = line.split('* **Stack:**')[1].trim();
      if (line.includes('* **MODE:**')) context.mode = line.includes('FULL') ? 'FULL' : 'LITE';
      if (line.includes('* **Kemampuan Tulis Berkas AI:**')) context.fileWriteCapability = line.split('* **Kemampuan Tulis Berkas AI:**')[1].trim();
      if (line.includes('* **Kemampuan Eksekusi AI:**')) context.execCapability = line.split('* **Kemampuan Eksekusi AI:**')[1].trim();
    }

    // Section 1 parsing
    if (currentSection === 1) {
      if (line.includes('* **Timestamp Audit:**')) status.timestampAudit = line.split('* **Timestamp Audit:**')[1].trim();
      if (line.includes('* **Cabang Git:**')) status.gitBranch = line.split('* **Cabang Git:**')[1].replace(/[`*]/g, '').trim();
      if (line.includes('* **Task Terakhir DONE:**')) status.lastDoneTask = line.split('* **Task Terakhir DONE:**')[1].replace(/[`*]/g, '').trim();
      if (line.includes('* **Task Aktif:**')) status.activeTask = line.split('* **Task Aktif:**')[1].replace(/[`*]/g, '').trim();
      if (line.includes('* **Status Task Aktif:**')) {
        const parsedStatus = line.split('* **Status Task Aktif:**')[1].replace(/[`*]/g, '').trim() as TaskStatus;
        status.activeTaskStatus = parsedStatus;
      }
      if (line.includes('* **Task Berikutnya:**')) status.nextTask = line.split('* **Task Berikutnya:**')[1].replace(/[`*]/g, '').trim();
    }

    // Section 2 parsing (Tasks)
    if (currentSection === 2) {
      const trimmed = line.trim();
      const isSep = /^\|\s*:?-{3,}/.test(trimmed);
      if (trimmed.startsWith('|') && !isSep) {
        const parts = line.split('|').map(p => p.trim()).filter((_, idx, arr) => idx > 0 && idx < arr.length - 1);
        if (parts.length >= 4) {
          const rawId = parts[0].replace(/[`*]/g, '').trim();
          if (/^ID\s*Task$/i.test(rawId) || rawId === 'ID' || rawId === '-' || rawId === '---') {
            continue;
          }
          const tidMatch = rawId.match(/TASK-(?:REV-)?\d+/);
          const id = tidMatch ? tidMatch[0] : rawId;
          const name = parts[1].trim();
          const dependencies = parts[2].trim();
          const taskStatus = parts[3].replace(/[`*]/g, '').trim() as TaskStatus;
          const evidence = parts[4] ? parts[4].trim() : '-';
          const approved = parts[5] ? parts[5].trim() : '-';

          if (id && id !== '---') {
            tasks.push({ id, name, dependencies, status: taskStatus, evidence, approved });
          }
        }
      }
    }

    // Section 3 parsing (WAL)
    if (currentSection === 3) {
      if (line.includes('* **Task:**')) wal.task = line.split('* **Task:**')[1].trim();
      if (line.includes('* **Langkah Sedang Dikerjakan:**')) wal.currentStep = line.split('* **Langkah Sedang Dikerjakan:**')[1].trim();
      if (line.includes('* **Berkas Direncanakan/Disentuh:**')) wal.plannedFiles = line.split('* **Berkas Direncanakan/Disentuh:**')[1].trim();
      if (line.includes('* **Sudah Dilakukan:**')) wal.completedSoFar = line.split('* **Sudah Dilakukan:**')[1].trim();
      if (line.includes('* **Langkah Berikutnya (persis):**')) wal.nextStepExact = line.split('* **Langkah Berikutnya (persis):**')[1].trim();
      if (line.includes('* **Perintah Verifikasi:**')) wal.verificationCommand = line.split('* **Perintah Verifikasi:**')[1].trim();
      if (line.includes('* **Diperbarui:**')) wal.updatedTimestamp = line.split('* **Diperbarui:**')[1].trim();
    }

    // Section 4 parsing (Assumptions)
    if (currentSection === 4) {
      const trimmed = line.trim();
      const isSep = /^\|\s*:?-{3,}/.test(trimmed);
      if (trimmed.startsWith('|') && !isSep) {
        const parts = line.split('|').map(p => p.trim()).filter((_, idx, arr) => idx > 0 && idx < arr.length - 1);
        if (parts.length >= 5) {
          const rawId = parts[0].replace(/[`*]/g, '').trim();
          if (/^ID$/i.test(rawId) || rawId === '-' || rawId === '(kosong)') {
            continue;
          }
          assumptions.push({
            id: rawId,
            type: parts[1] as 'Asumsi' | 'Pertanyaan',
            content: parts[2].trim(),
            impactIfWrong: parts[3].trim(),
            status: parts[4].replace(/[`*]/g, '').trim() as 'OPEN' | 'CONFIRMED' | 'REJECTED' | 'ANSWERED' | 'RESOLVED' | 'ACCEPTED'
          });
        }
      }
    }

    // Section 5 parsing (Revisions)
    if (currentSection === 5) {
      const trimmed = line.trim();
      const isSep = /^\|\s*:?-{3,}/.test(trimmed);
      if (trimmed.startsWith('|') && !isSep) {
        const parts = line.split('|').map(p => p.trim()).filter((_, idx, arr) => idx > 0 && idx < arr.length - 1);
        if (parts.length >= 4) {
          const rawId = parts[0].replace(/[`*]/g, '').trim();
          if (/^ID$/i.test(rawId) || rawId === '-' || rawId === '(kosong)') {
            continue;
          }
          revisions.push({
            id: rawId,
            level: parts[1] as 'S' | 'M' | 'L',
            description: parts[2].trim(),
            action: parts[3].trim()
          });
        }
      }
    }

    // Section 6 parsing (Handover notes)
    if (currentSection === 6) {
      if (!line.startsWith('## ') && !line.startsWith('---')) {
        handoverNotes += (handoverNotes ? '\n' : '') + line;
      }
    }

    // Section 7 parsing (Audit log)
    if (currentSection === 7) {
      if (line.trim().startsWith('*')) {
        auditLog.push(line.trim());
      }
    }
  }

  return {
    raw: content,
    context,
    status,
    tasks,
    wal,
    assumptions,
    revisions,
    handoverNotes: handoverNotes.trim(),
    auditLog
  };
}

export function serializeSessionStateToMarkdown(data: ParsedSessionState): string {
  const { context, status, tasks, wal, assumptions, revisions, handoverNotes, auditLog } = data;

  const taskRows = tasks.map(t => 
    `| \`${t.id}\` | ${t.name} | ${t.dependencies || '-'} | ${t.status} | ${t.evidence || '-'} | ${t.approved || '-'} |`
  ).join('\n');

  const assumptionRows = assumptions.length > 0
    ? assumptions.map(a => `| \`${a.id}\` | ${a.type} | ${a.content} | ${a.impactIfWrong} | ${a.status} |`).join('\n')
    : '| - | - | Tidak ada asumsi terbuka | - | - |';

  const revisionRows = revisions.length > 0
    ? revisions.map(r => `| \`${r.id}\` | ${r.level} | ${r.description} | ${r.action} |`).join('\n')
    : '| - | - | Kosong | - |';

  const auditLogRows = auditLog.length > 0
    ? auditLog.join('\n')
    : `* **[${status.timestampAudit || '2026-10-14 jam: ?'}]** Sesi sinkronisasi dan verifikasi audit state.`;

  return `# STATUS SESI (SESSION_STATE.md): ${context.projectName}

Sumber kebenaran tunggal status task dan titik pemulihan sesi (Zero-Loss Context Engineering v3.2.2).

---

## 0. KONTEKS PROYEK (statis)

* **Proyek:** ${context.projectName}
* **Stack:** ${context.stack}
* **MODE:** ${context.mode}
* **Kemampuan Tulis Berkas AI:** ${context.fileWriteCapability}
* **Kemampuan Eksekusi AI:** ${context.execCapability}

---

## 1. STATUS AKTIF

* **Timestamp Audit:** ${status.timestampAudit}
* **Cabang Git:** \`${status.gitBranch}\`
* **Task Terakhir DONE:** \`${status.lastDoneTask || '-'}\`
* **Task Aktif:** \`${status.activeTask || '-'}\`
* **Status Task Aktif:** ${status.activeTaskStatus || 'PENDING'}
* **Task Berikutnya:** \`${status.nextTask || '-'}\`

---

## 2. MATRIKS TASK

| ID Task | Nama | Dependensi | Status | Bukti Verifikasi | Disetujui |
| :--- | :--- | :--- | :--- | :--- | :--- |
${taskRows}

---

## 3. WORK IN PROGRESS (WAL)

* **Task:** ${wal.task}
* **Langkah Sedang Dikerjakan:** ${wal.currentStep}
* **Berkas Direncanakan/Disentuh:** ${wal.plannedFiles}
* **Sudah Dilakukan:** ${wal.completedSoFar}
* **Langkah Berikutnya (persis):** ${wal.nextStepExact}
* **Perintah Verifikasi:** ${wal.verificationCommand}
* **Diperbarui:** ${wal.updatedTimestamp}

---

## 4. ASSUMPTIONS & OPEN QUESTIONS

| ID | Jenis | Isi | Dampak jika salah | Status |
| :--- | :--- | :--- | :--- | :--- |
${assumptionRows}

---

## 5. SLOT REVISI AKTIF

| ID | Level (S/M/L) | Deskripsi | Tindakan |
| :--- | :--- | :--- | :--- |
${revisionRows}

---

## 6. CATATAN SERAH TERIMA

${handoverNotes || '- Sesi berjalan normal, tidak ada catatan blocking.'}

---

## 7. LOG AUDIT

${auditLogRows}
`;
}
