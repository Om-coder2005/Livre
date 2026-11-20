export type ProcessingStage =
  | 'validating'
  | 'opening'
  | 'extracting'
  | 'binding'
  | 'complete'
  | 'error';

export interface ProcessingStatus {
  stage: ProcessingStage;
  message: string;
  progressPercent: number; // 0 to 100
  error?: string;
}

export const MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024; // 50 MB
