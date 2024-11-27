export type MonitorRequestType = {
  type: "action" | "job";
};

export type MonitorActionRequest = {
  type: "action";
  runId: string;
  owner: string;
  repository: string;
};

export type MonitorJobRequest = {
  type: "job";
  runId: string;
  jobId: string;
  owner: string;
  repository: string;
};

export type MonitorRequest = MonitorActionRequest | MonitorJobRequest;
