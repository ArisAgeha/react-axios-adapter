export function isLocal() {
  return window.location.host.includes('localhost');
}

export function isIp() {
  return /^((2(5[0-5]|[0-4]\d))|[0-1]?\d{1,2})(\.((2(5[0-5]|[0-4]\d))|[0-1]?\d{1,2})){3}/.test(window.location.host);
}

export function isTestServer() {
  return window.location.hostname.includes('test.yingzhongshare.com');
}

export function isObject(target: any) {
  return Object.prototype.toString.call(target) === '[object Object]';
}
