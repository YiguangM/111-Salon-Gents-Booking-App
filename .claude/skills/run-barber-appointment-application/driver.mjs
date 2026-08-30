#!/usr/bin/env node
// Drives the barbershop app end-to-end in a real headless browser:
// public booking flow through to confirmation, then admin login and
// the schedule editor. Screenshots land next to this file in
// ./screenshots/. Run with: node .claude/skills/run-barber-appointment-application/driver.mjs smoke
//
// Assumes the dev server is already running at BASE_URL (default
// http://localhost:3000) and the DB has been seeded (npm run db:seed).

import { chromium } from "playwright";
import { fileURLToPath } from "node:url";
import path from "node:path";

const BASE_URL = process.env.BASE_URL ?? "http://localhost:3000";
const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? "admin@example.com";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? "ChangeMe123!";
const SCREENSHOT_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), "screenshots");

const command = process.argv[2] ?? "smoke";

function todayISODate() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

function addDaysISODate(isoDate, days) {
  const d = new Date(`${isoDate}T00:00:00`);
  d.setDate(d.getDate() + days);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

async function main() {
  if (command !== "smoke") {
    console.error(`Unknown command "${command}". Only "smoke" is supported.`);
    process.exit(1);
  }

  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 1000 } });
  const consoleErrors = [];
  page.on("console", (msg) => {
    if (msg.type() === "error") consoleErrors.push(msg.text());
  });
  page.on("pageerror", (err) => consoleErrors.push(String(err)));

  let shot = 0;
  const screenshot = async (name) => {
    shot += 1;
    const file = path.join(SCREENSHOT_DIR, `${String(shot).padStart(2, "0")}-${name}.png`);
    await page.screenshot({ path: file, fullPage: true });
    return file;
  };

  console.log(`Driving ${BASE_URL} ...`);

  // --- Public site ---
  await page.goto(BASE_URL, { waitUntil: "networkidle" });
  await screenshot("home");

  // --- Booking flow: service -> any barber -> first day with open slots -> details -> confirm ---
  await page.goto(`${BASE_URL}/book`, { waitUntil: "networkidle" });
  const firstServiceButton = page.locator("main button").first();
  const serviceName = (await firstServiceButton.innerText()).split("\n")[0];
  await firstServiceButton.click();
  await screenshot("book-step2-barber");

  await page.getByText("Any available barber").click();

  // The shop may be closed on the first date shown (e.g. Sunday) - probe
  // forward day by day until a day with open slots is found.
  let date = todayISODate();
  let slotCount = 0;
  for (let i = 0; i < 8; i++) {
    await page.fill('input[type="date"]', date);
    await page.waitForTimeout(700);
    slotCount = await page.locator("button", { hasText: /AM|PM/ }).count();
    if (slotCount > 0) break;
    date = addDaysISODate(date, 1);
  }
  await screenshot("book-step3-slots");

  if (slotCount === 0) {
    throw new Error("No open slots found in the next 8 days - is the seeded schedule intact?");
  }

  const slotButtons = page.locator("button", { hasText: /AM|PM/ });
  const bookedSlotText = await slotButtons.first().innerText();
  await slotButtons.first().click();
  await page.getByText("Continue", { exact: true }).click();
  await screenshot("book-step4-details");

  const testEmail = `smoke-test-${Date.now()}@example.com`;
  await page.fill('input[placeholder="Full name"]', "Smoke Test");
  await page.fill('input[placeholder="Email"]', testEmail);
  await page.fill('input[placeholder="Phone number"]', "555-000-0000");
  await page.getByText("Confirm Booking", { exact: true }).click();
  await page.waitForSelector("text=You're booked!", { timeout: 10_000 });
  await screenshot("book-confirmation");

  console.log(`Booked: ${serviceName} at ${bookedSlotText.split("\n")[0]} on ${date}`);

  // --- Admin: login, dashboard, barber schedule editor ---
  await page.goto(`${BASE_URL}/admin/login`, { waitUntil: "networkidle" });
  await screenshot("admin-login");
  await page.fill('input[type="email"]', ADMIN_EMAIL);
  await page.fill('input[type="password"]', ADMIN_PASSWORD);
  await page.click('button[type="submit"]');
  await page.waitForURL("**/admin");
  await page.waitForSelector("text=Dashboard");
  await screenshot("admin-dashboard");

  await page.goto(`${BASE_URL}/admin/barbers`, { waitUntil: "networkidle" });
  await screenshot("admin-barbers");

  const firstBarberLink = page.locator('a[href^="/admin/barbers/"]').first();
  await firstBarberLink.click();
  await page.waitForURL("**/admin/barbers/*");
  await page.waitForSelector("text=Weekly Working Hours");
  await screenshot("admin-barber-editor");

  // --- Clean up the appointment this smoke run created ---
  await page.goto(`${BASE_URL}/admin/appointments`, { waitUntil: "networkidle" });
  await page.waitForSelector("table");
  const row = page.locator("tr", { hasText: testEmail });
  if (await row.count()) {
    await page.once("dialog", (dialog) => dialog.accept());
    await row.getByText("Delete", { exact: true }).click();
    await page.waitForTimeout(500);
    console.log("Cleaned up the test appointment.");
  }

  await browser.close();

  console.log(`\nScreenshots written to: ${SCREENSHOT_DIR}`);
  if (consoleErrors.length) {
    console.log(`\n${consoleErrors.length} browser console error(s):`);
    for (const e of consoleErrors) console.log(" -", e);
    process.exitCode = 1;
  } else {
    console.log("\nNo browser console errors. PASS.");
  }
}

main().catch((err) => {
  console.error("Driver failed:", err);
  process.exitCode = 1;
});
