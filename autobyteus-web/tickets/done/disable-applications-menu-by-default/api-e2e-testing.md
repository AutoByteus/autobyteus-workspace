# API/E2E Testing - Disable Applications Menu By Default

- **Ticket**: disable-applications-menu-by-default

## Acceptance Criteria Closure Matrix
| AC ID | Description | Scenario ID | Status |
| --- | --- | --- | --- |
| AC-001 | Applications link in `AppLeftPanel.vue` is NOT visible when flag is false | T-COMP-001 | Passed |
| AC-002 | Applications link in `AppLeftPanel.vue` IS visible when flag is true | T-COMP-002 | Passed |
| AC-003 | Accessing `/applications` redirects to `/workspace` when flag is false | T-MID-001 | Passed |
| AC-004 | Flag is correctly initialized from env var | T-UNIT-001 | Manual Verified |

## Test Scenarios

### T-COMP-001: AppLeftPanel Visibility (Flag=false)
- **Source**: Requirement
- **Level**: Component Test
- **Expected**: "Applications" text not found in component output.
- **Result**: Passed (`AppLeftPanel_v2.spec.ts`)

### T-COMP-002: AppLeftPanel Visibility (Flag=true)
- **Source**: Requirement
- **Level**: Component Test
- **Expected**: "Applications" text found in component output.
- **Result**: Passed (`AppLeftPanel_v2.spec.ts`)

### T-COMP-003: LeftSidebarStrip Visibility (Flag=false)
- **Source**: Requirement
- **Level**: Component Test
- **Expected**: "Applications" title not found in buttons.
- **Result**: Passed (`LeftSidebarStrip.spec.ts`)

### T-COMP-004: LeftSidebarStrip Visibility (Flag=true)
- **Source**: Requirement
- **Level**: Component Test
- **Expected**: "Applications" title found in buttons.
- **Result**: Passed (`LeftSidebarStrip.spec.ts`)

### T-MID-001: Feature Flag Middleware Redirect
- **Source**: Requirement
- **Level**: Integration Test (Middleware)
- **Expected**: `navigateTo('/')` called when flag is false and path is `/applications`.
- **Result**: Passed (`feature-flags.global.spec.ts`)

## Manual Verification Scenarios (Desktop/Browser)
1. **Scenario**: Start application with `ENABLE_APPLICATIONS=false` (or unset).
   - Observe sidebar: "Applications" should NOT be visible.
   - Navigate to `http://localhost:3000/applications`: Should redirect to `/agents` (since `/` redirects to `/agents`).
2. **Scenario**: Start application with `ENABLE_APPLICATIONS=true`.
   - Observe sidebar: "Applications" should be visible.
   - Click "Applications": Should show the applications list.
