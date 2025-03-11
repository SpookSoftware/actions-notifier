import browser from "webextension-polyfill";

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

export const tokenState = createTokenState();
export const alarmState = createAlarmState();
