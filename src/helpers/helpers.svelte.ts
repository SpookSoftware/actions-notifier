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

export const tokenState = createTokenState();
