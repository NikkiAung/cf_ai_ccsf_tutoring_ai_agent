# Testing Guide for Calendly Automation

## Quick Test Flow

Follow these prompts step-by-step in the chatbot to test the full booking automation.

### Step 1: Start the App
```bash
npm run dev
```
Visit: `http://localhost:3000/schedule`

### Step 2: Find a Tutor
**Type in chat:**
```
I need Python help on Monday at 10:00
```

**Expected Response:**
- AI matches you with Chris H (available Monday 10:00-10:30 on campus)
- Shows available time slots
- Asks if you want to book

### Step 3: Confirm Booking
**Type in chat:**
```
yes
```

**Expected Response:**
- Chatbot asks for your name and email (Step 1/7)

### Step 4: Provide Name & Email
**Type in chat:**
```
Name: John Doe, Email: john.doe@example.com
```

**Expected Response:**
- Chatbot asks for CCSF email (Step 2/7)

### Step 5: Provide CCSF Email
**Type in chat:**
```
student@mail.ccsf.edu
```

**Expected Response:**
- Chatbot asks for student ID (Step 3/7)

### Step 6: Provide Student ID (or skip)
**Type in chat:**
```
1234567
```
OR
```
skip
```

**Expected Response:**
- Chatbot asks about allowing other students (Step 4/7)

### Step 7: Allow Other Students
**Type in chat:**
```
yes
```
OR
```
no
```

**Expected Response:**
- Chatbot asks for course codes (Step 5/7)

### Step 8: Provide Course Codes
**Type in chat:**
```
131B, 110A
```

**Expected Response:**
- Chatbot asks what specifically you need help with (Step 6/7)

### Step 9: Describe What You Need Help With
**Type in chat:**
```
I need help with nested loops and list comprehension in Python
```

**Expected Response:**
- Chatbot asks if there's anything else (Step 7/7)

### Step 10: Additional Notes
**Type in chat:**
```
No
```
OR
```
I prefer online sessions if possible
```

**Expected Response:**
- Chatbot says it's booking your session
- A browser window should open (in development mode)
- The Calendly form should be pre-filled with all your information
- You can review and submit the form

---

## Alternative Test Flows

### Test Flow 2: Online Tutor
**Prompt:**
```
I need online Python tutoring on Tuesday
```

Then follow the same steps above.

### Test Flow 3: Multiple Skills
**Prompt:**
```
I need help with Java and SQL on Wednesday
```

### Test Flow 4: Specific Time Preference
**Prompt:**
```
Find me a tutor for React on Friday at 11:00
```

---

## What to Expect

### In Development Mode:
1. ✅ Browser window opens automatically
2. ✅ Calendly page loads with correct date/time
3. ✅ Form fields are filled automatically:
   - Name
   - Email
   - CCSF Email
   - Student ID
   - Allow other students (radio button)
   - Course checkboxes
   - Specific help textarea
   - Additional notes textarea
4. ✅ Browser stays open for 30 seconds
5. ✅ You can review and submit the form

### If Something Goes Wrong:
- Check the browser console for errors
- Check the terminal for error messages
- Make sure Puppeteer is installed: `npm install puppeteer`
- Verify you're in development mode

---

## Troubleshooting

### Browser Doesn't Open
- Check if `NODE_ENV=development` is set
- Make sure you're running on a machine with a display
- Check terminal for error messages

### Form Not Filling
- Check browser console for JavaScript errors
- Verify Calendly page structure hasn't changed
- Check terminal for Puppeteer errors

### Automation Fails
- The chatbot will still return a Calendly URL
- You can manually fill out the form
- Date and time will be pre-selected in the URL

---

## Quick Copy-Paste Test

Copy and paste these prompts one by one:

1. `I need Python help on Monday at 10:00`
2. `yes`
3. `Name: Test Student, Email: test@example.com`
4. `test@mail.ccsf.edu`
5. `skip`
6. `yes`
7. `131B`
8. `I need help with Python assignments`
9. `no`

After step 9, the automation should run and open a browser window!

---

## Testing Different Scenarios

### Test with All Fields
Try providing all optional fields to test the full form:
- Student ID: `1234567`
- Allow others: `no`
- Multiple courses: `110A, 131B, MATH 108`
- Detailed help: `I'm struggling with object-oriented programming concepts`
- Additional notes: `I have a project due next week`

### Test with Minimal Fields
Try skipping optional fields:
- Student ID: `skip`
- Allow others: `yes`
- Single course: `131B`
- Brief help: `Python help`
- Additional notes: `no`

---

## Expected Behavior

### Success Case:
- ✅ All form fields filled correctly
- ✅ Browser window visible
- ✅ Can submit form immediately
- ✅ No errors in console

### Fallback Case:
- ⚠️ If automation fails, URL is still provided
- ⚠️ Date/time pre-selected in URL
- ⚠️ User can fill form manually
- ⚠️ Error message explains the situation

---

## Next Steps After Testing

1. **If automation works:**
   - Consider implementing Calendly API for production
   - Set up proper error handling
   - Add logging for debugging

2. **If automation doesn't work:**
   - Check Calendly's DOM structure
   - Update selectors in `lib/calendly-automation.ts`
   - Consider using Calendly API instead

3. **For production:**
   - Use Calendly API (recommended)
   - Or use a service like Browserless.io
   - Or run automation in a visible browser service

