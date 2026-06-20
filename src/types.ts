export interface NpsEvaluation {
  id?: string;
  chatId?: string;
  agentName: string;
  chatStart: string;
  chatEnd: string;
  durationStr: string;
  score: number;
  manualSummary: string;
  aiCoaching: string;
  npsPrediction: string;
  date: string;
  isFaulty: boolean;
  acknowledged?: boolean;
  ackDate?: string;
}

export interface QualityRecord {
  EmployeeID: string;
  AgentName: string;
  CCDepartment: string;
  TL: string;
  SheetDate: string;
  FactorName: string;
  FatalityDescription: string;
  FailedComment: string;
}

export interface AhtEvaluation {
  id?: string;
  chatId: string;
  fullName: string;
  targetAht: string;
  actualAht: string;
  responseTime: string;
  holdTime: string;
  isFaulty: boolean;
  respVio: string[];
  holdVio: string[];
  date: string;
}

export interface ChatMessage {
  sender: string;
  type: "agent" | "customer";
  timeObj?: string;
  timeStr: string;
  text: string;
}
