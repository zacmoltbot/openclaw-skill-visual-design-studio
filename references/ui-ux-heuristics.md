# UI/UX Heuristics — Design Review Framework

## Purpose
Structured checklist for design critique and self-review of generated UI.

---

## Nielsen's 10 Usability Heuristics (Adapted for V1)

### 1. Visibility of System Status
- Does the user know where they are?
- Is there a progress indicator for multi-step flows?
- Is feedback given after actions?

### 2. Match Between System and Real World
- Is language familiar to the user?
- Are icons self-explanatory?
- Is information organized logically?

### 3. User Control and Freedom
- Can the user easily back out of actions?
- Is there a clear home / main navigation?
- Can the user undo / redo?

### 4. Consistency and Standards
- Do buttons look like buttons?
- Is navigation in the same place on every page?
- Do similar actions behave the same way?

### 5. Error Prevention
- Are destructive actions confirmable?
- Are forms validated before submission?
- Are inputs constrained appropriately?

### 6. Recognition Rather Than Recall
- Are options visible rather than hidden?
- Is context maintained during navigation?
- Are breadcrumbs or location indicators present?

### 7. Flexibility and Efficiency of Use
- Does the design work for both novice and expert?
- Are shortcuts available (keyboard navigation)?
- Can frequent actions be done quickly?

### 8. Aesthetic and Minimalist Design
- Is the UI free of unnecessary elements?
- Is hierarchy clear at a glance?
- Is the most important content prominent?

### 9. Help Users Recover from Errors
- Are error messages in plain language?
- Do error messages explain what went wrong AND how to fix it?
- Can errors be resolved without leaving the current context?

### 10. Help and Documentation
- Is there a help section or tooltip for complex features?
- Is documentation searchable?
- Is help contextual (appears when needed)?

---

## V1-Specific Checks

### Navigation
- [ ] Top-level navigation exists
- [ ] Navigation items are labeled meaningfully
- [ ] Mobile nav collapses to hamburger or drawer

### Forms
- [ ] All inputs have visible labels
- [ ] Placeholder text is not the only label
- [ ] Error states are visually distinct
- [ ] Submit button communicates what it does

### Visual Hierarchy
- [ ] The most important element is the most prominent
- [ ] Related items are grouped together
- [ ] White space is used deliberately

### Accessibility Surface
- [ ] All images have alt text (or empty alt if decorative)
- [ ] Color is not the only means of conveying information
- [ ] Contrast ratio ≥ 4.5:1 for normal text
- [ ] Interactive elements are keyboard-focusable
