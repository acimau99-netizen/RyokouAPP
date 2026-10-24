import { TemplateItem } from '../types/zlce';

// Canonical raw imports from templates/ directory (Single Source of Truth)
import sessionStateTemplate from '../../templates/SESSION_STATE.template.md?raw';
import blueprintTemplate from '../../templates/BLUEPRINT.template.md?raw';
import tasksTemplate from '../../templates/TASKS.template.md?raw';
import aiWorkflowTemplate from '../../templates/AI_WORKFLOW.template.md?raw';
import architectureTemplate from '../../templates/ARCHITECTURE.template.md?raw';
import dataModelTemplate from '../../templates/DATA_MODEL.template.md?raw';
import testingTemplate from '../../templates/TESTING.template.md?raw';
import checklistsTemplate from '../../templates/CHECKLISTS.template.md?raw';
import changelogTemplate from '../../templates/CHANGELOG.template.md?raw';
import domainBookingProfile from '../../templates/profiles/DOMAIN_BOOKING.profile.md?raw';
import sessionStateExample from '../../examples/SESSION_STATE.example.md?raw';

export const ZLCE_TEMPLATES: TemplateItem[] = [
  {
    id: 'session-state',
    title: 'SESSION_STATE.md (Single Source of Truth)',
    filename: 'SESSION_STATE.md',
    category: 'state',
    description: 'Sumber kebenaran tunggal status task, catatan serah terima, WAL checkpoint, dan audit state.',
    content: sessionStateTemplate
  },
  {
    id: 'blueprint',
    title: 'BLUEPRINT.md (Gerbang 1)',
    filename: 'BLUEPRINT.md',
    category: 'spec',
    description: 'Visi produk, batasan teknis (non-goals), acceptance criteria, dan daftar modul.',
    content: blueprintTemplate
  },
  {
    id: 'tasks',
    title: 'TASKS.md (Daftar Tugas Atomik)',
    filename: 'TASKS.md',
    category: 'workflow',
    description: 'Daftar seluruh task terstruktur (TASK-001, TASK-002, dst.) dengan dependensi dan kriteria verifikasi.',
    content: tasksTemplate
  },
  {
    id: 'ai-workflow',
    title: 'AI_WORKFLOW.md (Aturan Eksekusi Agen)',
    filename: 'AI_WORKFLOW.md',
    category: 'workflow',
    description: 'Instruksi sistem interaksi AI, protokol commit Git, format Checkpoint Block, dan aturan WAL.',
    content: aiWorkflowTemplate
  },
  {
    id: 'architecture',
    title: 'ARCHITECTURE.md (Arsitektur Sistem)',
    filename: 'ARCHITECTURE.md',
    category: 'spec',
    description: 'Struktur modul, diagram relasi, batasan lapisan, dan keputusan arsitektural (ADR).',
    content: architectureTemplate
  },
  {
    id: 'data-model',
    title: 'DATA_MODEL.md (Skema & Migrasi DB)',
    filename: 'DATA_MODEL.md',
    category: 'spec',
    description: 'Skema tabel, relasi entitas, indeks, dan strategi migrasi database.',
    content: dataModelTemplate
  },
  {
    id: 'testing',
    title: 'TESTING.md (Spesifikasi Pengujian)',
    filename: 'TESTING.md',
    category: 'workflow',
    description: 'Strategi pengujian, test matrix per task, dan ambang batas kelulusan verifikasi.',
    content: testingTemplate
  },
  {
    id: 'checklists',
    title: 'CHECKLISTS.md (Daftar Periksa Kualitas)',
    filename: 'CHECKLISTS.md',
    category: 'workflow',
    description: 'Pre-merge checklist, security checklist, dan deployment release gates.',
    content: checklistsTemplate
  },
  {
    id: 'changelog',
    title: 'CHANGELOG.md (Catatan Perubahan SemVer)',
    filename: 'CHANGELOG.md',
    category: 'workflow',
    description: 'Catatan rilis versi terstruktur mengikuti kaidah Semantic Versioning.',
    content: changelogTemplate
  },
  {
    id: 'domain-booking',
    title: 'DOMAIN_BOOKING.profile.md (Profil Reservasi)',
    filename: 'DOMAIN_BOOKING.profile.md',
    category: 'profile',
    description: 'Profil domain spesifik untuk reservasi rental, booking harian, dan ketersediaan unit.',
    content: domainBookingProfile
  }
];

// Initial prefilled example for first-time onboarding and reset
export const INITIAL_SESSION_STATE_MD = sessionStateExample;
