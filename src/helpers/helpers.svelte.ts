import browser from "webextension-polyfill";
import { validateTokenDirectly } from "./browser";
import { ALARM_PREFIX } from "@constants";

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
        const result = await browser.storage.sync.get("githubToken");
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

        const result = await validateTokenDirectly(token);

        valid = result;
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
  const alarmCount = $derived(alarms.length);
  let isLoading = $state<boolean>(false);

  return {
    get alarmCount() {
      return alarmCount;
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
    getAlarms: async function () {
      if (isLoading) return alarms;
      isLoading = true;
      const allAlarms = await browser.alarms.getAll();
      const myAlarms = allAlarms.filter(isFromMyExtension);
      alarms = myAlarms;
      isLoading = false;
      return alarms;
    },
    refresh: async function () {
      if (isLoading) return;
      isLoading = true;
      const allAlarms = await browser.alarms.getAll();
      const myAlarms = allAlarms.filter(isFromMyExtension);
      alarms = myAlarms;
      isLoading = false;
      return;
    },
    clearAlarms: async function () {
      if (isLoading) return;
      isLoading = true;
      try {
        const allAlarms = await browser.alarms.getAll();
        const myAlarms = allAlarms.filter(isFromMyExtension);

        // Clear alarms from the alarms API
        const alarmNames = myAlarms.map((alarm) => alarm.name);
        const clearAlarmPromises = alarmNames.map((alarmName) =>
          browser.alarms.clear(alarmName)
        );

        // Extract the encoded part for storage removal
        // If your alarm names are like "actions-notifier_runId|owner|repo"
        // You need to remove "actions-notifier_" prefix to match storage keys
        const storageKeys = myAlarms.map((alarm) => {
          // Remove the ALARM_PREFIX if it exists
          if (alarm.name.startsWith(ALARM_PREFIX)) {
            return alarm.name.substring(ALARM_PREFIX.length);
          }
          return alarm.name;
        });

        const clearStoragePromises = storageKeys.map((key) =>
          browser.storage.sync.remove(key)
        );

        await Promise.all([...clearAlarmPromises, ...clearStoragePromises]);

        console.debug(
          `Cleared ${myAlarms.length} alarms and their storage entries`
        );

        alarms = [];
      } catch (error) {
        console.error("Error clearing alarms:", error);
      } finally {
        isLoading = false;
      }

      return;
    },
  };
}

function isFromMyExtension(alarm: browser.Alarms.Alarm): boolean {
  const numOfPipes = alarm.name.split("|").length;
  return (
    (numOfPipes === 3 || numOfPipes === 4) &&
    alarm.name.startsWith(ALARM_PREFIX)
  );
}

export const tokenState = createTokenState();
export const alarmState = createAlarmState();
