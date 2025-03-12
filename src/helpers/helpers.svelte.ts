import browser from "webextension-polyfill";
import ExtPay from "extpay";
import { sevenDaysAfter, trialIsValid } from "@/services/trial";

function createTokenState() {
  let token = $state<string>("");
  let valid = $state<boolean>(false);

  return {
    get token() {
      return token;
    },
    set token(value) {
      token = value;
    },
    async readTokenFromStorage() {
      const result = await browser.storage.local.get("githubToken");
      if (result.githubToken) {
        token = String(result.githubToken);
      } else token = "";
      return token;
    },

    get valid() {
      return valid;
    },
    set valid(value) {
      valid = value;
    },
    async checkTokenValidity() {
      if (!token) {
        valid = false;
        return valid;
      }
      const response = await fetch("https://api.github.com/user", {
        headers: {
          Authorization: `token ${token}`,
        },
      });
      if (response.ok) {
        if (response.status === 200) {
          valid = true;
        } else valid = false;
      } else valid = false;
      return valid;
    },
  };
}

function createAlarmState() {
  let alarmCount = $state<number>(0);

  return {
    get alarmCount() {
      return alarmCount;
    },
    set alarmCount(value) {
      alarmCount = value;
    },
    getAlarmCount: async () => {
      const alarms = await browser.alarms.getAll();
      alarmCount = alarms.length;
      return alarmCount;
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
  }>({
    paid: false,
    trialStartedAt: null,
    trialIsValid: false,
    trialExpired: false,
    trialExpirationDate: null,
  });

  extpay.onTrialStarted.addListener((user) => {
    // Since we're keying on onTrialStarted, we know there's a trial.
    paymentStatus.trialStartedAt = new Date(user.trialStartedAt!);
    paymentStatus.trialIsValid = true;
    paymentStatus.trialExpired = false;
    paymentStatus.trialExpirationDate = new Date(
      new Date(user.trialStartedAt!.getTime() + 30 * 24 * 60 * 60 * 1000)
    );
  });
  extpay.onPaid.addListener((_user) => {
    paymentStatus.paid = true;
    paymentStatus.trialIsValid = false;
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
        paymentStatus.trialExpired = false;
        paymentStatus.trialExpirationDate = null;
      }

      const trialIsActive = trialIsValid(user.trialStartedAt);
      if (trialIsActive) {
        paymentStatus.trialStartedAt = new Date(user.trialStartedAt!);
        paymentStatus.trialIsValid = true;
        paymentStatus.trialExpired = false;
        paymentStatus.trialExpirationDate = sevenDaysAfter(
          paymentStatus.trialStartedAt
        );
      }

      const trialExpired = user.trialStartedAt! > sevenDaysAfter(new Date());
      if (trialExpired) {
        paymentStatus.trialStartedAt = new Date(user.trialStartedAt!);
        paymentStatus.trialIsValid = false;
        paymentStatus.trialExpired = true;
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
