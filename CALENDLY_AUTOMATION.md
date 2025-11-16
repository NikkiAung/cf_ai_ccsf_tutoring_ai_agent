# Calendly Automation Guide

## Current Implementation

The automation uses Puppeteer to fill out the Calendly form. However, there's an important limitation:

### The Problem

When automation runs server-side:
1. Puppeteer opens a browser, fills the form, then closes
2. The browser session ends
3. When you visit the returned URL, it's a **fresh page** with an empty form

### Solutions

#### Option 1: Development Mode (Current Implementation)
- In development (`NODE_ENV=development`), the browser opens in **visible mode** (headful)
- Browser stays open for 30 seconds so you can see and interact with the filled form
- You can review and submit the form before the browser closes

**To test:**
```bash
NODE_ENV=development npm run dev
```

#### Option 2: Use Calendly API (Recommended for Production)
Calendly provides an official API for creating bookings:
- More reliable than web scraping
- No browser automation needed
- Proper integration

**Setup:**
1. Get Calendly API access: https://developer.calendly.com/
2. Set up OAuth
3. Use the API to create event invitations

**Documentation:** https://developer.calendly.com/api-docs

#### Option 3: Browserless.io Service
Use a service like Browserless.io that can:
- Keep browser sessions alive
- Provide remote browser access
- Handle multiple concurrent sessions

#### Option 4: Client-Side Automation
Run Puppeteer in a separate service that:
- Opens a visible browser window
- Keeps it open for user interaction
- Provides a way to access the browser session

## Current Behavior

### Development Mode
- ✅ Browser opens visibly
- ✅ Form is filled automatically
- ✅ Browser stays open for 30 seconds
- ✅ You can review and submit

### Production Mode
- ⚠️ Browser runs headless (invisible)
- ⚠️ Form is filled but browser closes immediately
- ⚠️ Returned URL shows empty form
- ✅ URL has correct date/time pre-selected

## Recommendations

For **production use**, implement one of these:

1. **Calendly API** (Best option)
   - Official, reliable
   - No browser automation needed
   - Proper error handling

2. **Separate Automation Service**
   - Run Puppeteer in a separate service
   - Keep browser sessions alive
   - Provide access to filled forms

3. **Hybrid Approach**
   - Use automation to collect data
   - Use Calendly API to create booking
   - Fall back to manual URL if API fails

## Testing

To test the visible browser automation:

1. Make sure you're in development mode:
   ```bash
   NODE_ENV=development npm run dev
   ```

2. Go through the booking flow in the chat

3. When automation runs, a browser window should open showing the filled form

4. Review and submit the form within 30 seconds

## Troubleshooting

**Browser doesn't open:**
- Check if `NODE_ENV=development` is set
- Make sure you're running on a machine with a display (not headless server)

**Form not filling:**
- Calendly's DOM structure may have changed
- Check browser console for errors
- Update selectors in `lib/calendly-automation.ts`

**Browser closes too quickly:**
- Adjust the timeout in `lib/calendly-automation.ts` (currently 30 seconds)

