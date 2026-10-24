/**
 * Type definitions for Zero-Loss Context Engineering (ZLCE) Studio v3.2.2
 */

export type TabType = 
  | 'session' 
  | 'initiation' 
  | 'prompt-engine' 
  | 'runtime-engine' 
  | 'recovery' 
  | 'triage' 
  | 'harness' 
  | 'templates' 
  | 'tutorial';

export type TaskStatus = 'PENDING' | 'READY' | 'IN_PROGRESS' | 'BLOCKED' | 'DONE';

export interface ZLCETask {
  id: string;
  name: string;
  dependencies: string;
  status: TaskStatus;
  evidence: string;
  approved: string;
}

export interface AssumptionOrQuestion {
  id: string;
  type: 'Asumsi' | 'Pertanyaan';
  content: string;
  impactIfWrong: string;
  status: 'OPEN' | 'CONFIRMED' | 'REJECTED' | 'ANSWERED' | 'RESOLVED' | 'ACCEPTED';
}

export interface RevisionSlot {
  id: string;
  level: 'S' | 'M' | 'L';
  description: string;
  action: string;
}

export interface ParsedSessionState {
  raw?: string;
  context: {
    projectName: string;
    stack: string;
    mode: 'FULL' | 'LITE';
    fileWriteCapability: string;
    execCapability: string;
  };
  status: {
    timestampAudit: string;
    gitBranch: string;
    lastDoneTask: string;
    activeTask: string;
    activeTaskStatus: TaskStatus;
    nextTask: string;
  };
  tasks: ZLCETask[];
  wal: {
    task: string;
    currentStep: string;
    plannedFiles: string;
    completedSoFar: string;
    nextStepExact: string;
    verificationCommand: string;
    updatedTimestamp: string;
  };
  assumptions: AssumptionOrQuestion[];
  revisions: RevisionSlot[];
  handoverNotes: string;
  auditLog: string[];
}

export interface ValidationIssue {
  type: 'error' | 'warning' | 'info';
  code: string;
  message: string;
  line?: number;
  fixable?: boolean;
  fixAction?: string;
}

export interface ValidationResult {
  valid: boolean;
  errorsCount: number;
  warningsCount: number;
  tasksCount: number;
  inProgressTasks: string[];
  issues: ValidationIssue[];
}

export interface ZeroLossChecklist {
  outputFormatFirst: boolean;
  schemaExplicit: boolean;
  verbatimContext: boolean;
  edgeCasesDeclared: boolean;
  stopTokenPresent: boolean;
  deterministicParsing: boolean;
}

export interface TaskLedgerEvent {
  id: string;
  clockTick: number;
  taskId: string;
  type: string;
  description: string;
  metadata?: string;
}

export interface TokenBudgetPreset {
  id: string;
  name: string;
  provider: string;
  category: string;
  freeQuotaDisplay: string;
  perRequestLimit: number;
  monthlyQuotaTokens: number;
  notes: string;
  docsUrl: string;
}

export interface TemplateItem {
  id: string;
  title: string;
  filename: string;
  category: string;
  description: string;
  content: string;
}

export interface SelfTestScenario {
  id: string;
  title: string;
  category: string;
  description: string;
  status: 'PASS' | 'FAIL' | 'PENDING';
  testPrompt: string;
  evaluationCriteria: {
    passConditions: string[];
    failConditions: string[];
  };
  sampleAgentResponse: string;
  userNotes?: string;
}
