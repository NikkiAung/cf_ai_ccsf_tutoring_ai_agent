# Troubleshooting Calendly Automation

## Common Issues and Solutions

### Issue: Automation stops mid-way with error message

**Symptoms:**
- Browser starts filling form
- Stops in the middle
- Shows error: "I'm sorry, I couldn't process your request"

**Possible Causes:**
1. **Calendly's DOM structure changed** - Form fields may have different selectors
2. **Page not fully loaded** - Form appears before fields are ready
3. **Field selectors not matching** - Calendly uses dynamic IDs/classes
4. **Timeout issues** - Page taking too long to load

**Solutions:**

1. **Check the terminal/console logs:**
   - Look for error messages
   - Check which fields were successfully filled
   - Look for "Successfully filled" messages

2. **Check the screenshot:**
   - Automation saves `calendly-form-filled.png` when done
   - Check `calendly-debug-before-fill.png` if fields aren't found
   - Check `calendly-no-form-found.png` if form isn't detected

3. **Increase wait times:**
   - The automation waits 5 seconds for page load
   - If your connection is slow, increase timeouts in `lib/calendly-automation.ts`

4. **Update selectors:**
   - Inspect Calendly form in browser
   - Update selectors in `lib/calendly-automation.ts`
   - Add new selectors to the arrays

### Issue: Form fields not being filled

**Symptoms:**
- Browser opens but fields remain empty
- Error messages about fields not found

**Solutions:**

1. **Check if form is visible:**
   - Look at the browser window
   - Check if form has loaded
   - Check if fields are visible (not hidden)

2. **Update selectors:**
   - Open Calendly manually
   - Inspect form fields
   - Note the actual selectors (IDs, classes, attributes)
   - Update `lib/calendly-automation.ts` with correct selectors

3. **Try different approaches:**
   - The automation tries multiple selector strategies
   - If one fails, it tries the next
   - Check logs to see which selectors worked

### Issue: Browser closes immediately

**Symptoms:**
- Browser opens but closes right away
- No time to see what happened

**Solutions:**

1. **Check development mode:**
   - Make sure `NODE_ENV=development`
   - Browser should stay open for 30 seconds in dev mode

2. **Check for errors:**
   - Look at terminal for error messages
   - Check if automation crashed

3. **Increase timeout:**
   - In development mode, browser stays open 30 seconds
   - Increase this in `lib/calendly-automation.ts` if needed

### Issue: Automation works but form is empty when visiting URL

**Symptoms:**
- Automation completes successfully
- But when you visit the returned URL, form is empty

**Explanation:**
- This is expected behavior in production
- Browser session ends after automation
- Form filling happens in the automated browser, not the URL

**Solutions:**

1. **Use development mode:**
   - Browser stays open so you can see filled form
   - You can review and submit directly

2. **Use Calendly API:**
   - Proper solution for production
   - Creates booking directly via API
   - No browser automation needed

3. **Use a persistent browser service:**
   - Services like Browserless.io
   - Keep browser sessions alive
   - Provide access to filled forms

## Debugging Steps

1. **Check logs:**
   ```bash
   # Look for these messages in terminal:
   - "Successfully filled name using selector: ..."
   - "Successfully filled email using selector: ..."
   - "Form found using selector: ..."
   - "Automation completed. Form filled at URL: ..."
   ```

2. **Check screenshots:**
   - `calendly-form-filled.png` - Final state
   - `calendly-debug-before-fill.png` - Before filling
   - `calendly-no-form-found.png` - If form not found

3. **Test manually:**
   - Open Calendly URL manually
   - Inspect form fields
   - Note the selectors
   - Update automation code

4. **Increase logging:**
   - Add more `console.log` statements
   - Log each step of the process
   - Log which selectors are tried

## Getting Help

If automation still doesn't work:

1. **Check Calendly's structure:**
   - Form may have changed
   - Selectors may need updating
   - New fields may have been added

2. **Consider alternatives:**
   - Use Calendly API (recommended)
   - Use a different automation tool
   - Manual booking with pre-filled URL

3. **Update selectors:**
   - Inspect Calendly form
   - Find actual selectors
   - Update `lib/calendly-automation.ts`

## Error Messages

### "Form not found"
- **Cause:** Form hasn't loaded yet
- **Solution:** Increase wait time, check selectors

### "Field not found"
- **Cause:** Selector doesn't match actual field
- **Solution:** Update selector, try different approaches

### "Navigation timeout"
- **Cause:** Page taking too long to load
- **Solution:** Increase timeout, check network

### "Element not visible"
- **Cause:** Field exists but is hidden
- **Solution:** Scroll to element, wait for visibility

## Best Practices

1. **Always check logs first**
2. **Use screenshots for debugging**
3. **Test in development mode first**
4. **Update selectors if Calendly changes**
5. **Consider Calendly API for production**

