import browser from "webextension-polyfill";
import ExtPay from "extpay";
import { sevenDaysAfter, trialIsValid } from "@/services/trial";

function createTokenState() {
  let token = $state<string>("");
  let valid = $state<boolean>(false);
  let isCheckingValidity = $state<boolean>(false);
  let isLoadingToken = $state<boolean>(false);

  return {
    get token() {
      return token;
    },
    set token(value) {
      token = value;
      // Automatically check validity when token changes
      this.checkTokenValidity();
    },
    get valid() {
      return valid;
    },
    get isCheckingValidity() {
      return isCheckingValidity;
    },
    get isLoadingToken() {
      return isLoadingToken;
    },
    async readTokenFromStorage() {
      if (isLoadingToken) return token;

      isLoadingToken = true;
      try {
        const result = await browser.storage.local.get("githubToken");
        if (result.githubToken) {
          token = String(result.githubToken);
        } else {
          token = "";
        }
        return token;
      } catch (error) {
        console.error("Error reading token from storage:", error);
        token = "";
        return token;
      } finally {
        isLoadingToken = false;
      }
    },
    async checkTokenValidity() {
      if (isCheckingValidity) return valid;

      isCheckingValidity = true;
      try {
        if (!token) {
          valid = false;
          return valid;
        }

        const response = await fetch("https://api.github.com/user", {
          headers: {
            Authorization: `token ${token}`,
          },
        });

        valid = response.ok && response.status === 200;
        return valid;
      } catch (error) {
        console.error("Token validation error:", error);
        valid = false;
        return valid;
      } finally {
        isCheckingValidity = false;
      }
    },
  };
}

function createAlarmState() {
  let alarms = $state<browser.Alarms.Alarm[]>([]);
  let alarmCount = $state<number>(0);
  let isLoading = $state<boolean>(false);

  return {
    get alarmCount() {
      return alarmCount;
    },
    set alarmCount(value) {
      alarmCount = value;
    },
    get alarms() {
      return alarms;
    },
    set alarms(value) {
      alarms = value;
    },
    get isLoading() {
      return isLoading;
    },
    getAlarmCount: async () => {
      if (isLoading) return alarmCount;
      isLoading = true;
      const alarms = await browser.alarms.getAll();
      alarmCount = alarms.length;
      isLoading = false;
      return alarmCount;
    },
    getAlarms: async () => {
      if (isLoading) return alarms;
      isLoading = true;
      const alarmsFromBrowser = await browser.alarms.getAll();
      alarms = alarmsFromBrowser;
      isLoading = false;
      return alarms;
    },
    refresh: async () => {
      if (isLoading) return;
      isLoading = true;
      const browserAlarms = await browser.alarms.getAll();
      alarmCount = browserAlarms.length;
      alarms = browserAlarms;
      isLoading = false;
      return;
    },
  };
}

function createPaymentState() {
  const extpay = ExtPay("cicd-workflow-notifications");
  let paymentStatus = $state<{
    paid: boolean;
    trialStartedAt: Date | null;
    trialIsValid: boolean;
    trialExpired: boolean;
    trialExpirationDate: Date | null;
    trialNeverStarted: boolean;
  }>({
    paid: false,
    trialStartedAt: null,
    trialIsValid: false,
    trialExpired: false,
    trialExpirationDate: null,
    trialNeverStarted: true,
  });

  extpay.onTrialStarted.addListener((user) => {
    // Since we're keying on onTrialStarted, we know there's a trial.
    paymentStatus.trialStartedAt = new Date(user.trialStartedAt!);
    paymentStatus.trialIsValid = true;
    paymentStatus.trialNeverStarted = false;
    paymentStatus.trialExpired = false;
    paymentStatus.trialExpirationDate = new Date(
      new Date(user.trialStartedAt!.getTime() + 30 * 24 * 60 * 60 * 1000)
    );
  });
  extpay.onPaid.addListener((_user) => {
    paymentStatus.paid = true;
    paymentStatus.trialIsValid = false;
    paymentStatus.trialNeverStarted = false;
    paymentStatus.trialExpired = false;
    paymentStatus.trialExpirationDate = null;
  });

  return {
    get paymentStatus() {
      return paymentStatus;
    },
    set paymentStatus(value) {
      paymentStatus = value;
    },

    async initialize() {
      const user = await extpay.getUser();
      if (user.paid) {
        paymentStatus.paid = true;
        paymentStatus.trialIsValid = false;
        paymentStatus.trialNeverStarted = false;
        paymentStatus.trialExpired = false;
        paymentStatus.trialExpirationDate = null;
      }

      const trialIsActive = trialIsValid(user.trialStartedAt);
      if (trialIsActive) {
        paymentStatus.trialStartedAt = new Date(user.trialStartedAt!);
        paymentStatus.trialIsValid = true;
        paymentStatus.trialExpired = false;
        paymentStatus.trialNeverStarted = false;
        paymentStatus.trialExpirationDate = sevenDaysAfter(
          paymentStatus.trialStartedAt
        );
      }

      const trialExpired = user.trialStartedAt! > sevenDaysAfter(new Date());
      if (trialExpired) {
        paymentStatus.trialStartedAt = new Date(user.trialStartedAt!);
        paymentStatus.trialIsValid = false;
        paymentStatus.trialExpired = true;
        paymentStatus.trialNeverStarted = false;
        paymentStatus.trialExpirationDate = null;
      }

      const trialNeverStarted = !user.trialStartedAt && !user.paid;
      if (trialNeverStarted) {
        paymentStatus.trialStartedAt = null;
        paymentStatus.trialIsValid = false;
        paymentStatus.trialExpired = false;
        paymentStatus.trialExpirationDate = null;
      }
      return paymentStatus;
    },
  };
}

export const tokenState = createTokenState();
export const alarmState = createAlarmState();
export const paymentState = createPaymentState();
