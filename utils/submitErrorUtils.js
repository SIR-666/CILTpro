const NETWORK_ERROR_CODES = new Set([
  "ERR_NETWORK",
  "ECONNABORTED",
  "ETIMEDOUT",
  "ENOTFOUND",
  "EHOSTUNREACH",
  "ECONNREFUSED",
]);

const toStringSafe = (value) =>
  typeof value === "string" ? value.trim() : "";

const extractMessageFromData = (data) => {
  if (!data) return "";

  if (typeof data === "string") return data.trim();

  if (typeof data === "object") {
    const candidates = [
      data.message,
      data.error,
      data.detail,
      data.title,
      data.msg,
    ];
    for (const candidate of candidates) {
      const text = toStringSafe(candidate);
      if (text) return text;
    }
  }

  return "";
};

export const isNetworkSubmissionError = (error) => {
  if (!error) return false;

  // If server responded, this is not a transport/network failure.
  if (error.response) return false;

  const code = toStringSafe(error.code).toUpperCase();
  if (NETWORK_ERROR_CODES.has(code)) return true;

  const message = toStringSafe(error.message).toLowerCase();
  return (
    message.includes("network error") ||
    message.includes("timeout") ||
    message.includes("failed to fetch") ||
    message.includes("request aborted") ||
    message.includes("socket") ||
    message.includes("connection")
  );
};

export const getSubmissionFailureMessage = (error) => {
  const statusCode = error?.response?.status;
  const apiMessage = extractMessageFromData(error?.response?.data);

  if (apiMessage && statusCode) {
    return `${apiMessage} (HTTP ${statusCode})`;
  }

  if (apiMessage) return apiMessage;

  if (statusCode) {
    return `Server returned HTTP ${statusCode}. Please contact admin if this keeps happening.`;
  }

  const fallback = toStringSafe(error?.message);
  return fallback || "Failed to submit data. Please try again.";
};
