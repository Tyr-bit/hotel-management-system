from playwright.sync_api import sync_playwright
import os

pages = [
    ('http://localhost:8080/login', 'D:/Project/A/界面/2-login.png'),
    ('http://localhost:8080/register', 'D:/Project/A/界面/3-register.png'),
    ('http://localhost:8080/no-permission', 'D:/Project/A/界面/4-no-permission.png'),
]

results = []

with sync_playwright() as p:
    # 使用旧版 Chromium 可执行文件
    executable_path = r'C:\Users\toto\AppData\Local\ms-playwright\chromium-1140\chrome-win\chrome.exe'
    browser = p.chromium.launch(executable_path=executable_path, headless=True)
    for url, path in pages:
        page = browser.new_page(viewport={'width': 1440, 'height': 900})
        try:
            page.goto(url, wait_until='networkidle', timeout=30000)
            page.screenshot(path=path, full_page=False)
            results.append((url, path, True, None))
            print(f"SUCCESS: {url} -> {path}")
        except Exception as e:
            results.append((url, path, False, str(e)))
            print(f"FAILED: {url} -> {e}")
        finally:
            page.close()
    browser.close()

for url, path, ok, err in results:
    status = "成功" if ok else f"失败: {err}"
    print(f"[{status}] {os.path.basename(path)}")
