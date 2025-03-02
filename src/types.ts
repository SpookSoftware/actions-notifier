export type MonitorRequestType = "action" | "job";

export type MonitorRequestTask = "start-monitoring" | "stop-monitoring";

export type MonitorRequest = {
  type: MonitorRequestType;
  runId: string;
  jobId?: string;
  owner: string;
  repository: string;
  task: MonitorRequestTask;
};

export type StartMonitorRequest = Omit<MonitorRequest, "task"> & {
  task: "start-monitoring";
};
export type StopMonitorRequest = Omit<MonitorRequest, "task"> & {
  task: "stop-monitoring";
};

export type StartMonitorJobRequest = Omit<
  StartMonitorRequest,
  "type" | "jobId"
> & {
  type: "job";
  jobId: string;
};
export type StopMonitorJobRequest = Omit<
  StopMonitorRequest,
  "type" | "jobId"
> & {
  type: "job";
  jobId: string;
};

export type StartMonitorActionRequest = Omit<
  StartMonitorRequest,
  "jobId" | "type"
> & {
  type: "action";
};
export type StopMonitorActionRequest = Omit<
  StopMonitorRequest,
  "type" | "jobId"
> & {
  type: "Action";
};

export type MonitorResponse =
  | {
      status: "ok";
      data?: Record<string, any>;
    }
  | {
      status: "error";
      error: Error;
    };

export type Encoded =
  | `${string}|${string}|${string}|${string}`
  | `${string}|${string}|${string}`;
