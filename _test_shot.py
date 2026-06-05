from playwright.sync_api import sync_playwright
import pathlib

url = pathlib.Path(r"F:\Santi Pulse\Brain Website\index.html").as_uri()
out = r"F:\Santi Pulse\Brain Website"

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)

    # Desktop
    page = browser.new_page(viewport={"width": 1440, "height": 900})
    logs = []
    page.on("console", lambda m: logs.append(f"{m.type}: {m.text}"))
    page.on("pageerror", lambda e: logs.append(f"PAGEERROR: {e}"))
    page.goto(url)
    page.wait_for_load_state("networkidle")
    page.wait_for_timeout(1500)  # let loader fade
    page.screenshot(path=out + r"\_shot_hero_desktop.png")
    page.screenshot(path=out + r"\_shot_full_desktop.png", full_page=True)

    # Open the Websites demo modal via the panel-3 ACCEDER
    page.evaluate("openWebsitesDemo()")
    page.wait_for_timeout(800)
    page.screenshot(path=out + r"\_shot_modal.png")
    page.evaluate("closeModal()")

    # Mobile
    mob = browser.new_page(viewport={"width": 390, "height": 844})
    mob.goto(url)
    mob.wait_for_load_state("networkidle")
    mob.wait_for_timeout(1500)
    mob.screenshot(path=out + r"\_shot_hero_mobile.png")

    print("CONSOLE/ERRORS:")
    for l in logs:
        print(" ", l)
    if not logs:
        print("  (none)")
    browser.close()
print("done")
