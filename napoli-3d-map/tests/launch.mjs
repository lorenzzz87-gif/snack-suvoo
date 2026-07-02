// 统一的 headless Chromium 启动配置（软件渲染 WebGL + 代理环境支持）
import { chromium } from 'playwright-core';

export const CHROME = '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';

export async function launchBrowser() {
  const proxy = process.env.HTTPS_PROXY || process.env.https_proxy;
  return chromium.launch({
    executablePath: CHROME,
    args: [
      '--use-gl=angle',
      '--use-angle=swiftshader',
      '--enable-unsafe-swiftshader',
      // 测试环境代理做 TLS 检查（MITM CA），Chromium 不认其 CA，仅测试时忽略
      ...(proxy ? ['--ignore-certificate-errors', '--disable-http2', '--disable-quic'] : []),
    ],
    ...(proxy ? { proxy: { server: proxy, bypass: 'localhost,127.0.0.1' } } : {}),
  });
}
