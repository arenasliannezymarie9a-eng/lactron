
# Remove Forgot Password Feature from AuthCard

## Overview

Strip out all forgot password, security question, and password reset functionality from the authentication card, leaving only login and signup.

## Changes

### File: `src/components/auth/AuthCard.tsx`

**Remove imports** (line 6):
- Remove `KeyRound`, `ArrowLeft`, `HelpCircle` from lucide-react imports (keep `Lock`, `Mail`, `User`, `Zap`, `Shield`)
- Remove `SecurityQuestion` from the api import (line 9)

**Simplify AuthMode type** (line 13):
- Change from `"login" | "signup" | "forgot" | "security_question" | "reset_password"` to `"login" | "signup"`

**Remove state variables** (lines 55-62):
- `securityQuestions`, `securityAnswer`
- `userSecurityQuestion`, `resetToken`, `newPassword`, `confirmNewPassword`

**Remove useEffect** (lines 65-73):
- Delete the `loadSecurityQuestions` effect entirely

**Remove handler functions** (lines 111-164):
- `handleForgotPassword`
- `handleVerifySecurityAnswer`
- `handleResetPassword`

**Simplify `resetForm`** (lines 166-176):
- Remove lines clearing `securityAnswer`, `userSecurityQuestion`, `resetToken`, `newPassword`, `confirmNewPassword`

**Simplify `switchMode`** (lines 178-187):
- Remove `"forgot"`, `"security_question"`, `"reset_password"` from `modeOrder` array

**Remove UI sections**:
- Back button for forgot password flow (lines 278-298)
- Forgot password form `mode === "forgot"` (lines 456-504)
- Security question form `mode === "security_question"` (lines 507-564)
- Reset password form `mode === "reset_password"` (lines 567-639)
- "Forgot Password?" link at the bottom (lines 642-660)
