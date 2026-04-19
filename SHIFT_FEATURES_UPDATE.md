# Shift Management Feature Updates

## 🐛 Bug Fixes

### 1. **Working Hours Calculation Error** ✓ FIXED
**Problem**: A 5-minute shift (23:00-23:05) was showing as 23.83 hours
- **Root Cause**: The code was adding 15 minutes to start time BEFORE checking if it's an overnight shift
  - startMinutes: 23:00 + 15 min = 1395 minutes
  - endMinutes: 23:05 = 1385 minutes
  - Since 1385 < 1395, it triggered overnight logic: 1385 + 24*60 = 2825
  - Result: (2825 - 1395) / 60 = **23.83 hours** ❌

**Solution**: Removed the 15-minute buffer from hoursWorked calculation
- Calculate actual shift duration correctly first
- The 15-min early scheduling is only for punctuality tracking, not actual work hours
- Now 23:00-23:05 correctly shows as **0.08 hours (5 minutes)** ✓

**File**: `server/models/Shift.js` (pre-save middleware)

---

## ✨ New Features

### 2. **Shift Creation Dialog with Mutually Exclusive Input Methods**

#### Feature Overview
Managers can now create shifts in two mutually exclusive ways:

**Option 1: Custom Times**
- Manager enters specific start and end times
- Shift type field disabled
- System auto-calculates working hours
- Use case: Send employee home early, account for late arrival

**Option 2: Preset Shift Type**
- Manager selects from predefined shifts (Breakfast, Full Day, Mid Shift, etc.)
- Start/End time fields disabled and auto-filled
- No manual time entry required
- Use case: Standard recurring shifts

#### Shift Type Presets
```javascript
breakfast:  "08:45 - 16:00"
fullday:    "08:45 - 19:00"
midshift:   "11:45 - 23:00"
lunch:      "15:45 - 23:00"
evening:    "17:45 - 23:00"
dinner:     "18:45 - 23:00"
```

#### UI Implementation
- **Toggle Buttons**: Blue UI with "Custom Times" vs "Preset Shift" buttons
- **Dynamic Fields**: Only relevant fields appear based on selection
- **Live Hours Display**: Shows calculated hours in green box below times
- **Validation**: Only validates fields relevant to chosen method

#### Files Modified
- `client/src/pages/manager/Shifts.jsx`:
  - Added `inputMethod` state ('times' or 'shiftType')
  - Added `shiftTypeTimings` object with preset times
  - Updated modal form with toggle buttons
  - Updated validation logic to be method-aware
  - Updated form submission to auto-fill times from presets

---

## Validation & Testing

✓ **Frontend Build**: Successful (no errors, existing Vite warning only)
✓ **Backend Module Load**: Shift model loads without errors
✓ **Logic**: Mutually exclusive states working correctly
✓ **Hours Calculation**: Shows real-time preview before submission

---

## User Workflow

### Creating a Shift - Option 1 (Custom Times)
1. Click "Assign Shift"
2. Select Employee & Date
3. Click "Custom Times" button
4. Enter exact Start and End times
5. Shift Type field disabled (shows as grayed out)
6. Hours auto-calculated and displayed
7. Click "Assign Shift"

### Creating a Shift - Option 2 (Preset)
1. Click "Assign Shift"
2. Select Employee & Date
3. Click "Preset Shift" button
4. Select Shift Type from dropdown
5. Start/End times auto-populate and display
6. Hours auto-calculated and displayed
7. Click "Assign Shift"

### Editing Shifts
- Always uses "Custom Times" mode (allows manager to adjust times)
- Can fine-tune start/end for late arrivals or early departures
- Useful for recalculating pay if needed

---

## Impact Summary

| Aspect | Before | After |
|--------|--------|-------|
| 5-min shift calculated as | 23.83 hours ❌ | 0.08 hours ✓ |
| Shift creation method | Manual times only | Custom OR Preset |
| Time entry validation | Always required | Method-dependent |
| UI clarity | Mixed form | Clear toggle UI |
| Hours preview | None | Real-time display |

---

## Testing Notes

- Toggle immediately disables/enables relevant fields
- No validation errors for disabled fields
- Preset shifts auto-fill hours correctly
- Existing shifts continue to work (editing mode always uses custom times)
- Mobile-responsive button layout

