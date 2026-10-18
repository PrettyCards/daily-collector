const { SocksProxyAgent } = require('socks-proxy-agent');

const proxy = process.env.ALL_PROXY;

module.exports = proxy ? new SocksProxyAgent(proxy, { keepAlive: true }) : undefined;
